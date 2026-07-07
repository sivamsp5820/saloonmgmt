import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { DashboardStats } from '../types';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

// Register ChartJS modules
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export const AdminDashboard: React.FC = () => {
  const [period, setPeriod] = useState<string>('day');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.get('/reports/dashboard', {
        params: { period, user: userFilter },
      });
      if (res.data.status === 'success') {
        setStats(res.data.data);
      }
    } catch (err: any) {
      setErrorMsg('Failed to load dashboard metrics. Check backend connection.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period, userFilter]);

  // Loader Placeholder
  if (isLoading && !stats) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#c9a84c] border-t-transparent" />
          <p className="text-xs text-[#c9a84c] uppercase tracking-wider font-semibold">Generating Reports...</p>
        </div>
      </div>
    );
  }

  // Error boundary fallback
  if (errorMsg) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center text-[#ff8080] my-8">
        <p className="font-bold">Error loading reports</p>
        <p className="text-xs mt-1">{errorMsg}</p>
        <button onClick={fetchStats} className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/35 border border-red-500/35 rounded-lg text-xs font-bold transition-all">
          Retry Reload
        </button>
      </div>
    );
  }

  // Chart datasets configuration
  const pieLabels = stats?.revenueByService.map((s) => s.serviceName) || [];
  const pieValues = stats?.revenueByService.map((s) => s.value) || [];
  const chartColors = [
    '#c9a84c', '#00c97a', '#4a9eff', '#e05555', '#e8c96a',
    '#a07830', '#2a8a5a', '#1a6acc', '#882222'
  ];

  const doughnutData = {
    labels: pieLabels,
    datasets: [
      {
        data: pieValues,
        backgroundColor: chartColors.slice(0, pieLabels.length),
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  };

  const barLabels = stats?.revenueTrend.map((t) => t.label) || [];
  const barValues = stats?.revenueTrend.map((t) => t.value) || [];

  const barData = {
    labels: barLabels,
    datasets: [
      {
        data: barValues,
        backgroundColor: 'rgba(201,168,76,.55)',
        borderColor: '#c9a84c',
        borderWidth: 2,
        borderRadius: 5,
      },
    ],
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* ── Filters ── */}
      <div className="flex gap-3.5 items-center">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="bg-[#1c2532] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs font-medium text-[#e8edf2] focus:border-[#c9a84c] outline-none"
        >
          <option value="day">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>

        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="bg-[#1c2532] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs font-medium text-[#e8edf2] focus:border-[#c9a84c] outline-none"
        >
          <option value="all">All Terminals</option>
          <option value="billing1">Counter Cashier Terminal 1</option>
          <option value="billing2">Counter Cashier Terminal 2</option>
        </select>
      </div>

      {/* ── Stats KPI Indicators ── */}
      <div className="grid grid-cols-4 gap-4">
        
        {/* Rev */}
        <div className="bg-[#161e28] border border-[#1e2d3d] rounded-xl p-5 relative overflow-hidden">
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-[#c9a84c]/5 pointer-events-none" />
          <span className="text-2xl mb-2.5 block">💰</span>
          <p className="text-2xl font-extrabold text-[#c9a84c] mb-1">₹{stats?.netRevenue.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-[#5a6a7a] font-bold uppercase tracking-wider">Net Revenue</span>
        </div>

        {/* Bills */}
        <div className="bg-[#161e28] border border-[#1e2d3d] rounded-xl p-5 relative overflow-hidden">
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-[#00c97a]/5 pointer-events-none" />
          <span className="text-2xl mb-2.5 block">🧾</span>
          <p className="text-2xl font-extrabold text-[#00c97a] mb-1">{stats?.transactionsCount}</p>
          <span className="text-[10px] text-[#5a6a7a] font-bold uppercase tracking-wider">Transactions</span>
        </div>

        {/* Customers */}
        <div className="bg-[#161e28] border border-[#1e2d3d] rounded-xl p-5 relative overflow-hidden">
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-[#4a9eff]/5 pointer-events-none" />
          <span className="text-2xl mb-2.5 block">👤</span>
          <p className="text-2xl font-extrabold text-[#4a9eff] mb-1">{stats?.customersCount}</p>
          <span className="text-[10px] text-[#5a6a7a] font-bold uppercase tracking-wider">Customers</span>
        </div>

        {/* Services */}
        <div className="bg-[#161e28] border border-[#1e2d3d] rounded-xl p-5 relative overflow-hidden">
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-red-500/5 pointer-events-none" />
          <span className="text-2xl mb-2.5 block">✂️</span>
          <p className="text-2xl font-extrabold text-red-300 mb-1">{stats?.totalServicesCount}</p>
          <span className="text-[10px] text-[#5a6a7a] font-bold uppercase tracking-wider">Services Done</span>
        </div>

      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-2 gap-5">
        
        {/* Doughnut */}
        <div className="bg-[#161e28] border border-[#1e2d3d] rounded-xl p-5">
          <div className="border-b border-[#1e2d3d] pb-3 mb-4">
            <span className="text-xs font-bold text-[#c9a84c] uppercase tracking-wider">Revenue by Service</span>
          </div>
          <div className="relative h-64 flex items-center justify-center">
            {pieLabels.length > 0 ? (
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                      labels: { color: '#5a6a7a', font: { size: 9 }, padding: 8 }
                    },
                    tooltip: {
                      callbacks: {
                        label: (c) => ` ₹${c.parsed.toLocaleString('en-IN')}`
                      }
                    }
                  }
                }}
              />
            ) : (
              <p className="text-xs text-[#5a6a7a] italic">No transaction data</p>
            )}
          </div>
        </div>

        {/* Bar */}
        <div className="bg-[#161e28] border border-[#1e2d3d] rounded-xl p-5">
          <div className="border-b border-[#1e2d3d] pb-3 mb-4">
            <span className="text-xs font-bold text-[#c9a84c] uppercase tracking-wider">Revenue Trend</span>
          </div>
          <div className="relative h-64 flex items-center justify-center">
            {barLabels.length > 0 ? (
              <Bar
                data={barData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (c) => ` ₹${c.parsed.y?.toLocaleString('en-IN') || c.raw}`
                      }
                    }
                  },
                  scales: {
                    x: {
                      ticks: { color: '#5a6a7a', font: { size: 9 } },
                      grid: { color: 'rgba(255,255,255,.03)' }
                    },
                    y: {
                      ticks: { color: '#5a6a7a', font: { size: 9 }, callback: (v) => '₹' + v },
                      grid: { color: 'rgba(255,255,255,.03)' }
                    }
                  }
                }}
              />
            ) : (
              <p className="text-xs text-[#5a6a7a] italic">No trend data</p>
            )}
          </div>
        </div>

      </div>

      {/* ── Recent Transactions Table ── */}
      <div className="bg-[#161e28] border border-[#1e2d3d] rounded-xl p-5">
        <div className="border-b border-[#1e2d3d] pb-3 mb-4">
          <span className="text-xs font-bold text-[#c9a84c] uppercase tracking-wider">Recent Transactions</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1e2d3d]">
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Date & Time</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Customer</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Services</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Terminal</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Amount</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Mode</th>
              </tr>
            </thead>
            <tbody>
              {stats && stats.recentTransactions.length > 0 ? (
                stats.recentTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-[#1e2d3d]/50 hover:bg-white/[0.02] transition-all">
                    <td className="p-3 text-xs text-[#5a6a7a]">{new Date(tx.created_at).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-xs font-bold">{tx.customerName}</td>
                    <td className="p-3 text-[11px] max-w-[200px] truncate">{tx.services}</td>
                    <td className="p-3 text-xs">
                      <span className="bg-[#4a9eff]/10 border border-[#4a9eff]/25 rounded text-[#4a9eff] px-2 py-0.5 text-[10px] font-bold uppercase">
                        {tx.billedByName}
                      </span>
                    </td>
                    <td className="p-3 text-xs font-black text-[#c9a84c]">₹{tx.total.toFixed(2)}</td>
                    <td className="p-3 text-xs">
                      <span className="bg-[#00c97a]/10 border border-[#00c97a]/25 rounded text-[#00c97a] px-2 py-0.5 text-[10px] font-bold uppercase">
                        {tx.paymentMode}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-xs text-[#5a6a7a] italic">
                    No transactions captured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
