import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { Transaction } from '../types';

export const AdminSales: React.FC = () => {
  const [period, setPeriod] = useState<string>('day');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [sales, setSales] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Edit Invoice states
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [editName, setEditName] = useState('');
  const [editTotal, setEditTotal] = useState<number>(0);
  const [editMode, setEditMode] = useState<'Cash' | 'UPI' | 'Card' | 'Net Banking'>('Cash');

  // Stats
  const [netRevenue, setNetRevenue] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [uniqueCusts, setUniqueCusts] = useState(0);
  const [totalDiscounts, setTotalDiscounts] = useState(0);

  const fetchSales = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/transactions', {
        params: { period, user: userFilter, search },
      });
      if (res.data.status === 'success') {
        const data = res.data.data || [];
        setSales(data);

        // Aggregate statistics on frontend
        const totalRev = data.reduce((sum: number, t: any) => sum + parseFloat(t.total), 0);
        const totalDisc = data.reduce((sum: number, t: any) => sum + parseFloat(t.discount_amount), 0);
        const customers = new Set(data.map((t: any) => t.customerPhone || t.customerName));

        setNetRevenue(totalRev);
        setTxCount(data.length);
        setUniqueCusts(customers.size);
        setTotalDiscounts(totalDisc);
      }
    } catch (err) {
      console.error('Failed to load transaction reports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [period, userFilter, search]);

  const handleDownloadCSV = () => {
    let csv = 'Date/Time,Customer,Phone,Services,Discount,Total,Payment,Terminal\n';
    sales.forEach((b) => {
      const servicesStr = b.services.map((s) => s.name).join('|');
      const discStr = b.discount_value ? (b.discount_type === 'percent' ? `${b.discount_value}%` : `₹${b.discount_value}`) : '';
      csv += `"${new Date(b.created_at).toLocaleString('en-IN')}","${b.customerName}","${b.customerPhone || ''}","${servicesStr}","${discStr}","${b.total.toFixed(2)}","${b.paymentMode}","${b.billedByName}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_report_${period}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditClick = (tx: Transaction) => {
    setEditTx(tx);
    setEditName(tx.customerName);
    setEditTotal(tx.total);
    setEditMode(tx.paymentMode);
  };

  const handleSaveEdit = async () => {
    if (!editTx) return;
    try {
      const res = await apiClient.put(`/transactions/${editTx.id}`, {
        customerName: editName,
        total: editTotal,
        paymentMode: editMode,
      });

      if (res.data.status === 'success') {
        setEditTx(null);
        fetchSales();
      }
    } catch (err) {
      alert('Failed to update invoice.');
    }
  };

  const handleDeleteClick = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice? This action is irreversible.')) return;
    try {
      const res = await apiClient.delete(`/transactions/${id}`);
      if (res.data.status === 'success') {
        fetchSales();
      }
    } catch (err) {
      alert('Failed to delete invoice.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* ── Filters & Action Row ── */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex gap-3 items-center">
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

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer or service..."
            className="bg-[#1c2532] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs font-medium text-[#e8edf2] placeholder-[#5a6a7a] focus:border-[#c9a84c] outline-none w-56"
          />
        </div>

        <button
          onClick={handleDownloadCSV}
          className="px-4 py-2 border border-[#c9a84c]/25 hover:bg-[#c9a84c]/10 rounded-lg text-xs font-bold text-[#c9a84c] transition-all"
        >
          ⬇ Download CSV
        </button>
      </div>

      {/* ── KPI Widgets ── */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#161e28] border border-[#1e2d3d] rounded-xl p-5">
          <span className="text-xl mb-2.5 block">💰</span>
          <p className="text-xl font-extrabold text-[#c9a84c] mb-0.5">₹{netRevenue.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-[#5a6a7a] font-bold uppercase tracking-wider">Net Revenue</span>
        </div>

        <div className="bg-[#161e28] border border-[#1e2d3d] rounded-xl p-5">
          <span className="text-xl mb-2.5 block">🧾</span>
          <p className="text-xl font-extrabold text-[#00c97a] mb-0.5">{txCount}</p>
          <span className="text-[10px] text-[#5a6a7a] font-bold uppercase tracking-wider">Transactions</span>
        </div>

        <div className="bg-[#161e28] border border-[#1e2d3d] rounded-xl p-5">
          <span className="text-xl mb-2.5 block">👤</span>
          <p className="text-xl font-extrabold text-[#4a9eff] mb-0.5">{uniqueCusts}</p>
          <span className="text-[10px] text-[#5a6a7a] font-bold uppercase tracking-wider">Unique Customers</span>
        </div>

        <div className="bg-[#161e28] border border-[#1e2d3d] rounded-xl p-5">
          <span className="text-xl mb-2.5 block">🏷️</span>
          <p className="text-xl font-extrabold text-red-300 mb-0.5">₹{totalDiscounts.toFixed(0)}</p>
          <span className="text-[10px] text-[#5a6a7a] font-bold uppercase tracking-wider">Total Discounts</span>
        </div>
      </div>

      {/* ── Data Table ── */}
      <div className="bg-[#161e28] border border-[#1e2d3d] rounded-xl p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1e2d3d]">
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Date/Time</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Customer</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Phone</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Services</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Discount</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Total</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Mode</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Terminal</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center p-8 text-xs text-[#5a6a7a]">
                    <div className="w-6 h-6 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading transaction logs...
                  </td>
                </tr>
              ) : sales.length > 0 ? (
                sales.map((tx) => {
                  const discStr = tx.discount_value ? (tx.discount_type === 'percent' ? `${tx.discount_value}%` : `₹${tx.discount_value}`) : '—';
                  return (
                    <tr key={tx.id} className="border-b border-[#1e2d3d]/50 hover:bg-white/[0.02] transition-all">
                      <td className="p-3 text-xs text-[#5a6a7a]">{new Date(tx.created_at).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-xs font-bold">{tx.customerName}</td>
                      <td className="p-3 text-xs text-[#5a6a7a]">{tx.customerPhone || '—'}</td>
                      <td className="p-3 text-[11px] max-w-[200px] truncate">
                        {tx.services.map((s) => s.name).join(', ')}
                      </td>
                      <td className="p-3 text-xs text-[#5a6a7a]">{discStr}</td>
                      <td className="p-3 text-xs font-extrabold text-[#c9a84c]">₹{tx.total.toFixed(2)}</td>
                      <td className="p-3 text-xs">
                        <span className="bg-[#00c97a]/10 border border-[#00c97a]/25 rounded text-[#00c97a] px-2 py-0.5 text-[10px] font-bold uppercase">
                          {tx.paymentMode}
                        </span>
                      </td>
                      <td className="p-3 text-xs">
                        <span className="bg-[#4a9eff]/10 border border-[#4a9eff]/25 rounded text-[#4a9eff] px-2 py-0.5 text-[10px] font-bold uppercase">
                          {tx.billedByName}
                        </span>
                      </td>
                      <td className="p-3 text-xs flex gap-2">
                        <button
                          onClick={() => handleEditClick(tx)}
                          className="px-2.5 py-1 border border-[#c9a84c]/25 text-[#c9a84c] rounded hover:bg-[#c9a84c]/10 text-[10px] font-bold transition-all"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(tx.id)}
                          className="px-2.5 py-1 border border-red-500/25 text-[#ff8080] rounded hover:bg-red-500/10 text-[10px] font-bold transition-all"
                        >
                          🗑 Del
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="text-center p-8 text-xs text-[#5a6a7a] italic">
                    No transactions match current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Edit Invoice Modal ── */}
      {editTx && (
        <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#1c2532] border border-[#c9a84c]/25 rounded-2xl p-6 w-[450px] max-w-full">
            <h3 className="text-base font-bold text-[#c9a84c] mb-5">✏️ Edit Invoice Details</h3>
            
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[#c9a84c] tracking-wider">Customer Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[#c9a84c] tracking-wider">Total Price (₹)</label>
                <input
                  type="number"
                  value={editTotal}
                  onChange={(e) => setEditTotal(parseFloat(e.target.value) || 0)}
                  className="bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[#c9a84c] tracking-wider">Payment Mode</label>
                <select
                  value={editMode}
                  onChange={(e: any) => setEditMode(e.target.value)}
                  className="bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c]"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="Net Banking">Net Banking</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditTx(null)}
                className="px-4 py-2 border border-[#1e2d3d] text-[#5a6a7a] rounded-lg text-xs font-bold hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0d1117] rounded-lg text-xs font-bold hover:shadow-lg transition-all"
              >
                Save Invoice
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default AdminSales;
