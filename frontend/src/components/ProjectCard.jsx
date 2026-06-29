import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, Car } from 'lucide-react';

const API_BASE = import.meta.env.DEV ? 'http://localhost:8000' : '';

export default function ProjectCard({ project }) {
  const location = useLocation();
  const statusClass = project.status.toLowerCase() === 'completed' ? 'completed' : 'in-progress';
  
  // Format the image source path
  // If the path starts with http/https (Supabase URL), use it directly. Otherwise, prefix with API BASE.
  const thumbUrl = project.thumbnail 
    ? (project.thumbnail.startsWith('http') ? project.thumbnail : `${API_BASE}/${project.thumbnail}`)
    : null;

  const linkPath = location.pathname.startsWith('/admin') 
    ? `/admin/projects/${project.id}` 
    : `/projects/${project.id}`;

  return (
    <Link to={linkPath} className="project-card">
      <div className="project-thumbnail">
        {thumbUrl ? (
          <img src={thumbUrl} alt={`${project.vehicle_make} ${project.vehicle_model}`} loading="lazy" />
        ) : (
          <div className="thumbnail-placeholder">
            <Car size={32} />
            <span>ไม่ได้อัปโหลดภาพ</span>
          </div>
        )}
        <span className={`status-badge ${statusClass}`}>
          {project.status === 'Completed' ? 'เสร็จสิ้น' : 'กำลังทำ'}
        </span>
      </div>

      <div className="project-details">
        <h3 className="project-title" style={{ fontSize: '1.1rem', fontWeight: '700' }}>
          {project.vehicle_year} {project.vehicle_make} {project.vehicle_model}
        </h3>
        
        <div className="project-client" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <User size={14} />
          <span>{project.client_name}</span>
        </div>

        {project.categories && project.categories.length > 0 && (
          <div className="project-categories" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: 'auto' }}>
            {project.categories.map((cat, idx) => (
              <span key={idx} className="category-tag" style={{ fontSize: '0.7rem' }}>
                {cat === 'Audio' ? 'เครื่องเสียง' : 
                 cat === 'Lighting' ? 'ไฟแต่ง/ไฟหน้า' :
                 cat === 'Security' ? 'เซนเซอร์/กันขโมย' :
                 cat === 'Fabrication' ? 'ตกแต่งชิ้นงาน' :
                 cat === 'Wiring' ? 'ระบบสายไฟ' : cat}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
