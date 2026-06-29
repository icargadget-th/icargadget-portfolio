import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast ${type}`}>
      {type === 'success' ? (
        <CheckCircle size={18} style={{ color: 'var(--accent-green)' }} />
      ) : (
        <AlertCircle size={18} style={{ color: 'var(--accent-red)' }} />
      )}
      <span>{message}</span>
    </div>
  );
}
