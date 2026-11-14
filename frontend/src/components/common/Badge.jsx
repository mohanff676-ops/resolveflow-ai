import React from 'react';

const STATUS_CONFIGS = {
  // Workflows & Tasks
  running: { bg: 'bg-indigo-50', text: 'text-indigo-700 font-medium', border: 'border-indigo-200', dot: 'bg-indigo-500 animate-pulse' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700 font-medium', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  failed: { bg: 'bg-rose-50', text: 'text-rose-700 font-medium', border: 'border-rose-200', dot: 'bg-rose-500' },
  awaiting_approval: { bg: 'bg-amber-50', text: 'text-amber-800 font-semibold', border: 'border-amber-300', dot: 'bg-amber-500 animate-pulse' },
  pending: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
  skipped: { bg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-200', dot: 'bg-slate-300' },

  // Issues
  open: { bg: 'bg-blue-50', text: 'text-blue-700 font-medium', border: 'border-blue-200', dot: 'bg-blue-500' },
  investigating: { bg: 'bg-purple-50', text: 'text-purple-700 font-medium', border: 'border-purple-200', dot: 'bg-purple-500 animate-pulse' },
  in_progress: { bg: 'bg-indigo-50', text: 'text-indigo-700 font-medium', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  resolved: { bg: 'bg-emerald-50', text: 'text-emerald-700 font-medium', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  closed: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
  escalated: { bg: 'bg-rose-50', text: 'text-rose-700 font-semibold', border: 'border-rose-200', dot: 'bg-rose-500' },

  // Priorities
  critical: { bg: 'bg-rose-50', text: 'text-rose-700 font-bold', border: 'border-rose-300', dot: 'bg-rose-500 animate-pulse' },
  high: { bg: 'bg-amber-50', text: 'text-amber-800 font-medium', border: 'border-amber-200', dot: 'bg-amber-500' },
  medium: { bg: 'bg-blue-50', text: 'text-blue-700 font-medium', border: 'border-blue-200', dot: 'bg-blue-500' },
  low: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },

  // Orders
  delayed: { bg: 'bg-rose-50', text: 'text-rose-700 font-medium', border: 'border-rose-200', dot: 'bg-rose-500' },
  delivered: { bg: 'bg-emerald-50', text: 'text-emerald-700 font-medium', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  shipped: { bg: 'bg-sky-50', text: 'text-sky-700 font-medium', border: 'border-sky-200', dot: 'bg-sky-500' },
  processing: { bg: 'bg-indigo-50', text: 'text-indigo-700 font-medium', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  cancelled: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },

  // Approvals
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-700 font-semibold', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  rejected: { bg: 'bg-rose-50', text: 'text-rose-700 font-semibold', border: 'border-rose-200', dot: 'bg-rose-500' },
  executed: { bg: 'bg-purple-50', text: 'text-purple-700 font-semibold', border: 'border-purple-200', dot: 'bg-purple-500' },

  // User Roles
  admin: { bg: 'bg-purple-50', text: 'text-purple-700 font-semibold', border: 'border-purple-200', dot: 'bg-purple-500' },
  operator: { bg: 'bg-slate-100', text: 'text-slate-700 font-medium', border: 'border-slate-200', dot: 'bg-slate-500' },
};

export const Badge = ({
  status = 'pending',
  label,
  size = 'sm',
  showDot = true,
  className = '',
}) => {
  const normalized = String(status).toLowerCase().replace(/ /g, '_');
  const conf = STATUS_CONFIGS[normalized] || STATUS_CONFIGS.pending;
  const displayLabel = label || normalized.replace(/_/g, ' ');

  const sizes = {
    xs: 'text-[11px] px-2 py-0.5 gap-1',
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-sm px-3 py-1.5 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${conf.bg} ${conf.text} ${conf.border} ${sizes[size] || sizes.sm} ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${conf.dot}`} />}
      <span className="capitalize">{displayLabel}</span>
    </span>
  );
};

export default Badge;
