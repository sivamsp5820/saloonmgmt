import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { PaymentStats } from '../types';

export const AdminPayments: React.FC = () => {
  const [period, setPeriod] = useState<string>('month');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [report, setReport] = useState<PaymentStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchPaymentReport = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/reports/payments', {
        params: { period, user: userFilter },
      });
      if (res.data.status === 'success') {
        setReport(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load payment mode analytics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentReport();
  }, [period, userFilter]);

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
          <option value="billing1">Terminal 1</option>
          <option value="billing2">Terminal 2</option>
        </select>
      </div>

      {/* ── Collection aggregates ── */}
      <div className="grid grid-cols-4 gap-4">
        {report?.stats.map((s, idx) => {
          const emoji = s.paymentMode === 'Cash' ? '💵' : s.paymentMode === 'UPI' ? '📱' : s.paymentMode === 'Card' ? '💳' : '🌐';
          return (
            <div key={idx} className="bg-[#161e28] border border-[#1e2d3d] rounded-xl p-5 relative overflow-hidden">
              <span className="text-xl mb-2 block">{emoji}</span>
              <h4 className="text-xs text-[#5a6a7a] font-bold uppercase tracking-wider mb-1">{s.paymentMode} Collected</h4>
              <p className="text-xl font-extrabold text-[#c9a84c] mb-0.5">₹{s.total.toLocaleString('en-IN')}</p>
              <div className="flex justify-between items-center text-[10px] text-[#5a6a7a] mt-2 border-t border-[#1e2d3d] pt-2">
                <span>{s.count} txs ({s.percentage}%)</span>
                <span>Avg: ₹{s.avg}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Transaction breakdown ── */}
      <div className="bg-[#161e28] border border-[#1e2d3d] rounded-xl p-5">
        <div className="border-b border-[#1e2d3d] pb-3 mb-4 flex justify-between items-center">
          <span className="text-xs font-bold text-[#c9a84c] uppercase tracking-wider">Detailed Collection Log</span>
          <span className="text-xs text-[#5a6a7a]">Grand collection total: <strong className="text-[#c9a84c]">₹{report?.grandTotal.toLocaleString('en-IN') || '0.00'}</strong></span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1e2d3d]">
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Timestamp</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Customer</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Services Rendition</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Billed By</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Amount</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Payment Mode</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-xs text-[#5a6a7a]">
                    <div className="w-6 h-6 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Compiling payment details...
                  </td>
                </tr>
              ) : report && report.detailedTx.length > 0 ? (
                report.detailedTx.map((tx) => (
                  <tr key={tx.id} className="border-b border-[#1e2d3d]/50 hover:bg-white/[0.02] transition-all">
                    <td className="p-3 text-xs text-[#5a6a7a]">{new Date(tx.created_at).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-xs font-bold">{tx.customerName}</td>
                    <td className="p-3 text-[11px] max-w-[200px] truncate">{tx.services}</td>
                    <td className="p-3 text-xs">
                      <span className="bg-[#4a9eff]/10 border border-[#4a9eff]/25 rounded text-[#4a9eff] px-2 py-0.5 text-[10px] font-bold uppercase">
                        {tx.billedByName}
                      </span>
                    </td>
                    <td className="p-3 text-xs font-extrabold text-[#c9a84c]">₹{parseFloat(tx.total as any).toFixed(2)}</td>
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
                    No transactions collected.
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
export default AdminPayments;
