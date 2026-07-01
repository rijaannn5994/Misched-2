import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [token, setTokenState] = useState(() => sessionStorage.getItem('token'));
  const [role, setRoleState] = useState(() => sessionStorage.getItem('role'));
  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  // Sync token to axios header whenever it changes
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, role: userRole } = res.data;

    // Store in state + sessionStorage (per-tab isolation)
    setTokenState(access_token);
    setRoleState(userRole);
    sessionStorage.setItem('token', access_token);
    sessionStorage.setItem('role', userRole);

    // Set axios header immediately
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

    // Fetch user profile
    try {
      const meRes = await api.get('/users/me');
      const userData = meRes.data;
      setUser(userData);
      sessionStorage.setItem('user', JSON.stringify(userData));
    } catch {
      // If profile fetch fails, set basic info
      setUser({ name: email, email, role: userRole });
      sessionStorage.setItem('user', JSON.stringify({ name: email, email, role: userRole }));
    }

    return userRole;
  };

  const logout = () => {
    setTokenState(null);
    setRoleState(null);
    setUser(null);
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{
      token,
      role,
      user,
      login,
      logout,
      isAuthenticated,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
