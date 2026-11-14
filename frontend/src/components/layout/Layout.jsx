import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

const TITLE_MAP = {
  '/': 'Home',
  '/create-ticket': 'Create Ticket',
  '/track-ticket': 'Track Ticket',
  '/tickets': 'All Tickets',
  '/orders': 'Orders',
  '/issues': 'All Tickets',
  '/workflows': 'Activity History',
  '/approvals': 'Approvals',
  '/analytics': 'Reports',
};

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const currentTitle = TITLE_MAP[location.pathname] || 'ResolveFlow AI';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content wrapper */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Header
          onOpenSidebar={() => setSidebarOpen(true)}
          pageTitle={currentTitle}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
