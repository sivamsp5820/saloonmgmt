import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { Customer } from '../types';

interface ServiceItem {
  id: string;
  name: string;
  price: number;
}

interface VisitTransaction {
  id: string;
  created_at: string;
  subtotal: number;
  discount_type: 'percent' | 'rupees';
  discount_value: number;
  discount_amount: number;
  total: number;
  payment_mode: string;
  billedBy?: string;
  billedByName?: string;
  services: ServiceItem[];
}

export const AdminCustomerVisitHistory: React.FC = () => {
  const [search, setSearch] = useState<string>('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [visitHistory, setVisitHistory] = useState<VisitTransaction[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState<boolean>(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  const fetchCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const res = await apiClient.get('/customers', { params: { search } });
      if (res.data.status === 'success') {
        const data: Customer[] = res.data.data || [];
        setCustomers(data);
        if (data.length > 0 && !selectedCust) {
          setSelectedCust(data[0]);
        } else if (data.length === 0) {
          setSelectedCust(null);
        }
      }
    } catch (err) {
      console.error('Failed to search customer records.');
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  useEffect(() => {
    if (selectedCust) {
      fetchCustomerHistory(selectedCust.id);
    } else {
      setVisitHistory([]);
    }
  }, [selectedCust]);

  const fetchCustomerHistory = async (id: string) => {
    setIsLoadingHistory(true);
    try {
      const res = await apiClient.get(`/customers/${id}/history`);
      if (res.data.status === 'success') {
        setVisitHistory(res.data.data.history || []);
      }
    } catch (err) {
      console.error('Failed to load visit history for customer.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* ── Search Header ── */}
      <div className="flex justify-between items-center gap-4 flex-wrap bg-[#161e28] border border-[#1e2d3d] rounded-xl p-5">
        <div>
          <h3 className="text-sm font-bold text-[#c9a84c] uppercase tracking-wider">Customer Visit History Search</h3>
          <p className="text-xs text-[#5a6a7a] mt-0.5">Search customer records by Name or Mobile Number to view total visits and bill details</p>
        </div>
        
        <div className="relative w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Name or Mobile Number..."
            className="w-full bg-[#0d1117] border border-[#1e2d3d] rounded-lg pl-9 pr-3 py-2.5 text-xs text-[#e8edf2] placeholder-[#5a6a7a] focus:border-[#c9a84c] outline-none transition-all"
          />
          <span className="absolute left-3 top-2.5 text-xs text-[#5a6a7a]">🔍</span>
        </div>
      </div>

      {/* ── Main Layout: Customer Selector List & History View ── */}
      <div className="grid grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Customer Directory Roster */}
        <div className="col-span-4 bg-[#161e28] border border-[#1e2d3d] rounded-xl p-4 flex flex-col gap-3 max-h-[calc(100vh-250px)] overflow-hidden">
          <div className="flex justify-between items-center pb-2 border-b border-[#1e2d3d]">
            <span className="text-xs font-bold text-[#5a6a7a] uppercase tracking-wider">Matched Customers</span>
            <span className="text-[10px] bg-[#c9a84c]/10 text-[#c9a84c] px-2 py-0.5 rounded-full font-bold">
              {customers.length} records
            </span>
          </div>

          <div className="overflow-y-auto flex flex-col gap-2 pr-1">
            {isLoadingCustomers ? (
              <div className="py-12 text-center text-xs text-[#5a6a7a]">
                <div className="w-5 h-5 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Searching records...
              </div>
            ) : customers.length > 0 ? (
              customers.map((c) => {
                const isSelected = selectedCust?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCust(c)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#1c2532] border-[#c9a84c] shadow-lg shadow-[#c9a84c]/5'
                        : 'bg-[#0d1117] border-[#1e2d3d] hover:border-[#1e2d3d]/80 hover:bg-[#0d1117]/80'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-xs font-bold text-[#e8edf2]">{c.name}</h4>
                      <span className="text-[10px] font-black bg-[#00c97a]/10 border border-[#00c97a]/20 text-[#00c97a] px-2 py-0.5 rounded-full">
                        {c.visits} {c.visits === 1 ? 'visit' : 'visits'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-[#5a6a7a]">
                      <span>📱 {c.phone || 'No phone'}</span>
                      <span className="font-extrabold text-[#c9a84c]">₹{(c.totalSpent || 0).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-xs text-[#5a6a7a] italic">
                No customer found matching "{search}".
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Detailed Customer History View */}
        <div className="col-span-8 bg-[#161e28] border border-[#1e2d3d] rounded-xl p-5 flex flex-col min-h-[calc(100vh-250px)]">
          {selectedCust ? (
            <>
              {/* Selected Customer Header Banner */}
              <div className="border-b border-[#1e2d3d] pb-4 mb-5 flex justify-between items-center flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-[#c9a84c]">{selectedCust.name}</h3>
                    <span className="text-xs text-[#5a6a7a] font-mono">({selectedCust.phone})</span>
                  </div>
                  <p className="text-[11px] text-[#5a6a7a] mt-0.5">Complete visit timeline, bill breakdowns, and services requested</p>
                </div>

                <div className="flex gap-4">
                  <div className="bg-[#0d1117] border border-[#1e2d3d] px-4 py-2 rounded-xl text-center">
                    <span className="text-[9px] text-[#5a6a7a] font-black uppercase tracking-wider block">Total Visits</span>
                    <span className="text-base font-extrabold text-[#00c97a]">{selectedCust.visits}</span>
                  </div>

                  <div className="bg-[#0d1117] border border-[#1e2d3d] px-4 py-2 rounded-xl text-center">
                    <span className="text-[9px] text-[#5a6a7a] font-black uppercase tracking-wider block">Total Spend</span>
                    <span className="text-base font-extrabold text-[#c9a84c]">₹{(selectedCust.totalSpent || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Visit History List */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
                {isLoadingHistory ? (
                  <div className="py-16 text-center text-xs text-[#5a6a7a]">
                    <div className="w-6 h-6 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Fetching visit details & bill breakdowns...
                  </div>
                ) : visitHistory.length > 0 ? (
                  visitHistory.map((tx, idx) => {
                    const visitNum = visitHistory.length - idx;
                    const formattedDate = new Date(tx.created_at).toLocaleString('en-IN', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    const discStr = tx.discount_value
                      ? (tx.discount_type === 'percent' ? `${tx.discount_value}%` : `₹${tx.discount_value}`)
                      : 'None';

                    return (
                      <div key={tx.id} className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl p-5 flex flex-col gap-4 hover:border-[#c9a84c]/30 transition-all">
                        
                        {/* Visit Header row */}
                        <div className="flex justify-between items-center border-b border-[#1e2d3d]/60 pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-full bg-[#c9a84c]/15 text-[#c9a84c] flex items-center justify-center font-black text-xs">
                              #{visitNum}
                            </span>
                            <div>
                              <span className="text-xs font-bold text-[#e8edf2] block">{formattedDate}</span>
                              <span className="text-[10px] text-[#5a6a7a]">Billed by: <strong className="text-[#4a9eff]">{tx.billedByName || 'Cashier'}</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="bg-[#00c97a]/10 border border-[#00c97a]/25 text-[#00c97a] px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase">
                              {tx.payment_mode === 'UPI' ? 'Card' : tx.payment_mode}
                            </span>
                            <span className="text-base font-black text-[#c9a84c]">
                              ₹{tx.total.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Services Grid */}
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#c9a84c] tracking-wider block mb-2">Services Performed</span>
                          <div className="grid grid-cols-2 gap-2">
                            {tx.services.map((s, sIdx) => (
                              <div key={sIdx} className="bg-[#161e28] border border-[#1e2d3d] rounded-lg p-2.5 flex justify-between items-center">
                                <span className="text-xs font-semibold text-[#e8edf2]">{s.name}</span>
                                <span className="text-xs font-extrabold text-[#c9a84c]">₹{s.price}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Financial Breakdown footer */}
                        <div className="flex justify-between items-center border-t border-[#1e2d3d]/40 pt-2 text-[11px] text-[#5a6a7a]">
                          <span>Subtotal: <strong className="text-[#e8edf2]">₹{tx.subtotal.toFixed(2)}</strong></span>
                          <span>Discount: <strong className="text-red-300">{discStr} (-₹{tx.discount_amount.toFixed(2)})</strong></span>
                          <span>Paid Total: <strong className="text-[#00c97a]">₹{tx.total.toFixed(2)}</strong></span>
                        </div>

                      </div>
                    );
                  })
                ) : (
                  <div className="py-16 text-center text-xs text-[#5a6a7a] italic">
                    No visit records captured for this customer.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-20 text-[#5a6a7a]">
              <span className="text-4xl mb-3">📜</span>
              <h4 className="text-sm font-bold text-[#e8edf2]">Select a Customer</h4>
              <p className="text-xs max-w-xs mt-1">Search by Name or Mobile Number in the left panel to display visit history and bill details.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default AdminCustomerVisitHistory;
