import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { Service, ServiceCategory } from '../types';

export const ServiceManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'treatments' | 'categories'>('treatments');
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState<boolean>(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);

  // Treatment Modal/Form States
  const [showSvcModal, setShowSvcModal] = useState<boolean>(false);
  const [svcEditId, setSvcEditId] = useState<string | null>(null);
  const [svcName, setSvcName] = useState('');
  const [svcCategory, setSvcCategory] = useState('');
  const [svcPrice, setSvcPrice] = useState<number>(0);
  const [svcDuration, setSvcDuration] = useState<number>(30);
  const [svcDesc, setSvcDesc] = useState('');

  // Category Modal/Form States
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');

  // Category Delete Conflicts States
  const [conflictCat, setConflictCat] = useState<ServiceCategory | null>(null);
  const [conflictCount, setConflictCount] = useState<number>(0);
  const [reassignTarget, setReassignTarget] = useState<string>('');

  const fetchServices = async () => {
    setIsLoadingServices(true);
    try {
      const res = await apiClient.get('/services');
      if (res.data.status === 'success') {
        setServices(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load services:', err);
    } finally {
      setIsLoadingServices(false);
    }
  };

  const fetchCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const res = await apiClient.get('/services/categories');
      if (res.data.status === 'success') {
        const cats = res.data.data || [];
        setCategories(cats);
        // Default select first category if dynamic choices are loaded
        if (cats.length > 0 && !svcCategory) {
          setSvcCategory(cats[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchServices();
    fetchCategories();
  }, []);

  // ── Treatment Actions ──

  const handleOpenAddSvc = () => {
    setSvcEditId(null);
    setSvcName('');
    // Pick the first category name if available, else 'Hair'
    setSvcCategory(categories.length > 0 ? categories[0].name : 'Hair');
    setSvcPrice(0);
    setSvcDuration(30);
    setSvcDesc('');
    setShowSvcModal(true);
  };

  const handleOpenEditSvc = (s: Service) => {
    setSvcEditId(s.id);
    setSvcName(s.name);
    setSvcCategory(s.category);
    setSvcPrice(s.price);
    setSvcDuration(s.duration || 30);
    setSvcDesc(s.description || '');
    setShowSvcModal(true);
  };

  const handleSaveSvc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!svcName || svcPrice < 0 || svcDuration <= 0) {
      alert('Valid name, price, and duration are required.');
      return;
    }

    try {
      const payload = {
        name: svcName,
        category: svcCategory,
        price: svcPrice,
        duration: svcDuration,
        description: svcDesc,
      };

      if (svcEditId) {
        const res = await apiClient.put(`/services/${svcEditId}`, payload);
        if (res.data.status === 'success') {
          setShowSvcModal(false);
          fetchServices();
        }
      } else {
        const res = await apiClient.post('/services', payload);
        if (res.data.status === 'success') {
          setShowSvcModal(false);
          fetchServices();
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save treatment.');
    }
  };

  const handleDeleteSvc = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this treatment? It will no longer show on the POS terminal.')) return;
    try {
      const res = await apiClient.delete(`/services/${id}`);
      if (res.data.status === 'success') {
        fetchServices();
      }
    } catch (err) {
      alert('Failed to deactivate treatment.');
    }
  };

  // ── Category Actions ──

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const res = await apiClient.post('/services/categories', { name: newCatName.trim() });
      if (res.data.status === 'success') {
        setNewCatName('');
        fetchCategories();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create category.');
    }
  };

  const handleStartEditCat = (cat: ServiceCategory) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
  };

  const handleSaveEditCat = async (catId: string) => {
    if (!editingCatName.trim()) return;
    try {
      const res = await apiClient.put(`/services/categories/${catId}`, { name: editingCatName.trim() });
      if (res.data.status === 'success') {
        setEditingCatId(null);
        fetchCategories();
        fetchServices(); // Refetch services because category names might have cascaded
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update category.');
    }
  };

  const handleDeleteCategory = async (cat: ServiceCategory) => {
    if (cat.name.toLowerCase() === 'uncategorized') {
      alert('Cannot delete the default Uncategorized category.');
      return;
    }

    try {
      const res = await apiClient.delete(`/services/categories/${cat.id}`);
      if (res.data.status === 'success') {
        fetchCategories();
      }
    } catch (err: any) {
      if (err.response?.data?.code === 'CATEGORY_IN_USE') {
        setConflictCat(cat);
        setConflictCount(err.response.data.serviceCount || 0);
        // Find first other category to default reassignment dropdown
        const otherCats = categories.filter(c => c.id !== cat.id);
        setReassignTarget(otherCats.length > 0 ? otherCats[0].name : 'Uncategorized');
      } else {
        alert(err.response?.data?.message || 'Failed to delete category.');
      }
    }
  };

  const handleResolveConflict = async (method: 'uncategorized' | 'reassign') => {
    if (!conflictCat) return;

    try {
      let url = `/services/categories/${conflictCat.id}`;
      if (method === 'uncategorized') {
        url += '?confirm=true';
      } else {
        url += `?reassignTo=${encodeURIComponent(reassignTarget)}`;
      }

      const res = await apiClient.delete(url);
      if (res.data.status === 'success') {
        setConflictCat(null);
        fetchCategories();
        fetchServices();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reassign and delete category.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* ── Tabs Navigation ── */}
      <div className="flex justify-between items-center border-b border-[#1e2d3d] pb-px">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('treatments')}
            className={`pb-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
              activeTab === 'treatments'
                ? 'border-[#c9a84c] text-[#c9a84c]'
                : 'border-transparent text-[#5a6a7a] hover:text-[#e8edf2]'
            }`}
          >
            Treatments Catalog
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`pb-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
              activeTab === 'categories'
                ? 'border-[#c9a84c] text-[#c9a84c]'
                : 'border-transparent text-[#5a6a7a] hover:text-[#e8edf2]'
            }`}
          >
            Manage Categories
          </button>
        </div>

        {activeTab === 'treatments' && (
          <button
            onClick={handleOpenAddSvc}
            className="px-4 py-2 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0d1117] font-black rounded-lg text-xs tracking-wide hover:shadow-[0_8px_24px_rgba(201,168,76,0.25)] transition-all"
          >
            ➕ Add Treatment
          </button>
        )}
      </div>

      {/* ── Treatments Tab ── */}
      {activeTab === 'treatments' && (
        <div className="grid grid-cols-3 gap-5 animate-fade-in">
          {isLoadingServices ? (
            <div className="col-span-3 text-center py-16 text-xs text-[#5a6a7a]">
              <div className="w-6 h-6 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading treatment catalog...
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
                      onClick={() => handleOpenEditSvc(s)}
                      className="px-2.5 py-1 text-[10px] font-bold border border-[#c9a84c]/25 hover:bg-[#c9a84c]/10 text-[#c9a84c] rounded transition-all"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSvc(s.id)}
                      className="px-2.5 py-1 text-[10px] font-bold border border-red-500/25 hover:bg-red-500/10 text-[#ff8080] rounded transition-all"
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
      )}

      {/* ── Categories Tab ── */}
      {activeTab === 'categories' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          
          {/* Add Category Form */}
          <form onSubmit={handleCreateCategory} className="bg-[#161e28] border border-[#1e2d3d] rounded-2xl p-5 flex gap-4 items-end max-w-lg">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[9px] font-black uppercase text-[#c9a84c] tracking-widest">New Category Name</label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Massage Therapy"
                className="bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c] w-full"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0d1117] font-black rounded-lg text-xs tracking-wide hover:shadow-[0_8px_24px_rgba(201,168,76,0.2)] transition-all shrink-0 h-[38px]"
            >
              Add Category
            </button>
          </form>

          {/* Categories Grid list */}
          <div className="bg-[#161e28] border border-[#1e2d3d] rounded-xl p-5 max-w-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1e2d3d]">
                    <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3 w-3/5">Category Name</th>
                    <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-3 w-2/5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingCategories ? (
                    <tr>
                      <td colSpan={2} className="text-center p-8 text-xs text-[#5a6a7a]">
                        <div className="w-6 h-6 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Loading categories list...
                      </td>
                    </tr>
                  ) : categories.length > 0 ? (
                    categories.map((cat) => (
                      <tr key={cat.id} className="border-b border-[#1e2d3d]/50 hover:bg-white/[0.01] transition-all">
                        <td className="p-3 text-xs">
                          {editingCatId === cat.id ? (
                            <input
                              type="text"
                              value={editingCatName}
                              onChange={(e) => setEditingCatName(e.target.value)}
                              className="bg-[#0d1117] border border-[#c9a84c]/50 rounded px-2.5 py-1 text-xs text-[#e8edf2] outline-none"
                              autoFocus
                            />
                          ) : (
                            <span className="font-bold text-[#e8edf2]">{cat.name}</span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-right">
                          {editingCatId === cat.id ? (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleSaveEditCat(cat.id)}
                                className="px-2.5 py-1 bg-[#00c97a] hover:bg-[#00c97a]/90 text-[#0d1117] rounded text-[10px] font-black transition-all"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingCatId(null)}
                                className="px-2.5 py-1 border border-[#1e2d3d] text-[#5a6a7a] rounded text-[10px] font-bold hover:bg-white/5 transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleStartEditCat(cat)}
                                className="px-2.5 py-1 border border-[#c9a84c]/25 text-[#c9a84c] rounded hover:bg-[#c9a84c]/10 text-[10px] font-bold transition-all"
                              >
                                Rename
                              </button>
                              {cat.name.toLowerCase() !== 'uncategorized' && (
                                <button
                                  onClick={() => handleDeleteCategory(cat)}
                                  className="px-2.5 py-1 border border-red-500/25 text-[#ff8080] rounded hover:bg-red-500/10 text-[10px] font-bold transition-all"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="text-center p-8 text-xs text-[#5a6a7a] italic">
                        No categories found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Save Treatment Modal ── */}
      {showSvcModal && (
        <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleSaveSvc} className="bg-[#1c2532] border border-[#c9a84c]/25 rounded-2xl p-6 w-[450px] max-w-full">
            <h3 className="text-base font-bold text-[#c9a84c] mb-5">
              {svcEditId ? '✏️ Edit Treatment Details' : '➕ Register New Treatment'}
            </h3>
            
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[#c9a84c] tracking-wider">Treatment Name</label>
                <input
                  type="text"
                  required
                  value={svcName}
                  onChange={(e) => setSvcName(e.target.value)}
                  placeholder="e.g. Haircut & Styling"
                  className="bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[#c9a84c] tracking-wider">Category</label>
                  <select
                    value={svcCategory}
                    onChange={(e: any) => setSvcCategory(e.target.value)}
                    className="bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c]"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                    {categories.length === 0 && (
                      <option value="Uncategorized">Uncategorized</option>
                    )}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[#c9a84c] tracking-wider">Price (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={svcPrice || ''}
                    onChange={(e) => setSvcPrice(parseFloat(e.target.value) || 0)}
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
                  value={svcDuration || ''}
                  onChange={(e) => setSvcDuration(parseInt(e.target.value) || 30)}
                  placeholder="30"
                  className="bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[#c9a84c] tracking-wider">Description (Optional)</label>
                <textarea
                  value={svcDesc}
                  onChange={(e) => setSvcDesc(e.target.value)}
                  placeholder="Detail treatment specifics..."
                  className="bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c] h-20 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSvcModal(false)}
                className="px-4 py-2 border border-[#1e2d3d] text-[#5a6a7a] rounded-lg text-xs font-bold hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0d1117] rounded-lg text-xs font-bold hover:shadow-lg transition-all"
              >
                {svcEditId ? 'Save Changes' : 'Create Treatment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Category Delete Conflict Resolution Modal ── */}
      {conflictCat && (
        <div className="fixed inset-0 bg-black/85 z-[110] flex items-center justify-center p-4">
          <div className="bg-[#1c2532] border border-red-500/20 rounded-2xl p-6 w-[480px] max-w-full">
            <h3 className="text-base font-bold text-[#ff8080] mb-3">⚠️ Category Deletion Conflict</h3>
            <p className="text-xs text-[#e8edf2] leading-relaxed mb-4">
              The category <strong className="text-[#c9a84c]">"{conflictCat.name}"</strong> is currently assigned to{' '}
              <strong className="text-[#c9a84c]">{conflictCount}</strong> active services. You cannot delete it directly.
            </p>
            
            <div className="bg-[#161e28] border border-[#1e2d3d] rounded-xl p-4 mb-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider">
                  Option 1: Move treatments to another category
                </span>
                <div className="flex gap-2">
                  <select
                    value={reassignTarget}
                    onChange={(e) => setReassignTarget(e.target.value)}
                    className="flex-1 bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c]"
                  >
                    {categories
                      .filter((c) => c.id !== conflictCat.id)
                      .map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={() => handleResolveConflict('reassign')}
                    disabled={categories.filter((c) => c.id !== conflictCat.id).length === 0}
                    className="px-4 py-2 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0d1117] rounded-lg text-xs font-bold hover:shadow-lg disabled:opacity-40 transition-all"
                  >
                    Reassign & Delete
                  </button>
                </div>
              </div>

              <div className="border-t border-[#1e2d3d]/50 my-1" />

              <div className="flex justify-between items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider">
                    Option 2: Reset categories to default
                  </span>
                  <p className="text-[10px] text-[#5a6a7a] mt-0.5">Move treatments to the default "Uncategorized" category.</p>
                </div>
                <button
                  onClick={() => handleResolveConflict('uncategorized')}
                  className="px-4 py-2 border border-red-500/25 text-[#ff8080] rounded-lg text-xs font-bold hover:bg-red-500/10 transition-all shrink-0"
                >
                  Move to Uncategorized & Delete
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setConflictCat(null)}
                className="px-4 py-2 border border-[#1e2d3d] text-[#5a6a7a] rounded-lg text-xs font-bold hover:bg-white/5 transition-all"
              >
                Cancel Deletion
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
