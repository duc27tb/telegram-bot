import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  SendHorizontal, 
  MessageSquare, 
  Settings, 
  LogOut,
  Bot,
  AlertTriangle,
  X,
  Wallet,
  Activity,
  Layers,
  Crown,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Sidebar({ activeTab, setActiveTab, isOpen, onClose }) {
  const { user, profile, signOut } = useAuth();
  const { unreadChatCount } = useChat();
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('telepulse_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'dashboard', label: 'Bảng Điều Khiển', icon: LayoutDashboard },
    { id: 'pricing', label: 'Bảng Giá & Gói Cước VIP', icon: Crown, badge: 'HOT' },
    { id: 'accounts', label: 'Tài Khoản Telegram', icon: Users },
    { id: 'groups', label: 'Nhóm Mục Tiêu', icon: Layers },
    { id: 'campaign', label: 'Chiến Dịch & Tin Nhắn', icon: SendHorizontal },
    { id: 'chat', label: 'Hộp Thư Trực Tiếp', icon: MessageSquare },
    { id: 'wallet', label: 'Ví & Nạp Tiền', icon: Wallet },
    { id: 'activities', label: 'Lịch Sử Hoạt Động', icon: Activity },
    { id: 'settings', label: 'Cài Đặt Hồ Sơ', icon: Settings },
  ];

  const currentPath = location.pathname.replace('/', '') || 'dashboard';
  const currentActive = activeTab || currentPath;

  const handleSelectTab = (id) => {
    navigate(`/${id}`);
    if (setActiveTab) setActiveTab(id);
    if (onClose) onClose(); // Tự động đóng menu trên mobile khi click chọn tab
  };

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('telepulse_sidebar_collapsed', next.toString());
      } catch {}
      return next;
    });
  };

  return (
    <>
      {/* Lớp phủ mờ (Backdrop) trên Mobile */}
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div>
          {/* Header Sidebar: Logo & Nút Thu/Phóng */}
          {!isCollapsed ? (
            <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="sidebar-logo-icon">
                  <Bot size={22} />
                </div>
                <div>
                  <div className="sidebar-logo-text">TelePulse</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Multi-Tenant Bot SaaS</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* Nút Thu gọn Sidebar trên Desktop */}
                <button 
                  type="button"
                  onClick={toggleCollapse}
                  className="sidebar-toggle-btn"
                  title="Thu gọn thanh menu"
                  aria-label="Thu gọn thanh menu"
                >
                  <PanelLeftClose size={17} />
                </button>

                {/* Nút đóng Sidebar chỉ hiện trên Mobile */}
                <button 
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'none', padding: '6px' }}
                  id="sidebar-close-btn"
                  aria-label="Đóng thanh menu"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="sidebar-logo-collapsed">
              <div className="sidebar-logo-icon" title="TelePulse Multi-Tenant Bot SaaS">
                <Bot size={22} />
              </div>
              <button 
                type="button"
                onClick={toggleCollapse}
                className="sidebar-toggle-btn"
                title="Mở rộng thanh menu"
                aria-label="Mở rộng thanh menu"
                style={{ marginTop: '8px' }}
              >
                <PanelLeftOpen size={17} />
              </button>
            </div>
          )}

          {/* Danh Sách Điều Hướng */}
          <ul className="nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentActive === item.id;
              const isChat = item.id === 'chat';

              // CHẾ ĐỘ THU GỌN (COLLAPSED)
              if (isCollapsed) {
                return (
                  <li
                    key={item.id}
                    className={`nav-item nav-item-collapsed ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectTab(item.id)}
                    title={
                      isChat && unreadChatCount > 0 
                        ? `${item.label} (${unreadChatCount} tin nhắn mới)` 
                        : item.label
                    }
                  >
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={19} />
                      
                      {/* Badge số tin nhắn chưa đọc khi Sidebar thu gọn */}
                      {isChat && unreadChatCount > 0 && (
                        <span className="sidebar-chat-icon-badge">
                          {unreadChatCount > 9 ? '9+' : unreadChatCount}
                        </span>
                      )}

                      {/* Chấm nhỏ cho mục HOT khi thu gọn */}
                      {!isChat && item.badge && (
                        <span className="sidebar-mini-dot-badge" />
                      )}
                    </div>
                  </li>
                );
              }

              // CHẾ ĐỘ MỞ RỘNG (EXPANDED)
              return (
                <li
                  key={item.id}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelectTab(item.id)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Badge đếm số tin nhắn chưa đọc của Hộp thư trực tiếp */}
                    {isChat && unreadChatCount > 0 && (
                      <span className="sidebar-chat-unread-badge">
                        {unreadChatCount > 99 ? '99+' : unreadChatCount}
                      </span>
                    )}

                    {/* Tag HOT cho gói cước VIP */}
                    {item.badge && (
                      <span style={{
                        fontSize: '9px',
                        fontWeight: '800',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        background: 'rgba(220, 38, 38, 0.2)',
                        color: '#f87171',
                        border: '1px solid rgba(220, 38, 38, 0.4)'
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Khu Vực Tài Khoản / Ví Tiền / Đăng Xuất Ở Đáy Sidebar */}
        {!isCollapsed ? (
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', marginBottom: '8px' }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: profile?.subscription_tier === 'VIP'
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  color: '#fff',
                  border: profile?.subscription_tier === 'VIP' ? '2px solid #fbbf24' : '2px solid transparent',
                  boxShadow: profile?.subscription_tier === 'VIP' ? '0 0 12px rgba(245, 158, 11, 0.5)' : 'none',
                  transition: 'all 0.25s ease'
                }}>
                  {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                {profile?.subscription_tier === 'VIP' && (
                  <div style={{
                    position: 'absolute',
                    top: '-7px',
                    right: '-5px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--bg-sidebar, #0f172a)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
                  }}>
                    <Crown size={10} color="#ffffff" />
                  </div>
                )}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {profile?.full_name || 'Người dùng'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {user?.email}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '600',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: profile?.subscription_tier === 'VIP' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(99, 102, 241, 0.12)',
                    color: profile?.subscription_tier === 'VIP' ? '#facc15' : 'var(--text-muted)',
                    border: profile?.subscription_tier === 'VIP' ? '1px solid rgba(234, 179, 8, 0.35)' : '1px solid var(--border-subtle)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}>
                    {profile?.role === 'admin' ? '👑 Quản Trị Viên' : profile?.subscription_tier === 'VIP' ? '⭐ Khách Hàng VIP' : '👤 Khách Hàng'}
                  </span>
                </div>
              </div>
            </div>

            <div 
              onClick={() => handleSelectTab('wallet')}
              style={{
                margin: '4px 6px 12px 6px',
                padding: '10px 12px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s'
              }}
              title="Xem ví và nạp tiền VietQR"
            >
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Wallet size={12} color="var(--primary-light)" />
                  <span>Số dư ví</span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#818cf8', marginTop: '2px' }}>
                  {(profile?.balance || 0).toLocaleString('vi-VN')} ₫
                </div>
              </div>
              <span style={{ fontSize: '11px', padding: '3px 8px', background: 'var(--primary)', color: '#fff', borderRadius: '4px', fontWeight: '600' }}>
                + Nạp
              </span>
            </div>

            <button 
              type="button"
              onClick={() => setShowConfirmLogout(true)}
              className="btn btn-secondary btn-sm" 
              style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--danger)' }}
            >
              <LogOut size={16} />
              <span>Đăng xuất</span>
            </button>
          </div>
        ) : (
          /* Footer khi Sidebar thu gọn */
          <div className="sidebar-footer-collapsed">
            <div 
              className="sidebar-avatar-mini"
              title={`${profile?.full_name || 'Người dùng'} (${user?.email})`}
            >
              {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>

            <button
              type="button"
              onClick={() => handleSelectTab('wallet')}
              className="sidebar-collapsed-btn"
              title={`Số dư ví: ${(profile?.balance || 0).toLocaleString('vi-VN')} ₫ (Bấm để nạp)`}
              aria-label="Xem ví"
            >
              <Wallet size={17} color="var(--primary-light)" />
            </button>

            <button
              type="button"
              onClick={() => setShowConfirmLogout(true)}
              className="sidebar-collapsed-btn danger"
              title="Đăng xuất tài khoản"
              aria-label="Đăng xuất"
            >
              <LogOut size={17} color="#ef4444" />
            </button>
          </div>
        )}
      </aside>

      {/* Popup xác nhận đăng xuất */}
      {showConfirmLogout && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '380px', textAlign: 'center', padding: '28px 24px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'var(--danger-bg)',
              color: '#ef4444',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              border: '1px solid rgba(239, 68, 68, 0.25)'
            }}>
              <LogOut size={24} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-main)' }}>
              Xác Nhận Đăng Xuất
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
              Bạn có chắc chắn muốn đăng xuất khỏi tài khoản <strong>{user?.email}</strong> không?
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="button"
                onClick={() => setShowConfirmLogout(false)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Hủy bỏ
              </button>
              <button 
                type="button"
                onClick={() => {
                  setShowConfirmLogout(false);
                  signOut();
                }}
                className="btn btn-danger"
                style={{ flex: 1 }}
              >
                Đăng Xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
