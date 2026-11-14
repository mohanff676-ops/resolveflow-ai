import { error } from '../utils/response.js';

export const validate = (schema) => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (err) {
      if (err.errors && Array.isArray(err.errors)) {
        const message = err.errors
          .map((e) => (e.path.length > 0 ? `${e.path.join('.')}: ${e.message}` : e.message))
          .join(', ');
        return error(res, `Validation failed: ${message}`, 400);
      }
      return error(res, err.message || 'Validation error', 400);
    }
  };
};

export default { validate };
