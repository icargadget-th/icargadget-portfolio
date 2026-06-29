import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Upload, Trash2, Image as ImageIcon, Video, CheckCircle, HelpCircle, Car, Cpu } from 'lucide-react';
import ComponentBuilder from '../components/ComponentBuilder';

const API_BASE = import.meta.env.DEV ? 'http://localhost:8000' : '';

export default function ProjectForm({ showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const isEditMode = !!id;

  // Form Fields
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState(new Date().getFullYear());
  const [clientName, setClientName] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('In-Progress');
  
  // Child States
  const [components, setComponents] = useState([]);
  
  // Existing Media (Edit Mode)
  const [existingMedia, setExistingMedia] = useState([]);
  
  // Selected files queue for upload
  const [selectedFiles, setSelectedFiles] = useState([]); // Array of { file, previewUrl, caption, isThumbnail }
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load existing details in edit mode
  useEffect(() => {
    if (isEditMode) {
      const fetchProjectDetails = async () => {
        try {
          setLoading(true);
          const res = await fetch(`${API_BASE}/api/projects/${id}`);
          if (!res.ok) throw new Error("Failed to fetch project");
          const data = await res.json();
          
          setVehicleMake(data.vehicle_make);
          setVehicleModel(data.vehicle_model);
          setVehicleYear(data.vehicle_year);
          setClientName(data.client_name);
          setClientContact(data.client_contact || '');
          setDescription(data.description || '');
          setStatus(data.status);
          setComponents(data.components || []);
          setExistingMedia(data.media || []);
        } catch (err) {
          console.error(err);
          showToast("ไม่สามารถโหลดรายละเอียดผลงานชิ้นนี้ได้", "error");
          navigate('/admin');
        } finally {
          setLoading(false);
        }
      };
      fetchProjectDetails();
    }
  }, [id, isEditMode]);

  // File selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    addFilesToQueue(files);
  };

  const addFilesToQueue = (files) => {
    const maxVideoSize = 100 * 1024 * 1024; // 100MB limit for videos

    const newFiles = files.map(file => {
      if (file.type.startsWith('video/') && file.size > maxVideoSize) {
        showToast(`ไฟล์วิดีโอ ${file.name} มีขนาดเกิน 100MB และถูกข้ามไป`, "error");
        return null;
      }
      
      const previewUrl = URL.createObjectURL(file);
      return {
        file,
        previewUrl,
        fileType: file.type.startsWith('image/') ? 'image' : 'video',
        caption: '',
        isThumbnail: false
      };
    }).filter(Boolean);

    setSelectedFiles([...selectedFiles, ...newFiles]);
  };

  const removeFileFromQueue = (index) => {
    const fileToRemove = selectedFiles[index];
    if (fileToRemove.previewUrl) {
      URL.revokeObjectURL(fileToRemove.previewUrl);
    }
    setSelectedFiles(selectedFiles.filter((_, idx) => idx !== index));
  };

  const handleUpdateFileField = (index, field, value) => {
    const updated = selectedFiles.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      if (field === 'isThumbnail' && value === true) {
        return { ...item, isThumbnail: false };
      }
      return item;
    });

    if (field === 'isThumbnail' && value === true) {
      setExistingMedia(existingMedia.map(m => ({ ...m, is_thumbnail: false })));
    }
    
    setSelectedFiles(updated);
  };

  const handleDeleteExistingMedia = async (mediaId) => {
    if (!window.confirm("คุณต้องการลบไฟล์สื่อนี้อย่างถาวรใช่หรือไม่?")) return;

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/api/media/${mediaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setExistingMedia(existingMedia.filter(m => m.id !== mediaId));
        showToast("ลบไฟล์สำเร็จแล้ว");
      } else {
        throw new Error("Failed to delete media");
      }
    } catch (err) {
      console.error(err);
      showToast("เกิดข้อผิดพลาดในการลบไฟล์", "error");
    }
  };

  const handleSetExistingThumbnail = async (mediaId) => {
    const updated = existingMedia.map(m => ({
      ...m,
      is_thumbnail: m.id === mediaId
    }));
    setExistingMedia(updated);
    setSelectedFiles(selectedFiles.map(f => ({ ...f, isThumbnail: false })));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    addFilesToQueue(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vehicleMake || !vehicleModel || !clientName) {
      showToast("กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน", "error");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('admin_token');

      // 1. Submit Project Details & Components
      const projectPayload = {
        vehicle_make: vehicleMake,
        vehicle_model: vehicleModel,
        vehicle_year: parseInt(vehicleYear) || new Date().getFullYear(),
        client_name: clientName,
        client_contact: clientContact,
        description: description,
        status: status,
        components: components
      };

      const url = isEditMode ? `${API_BASE}/api/projects/${id}` : `${API_BASE}/api/projects`;
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(projectPayload)
      });

      if (!res.ok) throw new Error("Failed to save project record");
      const resData = await res.json();
      const projectId = isEditMode ? id : resData.id;

      // 2. Upload Selected Media Queue
      if (selectedFiles.length > 0) {
        for (const item of selectedFiles) {
          const formData = new FormData();
          formData.append('file', item.file);
          if (item.caption) formData.append('caption', item.caption);
          formData.append('is_thumbnail', item.isThumbnail ? 'true' : 'false');

          const uploadRes = await fetch(`${API_BASE}/api/projects/${projectId}/media`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });
          if (!uploadRes.ok) {
            console.error(`Failed to upload ${item.file.name}`);
          }
        }
      }

      // Cleanup preview urls
      selectedFiles.forEach(item => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });

      showToast(isEditMode ? "ปรับปรุงข้อมูลผลงานติดตั้งสำเร็จ!" : "บันทึกผลงานติดตั้งใหม่สำเร็จ!");
      navigate(`/admin/projects/${projectId}`);
    } catch (err) {
      console.error(err);
      showToast("เกิดข้อผิดพลาดในการบันทึกผลงาน", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>กำลังโหลดฟอร์มข้อมูล...</div>;
  }

  return (
    <div>
      <div className="action-header" style={{ marginBottom: '20px' }}>
        <div>
          <Link to={isEditMode ? `/admin/projects/${id}` : '/admin'} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem', marginBottom: '16px' }}>
            <ArrowLeft size={16} />
            <span>ยกเลิก</span>
          </Link>
          <h1 style={{ fontSize: '2rem' }}>{isEditMode ? 'แก้ไขข้อมูลผลงานติดตั้ง' : 'เพิ่มผลงานติดตั้งใหม่'}</h1>
          <p className="subtitle">กรอกข้อมูลรถ อุปกรณ์ประดับยนต์ที่ติดตั้ง และอัปโหลดภาพ/วิดีโอล็อกการทำงาน</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Vehicle & Client details */}
        <section className="detail-card">
          <h3>
            <Car size={20} className="stat-icon" />
            <span>ข้อมูลตัวรถและข้อมูลการสั่งงานของลูกค้า</span>
          </h3>

          <div className="form-grid">
            <div className="form-group">
              <label>ยี่ห้อรถ (Car Brand) *</label>
              <input
                type="text"
                className="form-input"
                placeholder="เช่น Toyota, Honda, Isuzu..."
                value={vehicleMake}
                onChange={(e) => setVehicleMake(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>รุ่นรถ (Car Model) *</label>
              <input
                type="text"
                className="form-input"
                placeholder="เช่น Fortuner, Civic, D-Max..."
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>ปีรุ่นรถ (Year) *</label>
              <input
                type="number"
                className="form-input"
                min="1900"
                max="2100"
                value={vehicleYear}
                onChange={(e) => setVehicleYear(parseInt(e.target.value) || new Date().getFullYear())}
                required
              />
            </div>

            <div className="form-group">
              <label>สถานะการทำงาน</label>
              <select
                className="filter-select-premium"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ width: '100%', height: '48px' }}
              >
                <option value="In-Progress">กำลังดำเนินการ (In-Progress)</option>
                <option value="Completed">เสร็จสมบูรณ์ (Completed)</option>
              </select>
            </div>

            <div className="form-group">
              <label>ชื่อลูกค้า (เก็บส่วนตัว - ไม่แสดงต่อสาธารณะ) *</label>
              <input
                type="text"
                className="form-input"
                placeholder="เช่น คุณสมชาย ดีใจ..."
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>ช่องทางติดต่อลูกค้า (เก็บส่วนตัว - เช่น เบอร์โทร/Line) *</label>
              <input
                type="text"
                className="form-input"
                placeholder="เช่น 081-234-5678"
                value={clientContact}
                onChange={(e) => setClientContact(e.target.value)}
              />
            </div>

            <div className="form-group full-width">
              <label>รายละเอียดงานติดตั้งและการเดินสายไฟเพิ่มเติม</label>
              <textarea
                className="form-textarea"
                placeholder="รายละเอียดการถอดคอนโซล หน้ากาก ลิงก์ไฟหน้า การเดินสายกล้อง ซ่อนสายไฟChallenges ที่พบ หรือค่าตำแหน่งจูนมิติเสียงลำโพง..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Step 2: Component catalog builder */}
        <section className="detail-card">
          <h3>
            <Cpu size={20} className="stat-icon" />
            <span>รายการอุปกรณ์ประดับยนต์ที่ติดตั้ง</span>
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
            รายการจอแอนดรอยด์ ลำโพง แผงซาวด์ ซับวูฟเฟอร์ กล้องถอย เซนเซอร์ หรือชิ้นส่วนประดับยนต์ต่าง ๆ ที่ติดตั้งในตัวรถคันนี้
          </p>
          
          <ComponentBuilder components={components} onChange={setComponents} />
        </section>

        {/* Step 3: Media Upload section */}
        <section className="detail-card">
          <h3>
            <Upload size={20} className="stat-icon" />
            <span>รูปภาพและวิดีโอประกอบพอร์ตโฟลิโอ</span>
          </h3>

          <div 
            className="media-uploader"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="image/*,video/*"
              style={{ display: 'none' }}
            />
            <div className="uploader-content">
              <Upload className="uploader-icon" size={36} />
              <p style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-main)' }}>
                ลากและวางภาพถ่าย/วิดีโอที่นี่ หรือคลิกเพื่ออัปโหลด
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                รองรับไฟล์ภาพ: WEBP, PNG, JPEG. วิดีโอ: MP4, MOV, WebM (ขนาดไฟล์วิดีโอไม่เกิน 100MB)
              </p>
            </div>
          </div>

          {/* Existing Media list (Edit Mode) */}
          {isEditMode && existingMedia.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>
                ไฟล์สื่อที่ลงทะเบียนแล้ว ({existingMedia.length})
              </h4>
              <div className="media-preview-grid">
                {existingMedia.map((m) => {
                  const mediaSrc = m.file_path.startsWith('http') ? m.file_path : `${API_BASE}/${m.file_path}`;
                  return (
                    <div key={m.id} className="media-preview-card">
                      {m.file_type === 'image' ? (
                        <img src={mediaSrc} alt="Media" />
                      ) : (
                        <video src={mediaSrc} preload="metadata" />
                      )}
                      
                      <div className="media-card-overlay" style={{ opacity: 1 }}>
                        <button 
                          type="button" 
                          className="delete-media-btn" 
                          onClick={() => handleDeleteExistingMedia(m.id)}
                          title="ลบถาวร"
                        >
                          <Trash2 size={12} />
                        </button>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', color: 'white', textShadow: '1px 1px 2px black' }}>
                            {m.file_type === 'image' ? 'รูปภาพ' : 'วิดีโอ'}
                          </span>
                          
                          {m.is_thumbnail ? (
                            <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--accent-blue)', color: 'white', padding: '2px 4px', borderRadius: '2px', fontWeight: 'bold' }}>
                              หน้าปก
                            </span>
                          ) : (
                            m.file_type === 'image' && (
                              <button 
                                type="button" 
                                onClick={() => handleSetExistingThumbnail(m.id)}
                                style={{ fontSize: '0.65rem', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '2px 4px', borderRadius: '2px', cursor: 'pointer' }}
                              >
                                ตั้งเป็นหน้าปก
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* New Selected Files Upload Queue */}
          {selectedFiles.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>
                คิวไฟล์ที่เตรียมอัปโหลด ({selectedFiles.length})
              </h4>
              
              <div className="media-preview-grid">
                {selectedFiles.map((item, idx) => (
                  <div key={idx} className="media-preview-card" style={{ height: 'auto', aspectRatio: 'auto', padding: '8px' }}>
                    <div style={{ aspectRatio: '4/3', overflow: 'hidden', borderRadius: '6px', position: 'relative', backgroundColor: 'var(--bg-secondary)', marginBottom: '8px' }}>
                      {item.fileType === 'image' ? (
                        <img src={item.previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <video src={item.previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                      
                      <button 
                        type="button" 
                        className="delete-media-btn" 
                        onClick={() => removeFileFromQueue(idx)}
                        style={{ position: 'absolute', top: '8px', right: '8px' }}
                        title="ลบออก"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="คำบรรยายรูปภาพ..."
                        value={item.caption}
                        onChange={(e) => handleUpdateFileField(idx, 'caption', e.target.value)}
                        style={{ padding: '6px 8px', fontSize: '0.75rem' }}
                      />
                      
                      {item.fileType === 'image' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={item.isThumbnail}
                            onChange={(e) => handleUpdateFileField(idx, 'isThumbnail', e.target.checked)}
                          />
                          <span>ใช้เป็นรูปหน้าปกผลงาน</span>
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Form actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '30px' }}>
          <Link to={isEditMode ? `/admin/projects/${id}` : '/admin'} className="btn btn-secondary">
            <span>ยกเลิก</span>
          </Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={18} />
            <span>{saving ? 'กำลังบันทึกข้อมูล...' : 'บันทึกข้อมูลผลงานติดตั้ง'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
