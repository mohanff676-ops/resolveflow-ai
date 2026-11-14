import express from 'express';
import approvalsController from '../controllers/approvals.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { approvalDecisionSchema } from '../validators/agent.validator.js';

const router = express.Router();

// List approval requests (Authenticated operators & admins)
router.get('/', authenticate, approvalsController.getApprovals);

// Approve a sensitive operation (Requires 'admin' role)
router.post(
  '/:id/approve',
  authenticate,
  authorize('admin'),
  validate(approvalDecisionSchema),
  approvalsController.approveAction
);

// Reject a sensitive operation (Requires 'admin' role)
router.post(
  '/:id/reject',
  authenticate,
  authorize('admin'),
  validate(approvalDecisionSchema),
  approvalsController.rejectAction
);

export default router;
