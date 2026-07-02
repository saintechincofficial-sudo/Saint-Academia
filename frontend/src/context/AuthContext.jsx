import { createContext, useState, useEffect, useCallback } from 'react';

export const AuthContext = createContext();

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost/SaintAcademia/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({
          id: payload.user_id,
          email: payload.email,
          role: payload.role,
          school_id: payload.school_id
        });
      } catch (e) {
        setToken(null);
        localStorage.removeItem('auth_token');
      }
    }
    setLoading(false);
  }, [token]);

  const login = useCallback(async (email, password) => {
    setError(null);
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (data.success && data.token) {
        setToken(data.token);
        localStorage.setItem('auth_token', data.token);
        setUser(data.user);
        return { success: true };
      }
      
      setError(data.message || 'Login failed');
      return { success: false, message: data.message };
    } catch (err) {
      setError('Unable to connect to server: ' + err.message);
      return { success: false, message: 'Unable to connect to server' };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
  }, []);

  const value = {
    user,
    token,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
