import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { Service } from '../types';

export const AdminServices: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // New/Edit Service Modal States
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Hair');
  const [price, setPrice] = useState<number>(0);
  const [duration, setDuration] = useState<number>(30);
  const [desc, setDesc] = useState('');

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

  const handleOpenAdd = () => {
    setEditId(null);
    setName('');
    setCategory('Hair');
    setPrice(0);
    setDuration(30);
    setDesc('');
    setShowModal(true);
  };

  const handleOpenEdit = (s: Service) => {
    setEditId(s.id);
    setName(s.name);
    setCategory(s.category);
    setPrice(s.price);
    setDuration(s.duration || 30);
    setDesc(s.description || '');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || price < 0 || duration <= 0) {
      alert('Valid name, price, and duration are required.');
      return;
    }

    try {
      const payload = { name, category, price, duration, description: desc };

      if (editId) {
        // Update
        const res = await apiClient.put(`/services/${editId}`, payload);
        if (res.data.status === 'success') {
          setShowModal(false);
          fetchServices();
        }
      } else {
        // Create
        const res = await apiClient.post('/services', payload);
        if (res.data.status === 'success') {
          setShowModal(false);
          fetchServices();
        }
      }
    } catch (err) {
      alert('Failed to save service.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this service? It will no longer show on the POS terminal.')) return;
    try {
      const res = await apiClient.delete(`/services/${id}`);
      if (res.data.status === 'success') {
        fetchServices();
      }
    } catch (err) {
      alert('Failed to deactivate service.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* ── Add Action Row ── */}
      <div className="flex justify-between items-center gap-4">
        <h3 className="text-xs text-[#5a6a7a] font-bold uppercase tracking-wider">Configure treatments</h3>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0d1117] font-black rounded-lg text-xs tracking-wide hover:shadow-[0_8px_24px_rgba(201,168,76,0.3)] transition-all"
        >
          ➕ Add Treatment
        </button>
      </div>

      {/* ── Services Grid ── */}
      <div className="grid grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-3 text-center py-16 text-xs text-[#5a6a7a]">
            <div className="w-6 h-6 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading catalog data...
          </div>
        ) : services.length > 0 ? (
          services.map((s) => (
            <div key={s.id} className="bg-[#161e28] border border-[#1e2d3d] rounded-2xl p-5 hover:border-[#c9a84c]/25 transition-all flex flex-col justify-between h-48 group">
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
                <span className="text-sm font-black text-[#c9a84c]">₹{s.price.toFixed(2)}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenEdit(s)}
                    className="px-2 py-1 text-[10px] font-bold border border-[#c9a84c]/25 hover:bg-[#c9a84c]/10 text-[#c9a84c] rounded transition-all"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="px-2 py-1 text-[10px] font-bold border border-red-500/25 hover:bg-red-500/10 text-[#ff8080] rounded transition-all"
                  >
                    🗑 Del
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center py-16 text-xs text-[#5a6a7a] italic border border-dashed border-[#1e2d3d] rounded-2xl">
            No treatments recorded in active catalog.
          </div>
        )}
      </div>

      {/* ── Save Service Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-[#1c2532] border border-[#c9a84c]/25 rounded-2xl p-6 w-[450px] max-w-full">
            <h3 className="text-base font-bold text-[#c9a84c] mb-5">
              {editId ? '✏️ Edit Treatment Details' : '➕ Register New Treatment'}
            </h3>
            
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[#c9a84c] tracking-wider">Treatment Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Haircut & Styling"
                  className="bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[#c9a84c] tracking-wider">Category</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c]"
                  >
                    <option value="Hair">Hair</option>
                    <option value="Skin">Skin</option>
                    <option value="Beard">Beard</option>
                    <option value="Nails">Nails</option>
                    <option value="Spa">Spa</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[#c9a84c] tracking-wider">Price (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={price || ''}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    placeholder="Charge amount"
                    className="bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[#c9a84c] tracking-wider">Duration (Minutes)</label>
                <input
                  type="number"
                  required
                  min="5"
                  value={duration || ''}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                  placeholder="30"
                  className="bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[#c9a84c] tracking-wider">Description (Optional)</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Detail treatment specifics..."
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
                {editId ? 'Save Changes' : 'Create Treatment'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
export default AdminServices;
