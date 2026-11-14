import { z } from 'zod';

export const TICKET_CATEGORIES = [
  'E-commerce',
  'Customer Support',
  'Warehouse and Inventory',
  'Business Operations',
  'Other',
];

export const createTicketSchema = z.object({
  customer_name: z
    .string()
    .trim()
    .min(2, 'Customer name must be at least 2 characters')
    .max(100, 'Customer name cannot exceed 100 characters'),
  customer_email: z
    .string()
    .trim()
    .email('Please provide a valid email address')
    .toLowerCase(),
  order_id: z.string().trim().optional().nullable(),
  category: z.enum(TICKET_CATEGORIES, {
    errorMap: () => ({ message: 'Please select a valid business category' }),
  }),
  description: z
    .string()
    .trim()
    .min(5, 'Problem description must be at least 5 characters')
    .max(5000, 'Problem description cannot exceed 5000 characters'),
});

export const trackTicketSchema = z.object({
  ticketId: z.string().trim().min(5, 'Invalid ticket ID format'),
  email: z
    .string()
    .trim()
    .email('Please provide a valid customer email')
    .toLowerCase(),
});

export default {
  TICKET_CATEGORIES,
  createTicketSchema,
  trackTicketSchema,
};
