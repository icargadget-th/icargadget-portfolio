import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';

// Pages
import Dashboard from './pages/Dashboard';
import ProjectForm from './pages/ProjectForm';
import Settings from './pages/Settings';
import Login from './pages/Login';
import ProjectDetails from './pages/ProjectDetails';

// Components
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';

// Protected Admin Layout
function AdminLayout() {
  const token = localStorage.getItem('admin_token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="admin-layout">
      {/* Sidebar Navigation */}
      <Sidebar />
      
      {/* Content wrapper */}
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Admin Authentication */}
        <Route path="/login" element={<Login showToast={showToast} />} />

        {/* Admin Dashboard Protected Routes */}
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Dashboard showToast={showToast} />} />
          <Route path="projects/new" element={<ProjectForm showToast={showToast} />} />
          <Route path="projects/:id/edit" element={<ProjectForm showToast={showToast} />} />
          <Route path="projects/:id" element={<ProjectDetails showToast={showToast} isAdmin={true} />} />
          <Route path="settings" element={<Settings showToast={showToast} />} />
        </Route>

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Toast Notification */}
      {toast && (
        <div className="toast-container">
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        </div>
      )}
    </BrowserRouter>
  );
}
