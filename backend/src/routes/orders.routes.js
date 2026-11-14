import express from 'express';
import ordersController from '../controllers/orders.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, ordersController.getOrders);
router.get('/:id', authenticate, ordersController.getOrderById);

export default router;
