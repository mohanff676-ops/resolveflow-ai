import express from 'express';
import agentController from '../controllers/agent.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { agentLimiter } from '../middleware/rateLimiter.js';
import { runAgentSchema } from '../validators/agent.validator.js';

const router = express.Router();

// Trigger autonomous agent workflow
router.post('/run', authenticate, agentLimiter, validate(runAgentSchema), agentController.runAgent);

// Retrieve paginated list of workflows
router.get('/workflows', authenticate, agentController.getWorkflows);

// Retrieve full workflow timeline and details by ID
router.get('/workflows/:id', authenticate, agentController.getWorkflowById);

// Retrieve granular action logs for a workflow
router.get('/workflows/:id/actions', authenticate, agentController.getWorkflowActions);

export default router;
