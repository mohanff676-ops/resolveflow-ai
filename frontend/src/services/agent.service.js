import api from './api.js';

export const agentService = {
  // Run autonomous 6-agent workflow
  async runWorkflow(message, issueId = null, mode = 'standard') {
    const payload = { message };
    if (issueId) payload.issue_id = issueId;
    if (mode === 'interactive') payload.mode = 'interactive';
    const response = await api.post('/agent/run', payload);
    return response.data;
  },

  // List all workflows with pagination and optional status filter
  async getWorkflows(page = 1, limit = 10, status = '') {
    const params = { page, limit };
    if (status) params.status = status;
    const response = await api.get('/agent/workflows', { params });
    return response.data;
  },

  // Get full workflow details with tasks, actions, and approvals
  async getWorkflowById(id) {
    const response = await api.get(`/agent/workflows/${id}`);
    return response.data;
  },

  // Get fine-grained tool action logs for a workflow
  async getWorkflowActions(id) {
    const response = await api.get(`/agent/workflows/${id}/actions`);
    return response.data;
  },
};

export default agentService;
