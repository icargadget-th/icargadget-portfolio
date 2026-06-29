import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, FileText, User, Phone, Car, Cpu, FileCode, CheckCircle, Clock } from 'lucide-react';
import MediaCarousel from '../components/MediaCarousel';

const API_BASE = import.meta.env.DEV ? 'http://localhost:8000' : '';

export default function ProjectDetails({ showToast, isAdmin = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/projects/${id}`);
      if (!res.ok) {
        throw new Error("Project not found");
      }
      const data = await res.json();
      setProject(data);
    } catch (err) {
      console.error(err);
      showToast("เกิดข้อผิดพลาดในการโหลดรายละเอียดผลงาน", "error");
      navigate(isAdmin ? '/admin' : '/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm("คุณแน่ใจหรือไม่ที่จะลบผลงานนี้? ภาพและข้อมูลทั้งหมดจะถูกลบออกจากระบบอย่างถาวร")) {
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/api/projects/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        showToast("ลบข้อมูลผลงานติดตั้งเรียบร้อยแล้ว");
        navigate('/admin');
      } else {
        throw new Error("Deletion failed");
      }
    } catch (err) {
      console.error(err);
      showToast("เกิดข้อผิดพลาดในการลบผลงาน", "error");
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const response = await fetch(`${API_BASE}/api/export/${id}`);
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const filename = `Portfolio_${project.vehicle_year}_${project.vehicle_make}_${project.vehicle_model}.pdf`.replace(/\s+/g, '_');
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      showToast("ดาวน์โหลดรายงาน PDF สำเร็จแล้ว!");
    } catch (err) {
      console.error(err);
      showToast("เกิดข้อผิดพลาดในการสร้างรายงาน PDF", "error");
    } finally {
      setExporting(false);
    }
  };

  const copyContactToClipboard = () => {
    if (project && project.client_contact) {
      navigator.clipboard.writeText(project.client_contact);
      showToast("คัดลอกข้อมูลติดต่อเรียบร้อยแล้ว!");
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>กำลังโหลดรายละเอียด...</div>;
  }

  if (!project) return null;

  return (
    <div style={{ padding: isAdmin ? '0' : '40px 24px', maxWidth: isAdmin ? '100%' : '1200px', margin: '0 auto' }}>
      {/* Top Header Back links and Controls */}
      <div className="action-header" style={{ marginBottom: '30px' }}>
        <div>
          <Link 
            to={isAdmin ? '/admin' : '/'} 
            className="btn btn-secondary" 
            style={{ padding: '8px 16px', fontSize: '0.85rem', marginBottom: '16px' }}
          >
            <ArrowLeft size={16} />
            <span>{isAdmin ? 'กลับสู่หน้าแดชบอร์ดแอดมิน' : 'กลับสู่หน้าหลัก'}</span>
          </Link>
          
          <h1 style={{ fontSize: '2rem', marginTop: '8px' }}>
            {project.vehicle_year} {project.vehicle_make} {project.vehicle_model}
          </h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
            <span className={`status-badge ${project.status.toLowerCase() === 'completed' ? 'completed' : 'in-progress'}`} style={{ position: 'static' }}>
              {project.status === 'Completed' ? 'ติดตั้งเสร็จสมบูรณ์' : 'กำลังดำเนินการ'}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              วันที่บันทึก: {new Date(project.created_at).toLocaleDateString('th-TH')}
            </span>
          </div>
        </div>

        {isAdmin && (
          <div className="action-buttons">
            <button onClick={handleExportPDF} className="btn btn-primary" disabled={exporting}>
              <FileText size={18} />
              <span>{exporting ? 'กำลังสร้าง PDF...' : 'ส่งออกรายงาน PDF'}</span>
            </button>
            
            <Link to={`/admin/projects/${project.id}/edit`} className="btn btn-secondary">
              <Edit size={18} />
              <span>แก้ไข</span>
            </Link>
            
            <button onClick={handleDelete} className="btn btn-danger">
              <Trash2 size={18} />
              <span>ลบผลงาน</span>
            </button>
          </div>
        )}
      </div>

      <div className="detail-grid">
        {/* Left main area: Carousel, Notes, Components */}
        <div>
          <section style={{ marginBottom: '30px' }}>
            <MediaCarousel media={project.media} />
          </section>

          {project.description && (
            <section className="detail-card">
              <h3>
                <FileCode size={20} className="stat-icon" />
                <span>รายละเอียดงานติดตั้งและการดัดแปลง</span>
              </h3>
              <div style={{ 
                lineHeight: '1.7', 
                color: 'var(--text-main)', 
                whiteSpace: 'pre-wrap', 
                fontSize: '0.95rem' 
              }}>
                {project.description}
              </div>
            </section>
          )}

          <section className="detail-card">
            <h3>
              <Cpu size={20} className="stat-icon" />
              <span>รายการอุปกรณ์ประดับยนต์ที่ติดตั้ง</span>
            </h3>
            
            {!project.components || project.components.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>ยังไม่ได้ลงทะเบียนรายการอุปกรณ์ในระบบ</p>
            ) : (
              <div className="components-table-wrapper">
                <table className="components-table">
                  <thead>
                    <tr>
                      <th>หมวดหมู่</th>
                      <th>ยี่ห้อ (Brand)</th>
                      <th>รุ่น (Model)</th>
                      <th>จำนวน</th>
                      <th>บันทึกเพิ่มเติม / การจูนระบบ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.components.map((c, idx) => (
                      <tr key={idx}>
                        <td>
                          <span className="category-tag" style={{ backgroundColor: 'rgba(0, 102, 255, 0.05)', color: 'var(--accent-blue)', borderColor: 'rgba(0, 102, 255, 0.1)' }}>
                            {c.category}
                          </span>
                        </td>
                        <td style={{ fontWeight: '700' }}>{c.brand}</td>
                        <td>{c.model}</td>
                        <td style={{ fontWeight: '600' }}>{c.quantity}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{c.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Right Info pane: Specs and Client Cards */}
        <div>
          <section className="detail-card">
            <h3>
              <Car size={20} className="stat-icon" />
              <span>ข้อมูลรุ่นรถ</span>
            </h3>
            <table className="info-sheet">
              <tbody>
                <tr>
                  <td className="label">ยี่ห้อรถ</td>
                  <td className="value">{project.vehicle_make}</td>
                </tr>
                <tr>
                  <td className="label">รุ่นรถ</td>
                  <td className="value">{project.vehicle_model}</td>
                </tr>
                <tr>
                  <td className="label">ปีรุ่นรถ (Year)</td>
                  <td className="value">{project.vehicle_year}</td>
                </tr>
              </tbody>
            </table>
          </section>

          {isAdmin && (
            <section className="detail-card">
              <h3>
                <User size={20} className="stat-icon" />
                <span>ข้อมูลลูกค้า (เฉพาะแอดมิน)</span>
              </h3>
              <table className="info-sheet" style={{ marginBottom: '15px' }}>
                <tbody>
                  <tr>
                    <td className="label">ชื่อลูกค้า</td>
                    <td className="value">{project.client_name}</td>
                  </tr>
                  <tr>
                    <td className="label">ช่องทางติดต่อ</td>
                    <td className="value" style={{ wordBreak: 'break-all' }}>
                      {project.client_contact || 'ไม่ได้บันทึกข้อมูล'}
                    </td>
                  </tr>
                </tbody>
              </table>

              {project.client_contact && (
                <button 
                  onClick={copyContactToClipboard} 
                  className="btn btn-secondary" 
                  style={{ width: '100%', padding: '10px' }}
                >
                  <Phone size={14} />
                  <span>คัดลอกข้อมูลติดต่อ</span>
                </button>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
