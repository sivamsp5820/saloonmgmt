import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { Service } from '../types';
import { useDashboardContext } from '../layouts/DashboardLayout';

interface CartItem extends Service {
  qty: number;
}

export const BillingTerminal: React.FC = () => {
  const { isOnline } = useDashboardContext();

  const [services, setServices] = useState<Service[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Customer details
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Discount state
  const [discType, setDiscType] = useState<'percent' | 'rupees'>('percent');
  const [discVal, setDiscVal] = useState<number>(0);

  // Payment Mode
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'GPay' | 'Card' | 'Net Banking'>('Cash');

  // Completed Receipt state for printing
  const [receipt, setReceipt] = useState<any | null>(null);

  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/services');
      if (res.data.status === 'success') {
        setServices(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load services.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleClearCart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAddService = (svc: Service) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === svc.id);
      if (existing) {
        return prev.map((item) =>
          item.id === svc.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...svc, qty: 1 }];
    });
  };

  const handleUpdateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.qty + delta;
            return { ...item, qty: nextQty };
          }
          return item;
        })
        .filter((item) => item.qty > 0)
    );
  };

  const handleClearCart = () => {
    setCart([]);
    setCustName('');
    setCustPhone('');
    setDiscVal(0);
    setDiscType('percent');
    setPaymentMode('Cash');
    setReceipt(null);
  };

  // Math aggregates
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  
  const discountAmount = discType === 'percent'
    ? Math.round(subtotal * (discVal / 100))
    : discVal;

  const total = Math.max(0, subtotal - discountAmount);

  const handleCashout = async () => {
    if (!isOnline) {
      alert('⚠️ Terminal is OFFLINE. Please activate "Business Online" toggle in the top status bar before recording sales.');
      return;
    }

    if (!custName) {
      alert('Customer Name is required.');
      return;
    }

    if (cart.length === 0) {
      alert('Your checkout cart is empty.');
      return;
    }

    try {
      // Format items array for controller
      const itemsPayload = cart.flatMap((item) => 
        Array.from({ length: item.qty }).map(() => ({
          id: item.id,
          price: item.price,
        }))
      );

      const payload = {
        customerName: custName,
        customerPhone: custPhone || undefined,
        services: itemsPayload,
        discountType: discType,
        discountValue: discVal,
        discountAmount,
        subtotal,
        total,
        paymentMode,
      };

      const res = await apiClient.post('/transactions', payload);
      
      if (res.data.status === 'success') {
        setReceipt(res.data.data);
        // Alert to trigger immediate print
        setTimeout(() => {
          window.print();
        }, 300);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save billing ticket.');
    }
  };

  // Dynamically compute unique categories from database services
  const categories = ['All', ...Array.from(new Set(services.map((s) => s.category).filter(Boolean)))];

  const filteredServices = activeCategory === 'All'
    ? services
    : services.filter((s) => s.category === activeCategory);

  return (
    <div className="grid grid-cols-12 gap-6 h-full items-start overflow-hidden">
      
      {/* ── LEFT PANEL: Catalog Selection ── */}
      <div className="col-span-8 bg-[#161e28] border border-[#1e2d3d] rounded-2xl p-5 flex flex-col h-[calc(100vh-140px)] overflow-hidden">
        
        {/* Customer Forms */}
        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-[#1e2d3d]/50">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black uppercase text-[#c9a84c] tracking-widest">Client Name *</label>
            <input
              type="text"
              required
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
              placeholder="Enter customer name"
              className="bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c] transition-all"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black uppercase text-[#c9a84c] tracking-widest">Mobile Number</label>
            <input
              type="text"
              value={custPhone}
              onChange={(e) => setCustPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c] transition-all"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 py-4 overflow-x-auto shrink-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-[#c9a84c] text-[#0d1117] shadow-lg shadow-[#c9a84c]/20'
                  : 'bg-[#1c2532] border border-[#1e2d3d] text-[#5a6a7a] hover:text-[#e8edf2] hover:bg-[#1c2532]/70'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Treatments Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="text-center py-16 text-xs text-[#5a6a7a]">
              <div className="w-6 h-6 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading treatment catalog...
            </div>
          ) : filteredServices.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {filteredServices.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleAddService(s)}
                  className="bg-[#1c2532] border border-[#1e2d3d] rounded-xl p-4 cursor-pointer hover:border-[#c9a84c]/30 hover:bg-[#1c2532]/80 transition-all select-none flex flex-col justify-between h-28"
                >
                  <div>
                    <span className="text-[8px] font-black bg-[#c9a84c]/10 text-[#c9a84c] rounded px-1.5 py-0.5 uppercase tracking-wider">
                      {s.category}
                    </span>
                    <h4 className="text-xs font-bold text-[#e8edf2] mt-2 line-clamp-1">{s.name}</h4>
                  </div>
                  <div className="flex justify-between items-center mt-2 border-t border-[#1e2d3d]/50 pt-2">
                    <span className="text-xs font-extrabold text-[#c9a84c]">₹{s.price}</span>
                    <span className="text-[9px] text-[#5a6a7a]">➕ Add</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-16 text-xs text-[#5a6a7a] italic">
              No services listed in this category.
            </p>
          )}
        </div>

      </div>

      {/* ── RIGHT PANEL: Checkout Cart Summary ── */}
      <div className="col-span-4 bg-[#161e28] border border-[#1e2d3d] rounded-2xl p-5 flex flex-col h-[calc(100vh-140px)] justify-between overflow-y-auto">
        <div>
          <div className="border-b border-[#1e2d3d] pb-3 mb-3 flex justify-between items-center">
            <span className="text-xs font-bold text-[#c9a84c] uppercase tracking-wider">Checkout Cart</span>
            {(cart.length > 0 || custName || custPhone) && (
              <button onClick={handleClearCart} className="text-[10px] text-red-400 hover:underline font-bold" title="Shortcut: Alt+R">
                Reset Details (Alt+R)
              </button>
            )}
          </div>

          {/* Cart list */}
          <div className="max-h-[160px] overflow-y-auto flex flex-col gap-2 pr-1 mb-4">
            {cart.length > 0 ? (
              cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-[#0d1117] border border-[#1e2d3d] rounded-lg p-2.5">
                  <div className="overflow-hidden pr-2">
                    <p className="text-xs font-bold truncate">{item.name}</p>
                    <span className="text-[10px] text-[#c9a84c] font-black">₹{item.price} each</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleUpdateQty(item.id, -1)}
                      className="w-5 h-5 bg-[#1c2532] border border-[#1e2d3d] hover:bg-[#1c2532]/75 rounded flex items-center justify-center text-xs font-bold text-[#5a6a7a]"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold min-w-[12px] text-center">{item.qty}</span>
                    <button
                      onClick={() => handleUpdateQty(item.id, 1)}
                      className="w-5 h-5 bg-[#1c2532] border border-[#1e2d3d] hover:bg-[#1c2532]/75 rounded flex items-center justify-center text-xs font-bold text-[#5a6a7a]"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-6 text-xs text-[#5a6a7a] italic">Your cart is empty.</p>
            )}
          </div>

          {/* Discounts */}
          <div className="border-t border-[#1e2d3d]/50 pt-3 flex flex-col gap-2.5 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider">Apply Discount</span>
              <div className="flex bg-[#0d1117] border border-[#1e2d3d] rounded-lg p-0.5">
                <button
                  onClick={() => { setDiscType('percent'); setDiscVal(0); }}
                  className={`px-2 py-0.5 rounded text-[9px] font-black transition-all ${
                    discType === 'percent' ? 'bg-[#c9a84c] text-[#0d1117]' : 'text-[#5a6a7a]'
                  }`}
                >
                  %
                </button>
                <button
                  onClick={() => { setDiscType('rupees'); setDiscVal(0); }}
                  className={`px-2 py-0.5 rounded text-[9px] font-black transition-all ${
                    discType === 'rupees' ? 'bg-[#c9a84c] text-[#0d1117]' : 'text-[#5a6a7a]'
                  }`}
                >
                  ₹
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                max={discType === 'percent' ? 100 : subtotal}
                value={discVal || ''}
                onChange={(e) => setDiscVal(Math.min(discType === 'percent' ? 100 : subtotal, Math.max(0, parseFloat(e.target.value) || 0)))}
                placeholder={discType === 'percent' ? 'Discount %' : 'Discount value (₹)'}
                className="w-full bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-1.5 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c]"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="border-t border-[#1e2d3d]/50 pt-3 flex flex-col gap-2.5">
            <span className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider">Payment Mode</span>
            <div className="grid grid-cols-2 gap-1.5">
              {(['Cash', 'UPI', 'GPay', 'Card', 'Net Banking'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                    paymentMode === mode
                      ? 'bg-[#00c97a]/15 border-[#00c97a] text-[#00c97a]'
                      : 'bg-[#0d1117] border-[#1e2d3d] text-[#5a6a7a] hover:text-[#e8edf2]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Pricing aggregates & Cashout button */}
        <div className="border-t border-[#1e2d3d] pt-4 mt-4">
          <div className="flex flex-col gap-1.5 mb-4 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[#5a6a7a]">Subtotal:</span>
              <span className="font-bold">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#5a6a7a]">Discount:</span>
              <span className="font-bold text-red-300">- ₹{discountAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-t border-[#1e2d3d]/50 pt-2 mt-1">
              <span className="text-[#c9a84c] font-bold">Total Bill:</span>
              <span className="font-black text-[#c9a84c] text-base">₹{total.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handleCashout}
            disabled={!isOnline || cart.length === 0}
            className="w-full py-4 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0d1117] font-black rounded-xl text-sm tracking-wide hover:shadow-[0_8px_24px_rgba(201,168,76,0.35)] disabled:opacity-40 transition-all select-none"
          >
            {!isOnline ? '🚨 Terminal Offline' : '🧾 Complete Cash Out & Print'}
          </button>
        </div>

      </div>

      {/* ── PRINT COMPONENT & PREVIEW MODAL ── */}
      {receipt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-[#1c2532] border border-[#c9a84c]/25 rounded-2xl p-6 w-[360px] max-w-full shadow-2xl flex flex-col items-center gap-4 animate-scale-in">
            <div className="text-center w-full">
              <h3 className="text-sm font-bold text-[#c9a84c] uppercase tracking-wider mb-1">Receipt Preview</h3>
              <p className="text-[10px] text-[#5a6a7a]">Verify the 3-inch thermal receipt details below</p>
            </div>
            
            {/* The actual 3-inch physical receipt container */}
            <div 
              id="print-receipt" 
              className="font-mono text-[10px] leading-tight text-black p-5 w-[80mm] max-w-full bg-white shadow-[0_10px_30px_rgba(0,0,0,0.15)] rounded-sm border border-gray-200"
              style={{ minHeight: '300px' }}
            >
              <div className="text-center border-b border-dashed border-black pb-2 mb-2">
                <h3 className="font-bold text-sm uppercase">CreoCorpBilling</h3>
                <p className="text-[9px]">123 Luxury Avenue, Bangalore</p>
                <p className="text-[9px]">Tel: +91 98765 43210</p>
              </div>
              
              <div className="border-b border-dashed border-black pb-2 mb-2 text-[8px]">
                <p>Bill ID: {receipt.id}</p>
                <p>Date: {new Date(receipt.ts).toLocaleString('en-IN')}</p>
                <p>Cashier: {receipt.billedByName}</p>
                <p>Customer: {receipt.custName} {receipt.custPhone ? `(${receipt.custPhone})` : ''}</p>
              </div>

              <div className="border-b border-dashed border-black pb-2 mb-2">
                <div className="grid grid-cols-12 font-bold mb-1 text-[9px]">
                  <span className="col-span-8">Treatment</span>
                  <span className="col-span-4 text-right">Price</span>
                </div>
                {receipt.services.map((s: any, idx: number) => (
                  <div key={idx} className="grid grid-cols-12 text-[9px] mb-0.5">
                    <span className="col-span-8 truncate">{s.name}</span>
                    <span className="col-span-4 text-right">₹{s.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-0.5 text-right font-bold text-[9px] border-b border-dashed border-black pb-2 mb-2">
                <p>Subtotal: ₹{receipt.subtotal.toFixed(2)}</p>
                {receipt.discount > 0 && <p>Discount: -₹{receipt.discount.toFixed(2)}</p>}
                <p className="text-sm text-black">Total: ₹{receipt.total.toFixed(2)}</p>
              </div>

              <div className="text-center pt-2">
                <p className="font-bold uppercase tracking-widest text-[9px]">Mode: {receipt.paymentMode}</p>
                <p className="mt-2 text-[8px] italic">Thank you for visiting CreoCorpBilling!</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 w-full mt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-[#00c97a] hover:bg-[#00c97a]/90 text-[#0d1117] font-black rounded-lg text-xs tracking-wide transition-all shadow-lg shadow-[#00c97a]/20 flex items-center justify-center gap-1.5"
              >
                🖨️ Reprint
              </button>
              <button
                type="button"
                onClick={handleClearCart}
                className="flex-1 py-2.5 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0d1117] font-black rounded-lg text-xs tracking-wide transition-all shadow-lg shadow-[#c9a84c]/20"
              >
                Close & New Bill
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default BillingTerminal;
