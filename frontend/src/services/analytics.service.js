import api from './api.js';

export const analyticsService = {
  // Get overview KPI analytics
  async getOverview() {
    const response = await api.get('/analytics/overview');
    return response.data;
  },

  // Get agent role breakdown metrics
  async getAgentMetrics() {
    const response = await api.get('/analytics/agents');
    return response.data;
  },
};

export default analyticsService;
