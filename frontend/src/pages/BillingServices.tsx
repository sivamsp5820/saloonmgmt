import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { Service } from '../types';

export const BillingServices: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  return (
    <div className="flex flex-col gap-6">
      
      {/* ── Header ── */}
      <div>
        <h3 className="text-xs text-[#5a6a7a] font-bold uppercase tracking-wider">Treatment Tariff Catalog</h3>
        <p className="text-[11px] text-[#5a6a7a] mt-0.5">Tariff reference sheet for staff consults</p>
      </div>

      {/* ── Tariff catalog grid ── */}
      <div className="grid grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-3 text-center py-16 text-xs text-[#5a6a7a]">
            <div className="w-6 h-6 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading catalog Tariff sheet...
          </div>
        ) : services.length > 0 ? (
          services.map((s) => (
            <div key={s.id} className="bg-[#161e28] border border-[#1e2d3d] rounded-2xl p-5 hover:border-[#c9a84c]/20 transition-all flex flex-col justify-between h-44 group">
              <div>
                <div className="flex justify-between items-start gap-3">
                  <span className="bg-[#c9a84c]/10 border border-[#c9a84c]/20 text-[#c9a84c] text-[9px] font-black rounded-full px-2.5 py-0.5 uppercase tracking-wider">
                    {s.category}
                  </span>
                  <span className="text-xs text-[#5a6a7a] font-bold">⏱ {s.duration || 30}m</span>
                </div>
                <h4 className="text-sm font-bold text-[#e8edf2] mt-3 group-hover:text-[#c9a84c] transition-all">{s.name}</h4>
                <p className="text-[11px] text-[#5a6a7a] mt-1 line-clamp-2">{s.description || 'No description added'}</p>
              </div>

              <div className="flex justify-between items-center border-t border-[#1e2d3d]/50 pt-3">
                <span className="text-xs text-[#5a6a7a]">Rate:</span>
                <span className="text-sm font-black text-[#c9a84c]">₹{s.price.toFixed(2)}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center py-16 text-xs text-[#5a6a7a] italic border border-dashed border-[#1e2d3d] rounded-2xl">
            No active treatments registered in system.
          </div>
        )}
      </div>

    </div>
  );
};
export default BillingServices;
