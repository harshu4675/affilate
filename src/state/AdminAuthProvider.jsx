import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { adminLogin, adminLogout, adminSession } from '../services/catalogApi.js';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [state, setState] = useState({ status: 'checking', username: null, usingDefaultPassword: false });

  const refresh = useCallback(async () => {
    try {
      const data = await adminSession({ timeoutMs: 8000 });
      setState({
        status: data.authenticated ? 'authenticated' : 'anonymous',
        username: data.username,
        usingDefaultPassword: Boolean(data.usingDefaultPassword)
      });
      return data.authenticated;
    } catch {
      setState({ status: 'offline', username: null, usingDefaultPassword: false });
      return false;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (username, password) => {
      const data = await adminLogin(username, password);
      setState((prev) => ({ ...prev, status: 'authenticated', username: data.username }));
      await refresh();
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    try {
      await adminLogout();
    } finally {
      setState((prev) => ({ ...prev, status: 'anonymous', username: null }));
    }
  }, []);

  const value = useMemo(() => ({ ...state, refresh, login, logout }), [state, refresh, login, logout]);
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return context;
}
