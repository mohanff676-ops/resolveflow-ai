import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Search,
  Filter,
  Plus,
  Sparkles,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { issueService } from '../services/issue.service.js';
import Card from '../components/common/Card.jsx';
import Badge from '../components/common/Badge.jsx';
import Button from '../components/common/Button.jsx';
import Spinner from '../components/common/Spinner.jsx';
import Modal from '../components/common/Modal.jsx';
import EmptyState from '../components/common/EmptyState.jsx';

export const Issues = () => {
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newIssue, setNewIssue] = useState({
    title: '',
    description: '',
    type: 'general_inquiry',
    priority: 'medium',
  });
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const res = await issueService.getIssues({
        search: searchTerm,
        status: statusFilter,
        priority: priorityFilter,
      });
      if (res.success) {
        setIssues(res.data);
      }
    } catch (err) {
      console.error('Failed to load issues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [statusFilter, priorityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchIssues();
  };

  const handleOpenDetail = async (issue) => {
    setSelectedIssue(issue);
    setIsDetailModalOpen(true);
    try {
      const res = await issueService.getIssueById(issue.id);
      if (res.success) {
        setSelectedIssue(res.data);
      }
    } catch (err) {
      console.error('Failed to load issue details:', err);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedIssue) return;
    setStatusUpdating(true);
    try {
      const res = await issueService.updateIssue(selectedIssue.id, {
        status: newStatus,
        resolution: newStatus === 'resolved' ? 'Manually resolved by operator' : selectedIssue.resolution,
      });
      if (res.success) {
        setSelectedIssue((prev) => ({ ...prev, ...res.data }));
        fetchIssues();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleCreateIssue = async (e) => {
    e.preventDefault();
    if (!newIssue.title || !newIssue.description) return;
    setSubmitting(true);
    try {
      const res = await issueService.createIssue(newIssue);
      if (res.success) {
        setIsCreateModalOpen(false);
        setNewIssue({ title: '', description: '', type: 'general_inquiry', priority: 'medium' });
        fetchIssues();
      }
    } catch (err) {
      console.error('Failed to create issue:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-indigo-600" />
              Support Issues
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Track customer complaints, delivery discrepancies, and support tickets.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="md"
              icon={RefreshCw}
              onClick={fetchIssues}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => setIsCreateModalOpen(true)}
            >
              + Create Support Ticket
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ticket #, title, or keywords..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </form>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-xs text-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:bg-white focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="in_progress">In Progress</option>
              <option value="awaiting_approval">Awaiting Approval</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="escalated">Escalated</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-xs text-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:bg-white focus:border-indigo-500"
            >
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Issues Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center">
            <Spinner size="md" />
          </div>
        ) : issues.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Ticket #</th>
                  <th className="py-3 px-4">Issue Title</th>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {issues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                      {issue.issue_number}
                    </td>
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="font-semibold text-slate-900">{issue.title}</div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">{issue.description}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700 font-medium">
                      {issue.order?.order_number || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={issue.priority} size="xs" />
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={issue.status} size="xs" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {issue.customer?.name || (issue.order?.order_number ? `Order ${issue.order.order_number}` : 'Guest Customer')}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Eye}
                        onClick={() => handleOpenDetail(issue)}
                      >
                        Details
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Sparkles}
                        onClick={() => navigate('/command-center')}
                      >
                        Resolve with AI
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8">
            <EmptyState
              icon={AlertCircle}
              title="No issues found"
              description="No support issues matched your filter criteria."
              actionLabel="+ Create Support Ticket"
              onAction={() => setIsCreateModalOpen(true)}
            />
          </div>
        )}
      </div>

      {/* Issue Detail Modal */}
      {selectedIssue && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Ticket ${selectedIssue.issue_number}`}
          subtitle={`Logged on ${new Date(selectedIssue.created_at).toLocaleString()}`}
        >
          <div className="space-y-5">
            <div>
              <h4 className="text-base font-bold text-slate-900">{selectedIssue.title}</h4>
              <p className="text-xs text-slate-700 mt-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                {selectedIssue.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-medium block mb-1">Status</span>
                <Badge status={selectedIssue.status} size="sm" />
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-medium block mb-1">Priority</span>
                <Badge status={selectedIssue.priority} size="sm" />
              </div>
            </div>

            {selectedIssue.resolution && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                <strong className="text-emerald-900 block mb-1 font-semibold">Resolution Summary:</strong>
                <p className="text-emerald-800">{selectedIssue.resolution}</p>
              </div>
            )}

            {/* Change Status Action */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 font-medium">Update Status:</span>
                <select
                  disabled={statusUpdating}
                  value={selectedIssue.status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-xs text-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                >
                  <option value="open">Open</option>
                  <option value="investigating">Investigating</option>
                  <option value="in_progress">In Progress</option>
                  <option value="awaiting_approval">Awaiting Approval</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                  <option value="escalated">Escalated</option>
                </select>
              </div>

              <Button
                variant="primary"
                size="sm"
                icon={Sparkles}
                onClick={() => {
                  setIsDetailModalOpen(false);
                  navigate('/command-center');
                }}
              >
                Investigate with AI
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Issue Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Support Ticket"
        subtitle="Manually file a customer complaint or operational incident"
      >
        <form onSubmit={handleCreateIssue} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Issue Title</label>
            <input
              type="text"
              required
              value={newIssue.title}
              onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
              placeholder="e.g., Late Delivery Report for ORD-1003"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Description</label>
            <textarea
              required
              rows={3}
              value={newIssue.description}
              onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
              placeholder="Detail the customer's problem or request..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Category Type</label>
              <select
                value={newIssue.type}
                onChange={(e) => setNewIssue({ ...newIssue, type: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800"
              >
                <option value="delayed_delivery">Delayed Delivery</option>
                <option value="missing_item">Missing Item</option>
                <option value="wrong_item">Wrong Item</option>
                <option value="damaged_item">Damaged Item</option>
                <option value="refund_request">Refund Request</option>
                <option value="general_inquiry">General Inquiry</option>
                <option value="payment_issue">Payment Issue</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Priority</label>
              <select
                value={newIssue.priority}
                onChange={(e) => setNewIssue({ ...newIssue, priority: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={submitting}>
              Save Support Ticket
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Issues;
