import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import CookieBanner from './components/CookieBanner';
import Home from './pages/Home';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Staff from './pages/Staff';
import Student from './pages/Student';

const PrivateRoute = ({ children, allowedRole }) => {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (allowedRole && role !== allowedRole) return <Navigate to={`/${role}`} />;
  return children;
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/*" element={
          <PrivateRoute allowedRole="admin">
            <Admin />
          </PrivateRoute>
        } />
        <Route path="/staff" element={
          <PrivateRoute allowedRole="staff">
            <Staff />
          </PrivateRoute>
        } />
        <Route path="/student" element={
          <PrivateRoute allowedRole="student">
            <Student />
          </PrivateRoute>
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
          <AnimatedRoutes />
          <CookieBanner />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;