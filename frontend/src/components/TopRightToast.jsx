import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export default function TopRightToast() {
  const { toast, closeToast } = useNotification();

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isWarning = toast.type === 'warning';
  const isError = toast.type === 'error';

  return (
    <div 
      className={`top-right-toast-container ${toast.type || 'info'} ${toast.onClick ? 'clickable' : ''}`}
      style={toast.onClick ? { cursor: 'pointer' } : undefined}
      onClick={() => {
        if (toast.onClick) {
          toast.onClick();
          closeToast();
        }
      }}
    >
      <div className="toast-icon-wrap">
        {isSuccess && <CheckCircle2 size={20} color="var(--success)" />}
        {isWarning && <AlertTriangle size={20} color="var(--warning)" />}
        {isError && <AlertCircle size={20} color="var(--danger)" />}
        {!isSuccess && !isWarning && !isError && <Info size={20} color="var(--primary-light)" />}
      </div>

      <div className="toast-text-wrap">
        {toast.title && <div className="toast-title">{toast.title}</div>}
        <div className="toast-message">{toast.message}</div>
      </div>

      <button 
        type="button" 
        onClick={(e) => {
          e.stopPropagation();
          closeToast();
        }} 
        className="toast-close-btn"
        aria-label="Đóng thông báo"
      >
        <X size={15} />
      </button>

      {/* Thanh tiến trình thời gian biến mất */}
      <div className="toast-progress-bar" />
    </div>
  );
}
