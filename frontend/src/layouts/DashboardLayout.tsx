import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../api/client';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Users, 
  IndianRupee, 
  CreditCard, 
  Settings, 
  Receipt, 
  Scissors, 
  LogOut, 
  User as UserIcon,
  Calendar
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Load online status from localStorage to persist across subpages
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return localStorage.getItem('gc_terminal_online') === 'true';
  });

  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);

  const showToast = (text: string, type: 'ok' | 'err' = 'ok') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const triggerDailyReport = async () => {
    try {
      const today = new Date().toDateString();
      // 1. Fetch transactions for today by this user to compile shift numbers
      const res = await apiClient.get('/transactions', { params: { period: 'day' } });
      const todayBills = (res.data.data || []).filter((b: any) => b.billedBy === user?.id);
      const totalRevenue = todayBills.reduce((sum: number, b: any) => sum + parseFloat(b.total), 0);

      // 2. Dispatch report to admin
      const payload = {
        billedBy: user?.username,
        totalBills: todayBills.length,
        netRevenue: totalRevenue,
      };

      await apiClient.post('/reports/send-daily', payload);
      showToast('Shift checkout summary dispatched securely to Admin inbox.', 'ok');
    } catch (err) {
      console.error('Failed to send daily checkout report', err);
      showToast('Shift log logged locally, dispatch delay.', 'err');
    }
  };

  const handleOnlineToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextState = e.target.checked;
    setIsOnline(nextState);
    localStorage.setItem('gc_terminal_online', String(nextState));

    if (!nextState) {
      // Cashier toggled offline: send daily checkout email
      triggerDailyReport();
    }
  };

  const handleLogout = () => {
    if (user?.role === 'billing' && isOnline) {
      // Auto toggle offline on logout if cashier is online
      setIsOnline(false);
      localStorage.setItem('gc_terminal_online', 'false');
      triggerDailyReport();
    }
    logout();
    navigate('/login');
  };

  const adminNav: NavItem[] = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { path: '/admin/sales', label: 'Sales Reports', icon: <TrendingUp size={18} /> },
    { path: '/admin/customers', label: 'Customers', icon: <Users size={18} /> },
    { path: '/admin/expenses', label: 'Expenses Report', icon: <IndianRupee size={18} /> },
    { path: '/admin/payments', label: 'Payment Modes', icon: <CreditCard size={18} /> },
    { path: '/admin/services', label: 'Services', icon: <Settings size={18} /> },
  ];

  const cashierNav: NavItem[] = [
    { path: '/billing/terminal', label: 'POS Billing Terminal', icon: <Receipt size={18} /> },
    { path: '/billing/expenses', label: 'Expenses', icon: <IndianRupee size={18} /> },
    { path: '/billing/services', label: 'Services', icon: <Scissors size={18} /> },
  ];

  const activeNav = user?.role === 'admin' ? adminNav : cashierNav;

  // Determine topbar title
  const getPageTitle = () => {
    const current = activeNav.find(n => location.pathname === n.path);
    return current ? `${current.label} ${user?.role === 'billing' ? 'Workstation' : 'Overview'}` : 'Creo Corp';
  };

  const formattedDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0d1117] text-[#e8edf2] font-sans">
      
      {/* ── SIDEBAR ── */}
      <aside className="w-[240px] bg-[#111820] border-r border-[#1e2d3d] flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-[#1e2d3d]">
          <div className="font-serif text-xl font-black text-[#c9a84c] tracking-widest flex items-center gap-2">
            <span>✂️</span>
            <span>Creo Corp</span>
          </div>
          <p className="text-[10px] text-[#5a6a7a] tracking-[3px] uppercase mt-1">Saloon Billing</p>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
          {activeNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 select-none hover:bg-goldCustom/10 hover:text-[#c9a84c] ${
                  isActive 
                    ? "bg-[#c9a84c]/15 text-[#c9a84c] border-l-4 border-[#c9a84c] pl-[13px]" 
                    : "text-[#5a6a7a]"
                }`
              }
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[#1e2d3d]">
          <div className="flex items-center gap-3 bg-white/5 rounded-lg p-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c9a84c] to-[#a07830] flex items-center justify-center font-extrabold text-sm text-[#0d1117] uppercase flex-shrink-0">
              {user?.name[0] || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate">{user?.name}</p>
              <span className="text-[9px] text-[#c9a84c] font-semibold uppercase tracking-[0.5px]">
                {user?.role === 'admin' ? 'Admin Access' : 'Billing Staff'}
              </span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full py-2.5 bg-red-500/10 border border-red-500/25 rounded-lg text-[#ff8080] text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-500/25 transition-all duration-200"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Topbar */}
        <header className="h-14 bg-[#111820] border-b border-[#1e2d3d] flex items-center justify-between px-7 flex-shrink-0">
          <h2 className="text-sm font-bold tracking-wide">{getPageTitle()}</h2>
          
          <div className="flex items-center gap-5">
            {user?.role === 'billing' && (
              <div className="flex items-center gap-3 bg-white/5 border border-[#1e2d3d] rounded-full py-1 px-4">
                <span className={`text-[10px] font-extrabold tracking-wider uppercase ${isOnline ? "text-[#00c97a]" : "text-[#5a6a7a]"}`}>
                  {isOnline ? "Business Online" : "Business Offline"}
                </span>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={isOnline}
                    onChange={handleOnlineToggle}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#2a3a4a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00c97a]"></div>
                </label>
              </div>
            )}
            <div className="text-xs text-[#5a6a7a] flex items-center gap-1.5">
              <Calendar size={13} className="text-[#c9a84c]" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </header>

        {/* Content body */}
        <main className="flex-grow overflow-y-auto p-7 relative">
          <Outlet context={{ isOnline }} />
        </main>
      </div>

      {/* ── TOAST MESSAGE ── */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 border rounded-lg px-[18px] py-3 text-xs z-[9999] flex items-center gap-2 bg-[#1c2532] shadow-2xl transition-all duration-300 transform translate-y-0 ${
          toastMsg.type === 'ok' ? 'border-[#00c97a]/35 text-[#e8edf2]' : 'border-red-500/35 text-[#ff8080]'
        }`}>
          <span>{toastMsg.type === 'ok' ? '✅' : '⚠️'}</span>
          <span>{toastMsg.text}</span>
        </div>
      )}

    </div>
  );
};
export const useDashboardContext = () => {
  return useOutletContext<{ isOnline: boolean }>();
};
