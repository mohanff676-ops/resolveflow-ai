import express from 'express';
import issuesController from '../controllers/issues.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createIssueSchema, updateIssueSchema } from '../validators/issues.validator.js';

const router = express.Router();

router.get('/', authenticate, issuesController.getIssues);
router.get('/:id', authenticate, issuesController.getIssueById);
router.post('/', authenticate, validate(createIssueSchema), issuesController.createIssue);
router.patch('/:id', authenticate, validate(updateIssueSchema), issuesController.updateIssue);

export default router;
