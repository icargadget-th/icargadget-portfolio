import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, CheckCircle, Clock, Cpu, Search, Plus } from 'lucide-react';
import ProjectCard from '../components/ProjectCard';

const API_BASE = import.meta.env.DEV ? 'http://localhost:8000' : '';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({
    total_projects: 0,
    completed_projects: 0,
    inprogress_projects: 0,
    total_components: 0,
  });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch stats and projects list
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats
      const statsRes = await fetch(`${API_BASE}/api/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      
      // Fetch projects with query params
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (category) queryParams.append('category', category);
      if (status) queryParams.append('status', status);

      const projectsRes = await fetch(`${API_BASE}/api/projects?${queryParams.toString()}`);
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [search, category, status]);

  return (
    <div>
      <div className="action-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>แผงควบคุมแอดมิน (CMS Admin Dashboard)</h1>
          <p className="subtitle" style={{ margin: '4px 0 0 0' }}>จัดการรายการผลงาน ข้อมูลชิ้นงาน และสื่อการติดตั้งของร้าน iCarGadget</p>
        </div>
        <Link to="/admin/projects/new" className="btn btn-primary">
          <Plus size={18} />
          <span>เพิ่มผลงานติดตั้งใหม่</span>
        </Link>
      </div>

      {/* Hero Stats Section */}
      <section className="stats-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '35px' }}>
        <div className="stat-card">
          <div className="stat-header">
            <span>ผลงานทั้งหมด</span>
            <LayoutDashboard className="stat-icon" size={18} />
          </div>
          <div className="stat-value">{stats.total_projects}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>ติดตั้งเสร็จสิ้น</span>
            <CheckCircle className="stat-icon" size={18} style={{ color: 'var(--accent-green)' }} />
          </div>
          <div className="stat-value">{stats.completed_projects}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header" style={{ color: 'var(--accent-orange)' }}>
            <span>กำลังดำเนินการ</span>
            <Clock className="stat-icon" size={18} style={{ color: 'var(--accent-orange)' }} />
          </div>
          <div className="stat-value">{stats.inprogress_projects}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>อุปกรณ์ที่ติดตั้งแล้ว</span>
            <Cpu className="stat-icon" size={18} style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div className="stat-value">{stats.total_components} ชิ้น</div>
        </div>
      </section>

      {/* Search and Filters Section */}
      <section className="controls-bar" style={{ display: 'flex', gap: '16px', marginBottom: '30px', flexWrap: 'wrap' }}>
        <div className="search-wrapper" style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
          <Search className="search-icon" size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="search-input"
            placeholder="ค้นหายี่ห้อรถ, รุ่นรถ, ชื่อลูกค้า, ชื่ออุปกรณ์..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: '48px' }}
          />
        </div>

        <select 
          className="filter-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ minWidth: '160px' }}
        >
          <option value="">ทุกหมวดหมู่อุปกรณ์</option>
          <option value="Audio">เครื่องเสียง (Audio)</option>
          <option value="Lighting">ไฟแต่ง/ไฟหน้า (Lighting)</option>
          <option value="Security">เซนเซอร์/กันขโมย (Security)</option>
          <option value="Fabrication">งานชิ้นงาน/แผงซาวด์ (Fabrication)</option>
          <option value="Wiring">ระบบสายไฟ (Wiring)</option>
          <option value="Other">อุปกรณ์อื่น ๆ (Other)</option>
        </select>

        <select 
          className="filter-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ minWidth: '160px' }}
        >
          <option value="">ทุกสถานะงาน</option>
          <option value="In-Progress">กำลังดำเนินการ</option>
          <option value="Completed">เสร็จสมบูรณ์</option>
        </select>
      </section>

      {/* Projects Gallery */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          กำลังโหลดข้อมูลผลงานติดตั้ง...
        </div>
      ) : projects.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '80px 40px', 
          border: '1px dashed var(--border-color)', 
          borderRadius: '12px',
          color: 'var(--text-muted)',
          backgroundColor: 'var(--bg-card)'
        }}>
          <h3>ไม่พบผลงานติดตั้งในระบบ</h3>
          <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>
            ทดลองปรับการค้นหาของคุณ หรือกดปุ่ม "เพิ่มผลงานติดตั้งใหม่" เพื่อเริ่มสร้างข้อมูล
          </p>
        </div>
      ) : (
        <section className="projects-grid">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </section>
      )}
    </div>
  );
}
