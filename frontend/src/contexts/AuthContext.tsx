import React, { createContext, useState, useEffect, useContext } from 'react';
import type { User } from '../types';
import { apiClient } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('gc_token');
    localStorage.removeItem('gc_user');
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('gc_token');
      const storedUser = localStorage.getItem('gc_user');

      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
          
          // Optionally verify token with backend
          try {
            const res = await apiClient.get('/auth/me');
            if (res.data.status === 'success') {
              setUser(res.data.data.user);
              localStorage.setItem('gc_user', JSON.stringify(res.data.data.user));
            }
          } catch (err) {
            // Token expired or invalid
            logout();
          }
        } catch (err) {
          // JSON parsing failed or local storage is corrupted
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post('/auth/login', { username, password });
      
      if (res.data.status === 'success') {
        const { token: receivedToken, user: receivedUser } = res.data.data;
        setToken(receivedToken);
        setUser(receivedUser);
        localStorage.setItem('gc_token', receivedToken);
        localStorage.setItem('gc_user', JSON.stringify(receivedUser));
      } else {
        throw new Error(res.data.message || 'Login failed.');
      }
    } catch (error: any) {
      logout();
      throw new Error(error.response?.data?.message || error.message || 'Failed to authenticate user.');
    } finally {
      setIsLoading(false);
    }
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
