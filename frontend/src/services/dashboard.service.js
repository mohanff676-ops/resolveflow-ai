import api from './api.js';

export const dashboardService = {
  // Get aggregated dashboard statistics
  async getStats() {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  // Get recent activity stream (actions, workflows, audit logs)
  async getActivity() {
    const response = await api.get('/dashboard/activity');
    return response.data;
  },
};

export default dashboardService;
