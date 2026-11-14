import express from 'express';
import authRoutes from './auth.routes.js';
import agentRoutes from './agent.routes.js';
import approvalsRoutes from './approvals.routes.js';
import issuesRoutes from './issues.routes.js';
import ordersRoutes from './orders.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import analyticsRoutes from './analytics.routes.js';
import ticketRoutes from './ticket.routes.js';

const router = express.Router();

// Health Check Endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    service: 'ResolveFlow AI Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount modular sub-routers
router.use('/auth', authRoutes);
router.use('/agent', agentRoutes);
router.use('/approvals', approvalsRoutes);
router.use('/issues', issuesRoutes);
router.use('/orders', ordersRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/tickets', ticketRoutes);

export default router;
