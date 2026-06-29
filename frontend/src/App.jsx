import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Phone, MapPin, Clock, MessageSquare, ExternalLink } from 'lucide-react';

// Pages
import LandingPage from './pages/LandingPage';
import ProjectDetails from './pages/ProjectDetails';

// Components
import Toast from './components/Toast';

// Public Layout
function PublicLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (selector) => {
    if (location.pathname !== '/') {
      navigate('/', { replace: true });
      setTimeout(() => {
        const el = document.querySelector(selector);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.querySelector(selector);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="app-container">
      {/* Premium Public Navbar */}
      <nav className="pub-navbar">
        <div className="pub-navbar-container">
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <img src="/logo.png" alt="iCarGadget Logo" style={{ height: '36px', width: 'auto' }} />
            <span className="logo-text">iCarGadget</span>
          </Link>
          
          <div className="pub-nav-links">
            <button onClick={() => handleNavClick('#home')} className="pub-nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>หน้าแรก</button>
            <button onClick={() => handleNavClick('#services')} className="pub-nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>บริการ</button>
            <button onClick={() => handleNavClick('#portfolio')} className="pub-nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>ผลงานติดตั้ง</button>
            <button onClick={() => handleNavClick('#videos')} className="pub-nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>วิดีโอแนะนำ</button>
            <button onClick={() => handleNavClick('#reviews')} className="pub-nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>รีวิว</button>
          </div>
        </div>
      </nav>

      {/* Main Public Content */}
      <div style={{ flex: 1 }}>
        <Outlet />
      </div>

      {/* Floating Line button */}
      <a href="https://line.me/ti/p/%40icargadget" target="_blank" rel="noreferrer" className="floating-line-btn">
        <MessageSquare size={18} />
        <span>คุยกับช่าง Line ID: @icargadget</span>
      </a>

      {/* Premium Footer Section */}
      <footer className="footer-sec" id="contact">
        <div className="footer-container">
          <div className="footer-brand">
            <h3>iCarGadget</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.6', marginTop: '12px' }}>
              ศูนย์ติดตั้งเครื่องเสียงและประดับยนต์ครบวงจร 
              บริการติดตั้งอุปกรณ์ประดับยนต์ จอแอนดรอยด์ ลำโพง กล้องติดรถยนต์ 
              และอุปกรณ์ต่าง ๆ ที่ลูกค้าจัดซื้อมาเองแบบมืออาชีพ
            </p>
          </div>

          <div>
            <h4 style={{ color: 'white', marginBottom: '16px', fontSize: '1.1rem' }}>ติดต่อสอบถาม</h4>
            <div className="footer-info-item">
              <Phone size={16} />
              <span>โทร: 092-748-0660, 084-524-4433</span>
            </div>
            <div className="footer-info-item">
              <Clock size={16} />
              <span>เวลาทำการ: จันทร์ - เสาร์ (8:30 น. - 17:00 น.)</span>
            </div>
            <div className="footer-info-item">
              <MapPin size={16} />
              <span>
                ร้านตั้งอยู่ตามพิกัดแผนที่ ซอยลาดพร้าว 87
              </span>
            </div>
          </div>

          <div>
            <h4 style={{ color: 'white', marginBottom: '16px', fontSize: '1.1rem' }}>พิกัดร้าน</h4>
            <p style={{ fontSize: '0.85rem', marginBottom: '12px', lineHeight: '1.5' }}>
              สามารถค้นหาแผนที่ Google Maps เพื่อนำทางมาร้านได้ตามลิงก์ด้านล่างนี้
            </p>
            <a 
              href="https://share.google/LZRswke5oLNDiB3ld" 
              target="_blank" 
              rel="noreferrer" 
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', padding: '8px 16px', textDecoration: 'none' }}
            >
              <MapPin size={14} />
              <span>ดูแผนที่ Google Maps</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} iCarGadget. All Rights Reserved.</span>
          <span>Designed with Premium Light High-Tech Aesthetic</span>
        </div>
      </footer>
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
        {/* Public Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="projects/:id" element={<ProjectDetails showToast={showToast} isAdmin={false} />} />
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
