import express from 'express';
import dashboardController from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', authenticate, dashboardController.getStats);
router.get('/activity', authenticate, dashboardController.getActivity);

export default router;
