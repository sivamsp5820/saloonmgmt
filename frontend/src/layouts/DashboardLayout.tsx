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
  Calendar,
  Trash2
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
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetConfirmText, setResetConfirmText] = useState<string>('');
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const showToast = (text: string, type: 'ok' | 'err' = 'ok') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Keyboard shortcut listener (Ctrl+Alt+R) to open database reset modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (user?.role === 'admin' && e.ctrlKey && e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setShowResetModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user]);

  const handleResetDatabase = async () => {
    if (resetConfirmText !== 'RESET') return;
    setIsResetting(true);
    try {
      const res = await apiClient.post('/system/reset');
      if (res.data.status === 'success') {
        showToast(res.data.message || 'Database reset successfully. Only admin is kept.', 'ok');
        setShowResetModal(false);
        setResetConfirmText('');
        // Reload page to refresh all active subpages (which now have empty table values)
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        showToast(res.data.message || 'Failed to reset tables.', 'err');
      }
    } catch (err: any) {
      console.error('Failed to reset database', err);
      const errMsg = err.response?.data?.message || 'Error occurred during database reset.';
      showToast(errMsg, 'err');
    } finally {
      setIsResetting(false);
    }
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
    { path: '/admin/staff', label: 'Staff Management', icon: <UserIcon size={18} /> },
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
    return current ? `${current.label} ${user?.role === 'billing' ? 'Workstation' : 'Overview'}` : 'CreoCorpBilling';
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
            <span>CreoCorpBilling</span>
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
          {user?.role === 'admin' && (
            <button 
              onClick={() => setShowResetModal(true)}
              className="w-full mb-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-500/20 hover:text-red-300 transition-all duration-200"
            >
              <Trash2 size={14} className="animate-pulse" />
              <span>Reset Database Tables</span>
            </button>
          )}
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

      {/* ── RESET DATABASE MODAL ── */}
      {showResetModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 backdrop-blur-sm animate-fade-in">
          <div className="w-[450px] bg-[#161e28] border border-red-500/30 rounded-2xl p-6 shadow-2xl transform scale-100 transition-all duration-300 animate-scale-in">
            <div className="flex items-center gap-3 border-b border-[#1e2d3d] pb-4 mb-4">
              <div className="p-2.5 bg-red-500/10 rounded-xl text-red-500">
                <Trash2 size={22} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#e8edf2]">Reset Database Tables</h3>
                <p className="text-[11px] text-[#5a6a7a]">System Administrator Privilege (Ctrl+Alt+R)</p>
              </div>
            </div>

            <div className="space-y-3.5 mb-6 text-sm text-[#e8edf2]/80 leading-relaxed">
              <p>
                This action will <strong className="text-red-400">permanently delete</strong> all records from the following tables:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-[#5a6a7a] bg-[#0d1117] p-3 rounded-lg border border-[#1e2d3d]">
                <li><strong className="text-[#e8edf2]">Customers</strong> (All registered clients)</li>
                <li><strong className="text-[#e8edf2]">Services</strong> (All services catalog items)</li>
                <li><strong className="text-[#e8edf2]">Transactions</strong> (All sales, billing, and checkout history)</li>
                <li><strong className="text-[#e8edf2]">Expenses</strong> (All logged operational costs)</li>
                <li><strong className="text-[#e8edf2]">Billing Logins</strong> (All cashier profiles, keeping only <span className="text-[#c9a84c]">admin</span>)</li>
              </ul>
              <p className="text-xs text-[#5a6a7a]">
                To confirm this operation, please type <span className="text-red-400 font-mono font-bold bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/25">RESET</span> below.
              </p>
              <input
                type="text"
                placeholder="Type RESET to confirm"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs font-mono text-[#e8edf2] focus:border-red-500 outline-none transition-all duration-200"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setResetConfirmText('');
                }}
                className="px-4 py-2 border border-[#1e2d3d] hover:bg-white/5 rounded-lg text-xs font-bold text-[#5a6a7a] hover:text-[#e8edf2] transition-all"
              >
                Cancel
              </button>
              <button
                disabled={resetConfirmText !== 'RESET' || isResetting}
                onClick={handleResetDatabase}
                className="px-5 py-2 bg-red-500/10 hover:bg-red-500 border border-red-500/35 hover:border-red-600 rounded-lg text-red-500 hover:text-white text-xs font-bold transition-all duration-200 disabled:opacity-40 disabled:hover:bg-red-500/10 disabled:hover:text-red-500 disabled:hover:border-red-500/35 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isResetting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-current border-t-transparent animate-spin rounded-full" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Reset System Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export const useDashboardContext = () => {
  return useOutletContext<{ isOnline: boolean }>();
};
