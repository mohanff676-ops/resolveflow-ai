import api from './api.js';

export const approvalService = {
  // Get pending or all approvals
  async getApprovals(page = 1, limit = 10, status = '') {
    const params = { page, limit };
    if (status) params.status = status;
    const response = await api.get('/approvals', { params });
    return response.data;
  },

  // Approve sensitive action (Admin role)
  async approveAction(id) {
    const response = await api.post(`/approvals/${id}/approve`, {});
    return response.data;
  },

  // Reject sensitive action (Admin role)
  async rejectAction(id, reason = 'Rejected by Administrator') {
    const response = await api.post(`/approvals/${id}/reject`, { reason });
    return response.data;
  },
};

export default approvalService;
