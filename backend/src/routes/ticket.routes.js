import express from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';
import * as ticketController from '../controllers/ticket.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { ticketLimiter } from '../middleware/rateLimiter.js';
import { createTicketSchema } from '../validators/ticket.validator.js';

const router = express.Router();

// Optional auth helper: attaches req.user if a valid token is provided
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch {
      // Continue without user on public submission
    }
  }
  next();
};

// 1. POST /api/tickets - Create a new support ticket (Public or authenticated)
router.post(
  '/',
  ticketLimiter,
  optionalAuth,
  validate(createTicketSchema),
  ticketController.createTicket
);

// 2. GET /api/tickets - View all tickets (Authenticated for employees & admins)
router.get(
  '/',
  authenticate,
  ticketController.getAllTickets
);

// 3. GET /api/tickets/:ticketId - Customer lookup with email ownership verification (Public)
router.get(
  '/:ticketId',
  ticketLimiter,
  ticketController.getTicket
);

// 4. GET /api/tickets/:ticketId/progress - Customer 7-step progress timeline (Public)
router.get(
  '/:ticketId/progress',
  ticketLimiter,
  ticketController.getTicketProgress
);

export default router;
