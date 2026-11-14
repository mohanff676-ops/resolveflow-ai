import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';
import { error } from '../utils/response.js';

export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'Authorization token required', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Token has expired', 401);
    }
    return error(res, 'Invalid authorization token', 401);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Unauthorized', 401);
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return error(res, 'Forbidden: Insufficient permissions', 403);
    }

    next();
  };
};

export default { authenticate, authorize };
