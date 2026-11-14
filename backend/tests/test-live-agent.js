import { runIntakeAgent } from '../src/agents/roles/intake.agent.js';
import { runDecisionAgent } from '../src/agents/roles/decision.agent.js';
import { runInvestigationAgent } from '../src/agents/roles/investigation.agent.js';
import { AgentOrchestrator } from '../src/agents/orchestrator.js';
import { GEMINI_MODEL } from '../src/config/env.js';

async function testLiveGeminiAgents() {
  console.log('\n============================================================');
  console.log(`    TESTING LIVE AGENT EXECUTION WITH ${GEMINI_MODEL}     `);
  console.log('============================================================\n');

  try {
    // 1. Test Intake Agent Live
    console.log('1. Testing Live Intake Agent with gemini-3.5-flash...');
    const message = 'My order ORD-1003 has not arrived. It was supposed to arrive 3 days ago. Please investigate or refund.';
    const intakeResult = await runIntakeAgent(message);
    console.log('Intake Agent Result:', JSON.stringify(intakeResult, null, 2));

    if (!intakeResult.success || intakeResult.data.order_id !== 'ORD-1003') {
      throw new Error('Intake Agent failed to extract order_id ORD-1003');
    }
    console.log('✅ Intake Agent passed with live model.\n');

    // 2. Test Investigation Agent
    console.log('2. Running Investigation Agent for findings...');
    const investigationResult = await runInvestigationAgent(intakeResult.data);
    console.log('Investigation Findings for ORD-1003: order status:', investigationResult.findings.order?.status);
    console.log('✅ Investigation Agent passed.\n');

    // 3. Test Decision Agent Live
    console.log('3. Testing Live Decision Agent with gemini-3.5-flash...');
    const decisionResult = await runDecisionAgent(investigationResult.findings, intakeResult.data);
    console.log('Decision Agent Decision:', JSON.stringify(decisionResult.decision, null, 2));

    if (!decisionResult.success || !decisionResult.decision) {
      throw new Error('Decision Agent failed to return a valid decision');
    }
    console.log('✅ Decision Agent passed with live model.\n');

    console.log('============================================================');
    console.log('🎉 LIVE AGENT EXECUTION CONFIRMED WORKING WITH GEMINI MODEL!');
    console.log('============================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Live Agent Execution Test failed:', err.message);
    process.exit(1);
  }
}

testLiveGeminiAgents();
