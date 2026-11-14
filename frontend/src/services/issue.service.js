import api from './api.js';

export const issueService = {
  // Get paginated issues with filters
  async getIssues({ page = 1, limit = 10, status = '', priority = '', type = '', search = '' } = {}) {
    const params = { page, limit };
    if (status) params.status = status;
    if (priority) params.priority = priority;
    if (type) params.type = type;
    if (search) params.search = search;
    const response = await api.get('/issues', { params });
    return response.data;
  },

  // Get issue by ID with customer, order, and workflows
  async getIssueById(id) {
    const response = await api.get(`/issues/${id}`);
    return response.data;
  },

  // Create new issue ticket
  async createIssue(issueData) {
    const response = await api.post('/issues', issueData);
    return response.data;
  },

  // Update issue status / priority / resolution
  async updateIssue(id, updateData) {
    const response = await api.patch(`/issues/${id}`, updateData);
    return response.data;
  },
};

export default issueService;
