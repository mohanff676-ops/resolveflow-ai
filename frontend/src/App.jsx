import React from 'react';
import { Routes, Route, Navigate, Link, Outlet } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/layout/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CreateTicket from './pages/CreateTicket.jsx';
import TrackTicket from './pages/TrackTicket.jsx';
import Issues from './pages/Issues.jsx';
import WorkflowMonitor from './pages/WorkflowMonitor.jsx';
import Approvals from './pages/Approvals.jsx';
import Orders from './pages/Orders.jsx';
import Analytics from './pages/Analytics.jsx';
import CommandCenter from './pages/CommandCenter.jsx';
import Spinner from './components/common/Spinner.jsx';

// Route guard requiring authenticated user
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Layout for customer-facing routes: full dashboard layout if logged in, clean portal header if public
const CustomerPortalLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (user) {
    return <Layout />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4 fill-white" />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-sm tracking-tight">ResolveFlow AI</span>
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Customer Portal
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/create-ticket"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
          >
            Create Ticket
          </Link>
          <Link
            to="/track-ticket"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
          >
            Track Ticket
          </Link>
          <Link
            to="/login"
            className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs"
          >
            Staff Login
          </Link>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
};

export const App = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Customer-accessible Ticket Routes (Rendered inside Layout if authenticated, or Portal Layout if public) */}
      <Route element={<CustomerPortalLayout />}>
        <Route path="/create-ticket" element={<CreateTicket />} />
        <Route path="/track-ticket" element={<TrackTicket />} />
      </Route>

      {/* Protected App Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="tickets" element={<Issues />} />
        <Route path="orders" element={<Orders />} />
        <Route path="workflows" element={<WorkflowMonitor />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="analytics" element={<Analytics />} />

        {/* Legacy route redirects and aliases */}
        <Route path="issues" element={<Navigate to="/tickets" replace />} />
        <Route path="command-center" element={<Navigate to="/create-ticket" replace />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
