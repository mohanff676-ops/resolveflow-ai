import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY, GEMINI_MODEL } from '../../config/env.js';
import { ISSUE_TYPES, ISSUE_PRIORITIES } from '../../config/constants.js';
import { logger } from '../../utils/logger.js';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * INTAKE AGENT
 * Understands incoming request, extracts entities (order IDs, customer identifiers),
 * classifies issue category, determines urgency, and flags missing information.
 */
export async function runIntakeAgent(triggerMessage, context = {}) {
  logger.info('[Intake Agent] Analyzing business issue...');

  const prompt = `
You are the Intake Agent of ResolveFlow AI, an autonomous business operations platform.
Analyze the following customer/business issue message and extract structured intelligence.

Message:
"${triggerMessage}"

Available Issue Types: ${JSON.stringify(ISSUE_TYPES)}
Available Priorities: ${JSON.stringify(ISSUE_PRIORITIES)}

Instructions:
1. Extract any Order ID (e.g. ORD-1003, ORD-1001) or null if not provided.
2. Extract Customer Name, Email, or Customer ID if mentioned, or null.
3. Classify into the most appropriate Issue Type.
4. Determine Priority (low, medium, high, critical). A delay of 3+ days is high priority.
5. Identify if critical information is missing to resolve the issue.
6. Provide a concise summary of the complaint.

Respond STRICTLY with a valid JSON object in this format (no markdown, no code fences):
{
  "order_id": "ORD-1003" or null,
  "customer_identifier": "Emily Davis" or null,
  "issue_type": "delayed_delivery",
  "priority": "high",
  "missing_information": [],
  "urgency_rationale": "Order is 3 days past scheduled delivery date.",
  "summary": "Customer reports order ORD-1003 has not arrived 3 days past SLA and requests investigation or refund."
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
            logger.warn(`[Intake Agent] ${model} temporary unavailable (503/timeout), retrying in 1.5s...`);
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          logger.warn(`[Intake Agent] ${model} attempt notice: ${err.message}`);
          break;
        }
      }
      if (text) break;
    }

    if (!text) {
      // Heuristic fallback if AI service temporary unavailable or rate limited
      return {
        success: true,
        data: fallbackIntake(triggerMessage),
      };
    }

    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      success: true,
      data: {
        order_id: parsed.order_id || extractOrderRegex(triggerMessage),
        customer_identifier: parsed.customer_identifier || null,
        issue_type: parsed.issue_type || 'delayed_delivery',
        priority: parsed.priority || 'high',
        missing_information: parsed.missing_information || [],
        urgency_rationale: parsed.urgency_rationale || 'Determined by customer message',
        summary: parsed.summary || triggerMessage,
      },
    };
  } catch (err) {
    logger.error('[Intake Agent] Parsing failed, falling back to rule-based intake:', err.message);
    return {
      success: true,
      data: fallbackIntake(triggerMessage),
    };
  }
}

function extractOrderRegex(text) {
  const match = text.match(/ORD-\d{4}/i);
  return match ? match[0].toUpperCase() : null;
}

function fallbackIntake(message) {
  const orderId = extractOrderRegex(message);
  const isDelayed = /late|delay|not arrived|overdue|days ago/i.test(message);
  const isRefund = /refund|money back|return/i.test(message);

  return {
    order_id: orderId,
    customer_identifier: null,
    issue_type: isDelayed ? 'delayed_delivery' : isRefund ? 'refund_request' : 'general_inquiry',
    priority: isDelayed ? 'high' : 'medium',
    missing_information: orderId ? [] : ['order_id'],
    urgency_rationale: 'Derived from natural language pattern keywords',
    summary: message,
  };
}

export default { runIntakeAgent };
