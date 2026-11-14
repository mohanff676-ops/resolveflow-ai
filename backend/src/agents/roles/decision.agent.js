import { GoogleGenAI } from '@google/genai';
import { supabase } from '../../config/database.js';
import { GEMINI_API_KEY, GEMINI_MODEL } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * DECISION AGENT
 * Evaluates verified investigation findings against active business policies.
 * Generates an auditable execution plan and determines whether human authorization is required.
 */
export async function runDecisionAgent(investigationFindings, intakeData) {
  logger.info('[Decision Agent] Evaluating business policies and computing resolution...');

  // 1. Fetch active business policies
  const { data: policiesData } = await supabase
    .from('business_policies')
    .select('policy_key, policy_value, description')
    .eq('is_active', true);

  const policiesMap = (policiesData || []).reduce((acc, p) => ({ ...acc, [p.policy_key]: p.policy_value }), {});

  const order = investigationFindings.order;
  const delivery = investigationFindings.delivery;
  const payment = investigationFindings.payment;

  const prompt = `
You are the Decision Agent of ResolveFlow AI.
Evaluate the investigation results against company business policies to formulate an actionable resolution plan.

INVESTIGATION DOSSIER:
- Order Number: ${order?.order_number}
- Customer: ${order?.customer?.name} (${order?.customer?.email})
- Order Total: $${order?.total_amount}
- Order Status: ${order?.status}
- Expected Delivery: ${order?.expected_delivery}
- Actual Delivery: ${order?.actual_delivery || 'NOT_DELIVERED'}
- Is Delayed: ${delivery?.is_delayed} (${delivery?.delay_days} days overdue)
- Carrier Status: ${delivery?.notes}
- Payment Status: ${payment?.payment_status} ($${payment?.amount_paid} paid)
- Previous Complaints Count: ${investigationFindings.previous_complaints?.count || 0}

BUSINESS POLICIES IN EFFECT:
${JSON.stringify(policiesMap, null, 2)}

POLICY RULES:
1. Delivery SLA: Orders delayed by >= 2 days require immediate carrier escalation.
2. Refund Policy: If delivery delay is >= 3 days, customer is entitled to request a full or partial refund.
3. Financial Threshold: Any refund request exceeding $50.00 REQUIRES human administrator approval. System CANNOT auto-execute refunds above $50.
4. Compensation Policy: 10% goodwill discount or credit can be offered.

Instructions:
1. State which policies apply.
2. Choose resolution: Carrier Escalation + Refund Request.
3. Determine if admin approval is required (Order total is $${order?.total_amount}, which is ${Number(order?.total_amount) > 50 ? 'GREATER than $50 threshold -> MUST REQUIRE ADMIN APPROVAL' : 'under $50'}).
4. Generate a concise, customer-safe reasoning summary explaining why this resolution was chosen.
5. Create a sequence of executable tool actions.

Respond STRICTLY with a valid JSON object in this format (no markdown, no code fences):
{
  "applicable_policies": ["delivery_sla", "refund_policy", "escalation_policy"],
  "recommended_resolution": "Escalate carrier shipment and file full refund request pending admin approval",
  "requires_admin_approval": true,
  "sensitive_actions": ["refund"],
  "reasoning_summary": "Order ORD-1003 is 3 days past SLA at the central transit hub. Per Delivery SLA, a priority carrier escalation is created. Because delay is >= 3 days, a refund of $239.98 is initiated; since amount exceeds the $50 auto-refund threshold, administrator approval is requested before execution.",
  "execution_plan": [
    {
      "step": 1,
      "agent": "execution",
      "tool": "createDeliveryEscalation",
      "arguments": {
        "order_id": "${order?.order_number}",
        "reason": "Shipment stalled at regional hub 3 days past expected delivery",
        "priority": "high"
      }
    },
    {
      "step": 2,
      "agent": "execution",
      "tool": "createRefundRequest",
      "arguments": {
        "order_id": "${order?.order_number}",
        "amount": ${Number(order?.total_amount) || 0},
        "reason": "Customer requested resolution for order delayed 3 days past delivery SLA"
      }
    },
    {
      "step": 3,
      "agent": "execution",
      "tool": "updateIssueStatus",
      "arguments": {
        "issueId": "ISS-1001",
        "status": "awaiting_approval",
        "resolution": "Carrier escalated and refund of $${order?.total_amount} submitted for admin approval"
      }
    }
  ]
}
`;

  try {
    const primaryModel = GEMINI_MODEL || 'gemini-3.5-flash';
    const candidateModels = [primaryModel];
    let text = null;

    for (const model of candidateModels) {
      // Retry transient errors (503 high demand, temporary network spikes) up to 2 times
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              abortSignal: AbortSignal.timeout(25000),
            },
          });
          text = response?.text;
          if (text) break;
        } catch (err) {
          const isTransient =
            err?.status === 503 ||
            err?.message?.includes('503') ||
            err?.message?.includes('high demand') ||
            err?.message?.includes('UNAVAILABLE') ||
            err?.message?.includes('aborted');

          if (isTransient && attempt === 1) {
            logger.warn(`[Decision Agent] ${model} temporary unavailable (503/timeout), retrying in 1.5s...`);
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          logger.warn(`[Decision Agent] ${model} attempt notice: ${err.message}`);
          break;
        }
      }
      if (text) break;
    }

    if (!text) {
      return {
        success: true,
        decision: fallbackDecision(order, delivery, policiesMap),
      };
    }

    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      success: true,
      decision: parsed,
    };
  } catch (err) {
    logger.error('[Decision Agent] Gemini parsing failed, using deterministic policy evaluation:', err.message);
    return {
      success: true,
      decision: fallbackDecision(order, delivery, policiesMap),
    };
  }
}

function fallbackDecision(order, delivery, policies) {
  const isDelayed = delivery?.is_delayed;
  const delayDays = delivery?.delay_days || 0;
  const totalAmount = Number(order?.total_amount) || 0;
  const refundThreshold = Number(policies?.refund_threshold_amount) || 50;

  const requiresApproval = totalAmount > refundThreshold;

  const plan = [];

  // Step 1: Delivery escalation if delayed >= 2 days
  if (delayDays >= 2) {
    plan.push({
      step: 1,
      agent: 'execution',
      tool: 'createDeliveryEscalation',
      arguments: {
        order_id: order?.order_number,
        reason: `Automated escalation: Delivery SLA breached by ${delayDays} days.`,
        priority: delayDays >= 3 ? 'high' : 'medium',
      },
    });
  }

  // Step 2: Refund request if delayed >= 3 days
  if (delayDays >= 3) {
    plan.push({
      step: plan.length + 1,
      agent: 'execution',
      tool: 'createRefundRequest',
      arguments: {
        order_id: order?.order_number,
        amount: totalAmount,
        reason: `Customer compensation: 3+ days overdue past guaranteed delivery SLA.`,
      },
    });
  }

  // Step 3: Update issue status
  plan.push({
    step: plan.length + 1,
    agent: 'execution',
    tool: 'updateIssueStatus',
    arguments: {
      issueId: 'ISS-1001',
      status: requiresApproval ? 'awaiting_approval' : 'resolved',
      resolution: `Actions dispatched: ${plan.map((p) => p.tool).join(', ')}.`,
    },
  });

  return {
    applicable_policies: ['delivery_sla', 'refund_policy', 'approval_threshold'],
    recommended_resolution: requiresApproval
      ? 'Priority carrier escalation dispatched. Refund request submitted for human admin authorization.'
      : 'Carrier escalation dispatched and automated resolution executed.',
    requires_admin_approval: requiresApproval,
    sensitive_actions: requiresApproval ? ['refund'] : [],
    reasoning_summary: `Order ${order?.order_number} is ${delayDays} days delayed. Under delivery SLA policy, a carrier escalation was created. Under refund policy, a refund of $${totalAmount.toFixed(2)} was generated. Because the amount ${requiresApproval ? `exceeds the $${refundThreshold} threshold` : `is within limits`}, ${requiresApproval ? 'administrator approval is required before funds can be disbursed' : 'it was processed automatically'}.`,
    execution_plan: plan,
  };
}

export default { runDecisionAgent };
