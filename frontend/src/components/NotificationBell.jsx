import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export default function NotificationBell({ onNavigateTab, alignRight = false, isAdmin = false }) {
  const { notifications, unreadCount, clearBadge, markAsRead, markAllAsRead } = useNotification();
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Đóng dropdown khi click hoặc chạm ra ngoài (hỗ trợ mobile & desktop)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
    };
    if (showNotifDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showNotifDropdown]);

  const handleToggleBell = () => {
    setShowNotifDropdown(prev => !prev);
    // Khi click vào icon chuông, xóa badge đỏ trên icon
    clearBadge();
  };

  const handleNotificationItemClick = (n) => {
    markAsRead(n.id);
  };

  const handleNavigateFromNotif = (n, targetTab) => {
    markAsRead(n.id);
    setShowNotifDropdown(false);
    if (onNavigateTab) {
      onNavigateTab(targetTab);
    }
  };

  const handleGoToAll = () => {
    setShowNotifDropdown(false);
    if (onNavigateTab) {
      onNavigateTab(isAdmin ? 'transactions' : 'activities');
    }
  };

  const formatTimeAgo = (isoString) => {
    if (!isoString) return 'Vừa xong';
    const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return new Date(isoString).toLocaleDateString('vi-VN');
  };

  const unreadCountInList = notifications.filter(n => !n.read).length;

  return (
    <div className="header-notif-wrapper" ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Icon chuông chuẩn, đồng nhất tông màu & hiệu ứng */}
      <button
        type="button"
        onClick={handleToggleBell}
        className={`header-icon-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
        title={unreadCount > 0 ? `Có ${unreadCount} thông báo mới` : 'Thông báo hệ thống'}
        aria-label="Thông báo"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notif-badge-count">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu Thông Báo */}
      {showNotifDropdown && (
        <div
          className="notif-dropdown-menu"
          style={alignRight ? { left: 'auto', right: 0, transform: 'none' } : undefined}
        >
          <div className="notif-dropdown-header">
            <div className="notif-dropdown-header-title">
              <Bell size={16} color="var(--primary-light)" />
              <span>{isAdmin ? 'Thông Báo Quản Trị' : 'Thông Báo'}</span>
              {unreadCountInList > 0 && (
                <span className="notif-unread-tag">{unreadCountInList} chưa xem</span>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="notif-mark-read-btn"
                title="Đánh dấu tất cả thông báo là đã xem"
              >
                <CheckCheck size={14} />
                <span>Đã đọc tất cả</span>
              </button>
            )}
          </div>

          <div className="notif-dropdown-list">
            {notifications.length === 0 ? (
              <div className="notif-empty-state">
                <Bell size={28} color="var(--text-dim)" />
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Không có thông báo nào
                </p>
              </div>
            ) : (
              notifications.slice(0, 10).map((n) => {
                const isRead = !!n.read;
                const isSuccess = n.type === 'success';
                const isWarning = n.type === 'warning';
                
                // Điều hướng phù hợp
                let targetTab = isAdmin ? 'transactions' : 'activities';
                let targetLabel = isAdmin ? 'Chi tiết' : 'Chi tiết';

                const titleLower = (n.title || '').toLowerCase();
                const msgLower = (n.message || '').toLowerCase();

                if (titleLower.includes('nạp tiền') || titleLower.includes('ví') || msgLower.includes('nạp tiền') || msgLower.includes('vietqr')) {
                  targetTab = isAdmin ? 'transactions' : 'wallet';
                  targetLabel = isAdmin ? 'Xem Giao Dịch' : 'Xem Ví';
                } else if (titleLower.includes('vip') || msgLower.includes('vip')) {
                  targetTab = isAdmin ? 'pricing' : 'pricing';
                  targetLabel = isAdmin ? 'Xem Giá' : 'Xem Gói';
                }

                return (
                  <div
                    key={n.id}
                    className={`notif-item ${isRead ? 'is-read' : 'is-unread'}`}
                    onClick={() => handleNotificationItemClick(n)}
                    title={isRead ? 'Thông báo đã xem' : 'Chưa xem - Bấm để chuyển sang đã xem'}
                  >
                    <div className="notif-item-left">
                      <div className={`notif-icon-circle ${isRead ? 'icon-read' : 'icon-unread'}`}>
                        {isSuccess && <CheckCircle2 size={16} color="var(--success)" />}
                        {isWarning && <AlertTriangle size={16} color="var(--warning)" />}
                        {!isSuccess && !isWarning && (
                          <Info size={16} color={isRead ? "var(--text-muted)" : "var(--primary-light)"} />
                        )}
                      </div>
                    </div>

                    <div className="notif-item-body">
                      <div className="notif-top-row">
                        <div className="notif-item-title">{n.title}</div>
                        <span className={`notif-pill ${isRead ? 'pill-read' : 'pill-unread'}`}>
                          {isRead ? 'Đã xem' : 'Chưa xem'}
                        </span>
                      </div>

                      <div className="notif-item-msg">{n.message}</div>

                      <div className="notif-bottom-row">
                        <div className="notif-item-time">
                          <Clock size={11} />
                          <span>{formatTimeAgo(n.created_at)}</span>
                        </div>

                        {onNavigateTab && (
                          <button
                            type="button"
                            className="notif-navigate-link"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigateFromNotif(n, targetTab);
                            }}
                            title={`Chuyển tới ${targetLabel}`}
                          >
                            <span>{targetLabel}</span>
                            <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="notif-dropdown-footer">
            <button
              type="button"
              onClick={handleGoToAll}
              className="notif-view-all-btn"
            >
              <span>{isAdmin ? 'Xem toàn bộ giao dịch & hoạt động' : 'Xem tất cả nhật ký hoạt động'}</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
