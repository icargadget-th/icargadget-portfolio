import React, { useState, useEffect } from 'react';
import { Download, Upload, Trash2, Database, ShieldAlert, CheckCircle2, Copy, Check, Info } from 'lucide-react';

const API_BASE = import.meta.env.DEV ? 'http://localhost:8000' : '';

export default function Settings({ showToast }) {
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);
  const [isSupabase, setIsSupabase] = useState(false);
  const [copied, setCopied] = useState(false);

  // SQL schema DDL for user to copy-paste into Supabase SQL editor
  const supabaseSQL = `-- 1. สร้างตาราง projects (ข้อมูลตัวรถและงานติดตั้ง)
CREATE TABLE IF NOT EXISTS projects (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vehicle_make text NOT NULL,
    vehicle_model text NOT NULL,
    vehicle_year integer NOT NULL,
    client_name text NOT NULL,
    client_contact text,
    description text,
    status text NOT NULL DEFAULT 'In-Progress',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. สร้างตาราง components (รายการอุปกรณ์ประดับยนต์ที่ติดตั้ง)
CREATE TABLE IF NOT EXISTS components (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id bigint REFERENCES projects(id) ON DELETE CASCADE,
    brand text NOT NULL,
    model text NOT NULL,
    category text NOT NULL,
    quantity integer NOT NULL DEFAULT 1,
    notes text
);

-- 3. สร้างตาราง media (ไฟล์รูปภาพ/วิดีโอ)
CREATE TABLE IF NOT EXISTS media (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id bigint REFERENCES projects(id) ON DELETE CASCADE,
    file_path text NOT NULL,
    file_type text NOT NULL,
    is_thumbnail boolean DEFAULT false,
    caption text,
    created_at timestamp with time zone DEFAULT now()
);

-- * หมายเหตุ: ในฝั่ง Supabase Storage ให้สร้าง Bucket สาธารณะ (Public)
--   ชื่อ "icargadget-media" เพื่อเก็บรูปภาพและวิดีโอ`;

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/config`);
        if (res.ok) {
          const data = await res.json();
          setIsSupabase(data.supabase_enabled);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchConfig();
  }, []);

  const handleCopySQL = () => {
    navigator.clipboard.writeText(supabaseSQL).then(() => {
      setCopied(true);
      showToast("คัดลอกรหัส SQL ไปยังคลิปบอร์ดแล้ว!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Trigger Local Backup Download
  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/api/backup`, { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Backup compilation failed");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const dateStr = new Date().toISOString().slice(0,10);
      a.download = `icargadget_backup_${dateStr}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      showToast("บีบอัดและดาวน์โหลดไฟล์สำรองระบบสำเร็จ!");
    } catch (err) {
      console.error(err);
      showToast("เกิดข้อผิดพลาดในการสำรองข้อมูลสำรองภายนอก", "error");
    } finally {
      setBackingUp(false);
    }
  };

  // Trigger Backup File Import (Restore)
  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm("คำเตือน: การนำเข้าข้อมูลเก่าจะเขียนทับฐานข้อมูล SQLite และไฟล์ภาพในปัจจุบันทั้งหมดของคุณ ยืนยันที่จะดำเนินการต่อหรือไม่?")) {
      e.target.value = null;
      return;
    }

    setRestoring(true);
    try {
      const token = localStorage.getItem('admin_token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/api/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Restore failed");
      }

      const result = await res.json();
      showToast(result.message || "กู้คืนระบบจากไฟล์ ZIP สำเร็จ!");
    } catch (err) {
      console.error(err);
      showToast(err.message || "เกิดข้อผิดพลาดในการกู้คืนไฟล์สำรอง", "error");
    } finally {
      setRestoring(false);
      e.target.value = null;
    }
  };

  // Trigger Orphaned Media Sweep
  const handleCleanup = async () => {
    setCleaning(true);
    setCleanupResult(null);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/api/media/cleanup`, { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Media cleanup operation failed");
      
      const result = await res.json();
      setCleanupResult(result);
      showToast(`ทำความสะอาดไฟล์ขยะที่ไม่ได้เชื่อมโยงแล้ว ${result.deleted_count} ไฟล์!`);
    } catch (err) {
      console.error(err);
      showToast("เกิดข้อผิดพลาดในการรันล้างข้อมูลไฟล์ขยะ", "error");
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div>
      <div className="action-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1>การตั้งค่าระบบ (System Settings)</h1>
          <p className="subtitle">การสำรองฐานข้อมูล การย้ายโฮสติ้ง และการตรวจสอบล้างไฟล์ระบบ</p>
        </div>
      </div>

      {/* Database Integration Guide (Supabase Cloud Setup) */}
      <div className="detail-card" style={{ marginBottom: '30px', borderLeft: '4px solid var(--accent-purple)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: 'none', paddingBottom: '0' }}>
          <Info size={20} style={{ color: 'var(--accent-purple)' }} />
          <span>การเชื่อมต่อฐานข้อมูล Supabase Cloud</span>
        </h3>
        
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: '12px 0' }}>
          แอปพลิเคชันนี้รองรับการเก็บข้อมูลในคลาวด์เพื่อการใช้งานในระยะยาว (Production) 
          หากระบบตรวจพบข้อมูลการตั้งค่า Supabase ในระบบไฟล์สิ่งแวดล้อม (.env) ระบบจะสลับฐานข้อมูลและที่เก็บสื่อจากเครื่องเครื่องคอมพิวเตอร์ของคุณขึ้นระบบ Cloud ให้โดยอัตโนมัติ
        </p>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', backgroundColor: isSupabase ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: isSupabase ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
            สถานะปัจจุบัน: {isSupabase ? 'เชื่อมต่อฐานข้อมูล Supabase Cloud แล้ว' : 'ทำงานในโหมดออฟไลน์ (SQLite & Local Disk)'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>ขั้นตอนการสลับระบบขึ้น Cloud:</p>
          <ol style={{ paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li>สมัครบัญชีและสร้างโปรเจกต์ใหม่ที่ <a href="https://supabase.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>Supabase.com</a></li>
            <li>คัดลอกไฟล์คำสั่ง SQL ด้านล่างนี้ ไปรันในหน้า SQL Editor ของ Supabase เพื่อจำลองโครงสร้างตารางข้อมูล</li>
            <li>สร้าง Bucket บนหน้า Storage ของ Supabase โดยตั้งชื่อว่า <strong style={{ color: 'var(--text-main)' }}>icargadget-media</strong> และเลือกตั้งค่าให้เป็นสาธารณะ (Public Bucket)</li>
            <li>เปิดไฟล์ <strong style={{ color: 'var(--text-main)' }}>.env</strong> ในโฟลเดอร์ root ของโปรเจกต์ และป้อนคีย์การเชื่อมต่อ:</li>
          </ol>
          <pre style={{ padding: '10px', backgroundColor: '#e2e8f0', color: '#0f172a', borderRadius: '6px', fontSize: '0.75rem', overflowX: 'auto', marginTop: '6px' }}>
{`SUPABASE_URL=https://ของคุณ.supabase.co
SUPABASE_KEY=anon-key-ของคุณ`}
          </pre>
        </div>

        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-main)' }}>รหัสสคริปต์ SQL (DDL Schema):</span>
            <button 
              onClick={handleCopySQL} 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
            >
              {copied ? <Check size={12} style={{ color: 'var(--accent-green)' }} /> : <Copy size={12} />}
              <span>{copied ? "คัดลอกแล้ว!" : "คัดลอกสคริปต์ SQL"}</span>
            </button>
          </div>
          <pre style={{ 
            padding: '16px', 
            backgroundColor: '#0f172a', 
            color: '#94a3b8', 
            borderRadius: '10px', 
            fontSize: '0.75rem', 
            overflowX: 'auto',
            maxHeight: '220px',
            fontFamily: 'monospace'
          }}>
            {supabaseSQL}
          </pre>
        </div>
      </div>

      <div className="maintenance-section">
        {/* Backup Card */}
        <div className="maintenance-card">
          <div className="maintenance-info">
            <div className="maintenance-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} className="stat-icon" />
              <span>ดาวน์โหลดไฟล์สำรองระบบติดตั้ง (SQLite + Media)</span>
            </div>
            <div className="maintenance-desc">
              บีบอัดฐานข้อมูล SQLite ท้องถิ่นและภาพถ่ายงานติดตั้งทั้งหมดในโฟลเดอร์จัดเก็บเป็นไฟล์ ZIP ลงเครื่องคอมพิวเตอร์ของคุณ
              {isSupabase && (
                <span style={{ display: 'block', marginTop: '6px', color: 'var(--accent-red)', fontWeight: '600' }}>
                  * ฟังก์ชันการสำรองข้อมูลปิดใช้งานในขณะเชื่อมต่อ Supabase Cloud (เนื่องจากข้อมูลบันทึกและรูปภาพถูกสำรองไว้อย่างปลอดภัยบนคลาวด์แล้ว)
                </span>
              )}
            </div>
          </div>
          <div>
            <button onClick={handleBackup} className="btn btn-primary" disabled={backingUp || isSupabase}>
              <Download size={16} />
              <span>{backingUp ? 'กำลังบีบอัดสำรอง...' : 'ดาวน์โหลด ZIP สำรองข้อมูล'}</span>
            </button>
          </div>
        </div>

        {/* Restore Card */}
        <div className="maintenance-card">
          <div className="maintenance-info">
            <div className="maintenance-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-orange)' }}>
              <ShieldAlert size={18} />
              <span>กู้คืนระบบจากไฟล์ ZIP</span>
            </div>
            <div className="maintenance-desc">
              อัปโหลดไฟล์ ZIP สำรองระบบเพื่อคืนค่าฐานข้อมูลและเขียนทับไฟล์รูปภาพงานติดตั้งทั้งหมด
              <span style={{ display: 'block', marginTop: '6px', color: 'var(--accent-orange)', fontWeight: '600' }}>
                ข้อควรระวัง: ระบบจะสร้างสแนปช็อตย้อนกลับฉุกเฉินให้ก่อนเขียนทับเสมอ
              </span>
              {isSupabase && (
                <span style={{ display: 'block', marginTop: '6px', color: 'var(--accent-red)', fontWeight: '600' }}>
                  * ฟังก์ชันนี้ไม่รองรับในโหมด Supabase Cloud
                </span>
              )}
            </div>
          </div>
          <div>
            <label className={`btn btn-secondary ${isSupabase ? 'disabled' : ''}`} style={{ display: 'inline-flex', cursor: isSupabase ? 'not-allowed' : 'pointer', opacity: isSupabase ? 0.5 : 1 }}>
              <Upload size={16} />
              <span>{restoring ? 'กำลังกู้คืน...' : 'เลือกไฟล์ ZIP สำรอง'}</span>
              {!isSupabase && (
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleRestore}
                  disabled={restoring}
                  style={{ display: 'none' }}
                />
              )}
            </label>
          </div>
        </div>

        {/* Cleanup Card */}
        <div className="maintenance-card">
          <div className="maintenance-info">
            <div className="maintenance-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trash2 size={18} style={{ color: 'var(--accent-red)' }} />
              <span>ตรวจสอบและล้างไฟล์ขยะระบบ</span>
            </div>
            <div className="maintenance-desc">
              ระบบจะทำสแกนเปรียบเทียบรูปภาพทั้งหมดในพื้นที่จัดเก็บ (ในโฟลเดอร์เครื่อง หรือ บน Supabase Storage) กับเรคคอร์ดในฐานข้อมูล 
              และทำการลบไฟล์ภาพที่ไม่มีการอ้างอิงถึงในระบบอย่างถาวรเพื่อประหยัดพื้นที่จัดเก็บ
            </div>
          </div>
          <div>
            <button onClick={handleCleanup} className="btn btn-danger" disabled={cleaning}>
              <Trash2 size={16} />
              <span>{cleaning ? 'กำลังกู้คืนขยะ...' : 'รันตรวจสอบและล้างระบบ'}</span>
            </button>
          </div>
        </div>

        {/* Audit Results display */}
        {cleanupResult && (
          <div className="detail-card" style={{ marginTop: '10px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.95rem' }}>
              <CheckCircle2 size={16} style={{ color: 'var(--accent-green)' }} />
              <span>รายงานการกวาดล้างขยะในระบบ</span>
            </h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '8px' }}>
              ทำความสะอาดไฟล์ขยะสำเร็จ ลบไฟล์ที่ตกค้างออกไปจำนวน <strong>{cleanupResult.deleted_count}</strong> ไฟล์
            </p>
            {cleanupResult.deleted_count > 0 && (
              <ul style={{ paddingLeft: '20px', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {cleanupResult.deleted_files.map((file, idx) => (
                  <li key={idx}>{file}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
