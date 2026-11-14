import { error } from '../utils/response.js';

export const validate = (schema) => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (err) {
      const issues = err.issues || err.errors;
      if (issues && Array.isArray(issues)) {
        const message = issues
          .map((e) => (e.path && e.path.length > 0 ? `${e.path.join('.')}: ${e.message}` : e.message))
          .join(', ');
        return error(res, `Validation failed: ${message}`, 400);
      }
      return error(res, err.message || 'Validation error', 400);
    }
  };
};

export default { validate };
