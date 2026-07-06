import { useCallback } from 'react';
import { useAuth } from './useAuth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost/SaintAcademia/api';

export function useApi() {
  const { token, logout } = useAuth();

  const apiCall = useCallback(async (endpoint, options = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    const isFormData = options.body instanceof FormData;

    const headers = {
      // Don't set Content-Type for FormData — browser sets it with boundary
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    };

    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const response = await fetch(url, { ...options, headers });

      const text = await response.text();
      let data = {};
      try { data = JSON.parse(text); } catch { data = { message: text }; }

      if (response.status === 401) { logout(); window.location.href = '/'; }

      return { success: response.ok, status: response.status, ...data };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }, [token, logout]);

  const get  = useCallback((ep)       => apiCall(ep, { method:'GET' }),                         [apiCall]);
  const post = useCallback((ep, body) => apiCall(ep, { method:'POST', body: JSON.stringify(body) }), [apiCall]);
  const put  = useCallback((ep, body) => apiCall(ep, { method:'PUT',  body: JSON.stringify(body) }), [apiCall]);
  const del  = useCallback((ep)       => apiCall(ep, { method:'DELETE' }),                       [apiCall]);

  return { apiCall, get, post, put, del };
}
