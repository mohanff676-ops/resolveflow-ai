import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  Search,
  ExternalLink,
  ShieldCheck,
  Clock,
  ChevronDown,
  ChevronUp,
  Terminal,
} from 'lucide-react';
import { ticketService } from '../services/ticket.service.js';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/common/Button.jsx';
import Badge from '../components/common/Badge.jsx';
import Spinner from '../components/common/Spinner.jsx';

const CATEGORIES = [
  'E-commerce',
  'Customer Support',
  'Warehouse and Inventory',
  'Business Operations',
  'Other',
];

const PRESETS = [
  {
    category: 'E-commerce',
    name: 'Marcus Vance',
    email: 'marcus.vance@example.com',
    orderId: 'ORD-1003',
    description: 'My order ORD-1003 has not arrived for three days. Please check payment and delivery status, escalate with the carrier, and process a resolution.',
    label: 'Late Delivery & Refund',
  },
  {
    category: 'Customer Support',
    name: 'Sarah Connor',
    email: 'sarah.connor@example.com',
    orderId: 'ORD-1005',
    description: 'Customer reported order ORD-1005 arrived damaged. Please evaluate customer records, verify items, and recommend a compensation resolution.',
    label: 'Damaged Product Issue',
  },
  {
    category: 'Warehouse and Inventory',
    name: 'David Miller',
    email: 'david.miller@example.com',
    orderId: '',
    description: 'Please check inventory information, stock availability, and discrepancy logs for product SKU SWP-003 to resolve fulfillment issues.',
    label: 'Inventory Stock Check',
  },
  {
    category: 'Business Operations',
    name: 'Elena Rostova',
    email: 'elena.rostova@example.com',
    orderId: '',
    description: 'Automate operational reconciliation across recent orders and fulfillment logs to verify policy adherence and flag discrepancies.',
    label: 'Operations Review',
  },
];

export const CreateTicket = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [orderId, setOrderId] = useState('');
  const [category, setCategory] = useState('E-commerce');
  const [description, setDescription] = useState('');

  // Execution states
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdTicket, setCreatedTicket] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Prefill from user session or URL query params
  useEffect(() => {
    if (user?.name && !customerName) {
      setCustomerName(user.name);
    }
    if (user?.email && !customerEmail) {
      setCustomerEmail(user.email);
    }

    const categoryParam = searchParams.get('category');
    const orderParam = searchParams.get('orderId');
    const descParam = searchParams.get('description');
    const scenarioParam = searchParams.get('scenario');

    if (categoryParam && CATEGORIES.includes(categoryParam)) {
      setCategory(categoryParam);
    }
    if (orderParam) setOrderId(orderParam);
    if (descParam) setDescription(descParam);

    if (scenarioParam === 'ecommerce') {
      applyPreset(PRESETS[0]);
    } else if (scenarioParam === 'support') {
      applyPreset(PRESETS[1]);
    } else if (scenarioParam === 'warehouse') {
      applyPreset(PRESETS[2]);
    } else if (scenarioParam === 'operations') {
      applyPreset(PRESETS[3]);
    }
  }, [searchParams, user]);

  const applyPreset = (preset) => {
    setCategory(preset.category);
    setCustomerName(preset.name);
    setCustomerEmail(preset.email);
    setOrderId(preset.orderId);
    setDescription(preset.description);
    setErrorMsg('');
  };

  const handleCopyTicketId = async () => {
    if (!createdTicket?.ticket_id) return;
    try {
      await navigator.clipboard.writeText(createdTicket.ticket_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy ticket ID:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!customerName.trim()) {
      setErrorMsg('Please enter your customer name.');
      return;
    }
    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!description.trim() || description.trim().length < 5) {
      setErrorMsg('Problem description must be at least 5 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await ticketService.createTicket({
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim().toLowerCase(),
        order_id: orderId.trim() || null,
        category,
        description: description.trim(),
      });

      if (res.success && res.data?.ticket_id) {
        setCreatedTicket(res.data);
      } else {
        setErrorMsg(res.message || 'Ticket creation failed. Please try again.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to submit ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  // If ticket created successfully, show confirmation screen
  if (createdTicket) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-6">
        {/* Success Card */}
        <div className="bg-white rounded-2xl border border-emerald-200 p-6 sm:p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900">
              Your support ticket has been created!
            </h1>
            <p className="text-sm text-slate-600">
              Our automated 6-agent engine has begun investigating your request.
            </p>
          </div>

          {/* Prominent Ticket ID Display */}
          <div className="bg-indigo-50/70 border-2 border-indigo-200 rounded-2xl p-5 max-w-md mx-auto space-y-2">
            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider block">
              Your Official Ticket ID
            </span>
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-2xl sm:text-3xl font-extrabold text-indigo-900 tracking-wider">
                {createdTicket.ticket_id}
              </span>
              <button
                type="button"
                onClick={handleCopyTicketId}
                className="p-2 rounded-xl bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-xs"
                title="Copy Ticket ID"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Save this ticket ID and your email to track your ticket status at any time.
            </p>
          </div>

          {/* Ticket Information Summary */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-left text-xs space-y-2.5">
            <div className="flex justify-between items-center py-1 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Customer:</span>
              <span className="font-semibold text-slate-900">{createdTicket.customer_name}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Email:</span>
              <span className="font-mono text-slate-900">{createdTicket.customer_email}</span>
            </div>
            {createdTicket.order_id && (
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Order Number:</span>
                <span className="font-mono font-bold text-indigo-600">{createdTicket.order_id}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-1 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Category:</span>
              <span className="font-medium text-slate-900">{createdTicket.category}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Current Status:</span>
              <Badge status={createdTicket.status} size="xs" />
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Creation Date:</span>
              <span className="text-slate-700 font-mono">
                {new Date(createdTicket.created_at).toLocaleString()}
              </span>
            </div>
            <div className="pt-1">
              <span className="text-slate-500 font-medium block mb-1">Problem Description:</span>
              <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed font-sans">
                {createdTicket.description}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              icon={Search}
              onClick={() =>
                navigate(`/track-ticket?ticketId=${encodeURIComponent(createdTicket.ticket_id)}&email=${encodeURIComponent(createdTicket.customer_email)}`)
              }
            >
              Track My Ticket
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                setCreatedTicket(null);
                setDescription('');
                setOrderId('');
              }}
            >
              Create Another Ticket
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-sm">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Support Ticket System</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Create a Support Ticket
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Fill in the details below. Our six autonomous AI agents will investigate customer records, verify policies, and coordinate a resolution.
          </p>
        </div>
      </div>

      {/* Main Ticket Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Quick preset scenarios */}
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Or click a quick business template:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 text-xs font-medium text-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <span className="font-bold text-indigo-600">#{idx + 1}</span>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Customer Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Customer Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Sarah Johnson"
                disabled={submitting}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Customer Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="e.g. customer@example.com"
                disabled={submitting}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
          </div>

          {/* Order ID & Business Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Order ID <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. ORD-1003"
                disabled={submitting}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Business Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={submitting}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Problem Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Problem Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the customer's problem or inquiry in detail..."
              disabled={submitting}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all leading-relaxed"
            />
          </div>

          {/* Error alert */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              A unique ticket ID will be generated upon submission.
            </span>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              icon={Send}
              loading={submitting}
              disabled={submitting || !customerName.trim() || !customerEmail.trim() || !description.trim()}
            >
              Submit Ticket
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicket;
