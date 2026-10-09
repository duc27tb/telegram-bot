import React from 'react';
import { AlertTriangle, Trash2, X, Loader2, Info } from 'lucide-react';

/**
 * Modal xác nhận dùng chung cho toàn bộ ứng dụng
 * Thay thế hoàn toàn hàm confirm() mặc định của trình duyệt bằng giao diện hiện đại trong màn hình.
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận thao tác',
  message = 'Bạn có chắc chắn muốn thực hiện thao tác này?',
  subMessage,
  confirmText = 'Xác nhận xóa',
  cancelText = 'Hủy bỏ',
  variant = 'danger', // 'danger' | 'warning' | 'primary'
  icon,
  isLoading = false
}) {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  const themeColors = isDanger
    ? {
        border: 'rgba(239, 68, 68, 0.3)',
        shadow: '0 10px 30px rgba(239, 68, 68, 0.15)',
        iconBg: 'rgba(239, 68, 68, 0.15)',
        iconColor: '#ef4444',
        btnBg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        btnShadow: '0 2px 8px rgba(239, 68, 68, 0.35)',
        boxBg: 'rgba(239, 68, 68, 0.08)',
        boxBorder: 'rgba(239, 68, 68, 0.25)',
        boxText: '#f87171'
      }
    : isWarning
    ? {
        border: 'rgba(245, 158, 11, 0.3)',
        shadow: '0 10px 30px rgba(245, 158, 11, 0.15)',
        iconBg: 'rgba(245, 158, 11, 0.15)',
        iconColor: '#f59e0b',
        btnBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        btnShadow: '0 2px 8px rgba(245, 158, 11, 0.35)',
        boxBg: 'rgba(245, 158, 11, 0.08)',
        boxBorder: 'rgba(245, 158, 11, 0.25)',
        boxText: '#fbbf24'
      }
    : {
        border: 'rgba(99, 102, 241, 0.3)',
        shadow: '0 10px 30px rgba(99, 102, 241, 0.15)',
        iconBg: 'rgba(99, 102, 241, 0.15)',
        iconColor: '#6366f1',
        btnBg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        btnShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
        boxBg: 'rgba(99, 102, 241, 0.08)',
        boxBorder: 'rgba(99, 102, 241, 0.25)',
        boxText: '#818cf8'
      };

  return (
    <div className="modal-overlay" onClick={isLoading ? undefined : onClose} style={{ zIndex: 120 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '430px',
          padding: '24px',
          border: `1px solid ${themeColors.border}`,
          boxShadow: themeColors.shadow
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: themeColors.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {icon || (isDanger ? <Trash2 size={22} color={themeColors.iconColor} /> : <AlertTriangle size={22} color={themeColors.iconColor} />)}
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                {title}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Xác nhận thao tác trên màn hình
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="btn-icon-subtle"
            style={{ fontSize: '16px', padding: '4px', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Message */}
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
          <div style={{ margin: '0 0 12px 0' }}>
            {message}
          </div>

          {subMessage && (
            <div
              style={{
                background: themeColors.boxBg,
                border: `1px solid ${themeColors.boxBorder}`,
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start'
              }}
            >
              <Info size={16} color={themeColors.iconColor} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12px', color: themeColors.boxText }}>
                {subMessage}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="btn btn-secondary btn-sm"
            style={{ minWidth: '80px', padding: '8px 14px' }}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="btn btn-sm"
            style={{
              minWidth: '120px',
              padding: '8px 16px',
              background: themeColors.btnBg,
              color: '#ffffff',
              border: 'none',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: themeColors.btnShadow
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
