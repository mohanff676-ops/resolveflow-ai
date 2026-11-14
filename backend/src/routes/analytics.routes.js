import express from 'express';
import analyticsController from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/overview', authenticate, analyticsController.getOverview);
router.get('/agents', authenticate, analyticsController.getAgentMetrics);

export default router;
