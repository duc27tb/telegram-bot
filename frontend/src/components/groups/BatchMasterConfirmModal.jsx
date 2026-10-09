import React from 'react';
import { Star, AlertTriangle, Loader2, X, CheckCircle2, ShieldAlert } from 'lucide-react';

/**
 * Modal xác nhận thao tác Ghim sao hàng loạt hoặc Bỏ ghim hàng loạt
 * Thay thế hoàn toàn hàm confirm() mặc định của trình duyệt bằng giao diện hiện đại trong màn hình.
 */
export default function BatchMasterConfirmModal({
  isOpen,
  onClose,
  action = 'add', // 'add' | 'remove'
  account,
  groupCount = 0,
  onConfirm,
  isLoading = false
}) {
  if (!isOpen) return null;

  const isAdd = action === 'add';

  return (
    <div className="modal-overlay" onClick={isLoading ? undefined : onClose} style={{ zIndex: 110 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '440px',
          padding: '24px',
          border: isAdd ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
          boxShadow: isAdd ? '0 10px 30px rgba(245, 158, 11, 0.15)' : '0 10px 30px rgba(239, 68, 68, 0.15)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: isAdd ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {isAdd ? (
                <Star size={22} fill="#f59e0b" color="#f59e0b" />
              ) : (
                <AlertTriangle size={22} color="#ef4444" />
              )}
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                {isAdd ? 'Xác nhận Ghim Nhóm Chung' : 'Xác nhận Bỏ Ghim Nhóm'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Thao tác hàng loạt trên toàn bộ nhóm của nick
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

        {/* Content Body */}
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
          <p style={{ margin: '0 0 12px 0' }}>
            Bạn có chắc chắn muốn {isAdd ? <strong style={{ color: '#f59e0b' }}>ghim toàn bộ</strong> : <strong style={{ color: '#ef4444' }}>gỡ toàn bộ</strong>}{' '}
            <strong style={{ color: 'var(--text-main)' }}>{groupCount} nhóm</strong> của tài khoản{' '}
            <strong style={{ color: 'var(--text-main)' }}>{account?.account_name || 'Tài khoản'}</strong> ({account?.phone_number}){' '}
            {isAdd ? 'vào Kho Nhóm Chung không?' : 'khỏi Kho Nhóm Chung không?'}
          </p>

          {isAdd ? (
            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '8px',
              padding: '10px 12px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start'
            }}>
              <CheckCircle2 size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12px', color: '#fbbf24' }}>
                Link mời và username đã được quét ngầm sẵn sẽ tự động liên kết ngay tức thì (0 delay).
              </div>
            </div>
          ) : (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              padding: '10px 12px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start'
            }}>
              <ShieldAlert size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12px', color: '#f87171' }}>
                Các nhóm này sẽ bị xóa khỏi Kho Nhóm Chung, nhưng danh sách nhóm của tài khoản này vẫn được lưu nguyên vẹn.
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="btn btn-secondary btn-sm"
            style={{ minWidth: '80px', padding: '8px 14px' }}
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading || groupCount === 0}
            className="btn btn-sm"
            style={{
              minWidth: '130px',
              padding: '8px 16px',
              background: isAdd 
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#ffffff',
              border: 'none',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: isAdd ? '0 2px 8px rgba(245, 158, 11, 0.35)' : '0 2px 8px rgba(239, 68, 68, 0.35)'
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="spin" />
                <span>Đang xử lý...</span>
              </>
            ) : isAdd ? (
              <>
                <Star size={14} fill="#ffffff" />
                <span>Ghim ({groupCount})</span>
              </>
            ) : (
              <>
                <X size={14} />
                <span>Bỏ ghim ({groupCount})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
