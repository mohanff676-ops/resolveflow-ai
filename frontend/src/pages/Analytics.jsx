import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Bot,
  Zap,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Layers,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { analyticsService } from '../services/analytics.service.js';
import Card from '../components/common/Card.jsx';
import Badge from '../components/common/Badge.jsx';
import Button from '../components/common/Button.jsx';
import Spinner from '../components/common/Spinner.jsx';

export const Analytics = () => {
  const [overview, setOverview] = useState(null);
  const [agentMetrics, setAgentMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [ovRes, agRes] = await Promise.all([
        analyticsService.getOverview(),
        analyticsService.getAgentMetrics(),
      ]);
      if (ovRes.success) setOverview(ovRes.data);
      if (agRes.success) setAgentMetrics(agRes.data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
        <p className="text-sm text-slate-500 mt-4">Generating operational reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-indigo-600" />
              Reports
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Performance metrics, resolution velocity, and policy enforcement audits.
            </p>
          </div>

          <Button
            variant="secondary"
            size="md"
            icon={RefreshCw}
            onClick={fetchAnalytics}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Completion Rate */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Success Rate</span>
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {overview?.completionRate ?? 0}%
          </div>
          <div className="text-xs text-emerald-700 font-medium mt-1">
            Autonomous resolutions verified
          </div>
        </div>

        {/* Avg Resolution Time */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg Resolution Time</span>
            <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {overview?.avgDurationSeconds ?? 0}s
          </div>
          <div className="text-xs text-indigo-700 font-medium mt-1">
            From intake to resolution
          </div>
        </div>

        {/* Total Requests */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Requests</span>
            <div className="p-2.5 rounded-lg bg-slate-100 text-slate-600">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {overview?.totalWorkflows ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Customer inquiries processed
          </div>
        </div>

        {/* Policy Rules */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Business Policies</span>
            <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {overview?.policyCount ?? 0}
          </div>
          <div className="text-xs text-purple-700 font-medium mt-1">
            Automated guardrails enforced
          </div>
        </div>
      </div>

      {/* Agent Performance Cards */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900">
          Agent Performance Breakdown
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agentMetrics.map((role) => (
            <div
              key={role.role}
              className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 capitalize">
                  {role.role} Agent
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {role.successRate}% Success
                </span>
              </div>

              <div className="space-y-2 text-xs divide-y divide-slate-100 pt-1">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">Tasks Handled:</span>
                  <span className="font-semibold text-slate-900">{role.totalTasks}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">Tasks Completed:</span>
                  <span className="font-semibold text-emerald-700">{role.completedTasks}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">Tools Executed:</span>
                  <span className="font-semibold text-indigo-700">{role.actionCount}</span>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-[11px] text-slate-500 block mb-1 font-medium">Assigned Tools:</span>
                <div className="flex flex-wrap gap-1">
                  {role.toolsUsed?.length > 0 ? (
                    role.toolsUsed.map((t, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono"
                      >
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-400">Autonomous reasoning</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Issue Categories & Business Guardrails */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issue Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            Issue Distribution by Category
          </h3>

          {overview?.issueBreakdown && Object.keys(overview.issueBreakdown).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(overview.issueBreakdown).map(([type, count]) => (
                <div key={type} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-medium capitalize">{type.replace(/_/g, ' ')}</span>
                    <span className="font-bold text-slate-900">{count}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, count * 25)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No issue categories logged.</p>
          )}
        </div>

        {/* Business Policies */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Active Business Rules & Guardrails
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
              <div>
                <strong className="text-slate-900 block font-semibold">Automatic Refund Limit</strong>
                <span className="text-slate-500 text-[11px]">Requires manager approval for refunds over $50.00</span>
              </div>
              <Badge status="completed" label="Active" size="xs" />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
              <div>
                <strong className="text-slate-900 block font-semibold">Carrier Delay Escalation</strong>
                <span className="text-slate-500 text-[11px]">Automatically opens inquiry when delivery is 2+ days late</span>
              </div>
              <Badge status="completed" label="Active" size="xs" />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
              <div>
                <strong className="text-slate-900 block font-semibold">Database Integrity Check</strong>
                <span className="text-slate-500 text-[11px]">Verification Agent audits all state mutations against PostgreSQL</span>
              </div>
              <Badge status="completed" label="Active" size="xs" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
