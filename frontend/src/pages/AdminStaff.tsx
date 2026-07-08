import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types';

export const AdminStaff: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [staff, setStaff] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal states
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'billing'>('billing');
  const [isSaving, setIsSaving] = useState(false);

  const fetchStaff = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.get('/auth/users');
      if (res.data.status === 'success') {
        setStaff(res.data.data || []);
      }
    } catch (err: any) {
      console.error('Failed to load staff list', err);
      setErrorMsg('Failed to load staff profiles. Check backend connection.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleOpenAdd = () => {
    setEditId(null);
    setName('');
    setUsername('');
    setPassword('');
    setRole('billing');
    setShowModal(true);
  };

  const handleOpenEdit = (s: User) => {
    setEditId(s.id);
    setName(s.name);
    setUsername(s.username);
    setPassword(''); // Keep blank to not modify password
    setRole(s.role);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || (!editId && !password)) {
      alert('Name, username, and password (for new staff) are required.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = { name, username, role };
      if (password) {
        payload.password = password;
      }

      if (editId) {
        // Update
        const res = await apiClient.put(`/auth/users/${editId}`, payload);
        if (res.data.status === 'success') {
          setShowModal(false);
          fetchStaff();
        }
      } else {
        // Create
        const res = await apiClient.post('/auth/users', payload);
        if (res.data.status === 'success') {
          setShowModal(false);
          fetchStaff();
        }
      }
    } catch (err: any) {
      console.error('Failed to save staff member', err);
      alert(err.response?.data?.message || 'Failed to save staff member.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (targetUser: User) => {
    if (currentUser?.id === targetUser.id) {
      alert('You cannot delete your own logged-in admin account.');
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete staff member "${targetUser.name}"?`)) return;

    try {
      const res = await apiClient.delete(`/auth/users/${targetUser.id}`);
      if (res.data.status === 'success') {
        fetchStaff();
      }
    } catch (err: any) {
      console.error('Failed to delete staff member', err);
      alert(err.response?.data?.message || 'Failed to delete staff member.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* ── Add Action Row ── */}
      <div className="flex justify-between items-center gap-4">
        <h3 className="text-xs text-[#5a6a7a] font-bold uppercase tracking-wider">Manage Saloon Staff & Terminals</h3>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0d1117] font-black rounded-lg text-xs tracking-wide hover:shadow-[0_8px_24px_rgba(201,168,76,0.3)] transition-all flex items-center gap-1.5"
        >
          <span>➕</span> Add Staff Member
        </button>
      </div>

      {/* ── Error Message ── */}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 text-center text-[#ff8080]">
          <p className="font-bold">{errorMsg}</p>
        </div>
      )}

      {/* ── Staff List ── */}
      <div className="bg-[#161e28] border border-[#1e2d3d] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1e2d3d] bg-white/[0.01]">
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-4">Full Name</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-4">Username</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-4">Access Role</th>
                <th className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="text-center py-16 text-xs text-[#5a6a7a]">
                    <div className="w-6 h-6 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading staff profiles...
                  </td>
                </tr>
              ) : staff.length > 0 ? (
                staff.map((s) => (
                  <tr key={s.id} className="border-b border-[#1e2d3d]/50 hover:bg-white/[0.02] transition-all">
                    <td className="p-4 text-xs font-bold text-[#e8edf2] flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#c9a84c] to-[#a07830] flex items-center justify-center font-extrabold text-[11px] text-[#0d1117] uppercase flex-shrink-0">
                        {s.name[0] || 'U'}
                      </div>
                      <span>
                        {s.name} {currentUser?.id === s.id && <span className="text-[10px] text-[#5a6a7a] font-normal italic">(You)</span>}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-mono text-[#5a6a7a]">{s.username}</td>
                    <td className="p-4 text-xs">
                      {s.role === 'admin' ? (
                        <span className="bg-[#c9a84c]/10 border border-[#c9a84c]/25 rounded-full text-[#c9a84c] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide">
                          Administrator
                        </span>
                      ) : (
                        <span className="bg-[#4a9eff]/10 border border-[#4a9eff]/25 rounded-full text-[#4a9eff] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide">
                          Billing Staff
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-xs">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="px-3 py-1.5 text-[10px] font-bold border border-[#c9a84c]/25 hover:bg-[#c9a84c]/10 text-[#c9a84c] rounded-lg transition-all"
                        >
                          ✏️ Edit
                        </button>
                        {currentUser?.id !== s.id && (
                          <button
                            onClick={() => handleDelete(s)}
                            className="px-3 py-1.5 text-[10px] font-bold border border-red-500/25 hover:bg-red-500/10 text-[#ff8080] rounded-lg transition-all"
                          >
                            🗑 Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center p-8 text-xs text-[#5a6a7a] italic">
                    No active staff logins configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Save Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-[#1c2532] border border-[#c9a84c]/25 rounded-2xl p-6 w-[420px] max-w-full">
            <h3 className="text-base font-bold text-[#c9a84c] mb-5">
              {editId ? '✏️ Edit Staff Member details' : '👤 Register New Staff Member'}
            </h3>
            
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[#c9a84c] tracking-wider">Display Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Counter Cashier Terminal 3"
                  className="bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[#c9a84c] tracking-wider">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="e.g. billing3"
                  className="bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[#c9a84c] tracking-wider">
                  Password {editId && <span className="text-[9px] text-[#5a6a7a] font-normal lowercase">(leave blank to keep current)</span>}
                </label>
                <input
                  type="password"
                  required={!editId}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Secret access key"
                  className="bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[#c9a84c] tracking-wider">Access Level Role</label>
                <select
                  value={role}
                  onChange={(e: any) => setRole(e.target.value)}
                  className="bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2 text-xs text-[#e8edf2] outline-none focus:border-[#c9a84c]"
                >
                  <option value="billing">Billing Staff (POS billing & records terminal)</option>
                  <option value="admin">Administrator (Full sales, config, and system access)</option>
                </select>
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
                disabled={isSaving}
                className="px-4 py-2 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0d1117] rounded-lg text-xs font-bold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : editId ? 'Save Changes' : 'Register Staff'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
export default AdminStaff;
