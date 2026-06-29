import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, Video } from 'lucide-react';

const API_BASE = import.meta.env.DEV ? 'http://localhost:8000' : '';

export default function MediaCarousel({ media = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!media || media.length === 0) {
    return (
      <div className="carousel-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="thumbnail-placeholder" style={{ background: 'transparent' }}>
          <ImageIcon size={48} />
          <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>No Media Files Uploaded</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Upload images or videos in the editor</span>
        </div>
      </div>
    );
  }

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? media.length - 1 : prevIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex === media.length - 1 ? 0 : prevIndex + 1));
  };

  const currentMedia = media[currentIndex];
  const mediaUrl = `${API_BASE}/${currentMedia.file_path}`;

  return (
    <div className="carousel-container">
      <div className="carousel-slide">
        {currentMedia.file_type === 'image' ? (
          <img 
            src={mediaUrl} 
            alt={currentMedia.caption || `Installation Photo ${currentIndex + 1}`} 
          />
        ) : (
          <video 
            src={mediaUrl} 
            controls 
            preload="metadata"
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </div>

      {media.length > 1 && (
        <>
          <button onClick={handlePrev} className="carousel-btn prev" aria-label="Previous Media">
            <ChevronLeft size={24} />
          </button>
          <button onClick={handleNext} className="carousel-btn next" aria-label="Next Media">
            <ChevronRight size={24} />
          </button>
        </>
      )}

      <div className="carousel-caption-bar">
        <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>
          {currentMedia.caption || `${currentMedia.file_type === 'image' ? 'Image' : 'Video'} ${currentIndex + 1} of ${media.length}`}
        </span>
        {currentMedia.is_thumbnail && (
          <span style={{ marginLeft: '10px', fontSize: '0.7rem', backgroundColor: 'var(--accent-blue)', color: 'var(--bg-primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
            Thumbnail
          </span>
        )}
      </div>
    </div>
  );
}
