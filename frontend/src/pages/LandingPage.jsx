import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Monitor, Volume2, Video, ShieldCheck, Sparkles, Share2, Star, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import ProjectCard from '../components/ProjectCard';

const API_BASE = import.meta.env.DEV ? 'http://localhost:8000' : '';

// Simulated customer reviews
const reviewsData = [
  {
    author: "คุณวิทวัส ทวีศิลป์",
    source: "รีวิวผ่าน Google Maps",
    rating: 5,
    text: "ซื้อจอ Android จาก Shopee มาเอง ช่างติดตั้งได้เนียนมาก เดินสายเก็บเรียบร้อย แนะนำการใช้งานดี บริการดีมากครับ พิกัดลาดพร้าว 87 หาง่ายมาก"
  },
  {
    author: "คุณธนพล ลิมปวัฒนะ",
    source: "รีวิวผ่าน Facebook Page",
    rating: 5,
    text: "เปลี่ยนลำโพงคู่หน้าหลังใหม่ ฝีมือติดตั้งดีเยี่ยม ร้านนี้เน้นติดตั้งอุปกรณ์ที่ลูกค้าเอามาเอง ตอบโจทย์มาก ราคาเป็นกันเอง ช่างเชี่ยวชาญจริง ๆ"
  },
  {
    author: "คุณกมลวรรณ เด่นดวง",
    source: "รีวิวผ่าน Facebook Page",
    rating: 5,
    text: "ติดกล้องรอบคัน 360 องศาให้รถ Honda City ช่างตั้งค่ากล้องได้ตรงและมุมมองชัดเจน เดินสายซ่อนใต้แผงคอนโซลไม่มีสายโผล่เลย แนะนำเลยค่ะ"
  },
  {
    author: "คุณสมชาย อัศวรุ่งโรจน์",
    source: "รีวิวผ่าน Google Maps",
    rating: 5,
    text: "มาแดมป์เก็บเสียงประตูกับร้านนี้ เสียงรบกวนเงียบลงเยอะมาก ช่างบริการรวดเร็ว ทำงานประณีต ราคาค่าติดตั้งไม่แพง สมเหตุสมผลครับ"
  }
];

export default function LandingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dynamic 2-tier filter states
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [brandsList, setBrandsList] = useState([]);
  const [brandModelMap, setBrandModelMap] = useState({});
  
  // Video tabs state
  const [activeVideoTab, setActiveVideoTab] = useState('all');
  
  // Reviews slider state
  const [currentReviewIdx, setCurrentReviewIdx] = useState(0);
  
  // Share button state
  const [copied, setCopied] = useState(false);

  // Load projects from database
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/projects`);
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
          
          // Construct Brand -> Models map dynamically
          const map = {};
          data.forEach(p => {
            const make = p.vehicle_make.trim();
            const model = p.vehicle_model.trim();
            if (!map[make]) {
              map[make] = new Set();
            }
            map[make].add(model);
          });
          
          // Convert sets to arrays
          const formattedMap = {};
          Object.keys(map).forEach(make => {
            formattedMap[make] = Array.from(map[make]).sort();
          });
          
          setBrandModelMap(formattedMap);
          setBrandsList(Object.keys(formattedMap).sort());
        }
      } catch (err) {
        console.error("Failed to load projects:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjects();
  }, []);

  // Sync state with URL search parameters on load/change
  useEffect(() => {
    if (Object.keys(brandModelMap).length > 0) {
      const brandParam = searchParams.get('brand');
      const modelParam = searchParams.get('model');
      
      if (brandParam && brandModelMap[brandParam]) {
        setSelectedBrand(brandParam);
        
        if (modelParam && brandModelMap[brandParam].includes(modelParam)) {
          setSelectedModel(modelParam);
        } else {
          setSelectedModel('');
        }
      } else {
        setSelectedBrand('');
        setSelectedModel('');
      }
    }
  }, [searchParams, brandModelMap]);

  // Handle brand selection change
  const handleBrandChange = (brand) => {
    setSelectedBrand(brand);
    setSelectedModel('');
    
    if (brand) {
      setSearchParams({ brand });
    } else {
      setSearchParams({});
    }
  };

  // Handle model selection change
  const handleModelChange = (model) => {
    setSelectedModel(model);
    
    if (selectedBrand) {
      if (model) {
        setSearchParams({ brand: selectedBrand, model });
      } else {
        setSearchParams({ brand: selectedBrand });
      }
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSelectedBrand('');
    setSelectedModel('');
    setSearchParams({});
  };

  // Copy shareable link
  const handleShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Filter projects based on dropdown states
  const filteredProjects = projects.filter(p => {
    const matchBrand = !selectedBrand || p.vehicle_make.toLowerCase() === selectedBrand.toLowerCase();
    const matchModel = !selectedModel || p.vehicle_model.toLowerCase() === selectedModel.toLowerCase();
    return matchBrand && matchModel;
  });

  // YouTube playlist mappings
  const youtubeVideos = [
    {
      id: "4UgLo88LFPE",
      title: "หมวดสอนซื้อจอแอนดรอยด์ (เลือกสเปกยังไงให้คุ้มค่า)",
      category: "screen",
      embedUrl: "https://www.youtube.com/embed/4UgLo88LFPE"
    },
    {
      id: "YpgLgGFNBOE",
      title: "หมวดวิธีเช็คการติดตั้งจอแอนดรอยด์ (ตรวจสอบจุดเดินสายและงานหน้ากาก)",
      category: "inspect",
      embedUrl: "https://www.youtube.com/embed/YpgLgGFNBOE"
    },
    {
      id: "YpgLgGFNBOE_speaker", // Helper ID for distinct key
      title: "หมวดวิธีเลือกซื้อลำโพง (ความแตกต่างของลำโพงแยกชิ้น/แกนร่วม)",
      category: "audio",
      embedUrl: "https://www.youtube.com/embed/YpgLgGFNBOE"
    },
    {
      id: "Eaen9tACiUY",
      title: "หมวดวิธีเลือกซื้อกล้องรอบคัน 360° (การวางตำแหน่งกล้องและเซนเซอร์)",
      category: "camera",
      embedUrl: "https://www.youtube.com/embed/Eaen9tACiUY"
    },
    {
      id: "dtYRNUhvHnY",
      title: "หมวดปัญหาที่มักเกิดหลังติดตั้งจอแอนดรอยด์ (วิธีแก้ไขปัญหาเบื้องต้น)",
      category: "trouble",
      embedUrl: "https://www.youtube.com/embed/dtYRNUhvHnY"
    }
  ];

  const filteredVideos = activeVideoTab === 'all' 
    ? youtubeVideos 
    : youtubeVideos.filter(v => v.category === activeVideoTab);

  // Review Slider actions
  const prevReview = () => {
    setCurrentReviewIdx(prev => (prev === 0 ? reviewsData.length - 1 : prev - 1));
  };

  const nextReview = () => {
    setCurrentReviewIdx(prev => (prev === reviewsData.length - 1 ? 0 : prev + 1));
  };

  return (
    <div id="home">
      {/* Premium Hero Section */}
      <section 
        className="hero-sec" 
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1617788138017-80ad40651399?q=80&w=1200&auto=format&fit=crop')` }}
      >
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            ศูนย์บริการติดตั้งอุปกรณ์ที่ลูกค้าจัดหามาเอง
          </div>
          <h1 className="hero-title">iCarGadget - ศูนย์ติดตั้งเครื่องเสียงและประดับยนต์ครบวงจร</h1>
          <p className="hero-desc">
            รับติดตั้ง จอแอนดรอยด์ ลำโพง กล้องติดรถยนต์ กล้องรอบคัน 360° แผ่นแดมป์เก็บเสียง เซนเซอร์ ไฟตัดหมอก 
            และอุปกรณ์แต่งรถทุกชนิดที่คุณซื้อออนไลน์มาเอง บริการประณีตโดยช่างผู้เชี่ยวชาญ เดินสายเก็บสายเนียนสวยงาม
          </p>
          <div className="hero-ctas">
            <button onClick={() => document.getElementById('portfolio').scrollIntoView({ behavior: 'smooth' })} className="btn btn-primary">
              ดูผลงานการติดตั้ง
            </button>
            <a href="https://line.me/ti/p/%40icargadget" target="_blank" rel="noreferrer" className="btn btn-purple" style={{ textDecoration: 'none' }}>
              จองคิว / สอบถามช่าง
            </a>
          </div>
        </div>
      </section>

      {/* Services Showcase Section */}
      <section className="section-container" id="services">
        <div className="section-header">
          <h2 className="section-title">บริการติดตั้งระดับพรีเมียม</h2>
          <p className="section-subtitle">บริการรับติดตั้งอุปกรณ์ประดับยนต์ทุกประเภทที่ท่านซื้อออนไลน์มาเอง ทีมงานพร้อมดูแลด้วยความใส่ใจ</p>
        </div>

        <div className="services-grid">
          <div className="service-card">
            <div className="service-icon-wrapper">
              <Monitor size={28} />
            </div>
            <h3 className="service-title">จอแอนดรอยด์ (Android Screen)</h3>
            <p className="service-desc">ติดตั้งจอแอนดรอยด์ตรงรุ่น จอหมุน จอพับ ซ่อนเก็บสายไฟ เชื่อมต่อระบบคอนโทรลพวงมาลัยสมบูรณ์</p>
          </div>

          <div className="service-card">
            <div className="service-icon-wrapper">
              <Volume2 size={28} />
            </div>
            <h3 className="service-title">เครื่องเสียง & ลำโพง (Audio Speakers)</h3>
            <p className="service-desc">เปลี่ยนลำโพงคู่หน้า-หลัง ทวีตเตอร์ ติดตั้งแอมป์ ซับบ็อกซ์ จูนมิติเสียงให้คมชัดสมจริง</p>
          </div>

          <div className="service-card">
            <div className="service-icon-wrapper">
              <Video size={28} />
            </div>
            <h3 className="service-title">กล้องติดรถยนต์ & 360° (Dashcams)</h3>
            <p className="service-desc">ติดตั้งกล้องบันทึกภาพหน้า-หลัง หรือกล้องรอบคัน 360° เซ็ตระบบพิกัดเลนส์อัจฉริยะ</p>
          </div>

          <div className="service-card">
            <div className="service-icon-wrapper">
              <ShieldCheck size={28} />
            </div>
            <h3 className="service-title">แดมป์เก็บเสียง (Sound Dampening)</h3>
            <p className="service-desc">ติดตั้งแผ่นแดมป์กันเสียงรบกวนรอบทิศทาง บริเวณประตู พื้นซุ้มล้อ และหลังคา ลดเสียงสะท้อนจากภายนอก</p>
          </div>

          <div className="service-card">
            <div className="service-icon-wrapper">
              <Sparkles size={28} />
            </div>
            <h3 className="service-title">อุปกรณ์เสริมอื่น ๆ (Accessories)</h3>
            <p className="service-desc">รับติดตั้งเซนเซอร์กะระยะถอยจอด ไฟตัดหมอก ไฟส่องสว่างภายในรถ OBD2 และประดับยนต์ทั่วไป</p>
          </div>
        </div>
      </section>

      {/* Portfolio Section with 2-Tier Cascading Filter */}
      <section className="section-container" id="portfolio" style={{ backgroundColor: '#ffffff', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.01)' }}>
        <div className="section-header">
          <h2 className="section-title">ผลงานการติดตั้งของเรา</h2>
          <p className="section-subtitle">เลือกกรองรุ่นรถและยี่ห้อรถด้านล่าง เพื่อค้นหาผลงานการติดตั้งจริงของทางร้าน</p>
        </div>

        {/* 2-Tier Cascading Filter Controls */}
        <div className="filter-card">
          <div className="filter-grid-2tier">
            <div className="filter-group">
              <label className="filter-label">1. ยี่ห้อรถ (Car Brand)</label>
              <select 
                className="filter-select-premium"
                value={selectedBrand}
                onChange={(e) => handleBrandChange(e.target.value)}
              >
                <option value="">เลือกยี่ห้อรถทั้งหมด...</option>
                {brandsList.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">2. รุ่นรถ (Car Model)</label>
              <select 
                className="filter-select-premium"
                value={selectedModel}
                onChange={(e) => handleModelChange(e.target.value)}
                disabled={!selectedBrand}
              >
                <option value="">เลือกรุ่นรถทั้งหมด...</option>
                {selectedBrand && brandModelMap[selectedBrand] && brandModelMap[selectedBrand].map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={handleShareLink} 
                className={`btn ${copied ? 'btn-secondary' : 'btn-primary'}`} 
                style={{ height: '48px', padding: '0 20px', whiteSpace: 'nowrap' }}
                title="Copy shareable link"
              >
                {copied ? <Check size={18} style={{ color: 'var(--accent-green)' }} /> : <Share2 size={18} />}
                <span>{copied ? "คัดลอกลิงก์แล้ว!" : "แชร์ผลลัพธ์นี้"}</span>
              </button>

              {(selectedBrand || selectedModel) && (
                <button 
                  onClick={handleResetFilters} 
                  className="btn btn-secondary"
                  style={{ height: '48px', padding: '0 20px' }}
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Projects Gallery */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
            กำลังโหลดข้อมูลผลงานการติดตั้ง...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '80px 20px', 
            border: '2px dashed var(--border-color)', 
            borderRadius: '16px',
            color: 'var(--text-muted)'
          }}>
            <h3>ไม่พบผลงานติดตั้งที่ค้นหา</h3>
            <p style={{ marginTop: '10px', fontSize: '0.9rem' }}>
              ขออภัย ยังไม่มีข้อมูลการติดตั้งสำหรับยี่ห้อและรุ่นรถที่กรองในฐานข้อมูลขณะนี้
            </p>
          </div>
        ) : (
          <div className="projects-grid">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>

      {/* Video Tutorials Section */}
      <section className="section-container" id="videos">
        <div className="section-header">
          <h2 className="section-title">คู่มือและวิดีโอแนะนำ</h2>
          <p className="section-subtitle">เรียนรู้วิธีการเลือกซื้อจอแอนดรอยด์ ลำโพง และวิธีเช็คงานติดตั้งจากช่างก่อนจ่ายเงิน</p>
        </div>

        {/* Category Tabs */}
        <div className="videos-category-tabs">
          <button onClick={() => setActiveVideoTab('all')} className={`video-tab-btn ${activeVideoTab === 'all' ? 'active' : ''}`}>ทั้งหมด</button>
          <button onClick={() => setActiveVideoTab('screen')} className={`video-tab-btn ${activeVideoTab === 'screen' ? 'active' : ''}`}>สอนซื้อจอ</button>
          <button onClick={() => setActiveVideoTab('inspect')} className={`video-tab-btn ${activeVideoTab === 'inspect' ? 'active' : ''}`}>เช็คงานติดตั้ง</button>
          <button onClick={() => setActiveVideoTab('audio')} className={`video-tab-btn ${activeVideoTab === 'audio' ? 'active' : ''}`}>การเลือกลำโพง</button>
          <button onClick={() => setActiveVideoTab('camera')} className={`video-tab-btn ${activeVideoTab === 'camera' ? 'active' : ''}`}>กล้องรอบคัน 360°</button>
          <button onClick={() => setActiveVideoTab('trouble')} className={`video-tab-btn ${activeVideoTab === 'trouble' ? 'active' : ''}`}>ปัญหาหลังติดตั้ง</button>
        </div>

        {/* Videos Grid */}
        <div className="videos-grid">
          {filteredVideos.map((video) => (
            <div key={video.id} className="video-card">
              <div className="video-iframe-wrapper">
                <iframe 
                  src={video.embedUrl} 
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                  allowFullScreen
                ></iframe>
              </div>
              <div className="video-info">
                <span className="video-category-badge">
                  {video.category === 'screen' && "สอนซื้อจอ"}
                  {video.category === 'inspect' && "วิธีตรวจงาน"}
                  {video.category === 'audio' && "เลือกลำโพง"}
                  {video.category === 'camera' && "กล้อง 360°"}
                  {video.category === 'trouble' && "ปัญหา & วิธีแก้"}
                </span>
                <h3 className="video-title">{video.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Customer Reviews Section */}
      <section className="section-container" id="reviews" style={{ backgroundColor: '#f8fafc', borderRadius: '24px' }}>
        <div className="section-header">
          <h2 className="section-title">เสียงตอบรับจากลูกค้า</h2>
          <p className="section-subtitle">ความประทับใจของลูกค้าจริงที่เลือกมาใช้บริการติดตั้งที่ iCarGadget</p>
        </div>

        <div className="reviews-slider-container">
          <div className="review-slide">
            <div className="review-stars">
              {[...Array(reviewsData[currentReviewIdx].rating)].map((_, i) => (
                <Star key={i} size={18} fill="var(--accent-orange)" />
              ))}
            </div>
            <p className="review-text">"{reviewsData[currentReviewIdx].text}"</p>
            <div className="review-author">{reviewsData[currentReviewIdx].author}</div>
            <div className="review-source">{reviewsData[currentReviewIdx].source}</div>
          </div>

          {/* Navigation arrows */}
          <button onClick={prevReview} className="slider-arrow arrow-left">
            <ChevronLeft size={20} />
          </button>
          <button onClick={nextReview} className="slider-arrow arrow-right">
            <ChevronRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );
}
