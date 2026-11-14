import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  FileText,
  Mail,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  Package,
} from 'lucide-react';
import { ticketService } from '../services/ticket.service.js';
import Button from '../components/common/Button.jsx';
import Badge from '../components/common/Badge.jsx';
import Spinner from '../components/common/Spinner.jsx';

export const TrackTicket = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Verification Form Inputs
  const [ticketIdInput, setTicketIdInput] = useState('');
  const [emailInput, setEmailInput] = useState('');

  // Loaded Data
  const [ticketData, setTicketData] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lastChecked, setLastChecked] = useState(null);

  // Check URL params on mount
  useEffect(() => {
    const urlTicketId = searchParams.get('ticketId');
    const urlEmail = searchParams.get('email');

    if (urlTicketId) setTicketIdInput(urlTicketId);
    if (urlEmail) setEmailInput(urlEmail);

    if (urlTicketId && urlEmail) {
      handleTrack(urlTicketId, urlEmail);
    }
  }, []);

  const handleTrack = async (targetId = ticketIdInput, targetEmail = emailInput) => {
    if (!targetId.trim() || !targetEmail.trim()) {
      setErrorMsg('Please enter both your Ticket ID and Customer Email to verify ownership.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const [ticketRes, progressRes] = await Promise.all([
        ticketService.getTicket(targetId.trim(), targetEmail.trim()),
        ticketService.getTicketProgress(targetId.trim(), targetEmail.trim()),
      ]);

      if (ticketRes.success) {
        setTicketData(ticketRes.data);
      }
      if (progressRes.success) {
        setProgressData(progressRes.data);
      }
      setLastChecked(new Date());

      // Update URL search parameters cleanly
      setSearchParams({
        ticketId: targetId.trim().toUpperCase(),
        email: targetEmail.trim().toLowerCase(),
      });
    } catch (err) {
      setTicketData(null);
      setProgressData(null);
      if (err.response?.status === 403) {
        setErrorMsg('Verification failed: The customer email does not match the records for this ticket.');
      } else if (err.response?.status === 404) {
        setErrorMsg('Ticket not found. Please double-check your Ticket ID (e.g. RF-2026-A7K92).');
      } else {
        setErrorMsg(err.response?.data?.message || err.message || 'Unable to track ticket. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    if (!ticketIdInput || !emailInput) return;
    setRefreshing(true);
    handleTrack(ticketIdInput, emailInput);
  };

  // Periodic polling every 12 seconds when ticket is active
  useEffect(() => {
    if (!ticketData || !progressData) return;

    const isActive =
      ticketData.status === 'investigating' ||
      ticketData.status === 'in_progress' ||
      ticketData.status === 'awaiting_approval';

    if (!isActive) return;

    const interval = setInterval(() => {
      ticketService
        .getTicketProgress(ticketData.ticket_id, ticketData.customer_email)
        .then((res) => {
          if (res.success) {
            setProgressData(res.data);
            setLastChecked(new Date());
          }
        })
        .catch(() => {});
    }, 12000);

    return () => clearInterval(interval);
  }, [ticketData, progressData]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4 sm:py-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
              <Search className="w-3.5 h-3.5 text-indigo-600" />
              <span>Customer Self-Service Tracking</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Track Support Ticket
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Verify your ticket ownership using your unique Ticket ID and email to view real-time investigation progress.
            </p>
          </div>

          <Link
            to="/create-ticket"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
          >
            Create New Ticket <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Ticket Lookup & Verification Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleTrack();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Ticket ID <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={ticketIdInput}
                  onChange={(e) => setTicketIdInput(e.target.value.toUpperCase())}
                  placeholder="e.g. RF-2026-A7K92"
                  disabled={loading}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Customer Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="The email used to file the ticket"
                  disabled={loading}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-500">
              Only the customer who created the ticket can access its progress details.
            </span>
            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={Search}
              loading={loading}
              disabled={loading || !ticketIdInput.trim() || !emailInput.trim()}
            >
              Verify & Track
            </Button>
          </div>
        </form>
      </div>

      {/* Ticket Details & Progress Timeline */}
      {ticketData && progressData && (
        <div className="space-y-6">
          {/* Ticket Information Overview Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-base font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                    {ticketData.ticket_id}
                  </span>
                  <Badge status={ticketData.status} size="sm" />
                </div>
                <div className="text-xs text-slate-500 pt-0.5">
                  Customer: <strong className="text-slate-800">{ticketData.customer_name}</strong> &bull; Category: <span className="font-medium text-slate-700">{ticketData.category}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                {lastChecked && (
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    Updated {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  icon={RefreshCw}
                  loading={refreshing}
                  onClick={handleManualRefresh}
                >
                  Refresh Status
                </Button>
              </div>
            </div>

            {/* Administrator Approval Alert if applicable */}
            {progressData.requires_approval && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <strong className="block font-bold text-sm text-amber-900">
                    Your request requires administrator approval.
                  </strong>
                  <p className="mt-1 text-amber-800 leading-relaxed">
                    The automated investigation completed its preliminary findings. In accordance with policy rules, the proposed financial resolution requires review by a system administrator before funds can be released.
                  </p>
                </div>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block font-semibold uppercase text-[10px] tracking-wider">
                  Date Created
                </span>
                <span className="text-slate-900 font-medium">
                  {new Date(ticketData.created_at).toLocaleString()}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block font-semibold uppercase text-[10px] tracking-wider">
                  Associated Order
                </span>
                <span className="font-mono font-bold text-indigo-600">
                  {ticketData.order_number || 'N/A'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block font-semibold uppercase text-[10px] tracking-wider">
                  Latest Update
                </span>
                <span className="text-slate-900 font-medium">
                  {progressData.latest_update}
                </span>
              </div>
            </div>

            {/* Problem Description */}
            <div className="space-y-1 pt-1">
              <span className="text-xs font-semibold text-slate-700 block">
                Request Description:
              </span>
              <p className="text-xs text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                {ticketData.description}
              </p>
            </div>
          </div>

          {/* 7-Step Customer Progress Timeline Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  Support Resolution Timeline
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time status updates as our intelligent agents work through your case
                </p>
              </div>

              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                7 Step Process
              </span>
            </div>

            {/* Timeline Steps List */}
            <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {progressData.steps.map((s) => {
                const isCompleted = s.status === 'completed';
                const isCurrent = s.status === 'current';
                const isPending = s.status === 'pending';

                return (
                  <div key={s.step} className="relative group">
                    {/* Node Icon on Timeline */}
                    <div
                      className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        isCompleted
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : isCurrent
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 animate-pulse'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span>{s.step}</span>
                      )}
                    </div>

                    {/* Step Card Content */}
                    <div
                      className={`p-4 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-indigo-50/60 border-indigo-300 shadow-xs'
                          : isCompleted
                          ? 'bg-slate-50/60 border-slate-200'
                          : 'bg-slate-50/20 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                            {s.step}. {s.name}
                          </h3>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800'
                                : isCurrent
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {s.status}
                          </span>
                        </div>

                        {s.updated_at && (
                          <span className="text-[11px] text-slate-500 font-mono">
                            {new Date(s.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed mt-1">
                        {s.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackTicket;
