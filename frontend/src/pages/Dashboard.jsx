import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Package,
  AlertCircle,
  GitBranch,
  ShieldCheck,
  PlusCircle,
  RefreshCw,
  ArrowRight,
  Clock,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  Headphones,
  Boxes,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  FileText,
  Search,
  Check,
  Zap,
} from 'lucide-react';
import { dashboardService } from '../services/dashboard.service.js';
import Card from '../components/common/Card.jsx';
import Badge from '../components/common/Badge.jsx';
import Button from '../components/common/Button.jsx';
import Spinner from '../components/common/Spinner.jsx';
import EmptyState from '../components/common/EmptyState.jsx';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getActivity(),
      ]);
      if (statsRes.success) setStats(statsRes.data);
      if (activityRes.success) setActivity(activityRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const scrollToUseCases = () => {
    const el = document.getElementById('use-cases');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
        <p className="text-sm text-slate-500 mt-4">Loading your business dashboard...</p>
      </div>
    );
  }

  // Calculate open issues: total issues minus resolved issues
  const openIssuesCount = Math.max(0, (stats?.totalIssues ?? 0) - (stats?.resolvedIssues ?? 0));
  const pendingApprovalsCount = stats?.pendingApprovals ?? 0;

  return (
    <div className="space-y-8">
      {/* 1. Website Introduction */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <div className="max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Intelligent Agent Orchestration</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              ResolveFlow AI
            </h1>
            <h2 className="text-lg sm:text-xl font-semibold text-indigo-600">
              AI-Powered Business Problem Resolution Platform
            </h2>
          </div>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl">
            Helping businesses investigate customer problems, coordinate intelligent agents and manage resolutions with human oversight.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              icon={PlusCircle}
              onClick={() => navigate('/command-center')}
            >
              Try ResolveFlow AI
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={scrollToUseCases}
            >
              Explore Use Cases
            </Button>
            <Button
              variant="ghost"
              size="lg"
              icon={RefreshCw}
              loading={refreshing}
              onClick={handleRefresh}
            >
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Key Business Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Orders</span>
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {stats?.totalOrders ?? 0}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span>Orders in system</span>
            <Link to="/orders" className="text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center">
              View orders &rarr;
            </Link>
          </div>
        </div>

        {/* Open Customer Issues */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Open Customer Issues</span>
            <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {openIssuesCount}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span>{stats?.resolvedIssues ?? 0} resolved so far</span>
            <Link to="/issues" className="text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center">
              View issues &rarr;
            </Link>
          </div>
        </div>

        {/* Requests Being Processed */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Requests Being Processed</span>
            <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
              <GitBranch className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {stats?.activeWorkflows ?? 0}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span>Active AI investigations</span>
            <Link to="/workflows" className="text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center">
              View history &rarr;
            </Link>
          </div>
        </div>

        {/* Approvals Needed */}
        <div
          className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-all ${
            pendingApprovalsCount > 0
              ? 'border-amber-300 bg-amber-50/30'
              : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approvals Needed</span>
            <div className={`p-2.5 rounded-lg ${pendingApprovalsCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-3xl font-extrabold tracking-tight ${pendingApprovalsCount > 0 ? 'text-amber-800' : 'text-slate-900'}`}>
            {pendingApprovalsCount}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span className={pendingApprovalsCount > 0 ? 'text-amber-700 font-medium' : ''}>
              {pendingApprovalsCount > 0 ? 'Requires manager review' : 'No pending reviews'}
            </span>
            <Link to="/approvals" className="text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center">
              Review now &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Four Real Business Use Cases Section */}
      <div id="use-cases" className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
              <span>Business Applications</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Real-World Business Use Cases
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              How different teams leverage ResolveFlow AI to investigate problems and manage resolutions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Use Case 1: E-commerce Businesses */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Use Case 1: E-commerce Businesses
                  </h3>
                  <span className="text-xs text-slate-500">Online stores & fulfillment operations</span>
                </div>
              </div>

              {/* Problem examples */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Common Business Problems:
                </span>
                <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                  <li>Delayed orders</li>
                  <li>Missing packages</li>
                  <li>Refund requests</li>
                  <li>Customer complaints</li>
                </ul>
              </div>

              {/* How ResolveFlow helps */}
              <div>
                <span className="text-xs font-semibold text-slate-900 block mb-1.5">
                  How ResolveFlow AI Helps:
                </span>
                <ul className="text-xs text-slate-600 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Investigates order information.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Checks payment and delivery status.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Recommends a suitable resolution.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Creates escalation and refund requests.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Requests administrator approval for sensitive actions.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-slate-100">
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => navigate('/command-center?scenario=ecommerce')}
              >
                Try E-commerce Scenario &rarr;
              </Button>
            </div>
          </div>

          {/* Use Case 2: Customer Support Teams */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Use Case 2: Customer Support Teams
                  </h3>
                  <span className="text-xs text-slate-500">Tier-1 & Tier-2 customer service</span>
                </div>
              </div>

              {/* Problem examples */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Common Business Problems:
                </span>
                <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                  <li>Repeated customer complaints</li>
                  <li>Unresolved support tickets</li>
                  <li>Delayed responses</li>
                </ul>
              </div>

              {/* How ResolveFlow helps */}
              <div>
                <span className="text-xs font-semibold text-slate-900 block mb-1.5">
                  How ResolveFlow AI Helps:
                </span>
                <ul className="text-xs text-slate-600 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Understands customer complaints.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Organizes support issues.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Investigates available customer records.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Recommends resolutions.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Tracks issue progress.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-slate-100">
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => navigate('/command-center?scenario=support')}
              >
                Try Customer Support Scenario &rarr;
              </Button>
            </div>
          </div>

          {/* Use Case 3: Warehouses and Inventory Businesses */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-50 text-amber-700">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Use Case 3: Warehouses and Inventory Businesses
                  </h3>
                  <span className="text-xs text-slate-500">Supply chain & inventory management</span>
                </div>
              </div>

              {/* Problem examples */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Common Business Problems:
                </span>
                <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                  <li>Missing inventory</li>
                  <li>Stock discrepancies</li>
                  <li>Order fulfillment problems</li>
                </ul>
              </div>

              {/* How ResolveFlow helps */}
              <div>
                <span className="text-xs font-semibold text-slate-900 block mb-1.5">
                  How ResolveFlow AI Helps:
                </span>
                <ul className="text-xs text-slate-600 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Checks inventory information.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Investigates order records.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Identifies discrepancies using available business data.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Recommends operational actions.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Records activities for tracking.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-slate-100">
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => navigate('/command-center?scenario=warehouse')}
              >
                Try Inventory Scenario &rarr;
              </Button>
            </div>
          </div>

          {/* Use Case 4: Business Operations Teams */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Use Case 4: Business Operations Teams
                  </h3>
                  <span className="text-xs text-slate-500">Cross-department workflows & compliance</span>
                </div>
              </div>

              {/* Problem examples */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Common Business Problems:
                </span>
                <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                  <li>Repetitive manual tasks</li>
                  <li>Operational delays</li>
                  <li>Uncoordinated workflows</li>
                </ul>
              </div>

              {/* How ResolveFlow helps */}
              <div>
                <span className="text-xs font-semibold text-slate-900 block mb-1.5">
                  How ResolveFlow AI Helps:
                </span>
                <ul className="text-xs text-slate-600 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Coordinates specialized AI agents.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Automates supported operational actions.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Tracks workflow progress.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Maintains activity records.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Provides reports.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-slate-100">
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => navigate('/command-center?scenario=operations')}
              >
                Try Operations Scenario &rarr;
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Real-World Example Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
            <span>Step-by-Step Resolution</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            See How ResolveFlow AI Solves a Business Problem
          </h2>
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-indigo-950 mt-3 text-sm flex items-start gap-3">
            <span className="font-bold shrink-0 text-indigo-600">Real-World Problem:</span>
            <span>A customer reports that order ORD-1003 has not arrived for three days.</span>
          </div>
        </div>

        {/* Visual Timeline (6 Steps) */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
            Visual Resolution Timeline
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[
              { step: 1, title: 'Customer complaint received.', desc: 'Intake Agent extracts the order ID and flags a delivery delay issue.' },
              { step: 2, title: 'Order, payment and delivery details checked.', desc: 'Investigation Agent verifies order ORD-1003 in Supabase and queries carrier tracking.' },
              { step: 3, title: 'Best resolution identified using business policies.', desc: 'Decision Agent applies refund eligibility rule and determines delay exceeds 2-day SLA.' },
              { step: 4, title: 'Delivery escalation created.', desc: 'Execution Agent attaches an escalation note to order ORD-1003.' },
              { step: 5, title: 'Refund request submitted for administrator approval.', desc: 'Because the $239.98 total exceeds the $50 auto-refund threshold, approval is created.' },
              { step: 6, title: 'Actions verified and recorded.', desc: 'Verification Agent validates database updates and Monitoring Agent logs audit records.' },
            ].map((item) => (
              <div
                key={item.step}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 relative hover:border-indigo-200 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {item.step}
                  </span>
                  <h4 className="font-bold text-xs text-slate-900 leading-tight">
                    {item.title}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500 pl-8 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Example Result Display */}
        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Investigation Result:
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold">
              Status: Awaiting administrator approval
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
            <div className="p-3.5 rounded-lg bg-white border border-slate-200 space-y-1">
              <span className="text-slate-500 block">Operational Action:</span>
              <span className="font-semibold text-slate-900">
                Delivery escalation created in carrier log.
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-white border border-slate-200 space-y-1">
              <span className="text-slate-500 block">Refund Request:</span>
              <span className="font-bold text-slate-900 text-sm font-mono">
                $239.98
              </span>
              <span className="text-[11px] text-slate-500 block">
                (Simulated transaction — no real funds have been transferred)
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="primary"
              size="sm"
              icon={PlusCircle}
              onClick={() => navigate('/command-center?scenario=ecommerce')}
            >
              Test This Live in ResolveFlow
            </Button>
          </div>
        </div>
      </div>

      {/* 5. Benefits Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
            <span>Core Advantages</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Why Businesses Choose ResolveFlow AI
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Engineered to coordinate intelligent agents while giving operations teams transparent governance.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: 'Faster problem investigation.',
              desc: 'Investigates customer inquiries, queries order history, and cross-references carrier tracking in seconds.',
              icon: Zap,
            },
            {
              title: 'Less repetitive manual work.',
              desc: 'Handles routine data lookups, multi-system checks, and verification steps automatically.',
              icon: RefreshCw,
            },
            {
              title: 'Coordinated AI agents.',
              desc: 'Six specialized agent roles collaborate seamlessly across intake, investigation, decision, execution, verification, and monitoring.',
              icon: GitBranch,
            },
            {
              title: 'Consistent policy-based decisions.',
              desc: 'Evaluates refund SLAs and company rules objectively on every single customer issue without subjective bias.',
              icon: ShieldCheck,
            },
            {
              title: 'Human approval for sensitive actions.',
              desc: 'Policy guardrails pause execution and require manager approval for sensitive financial transactions.',
              icon: ShieldAlert,
            },
            {
              title: 'Traceable activity records.',
              desc: 'Logs every single tool call, agent thought, and database modification for complete end-to-end accountability.',
              icon: FileText,
            },
          ].map((benefit, idx) => {
            const Icon = benefit.icon;
            return (
              <div
                key={idx}
                className="p-5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-indigo-200 transition-colors space-y-2.5"
              >
                <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">
                  {benefit.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {benefit.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Recent Activity Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Recent Activity</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Recent customer requests processed by ResolveFlow AI
            </p>
          </div>
          <Link
            to="/workflows"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
          >
            View all activity <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {activity?.recentWorkflows?.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {activity.recentWorkflows.map((wf) => {
              const dateStr = new Date(wf.started_at).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
              const isPendingApproval = wf.status === 'awaiting_approval';
              const isCompleted = wf.status === 'completed';

              return (
                <div
                  key={wf.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="space-y-1 max-w-3xl">
                    <div className="flex items-center gap-2.5">
                      <Badge status={wf.status} size="sm" />
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {dateStr}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 line-clamp-1">
                      {wf.trigger_message}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isPendingApproval
                        ? 'Investigated order details. Refund exceeds policy limit and requires manager approval.'
                        : isCompleted
                        ? 'Investigated customer issue and verified records. Resolution completed successfully.'
                        : 'Currently investigating customer records and coordinating resolution steps.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/workflows?id=${wf.id}`)}
                    >
                      View Details
                    </Button>
                    {isPendingApproval && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate('/approvals')}
                      >
                        Review Approval
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8">
            <EmptyState
              icon={GitBranch}
              title="No customer requests yet"
              description="Click the button below to submit a customer problem and watch our AI resolve it."
              actionLabel="+ Create New Customer Request"
              onAction={() => navigate('/command-center')}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
