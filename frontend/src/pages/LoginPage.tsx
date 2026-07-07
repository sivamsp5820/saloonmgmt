import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('Username and Password are required.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      await login(username, password);
      // Route user according to role
      const storedUser = localStorage.getItem('gc_user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/billing/terminal');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-screen bg-gradient-to-br from-[#0a0f16] via-[#111820] to-[#0d1117] flex items-center justify-center overflow-hidden">
      {/* Glow Backdrops */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_40%,rgba(201,168,76,0.08)_0%,transparent_55%),radial-gradient(ellipse_at_75%_60%,rgba(0,201,122,0.05)_0%,transparent_50%)] pointer-events-none" />

      <div className="relative z-10 w-[420px] bg-[#161e28]/95 border border-[#c9a84c]/25 rounded-2xl p-12 shadow-[0_32px_80px_rgba(0,0,0,0.7)]">
        
        {/* Logo and Branding */}
        <div className="text-center mb-9">
          <span className="text-5xl block mb-3 animate-bounce">✂️</span>
          <h1 className="font-serif text-3xl font-black text-[#c9a84c] tracking-widest">Creo Corp</h1>
          <p className="text-[11px] text-[#5a6a7a] tracking-[4px] uppercase mt-1">Saloon Billing</p>
        </div>

        {/* Validation Errors */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/35 rounded-lg p-3 text-[13px] text-[#ff8080] mb-5">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#c9a84c]">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full bg-[#0d1117] border border-[#c9a84c]/20 rounded-lg px-4 py-3 text-sm outline-none text-[#e8edf2] focus:border-[#c9a84c] focus:ring-2 focus:ring-[#c9a84c]/10 transition-all duration-200"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#c9a84c]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full bg-[#0d1117] border border-[#c9a84c]/20 rounded-lg px-4 py-3 text-sm outline-none text-[#e8edf2] focus:border-[#c9a84c] focus:ring-2 focus:ring-[#c9a84c]/10 transition-all duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0d1117] font-black rounded-lg text-sm tracking-wide hover:shadow-[0_8px_24px_rgba(201,168,76,0.4)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-[#0d1117] border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Sign In →</span>
            )}
          </button>
        </form>

        {/* Demo login instructions */}
        <div className="text-[10px] text-[#5a6a7a] text-center mt-7 leading-relaxed border-t border-[#1e2d3d] pt-5">
          <p className="mb-2">Demo Cashiers and Admin profiles:</p>
          <div className="flex flex-col gap-1">
            <p>Admin: <span className="text-[#c9a84c]">admin / admin123</span></p>
            <p>Cashier 1: <span className="text-[#c9a84c]">billing1 / bill123</span></p>
            <p>Cashier 2: <span className="text-[#c9a84c]">billing2 / bill456</span></p>
          </div>
        </div>

      </div>
    </div>
  );
};
