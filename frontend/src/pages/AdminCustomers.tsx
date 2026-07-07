import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { Customer } from '../types';

export const AdminCustomers: React.FC = () => {
  const [search, setSearch] = useState<string>('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Edit Customer States
  const [editCust, setEditCust] = useState<Customer | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // History Detail states
  const [historyCust, setHistoryCust] = useState<Customer | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/customers', { params: { search } });
      if (res.data.status === 'success') {
        setCustomers(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load customers list.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const handleEditClick = (cust: Customer) => {
    setEditCust(cust);
    setEditName(cust.name);
    setEditPhone(cust.phone === '—' ? '' : cust.phone);
  };

  const handleSaveEdit = async () => {
    if (!editCust) return;
    try {
      const res = await apiClient.put(`/customers/${editCust.id}`, {
        name: editName,
        phone: editPhone,
      });

      if (res.data.status === 'success') {
        setEditCust(null);
        fetchCustomers();
      }
    } catch (err) {
      alert('Failed to update customer.');
    }
  };

  const handleDeleteClick = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer? Historical bills will be retained as Guest.')) return;
    try {
      const res = await apiClient.delete(`/customers/${id}`);
      if (res.data.status === 'success') {
        fetchCustomers();
      }
    } catch (err) {
      alert('Failed to delete customer.');
    }
  };

  const handleViewHistory = async (cust: Customer) => {
    setHistoryCust(cust);
    setHistoryLoading(true);
    try {
      const res = await apiClient.get(`/customers/${cust.id}/history`);
      if (res.data.status === 'success') {
        setHistoryList(res.data.data.history || []);
      }
    } catch (err) {
      console.error('Failed to load customer history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* ── Search Bar ── */}
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name or phone..."
          className="bg-[#1c2532] border border-[#1e2d3d] rounded-lg px-3 py-2.5 text-xs font-medium text-[#e8edf2] placeholder-[#5a6a7a] focus:border-[#c9a84c] outline-none w-72"
        />
        <p className="text-xs text-[#5a6a7a]">
          Sorted by <span className="text-[#c9a84c] font-black">Total Spend</span> (Descending)
        </p>
      </div>

      {/* ── Customers Table ── */}
      <div className="bg-[#161e28] border border-[#1e2d3d] rounded-xl p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1e2d3d]">
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Customer Name</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Phone</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Visits Count</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Total Spend</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Last Visit</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-xs text-[#5a6a7a]">
                    <div className="w-6 h-6 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading client roster...
                  </td>
                </tr>
              ) : customers.length > 0 ? (
                customers.map((c) => (
                  <tr key={c.id} className="border-b border-[#1e2d3d]/50 hover:bg-white/[0.02] transition-all">
                    <td className="p-3 text-xs font-bold text-[#e8edf2]">{c.name}</td>
                    <td className="p-3 text-xs text-[#5a6a7a]">{c.phone}</td>
                    <td className="p-3 text-xs font-bold">{c.visits}</td>
                    <td className="p-3 text-xs font-black text-[#c9a84c]">₹{c.totalSpent?.toFixed(2) || '0.00'}</td>
                    <td className="p-3 text-xs text-[#5a6a7a]">
                      {c.lastVisit ? new Date(c.lastVisit).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="p-3 text-xs flex gap-2">
                      <button
                        onClick={() => handleViewHistory(c)}
                        className="px-2.5 py-1 border border-[#00c97a]/25 text-[#00c97a] rounded hover:bg-[#00c97a]/10 text-[10px] font-bold transition-all"
                      >
                        📜 History
                      </button>
                      <button
                        onClick={() => handleEditClick(c)}
                        className="px-2.5 py-1 border border-[#c9a84c]/25 text-[#c9a84c] rounded hover:bg-[#c9a84c]/10 text-[10px] font-bold transition-all"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(c.id)}
                        className="px-2.5 py-1 border border-red-500/25 text-[#ff8080] rounded hover:bg-red-500/10 text-[10px] font-bold transition-all"
                      >
                        🗑 Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-xs text-[#5a6a7a] italic">
                    No customers registered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Edit Customer Modal ── */}
      {editCust && (
        <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#1c2532] border border-[#c9a84c]/25 rounded-2xl p-6 w-[400px] max-w-full">
            <h3 className="text-base font-bold text-[#c9a84c] mb-5">✏️ Edit Customer Profile</h3>
            
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
                <label className="text-[10px] font-bold uppercase text-[#c9a84c] tracking-wider">Phone number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditCust(null)}
                className="px-4 py-2 border border-[#1e2d3d] text-[#5a6a7a] rounded-lg text-xs font-bold hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0d1117] rounded-lg text-xs font-bold hover:shadow-lg transition-all"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Purchase History Modal ── */}
      {historyCust && (
        <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#1c2532] border border-[#1e2d3d] rounded-2xl p-6 w-[650px] max-w-full flex flex-col max-h-[85vh]">
            
            <div className="border-b border-[#1e2d3d] pb-3 mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-[#c9a84c]">{historyCust.name}</h3>
                <p className="text-[11px] text-[#5a6a7a]">Visit log and treatments completed</p>
              </div>
              <button 
                onClick={() => setHistoryCust(null)}
                className="text-[#5a6a7a] hover:text-[#e8edf2] text-xl font-bold p-1 select-none"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
              {historyLoading ? (
                <div className="py-12 text-center text-xs text-[#5a6a7a]">
                  <div className="w-6 h-6 border-2 border-[#00c97a] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Compiling billing records...
                </div>
              ) : historyList.length > 0 ? (
                historyList.map((tx) => (
                  <div key={tx.id} className="bg-[#0d1117] border border-[#1e2d3d] rounded-xl p-4 flex justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] text-[#5a6a7a] font-bold">
                        {new Date(tx.created_at).toLocaleString('en-IN')}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {tx.services.map((s: any, idx: number) => (
                          <span 
                            key={idx}
                            className="bg-[#c9a84c]/10 border border-[#c9a84c]/20 text-[#c9a84c] text-[10px] font-bold rounded-full px-3 py-1"
                          >
                            {s.name} (₹{s.price})
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right flex flex-col justify-between flex-shrink-0">
                      <p className="text-xs text-[#5a6a7a] uppercase tracking-wider">{tx.payment_mode}</p>
                      <p className="text-sm font-black text-[#c9a84c]">₹{tx.total.toFixed(2)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-12 text-center text-xs text-[#5a6a7a] italic">
                  No treatments registered.
                </p>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
export default AdminCustomers;
