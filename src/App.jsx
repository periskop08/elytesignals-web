import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('web_user');
    if (saved) {
      setUser(JSON.parse(saved));
    }
  }, []);

  const loginUser = (data) => {
    setUser(data);
    localStorage.setItem('web_user', JSON.stringify(data));
  };

  const logoutUser = () => {
    setUser(null);
    localStorage.removeItem('web_user');
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login onLogin={loginUser} />} />
        <Route path="/dashboard" element={user ? <Dashboard user={user} onLogout={logoutUser} /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}
