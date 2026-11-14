import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  GitBranch,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Terminal,
  Code,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { agentService } from '../services/agent.service.js';
import Card from '../components/common/Card.jsx';
import Badge from '../components/common/Badge.jsx';
import Button from '../components/common/Button.jsx';
import Spinner from '../components/common/Spinner.jsx';
import EmptyState from '../components/common/EmptyState.jsx';

export const WorkflowMonitor = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedId = searchParams.get('id');

  const [workflows, setWorkflows] = useState([]);
  const [activeWorkflow, setActiveWorkflow] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedTaskJson, setExpandedTaskJson] = useState({});

  const fetchWorkflows = async () => {
    try {
      setLoadingList(true);
      const res = await agentService.getWorkflows(1, 25, statusFilter);
      if (res.success) {
        setWorkflows(res.data);
      }
    } catch (err) {
      console.error('Failed to load activity history:', err);
    } finally {
      setLoadingList(false);
    }
  };

  const fetchWorkflowDetail = async (id) => {
    try {
      setLoadingDetail(true);
      const res = await agentService.getWorkflowById(id);
      if (res.success) {
        setActiveWorkflow(res.data);
      }
    } catch (err) {
      console.error('Failed to load workflow details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [statusFilter]);

  useEffect(() => {
    if (selectedId) {
      fetchWorkflowDetail(selectedId);
    } else {
      setActiveWorkflow(null);
    }
  }, [selectedId]);

  const toggleTaskJson = (taskId) => {
    setExpandedTaskJson((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {selectedId && (
              <button
                onClick={() => setSearchParams({})}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="Back to all activity"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <GitBranch className="w-6 h-6 text-indigo-600" />
                {selectedId ? 'Request Investigation Timeline' : 'Activity History'}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                {selectedId
                  ? `Detailed audit trail for request ${selectedId.slice(0, 8)}...`
                  : 'Chronological timeline of customer requests investigated and resolved by AI agents.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="md"
              icon={RefreshCw}
              onClick={() => (selectedId ? fetchWorkflowDetail(selectedId) : fetchWorkflows())}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Main View: Detailed Inspector OR List */}
      {selectedId ? (
        loadingDetail ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : activeWorkflow ? (
          <div className="space-y-6">
            {/* Overview Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2.5">
                <Badge status={activeWorkflow.status} size="sm" />
                <span className="text-xs font-mono text-slate-500">ID: {activeWorkflow.id}</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                "{activeWorkflow.trigger_message}"
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Started: {new Date(activeWorkflow.started_at).toLocaleString()}
                </span>
                {activeWorkflow.completed_at && (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Completed: {new Date(activeWorkflow.completed_at).toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Agent Sub-tasks Timeline */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Agent Roles Involved</span>
              </h3>

              <div className="space-y-3">
                {activeWorkflow.tasks?.length > 0 ? (
                  activeWorkflow.tasks.map((task) => {
                    const isExpanded = !!expandedTaskJson[task.id];
                    return (
                      <div
                        key={task.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-xs flex items-center justify-center font-bold uppercase">
                              {task.agent_role.slice(0, 2)}
                            </span>
                            <div>
                              <span className="font-semibold text-slate-900 text-sm capitalize">
                                {task.agent_role} Agent
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono ml-2">
                                ({task.id.slice(0, 8)}...)
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge status={task.status} size="xs" />
                            {task.output && (
                              <button
                                onClick={() => toggleTaskJson(task.id)}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 ml-2"
                              >
                                {isExpanded ? 'Hide Raw Details' : 'View Raw Details'}
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Collapsible Output */}
                        {task.output && isExpanded && (
                          <div className="p-3.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto max-h-56">
                            <pre>{JSON.stringify(task.output, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500">No agent sub-tasks recorded.</p>
                )}
              </div>
            </div>

            {/* Granular Tool Actions */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-600" />
                <span>Backend Operations Executed</span>
              </h3>

              {activeWorkflow.actions?.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Tool Name</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Execution Result</th>
                        <th className="py-2.5 px-3 text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {activeWorkflow.actions.map((act) => (
                        <tr key={act.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">
                            {act.tool_name}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge status={act.status} size="xs" />
                          </td>
                          <td className="py-2.5 px-3 max-w-sm truncate text-slate-700 font-mono text-[11px]">
                            {JSON.stringify(act.result)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-500 font-mono text-[11px]">
                            {new Date(act.executed_at).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500">No backend tools executed for this request.</p>
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            icon={AlertTriangle}
            title="Request not found"
            description="The requested workflow could not be found in the database."
            actionLabel="Return to Activity History"
            onAction={() => setSearchParams({})}
          />
        )
      ) : (
        /* Workflows List Table */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              All Activity Runs
            </span>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-xs text-slate-800 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="running">Running</option>
              <option value="awaiting_approval">Awaiting Approval</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {loadingList ? (
            <div className="py-16 flex justify-center">
              <Spinner size="md" />
            </div>
          ) : workflows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Request ID</th>
                    <th className="py-3 px-4">Customer Request</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {workflows.map((wf) => (
                    <tr key={wf.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                        {wf.id.slice(0, 8)}...
                      </td>
                      <td className="py-3.5 px-4 max-w-md truncate font-medium text-slate-900">
                        {wf.trigger_message}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge status={wf.status} size="xs" />
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(wf.started_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSearchParams({ id: wf.id })}
                        >
                          View Details
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
                icon={GitBranch}
                title="No activity recorded"
                description="Submit your first customer issue to see live agent activity."
                actionLabel="Create Ticket"
                onAction={() => navigate('/create-ticket')}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkflowMonitor;
