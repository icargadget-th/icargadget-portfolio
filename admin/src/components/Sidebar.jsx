import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Settings, Globe, LogOut } from 'lucide-react';

const API_BASE = import.meta.env.DEV ? 'http://localhost:8000' : '';

export default function Sidebar() {
  const navigate = useNavigate();
  const [dbMode, setDbMode] = useState('กำลังตรวจสอบ...');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/config`);
        if (res.ok) {
          const data = await res.json();
          setDbMode(data.supabase_enabled ? 'Supabase Cloud' : 'Local SQLite');
        } else {
          setDbMode('Local SQLite');
        }
      } catch (err) {
        setDbMode('Local SQLite');
      }
    };
    fetchConfig();
  }, []);

  const handleLogout = () => {
    if (window.confirm("คุณต้องการออกจากระบบแอดมินใช่หรือไม่?")) {
      localStorage.removeItem('admin_token');
      navigate('/login');
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img src="/logo.png" alt="iCarGadget Logo" style={{ height: '32px', width: 'auto' }} />
        <span className="logo-text">iCarGadget</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink 
          to="/" 
          end
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={20} />
          <span className="nav-label">แดชบอร์ด</span>
        </NavLink>

        <NavLink 
          to="/projects/new" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <PlusCircle size={20} />
          <span className="nav-label">เพิ่มผลงานติดตั้ง</span>
        </NavLink>

        <NavLink 
          to="/settings" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Settings size={20} />
          <span className="nav-label">การตั้งค่าระบบ</span>
        </NavLink>

        <a 
          href={import.meta.env.DEV ? 'http://localhost:5173' : '/'} 
          className="nav-item"
          style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', borderRadius: '0', paddingTop: '20px', textDecoration: 'none' }}
        >
          <Globe size={20} style={{ color: 'var(--accent-blue)' }} />
          <span className="nav-label" style={{ color: 'var(--text-main)' }}>ดูหน้าเว็บสาธารณะ</span>
        </a>

        <button 
          onClick={handleLogout} 
          className="nav-item"
          style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
        >
          <LogOut size={20} style={{ color: 'var(--accent-red)' }} />
          <span className="nav-label" style={{ color: 'var(--accent-red)' }}>ออกจากระบบ</span>
        </button>
      </nav>

      <div className="sidebar-status">
        <div className="status-indicator" style={{ backgroundColor: dbMode.includes('Supabase') ? 'var(--accent-green)' : 'var(--accent-orange)' }}></div>
        <span className="status-label">ระบบ DB: {dbMode}</span>
      </div>
    </aside>
  );
}
