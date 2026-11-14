import { executeTool } from '../../tools/index.js';
import { logger } from '../../utils/logger.js';

/**
 * INVESTIGATION AGENT
 * Retrieves ground-truth facts from database tools:
 * - Order details & line items
 * - Customer contact & delivery address
 * - Payment confirmation & method
 * - Delivery status & carrier location
 * - Customer prior complaint history
 * Returns a verified, structured findings dossier.
 */
export async function runInvestigationAgent(intakeData, onToolExecuted = null) {
  logger.info('[Investigation Agent] Starting database investigation...');
  const findings = {
    order_id_queried: intakeData.order_id,
    order: null,
    customer: null,
    payment: null,
    delivery: null,
    previous_complaints: null,
    discrepancies: [],
    verified: false,
  };

  const record = async (toolName, args, result) => {
    if (onToolExecuted) {
      await onToolExecuted(toolName, args, result);
    }
  };

  if (!intakeData.order_id) {
    findings.discrepancies.push('Cannot investigate order details without order_id');
    return { success: false, error: 'Missing order_id for investigation', findings };
  }

  // 1. Get Order Details
  const orderRes = await executeTool('getOrderDetails', { orderId: intakeData.order_id });
  await record('getOrderDetails', { orderId: intakeData.order_id }, orderRes);

  if (!orderRes.success || !orderRes.data?.found) {
    findings.discrepancies.push(`Order ${intakeData.order_id} not found in database`);
    return { success: false, error: `Order ${intakeData.order_id} not found`, findings };
  }
  findings.order = orderRes.data.order;

  // 2. Get Delivery Status
  const deliveryRes = await executeTool('getDeliveryStatus', { orderId: intakeData.order_id });
  await record('getDeliveryStatus', { orderId: intakeData.order_id }, deliveryRes);
  if (deliveryRes.success) {
    findings.delivery = deliveryRes.data;
  }

  // 3. Get Payment Status
  const paymentRes = await executeTool('getPaymentStatus', { orderId: intakeData.order_id });
  await record('getPaymentStatus', { orderId: intakeData.order_id }, paymentRes);
  if (paymentRes.success) {
    findings.payment = paymentRes.data;
  }

  // 4. Get Customer Details (if order had customer_id)
  if (findings.order.customer?.id) {
    const custRes = await executeTool('getCustomerDetails', { customerId: findings.order.customer.id });
    await record('getCustomerDetails', { customerId: findings.order.customer.id }, custRes);
    if (custRes.success && custRes.data.found) {
      findings.customer = custRes.data.customer;
    }

    // 5. Get Previous Complaints
    const compRes = await executeTool('getPreviousComplaints', { customerId: findings.order.customer.id });
    await record('getPreviousComplaints', { customerId: findings.order.customer.id }, compRes);
    if (compRes.success) {
      findings.previous_complaints = compRes.data;
    }
  }

  // Evaluate SLA delay verification
  if (findings.delivery?.is_delayed) {
    findings.discrepancies.push(
      `Order is confirmed delayed by ${findings.delivery.delay_days} days. Carrier status: ${findings.delivery.last_known_location}`
    );
  }

  findings.verified = true;
  logger.info(`[Investigation Agent] Completed. Order ${findings.order.order_number} verified with ${findings.order.items.length} items.`);

  return {
    success: true,
    findings,
  };
}

export default { runInvestigationAgent };
