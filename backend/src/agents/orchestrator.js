import { GoogleGenAI } from '@google/genai';
import { supabase } from '../config/database.js';
import { GEMINI_API_KEY, GEMINI_MODEL } from '../config/env.js';
import { geminiFunctionDeclarations, executeTool } from '../tools/index.js';
import { runIntakeAgent } from './roles/intake.agent.js';
import { runInvestigationAgent } from './roles/investigation.agent.js';
import { runDecisionAgent } from './roles/decision.agent.js';
import { runExecutionAgent } from './roles/execution.agent.js';
import { runVerificationAgent } from './roles/verification.agent.js';
import { MonitoringAgent } from './roles/monitoring.agent.js';
import { logger } from '../utils/logger.js';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export class AgentOrchestrator {
  /**
   * Run the complete multi-agent resolution workflow for a business issue
   */
  static async runWorkflow({ message, userId = null, issueId = null }) {
    logger.info(`[Orchestrator] Starting workflow for message: "${message.slice(0, 60)}..."`);

    // 1. Create persistent workflow record
    const { data: workflow, error: wfErr } = await supabase
      .from('workflows')
      .insert([
        {
          trigger_message: message,
          issue_id: issueId || null,
          created_by: userId || null,
          status: 'running',
          started_at: new Date().toISOString(),
        },
      ])
      .select('*')
      .single();

    if (wfErr || !workflow) {
      throw new Error(`Failed to initialize workflow in database: ${wfErr?.message}`);
    }

    const workflowId = workflow.id;
    const monitor = new MonitoringAgent(workflowId);

    try {
      // ----------------------------------------------------------------------
      // PHASE 1: INTAKE AGENT
      // ----------------------------------------------------------------------
      await monitor.startTask('intake', { message });
      const intakeResult = await runIntakeAgent(message);
      await monitor.completeTask('intake', intakeResult.data, intakeResult.success);

      if (!intakeResult.success) {
        throw new Error('Intake Agent failed to analyze problem.');
      }
      const intakeData = intakeResult.data;

      // ----------------------------------------------------------------------
      // PHASE 2: INVESTIGATION AGENT
      // ----------------------------------------------------------------------
      await monitor.startTask('investigation', intakeData);
      const investigationResult = await runInvestigationAgent(intakeData, async (toolName, args, result) => {
        await monitor.recordAction(toolName, args, result, 'investigation');
      });
      await monitor.completeTask(
        'investigation',
        investigationResult.findings,
        investigationResult.success,
        investigationResult.error
      );

      if (!investigationResult.success) {
        // If order was not found or missing
        const failSummary = {
          status: 'failed',
          intake: intakeData,
          investigation: investigationResult.findings,
          error: investigationResult.error,
          message: `Investigation halted: ${investigationResult.error}`,
        };
        await monitor.finalizeWorkflow({
          status: 'failed',
          result: failSummary,
          executionPlan: null,
        });
        return {
          workflow_id: workflowId,
          status: 'failed',
          error: investigationResult.error,
          summary: failSummary,
        };
      }
      const findings = investigationResult.findings;

      // ----------------------------------------------------------------------
      // PHASE 3: DECISION AGENT
      // ----------------------------------------------------------------------
      await monitor.startTask('decision', { intakeData, findings });
      const decisionResult = await runDecisionAgent(findings, intakeData);
      await monitor.completeTask('decision', decisionResult.decision, decisionResult.success);

      const decision = decisionResult.decision;

      // Update workflow execution plan
      await supabase
        .from('workflows')
        .update({ execution_plan: decision.execution_plan })
        .eq('id', workflowId);

      // ----------------------------------------------------------------------
      // PHASE 4: EXECUTION AGENT
      // ----------------------------------------------------------------------
      await monitor.startTask('execution', { plan: decision.execution_plan });
      const executionResult = await runExecutionAgent({
        executionPlan: decision.execution_plan || [],
        workflowId,
        onActionExecuted: async (toolName, args, result) => {
          await monitor.recordAction(toolName, args, result, 'execution');
        },
      });
      await monitor.completeTask('execution', executionResult, executionResult.success);

      if (!executionResult.success) {
        const failedStep = executionResult.executionLog?.find((l) => !l.success);
        const failSummary = {
          workflow_id: workflowId,
          workflowId: workflowId,
          status: 'failed',
          intake: intakeData,
          investigation: findings,
          decision,
          execution: executionResult,
          error: `Execution Agent halted: Tool "${failedStep?.tool}" failed: ${JSON.stringify(failedStep?.output)}`,
        };
        await monitor.finalizeWorkflow({
          status: 'failed',
          result: failSummary,
          executionPlan: decision.execution_plan,
        });
        return failSummary;
      }

      // ----------------------------------------------------------------------
      // PHASE 5: VERIFICATION AGENT
      // ----------------------------------------------------------------------
      await monitor.startTask('verification', { executionLog: executionResult.executionLog });
      const verificationResult = await runVerificationAgent({
        orderId: intakeData.order_id,
        workflowId,
        executionLog: executionResult.executionLog,
      });
      await monitor.completeTask('verification', verificationResult.verification, verificationResult.success);

      // ----------------------------------------------------------------------
      // PHASE 6: MONITORING & RESOLUTION SUMMARY
      // ----------------------------------------------------------------------
      const finalStatus = executionResult.requiresApproval ? 'awaiting_approval' : 'completed';

      const finalResult = {
        workflow_id: workflowId,
        workflowId: workflowId,
        status: finalStatus,
        trigger_message: message,
        triggerMessage: message,
        intake: intakeData,
        investigation: findings,
        decision: {
          recommended_resolution: decision.recommended_resolution,
          reasoning_summary: decision.reasoning_summary,
          requires_admin_approval: decision.requires_admin_approval,
          applicable_policies: decision.applicable_policies,
          execution_plan: decision.execution_plan,
        },
        executionPlan: decision.execution_plan,
        execution: {
          steps_executed: executionResult.executionLog.length,
          execution_log: executionResult.executionLog,
          paused_for_approval: executionResult.requiresApproval,
          pending_approval_details: executionResult.pendingApprovalDetails,
        },
        pendingApproval: executionResult.pendingApprovalDetails
          ? {
              id: executionResult.pendingApprovalDetails.approval_id,
              approval_id: executionResult.pendingApprovalDetails.approval_id,
              amount: executionResult.pendingApprovalDetails.amount,
              details: { amount: executionResult.pendingApprovalDetails.amount },
              notice: executionResult.pendingApprovalDetails.notice,
            }
          : null,
        verification: verificationResult.verification,
        completed_at: new Date().toISOString(),
      };

      await monitor.finalizeWorkflow({
        status: finalStatus,
        result: finalResult,
        executionPlan: decision.execution_plan,
      });

      return finalResult;
    } catch (err) {
      logger.error(`[Orchestrator] Workflow ${workflowId} failed with error:`, err.message);
      const errorResult = {
        workflow_id: workflowId,
        workflowId: workflowId,
        status: 'failed',
        error: err.message,
        timestamp: new Date().toISOString(),
      };
      await monitor.finalizeWorkflow({
        status: 'failed',
        result: errorResult,
        executionPlan: null,
      });
      return errorResult;
    }
  }

  /**
   * Interactive Gemini Function-Calling Loop (bounded by max 8 iterations)
   */
  static async runInteractiveAgentLoop({ message, workflowId = null, maxIterations = 8 }) {
    logger.info(`[Orchestrator] Running interactive tool-calling loop (max ${maxIterations} turns)...`);

    const primaryModel = GEMINI_MODEL || 'gemini-3.5-flash';
    const candidateModels = [primaryModel];
    const toolCallHistory = [];
    let iterations = 0;
    let finalAnswer = null;

    // Format tools for Gemini API
    const toolsConfig = [{ functionDeclarations: geminiFunctionDeclarations }];

    const conversationContents = [
      {
        role: 'user',
        parts: [
          {
            text: `You are ResolveFlow AI Orchestrator. Help investigate and resolve the following business operational issue by calling the available tools: "${message}". Call relevant tools, inspect the results, formulate a plan, and provide a clear final resolution.`,
          },
        ],
      },
    ];

    while (iterations < maxIterations) {
      iterations++;
      logger.info(`[Orchestrator] Tool loop iteration ${iterations}/${maxIterations}`);

      let response = null;
      let lastErr = null;

      for (const model of candidateModels) {
        // Retry transient errors (503 high demand, temporary network spikes) up to 2 times
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            response = await ai.models.generateContent({
              model,
              contents: conversationContents,
              config: {
                tools: toolsConfig,
                temperature: 0.2,
                abortSignal: AbortSignal.timeout(25000),
              },
            });
            if (response) break;
          } catch (e) {
            lastErr = e;
            const isTransient =
              e?.status === 503 ||
              e?.message?.includes('503') ||
              e?.message?.includes('high demand') ||
              e?.message?.includes('UNAVAILABLE') ||
              e?.message?.includes('aborted');

            if (isTransient && attempt === 1) {
              logger.warn(`[Orchestrator] ${model} temporary unavailable (503/timeout), retrying in 1.5s...`);
              await new Promise((r) => setTimeout(r, 1500));
              continue;
            }
            logger.warn(`[Orchestrator] ${model} attempt notice: ${e.message}`);
            break;
          }
        }
        if (response) break;
      }

      if (!response) {
        const errorMsg = `Gemini API service unavailable or rate-limited: ${lastErr?.message || 'Quota exceeded / timeout'}`;
        logger.error(`[Orchestrator] ${errorMsg}`);

        if (workflowId) {
          await supabase
            .from('workflows')
            .update({
              status: 'failed',
              result: {
                error: errorMsg,
                toolCallHistory,
                iterations,
                failed_at: new Date().toISOString(),
              },
              completed_at: new Date().toISOString(),
            })
            .eq('id', workflowId);
        }

        return {
          iterations,
          toolCallHistory,
          finalAnswer: null,
          completed: false,
          error: errorMsg,
        };
      }

      // Check if model called functions
      const functionCalls = response.functionCalls;

      if (!functionCalls || functionCalls.length === 0) {
        // No further tools called; model produced final response
        finalAnswer = response.text || 'Task completed.';
        break;
      }

      // Add model's exact candidate content to conversation history
      const modelContent = response.candidates?.[0]?.content;
      if (modelContent) {
        conversationContents.push(modelContent);
      } else {
        conversationContents.push({
          role: 'model',
          parts: functionCalls.map((fc) => ({
            functionCall: {
              name: fc.name,
              args: fc.args,
            },
          })),
        });
      }

      // Execute each function call safely
      const responseParts = [];
      for (const call of functionCalls) {
        logger.info(`[Orchestrator] Executing tool "${call.name}" with args:`, call.args);
        const execRes = await executeTool(call.name, call.args);

        toolCallHistory.push({
          iteration: iterations,
          tool: call.name,
          args: call.args,
          result: execRes,
        });

        // Record into database if workflowId provided
        if (workflowId) {
          await executeTool('recordAgentAction', {
            workflow_id: workflowId,
            tool_name: call.name,
            arguments: call.args || {},
            result: execRes.data || execRes,
            status: execRes.success ? 'success' : 'failed',
            error: execRes.error || null,
          });
        }

        responseParts.push({
          functionResponse: {
            name: call.name,
            response: { result: execRes.data || { error: execRes.error } },
          },
        });
      }

      // Feed tool execution results back to model
      conversationContents.push({
        role: 'user',
        parts: responseParts,
      });
    }

    return {
      iterations,
      toolCallHistory,
      finalAnswer,
      completed: !!finalAnswer,
    };
  }

  /**
   * Resume and execute sensitive action upon Human Administrator decision
   */
  static async handleAdminApproval({ approvalId, adminUserId, approved, rejectionReason = null }) {
    logger.info(`[Orchestrator] Processing admin approval ${approvalId}: approved=${approved}`);

    // 1. Fetch approval record
    const { data: approval, error: appErr } = await supabase
      .from('approvals')
      .select('*')
      .eq('id', approvalId)
      .single();

    if (appErr || !approval) {
      throw new Error(`Approval record not found: ${appErr?.message}`);
    }

    // 2. Prevent duplicate execution
    if (approval.status === 'executed' || approval.status === 'rejected') {
      const err = new Error(`Approval ${approvalId} has already been finalized with status "${approval.status}".`);
      err.statusCode = 409;
      throw err;
    }

    const now = new Date().toISOString();

    if (!approved) {
      // Admin rejected the sensitive operation
      await supabase
        .from('approvals')
        .update({
          status: 'rejected',
          decided_at: now,
          decided_by: adminUserId,
          reason: rejectionReason || 'Rejected by Administrator',
        })
        .eq('id', approvalId);

      // Update workflow status
      await supabase
        .from('workflows')
        .update({
          status: 'completed',
          result: {
            resolution: 'Operation cancelled: Administrator rejected sensitive action.',
            approval_status: 'rejected',
            reason: rejectionReason,
          },
          completed_at: now,
        })
        .eq('id', approval.workflow_id);

      return {
        approval_id: approvalId,
        status: 'rejected',
        message: 'Action rejected by administrator. Workflow concluded safely without execution.',
      };
    }

    // Admin APPROVED: Execute the approved simulated operation
    let executionResult = null;
    if (approval.action_type === 'refund') {
      const simTransferId = `SIM_TX_${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`;
      executionResult = {
        simulated: true,
        notice: 'DEMONSTRATION SIMULATED REFUND — NO REAL FUNDS WERE TRANSFERRED',
        transfer_id: simTransferId,
        amount: approval.details?.amount,
        order_id: approval.details?.order_id,
        processed_at: now,
      };

      // Update issue if associated
      await supabase
        .from('issues')
        .update({
          status: 'resolved',
          resolution: `Approved refund of $${approval.details?.amount} executed (${simTransferId}).`,
          updated_at: now,
        })
        .eq('order_id', approval.details?.order_id);
    }

    // 3. Update approval record to 'executed'
    await supabase
      .from('approvals')
      .update({
        status: 'executed',
        decided_at: now,
        decided_by: adminUserId,
        execution_result: executionResult,
      })
      .eq('id', approvalId);

    // 4. Update workflow status to 'completed'
    await supabase
      .from('workflows')
      .update({
        status: 'completed',
        completed_at: now,
      })
      .eq('id', approval.workflow_id);

    // 5. Record audit log
    await supabase.from('audit_logs').insert([
      {
        user_id: adminUserId,
        action: `admin_approved_${approval.action_type}`,
        entity_type: 'approvals',
        entity_id: approvalId,
        metadata: { executionResult, details: approval.details },
      },
    ]);

    return {
      approval_id: approvalId,
      approvalId,
      approved: true,
      status: 'executed',
      transferId: executionResult?.transfer_id,
      execution_result: executionResult,
      executionResult,
      message: 'Approved sensitive operation executed successfully and audited.',
    };
  }
}

export default AgentOrchestrator;
