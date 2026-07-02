import { useCallback } from 'react';
import { useAuth } from './useAuth';

const API_BASE_URL = 'http://localhost/SaintAcademia/api';

export function useApi() {
  const { token, logout } = useAuth();

  const apiCall = useCallback(async (endpoint, options = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json();

      if (response.status === 401) {
        logout();
        window.location.href = '/';
      }

      return {
        success: response.ok,
        status: response.status,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }, [token, logout]);

  return { apiCall };
}
