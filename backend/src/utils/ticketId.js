import crypto from 'crypto';

/**
 * Generate a customer-friendly, non-sequential unique ticket identifier
 * Format: RF-YYYY-XXXXX (e.g. RF-2026-A7K92)
 * Uses unambiguous alphanumeric characters (omits 0, O, 1, I, L)
 */
export function generateTicketId(year = new Date().getFullYear()) {
  const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const bytes = crypto.randomBytes(5);
  let randomPart = '';
  for (let i = 0; i < 5; i++) {
    randomPart += chars[bytes[i] % chars.length];
  }
  return `RF-${year}-${randomPart}`;
}

export default { generateTicketId };
