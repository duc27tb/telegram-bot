import React, { useEffect } from 'react';
import { ChevronRight, X, Star } from 'lucide-react';

/**
 * Reusable RightDrawer Component
 * Bảng trượt từ bên phải màn hình (Slide-Over Panel)
 * Có nút thu gọn/đóng ở chính giữa cạnh trái để đóng về phía bên phải
 */
export default function RightDrawer({
  isOpen,
  onClose,
  title = 'Bảng Điều Khiển',
  subtitle,
  icon: Icon = Star,
  iconColor = '#f59e0b',
  badge,
  width = '540px',
  headerActions,
  children,
  footer
}) {
  // Đóng khi nhấn phím Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Ngăn cuộn body khi drawer mở trên mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Lớp nền mờ Backdrop */}
      <div 
        className={`right-drawer-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

      {/* Khung Sidebar trượt từ bên phải */}
      <aside 
        className={`right-drawer-panel ${isOpen ? 'open' : ''}`}
        style={{ width: `min(${width}, 100vw)` }}
      >
        {/* Nút điều khiển ở CHÍNH GIỮA CẠNH TRÁI để đóng bảng */}
        <button
          onClick={onClose}
          className="right-drawer-handle-btn"
          title="Thu gọn / Đóng bảng điều khiển"
          aria-label="Đóng bảng bên phải"
        >
          <ChevronRight size={18} />
        </button>

        {/* Drawer Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(217, 119, 6, 0.12) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: iconColor,
              flexShrink: 0
            }}>
              <Icon size={20} fill={iconColor} />
            </div>

            <div style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{
                  fontSize: '17px',
                  fontWeight: '700',
                  margin: 0,
                  color: 'var(--text-main)',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}>
                  {title}
                </h3>
                {badge !== undefined && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '2px 7px',
                    borderRadius: '999px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    border: '1px solid rgba(245, 158, 11, 0.3)'
                  }}>
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && (
                <div style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  marginTop: '2px',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}>
                  {subtitle}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {headerActions}
            <button
              onClick={onClose}
              className="btn-icon-subtle"
              style={{ fontSize: '18px', padding: '6px' }}
              title="Đóng bảng"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Drawer Body (Cuộn mượt mà) */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {children}
        </div>

        {/* Drawer Footer nếu có */}
        {footer && (
          <div style={{
            padding: '14px 22px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(255, 255, 255, 0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            {footer}
          </div>
        )}
      </aside>
    </>
  );
}
