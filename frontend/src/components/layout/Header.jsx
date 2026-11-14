import React, { useState, useEffect } from 'react';
import { Menu, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import Button from '../common/Button.jsx';
import Badge from '../common/Badge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export const Header = ({ onOpenSidebar, pageTitle = 'Home' }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isBackendHealthy, setIsBackendHealthy] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const res = await api.get('/health', { timeout: 3000 });
        if (isMounted) setIsBackendHealthy(res.data?.status === 'ok');
      } catch {
        if (isMounted) setIsBackendHealthy(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">{pageTitle}</h1>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* System Connectivity Status Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs">
          {isBackendHealthy ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600 text-[11px] font-medium">System Ready</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span className="text-rose-600 text-[11px] font-medium">Offline</span>
            </>
          )}
        </div>

        {/* Role Pill */}
        <Badge status={user?.role || 'operator'} size="sm" />

        {/* Quick New Request Button */}
        <Button
          variant="primary"
          size="sm"
          icon={PlusCircle}
          onClick={() => navigate('/command-center')}
          className="hidden md:inline-flex"
        >
          New Request
        </Button>
      </div>
    </header>
  );
};

export default Header;
