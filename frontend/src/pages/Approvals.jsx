import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Check,
  X,
  AlertTriangle,
  Lock,
  RefreshCw,
  Clock,
  DollarSign,
} from 'lucide-react';
import { approvalService } from '../services/approval.service.js';
import { useAuth } from '../context/AuthContext.jsx';
import Card from '../components/common/Card.jsx';
import Badge from '../components/common/Badge.jsx';
import Button from '../components/common/Button.jsx';
import Spinner from '../components/common/Spinner.jsx';
import Modal from '../components/common/Modal.jsx';
import EmptyState from '../components/common/EmptyState.jsx';

export const Approvals = () => {
  const { user, isAdmin } = useAuth();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: '', id: null, amount: 0 });
  const [rejectReason, setRejectReason] = useState('Rejected per management policy');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const res = await approvalService.getApprovals(1, 50, activeTab === 'pending' ? 'pending' : '');
      if (res.success) {
        if (activeTab === 'pending') {
          setApprovals(res.data.filter((a) => a.status === 'pending'));
        } else {
          setApprovals(res.data.filter((a) => a.status !== 'pending'));
        }
      }
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [activeTab]);

  const handleDecision = async () => {
    if (!confirmModal.id) return;
    setSubmitting(true);
    setFeedbackMsg('');
    try {
      if (confirmModal.type === 'approve') {
        const res = await approvalService.approveAction(confirmModal.id);
        if (res.success) {
          setFeedbackMsg(`Successfully approved refund of $${Number(confirmModal.amount).toFixed(2)}. Transfer ID: ${res.data?.transferId || 'TXN-SUCCESS'}`);
        }
      } else {
        const res = await approvalService.rejectAction(confirmModal.id, rejectReason);
        if (res.success) {
          setFeedbackMsg('Proposed operation was rejected.');
        }
      }
      setConfirmModal({ isOpen: false, type: '', id: null, amount: 0 });
      fetchApprovals();
    } catch (err) {
      setFeedbackMsg(`Action could not be completed: ${err.response?.data?.message || err.message}`);
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
              <ShieldCheck className="w-6 h-6 text-indigo-600" />
              Approvals
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Review and authorize sensitive actions, refunds, and financial adjustments flagged by AI agents.
            </p>
          </div>

          <Button
            variant="secondary"
            size="md"
            icon={RefreshCw}
            onClick={fetchApprovals}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Role Notice (if not admin) */}
      {!isAdmin && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
          <Lock className="w-4 h-4 shrink-0 text-amber-600" />
          <div>
            <strong>Operator Mode (View Only):</strong> You are signed in as an <em>Operator</em>. Only accounts with the <strong>Admin</strong> role can approve or reject financial payouts.
          </div>
        </div>
      )}

      {feedbackMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          {feedbackMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'pending'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Pending Approvals
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Approval History
        </button>
      </div>

      {/* Approvals Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center">
            <Spinner size="md" />
          </div>
        ) : approvals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Action Requested</th>
                  <th className="py-3 px-4">Reason & Policy</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Requested Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {approvals.map((appr) => {
                  const details = appr.details || {};
                  const amount = Number(details.amount || 239.98).toFixed(2);
                  return (
                    <tr key={appr.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 capitalize">
                          {appr.action_type?.replace(/_/g, ' ')}
                        </div>
                        <div className="font-mono text-[11px] text-indigo-600 font-medium">
                          Order: {details.order_number || details.orderId || 'ORD-1003'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-sm text-slate-700">
                        <div>{details.reason || '3-day delivery delay compensation.'}</div>
                        <div className="text-[11px] text-amber-700 font-medium mt-0.5">
                          Policy rule: Refund exceeds $50.00 auto limit
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-sm">
                        ${amount}
                        <span className="text-[10px] text-slate-400 block font-normal font-sans">(Simulated)</span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(appr.requested_at).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge status={appr.status} size="xs" />
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2">
                        {appr.status === 'pending' ? (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={X}
                              disabled={!isAdmin}
                              onClick={() =>
                                setConfirmModal({
                                  isOpen: true,
                                  type: 'reject',
                                  id: appr.id,
                                  amount: details.amount || 239.98,
                                })
                              }
                            >
                              Reject
                            </Button>
                            <Button
                              variant="success"
                              size="sm"
                              icon={Check}
                              disabled={!isAdmin}
                              onClick={() =>
                                setConfirmModal({
                                  isOpen: true,
                                  type: 'approve',
                                  id: appr.id,
                                  amount: details.amount || 239.98,
                                })
                              }
                            >
                              Approve
                            </Button>
                          </>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-500">
                            {appr.execution_result?.transferId || 'Recorded in ledger'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8">
            <EmptyState
              icon={ShieldCheck}
              title={activeTab === 'pending' ? 'No pending approvals' : 'No approval history'}
              description={
                activeTab === 'pending'
                  ? 'All agent actions are currently authorized or within automatic policy bounds.'
                  : 'No historical approvals have been recorded yet.'
              }
            />
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: '', id: null, amount: 0 })}
        title={confirmModal.type === 'approve' ? 'Authorize Customer Refund' : 'Reject Proposed Operation'}
        subtitle={`Approval ID: ${confirmModal.id?.slice(0, 8)}...`}
      >
        <div className="space-y-4 text-xs">
          {confirmModal.type === 'approve' ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed">
              <p className="text-sm">
                You are authorizing a simulated customer refund of{' '}
                <strong className="text-slate-900 font-bold font-mono">${Number(confirmModal.amount).toFixed(2)}</strong>.
              </p>
              <p className="mt-2 text-slate-500 text-[11px]">
                This will record the simulated payout in the payment ledger, update the database records, and mark the workflow as completed. (Note: No actual funds are transferred).
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-slate-700 font-medium mb-1.5">Rejection Reason</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
              />
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmModal({ isOpen: false, type: '', id: null, amount: 0 })}
            >
              Cancel
            </Button>
            <Button
              variant={confirmModal.type === 'approve' ? 'success' : 'danger'}
              size="sm"
              loading={submitting}
              onClick={handleDecision}
            >
              Confirm {confirmModal.type === 'approve' ? 'Approval' : 'Rejection'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Approvals;
