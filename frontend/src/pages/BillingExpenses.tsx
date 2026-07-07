import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { Expense } from '../types';

export const BillingExpenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Add Expense states
  const [showModal, setShowModal] = useState<boolean>(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<'Product Purchase' | 'Utilities' | 'Maintenance' | 'Salary' | 'Rent' | 'Marketing' | 'Other'>('Other');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Card' | 'Net Banking'>('Cash');
  const [note, setNote] = useState('');

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      // Limit cashiers to viewing current month records for their terminal
      const res = await apiClient.get('/expenses', {
        params: { period: 'month', user: 'all' },
      });
      if (res.data.status === 'success') {
        setExpenses(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load expenses.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleOpenAdd = () => {
    setDesc('');
    setAmount(0);
    setCategory('Other');
    setPaymentMode('Cash');
    setNote('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || amount <= 0) {
      alert('Description and amount are required.');
      return;
    }

    try {
      const payload = { description: desc, amount, category, payment_mode: paymentMode, note };
      const res = await apiClient.post('/expenses', payload);
      if (res.data.status === 'success') {
        setShowModal(false);
        fetchExpenses();
      }
    } catch (err) {
      alert('Failed to log expense.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* ── Action Header ── */}
      <div className="flex justify-between items-center gap-4">
        <div>
          <h3 className="text-xs text-[#5a6a7a] font-bold uppercase tracking-wider">Outflow Management</h3>
          <p className="text-[11px] text-[#5a6a7a] mt-0.5">Workstation log for this month</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0d1117] font-black rounded-lg text-xs tracking-wide hover:shadow-[0_8px_24px_rgba(201,168,76,0.3)] transition-all"
        >
          ➕ Log Expense
        </button>
      </div>

      {/* ── Expenses Log Table ── */}
      <div className="bg-[#161e28] border border-[#1e2d3d] rounded-xl p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1e2d3d]">
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Date</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Description</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Category</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Amount</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Payment</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Operator</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-xs text-[#5a6a7a]">
                    <div className="w-6 h-6 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading expenses...
                  </td>
                </tr>
              ) : expenses.length > 0 ? (
                expenses.map((e) => (
                  <tr key={e.id} className="border-b border-[#1e2d3d]/50 hover:bg-white/[0.02] transition-all">
                    <td className="p-3 text-xs text-[#5a6a7a]">{new Date(e.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="p-3 text-xs font-bold">{e.description}</td>
                    <td className="p-3 text-xs text-[#c9a84c]">{e.category}</td>
                    <td className="p-3 text-xs font-extrabold text-[#c9a84c]">₹{parseFloat(e.amount as any).toFixed(2)}</td>
                    <td className="p-3 text-xs text-[#5a6a7a]">{e.payment_mode}</td>
                    <td className="p-3 text-xs">
                      <span className="bg-[#4a9eff]/10 border border-[#4a9eff]/25 rounded text-[#4a9eff] px-2 py-0.5 text-[10px] font-bold uppercase">
                        {e.recordedByName}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-[#5a6a7a] max-w-[150px] truncate">{e.note || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-xs text-[#5a6a7a] italic">
                    No workstation expenses logged this month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Log Expense Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-[#1c2532] border border-[#c9a84c]/25 rounded-2xl p-6 w-[450px] max-w-full">
            <h3 className="text-base font-bold text-[#c9a84c] mb-5">➕ Record Workstation Expense</h3>
            
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[#c9a84c] tracking-wider">Description</label>
                <input
                  type="text"
                  required
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="e.g. Purchased shampoo bottles"
                  className="bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[#c9a84c] tracking-wider">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    placeholder="Amount paid"
                    className="bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[#c9a84c] tracking-wider">Category</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c]"
                  >
                    <option value="Product Purchase">Product Purchase</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Salary">Salary</option>
                    <option value="Rent">Rent</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[#c9a84c] tracking-wider">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e: any) => setPaymentMode(e.target.value)}
                  className="bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c]"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="Net Banking">Net Banking</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[#c9a84c] tracking-wider">Note (Optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Additional logs..."
                  className="bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c] h-20 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-[#1e2d3d] text-[#5a6a7a] rounded-lg text-xs font-bold hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0d1117] rounded-lg text-xs font-bold hover:shadow-lg transition-all"
              >
                Log Outflow
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
export default BillingExpenses;
