import express from 'express';
import authController from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { success } from '../utils/response.js';

const router = express.Router();

// Registration endpoint with rate limiting & schema validation
router.post('/register', authLimiter, validate(registerSchema), authController.register);

// Login endpoint with rate limiting & schema validation
router.post('/login', authLimiter, validate(loginSchema), authController.login);

// Current user profile (Protected route requiring valid JWT)
router.get('/me', authenticate, authController.getMe);

// Role-based authorization test endpoint (Requires 'admin' role)
router.get('/admin-only', authenticate, authorize('admin'), (req, res) => {
  return success(res, {
    message: 'Welcome Admin. You have access to administrative controls.',
    user: req.user,
  });
});

export default router;
