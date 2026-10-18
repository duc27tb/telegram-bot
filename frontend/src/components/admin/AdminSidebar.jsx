import React from 'react';
import {
  ShieldAlert,
  LayoutDashboard,
  Users,
  DollarSign,
  Crown,
  Bot,
  Settings,
  LogOut,
  Sparkles,
  Server,
  Activity,
  Layers,
  X
} from 'lucide-react';

export default function AdminSidebar({ 
  activeTab, 
  onSelectTab, 
  onLogout, 
  userEmail = 'admin@telepulse.io',
  isOpen = false,
  onClose
}) {
  const menuItems = [
    {
      id: 'overview',
      label: 'Tổng Quan Hệ Thống',
      icon: LayoutDashboard,
      badge: 'KPI'
    },
    {
      id: 'users',
      label: 'Quản Lý Khách Hàng',
      icon: Users,
      badge: 'Users'
    },
    {
      id: 'transactions',
      label: 'Dòng Tiền & Giao Dịch',
      icon: DollarSign,
      badge: 'VietQR'
    },
    {
      id: 'pricing',
      label: 'Gói Cước & Bảng Giá VIP',
      icon: Crown,
      badge: 'Plans'
    },
    {
      id: 'bots',
      label: 'Giám Sát Bot Toàn Sàn',
      icon: Bot,
      badge: 'Live'
    },
    {
      id: 'audit_logs',
      label: 'Nhật Ký Kiểm Toán (Audit)',
      icon: Activity,
      badge: 'Audit'
    },
    {
      id: 'settings',
      label: 'Cấu Hình Nền Tảng',
      icon: Settings,
      badge: null
    }
  ];

  const handleSelect = (id) => {
    onSelectTab(id);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Backdrop trên màn hình mobile / tablet */}
      {isOpen && <div className="admin-sidebar-backdrop" onClick={onClose} />}

      <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Top Branding */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            background: 'rgba(239, 68, 68, 0.08)',
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 0 16px rgba(239, 68, 68, 0.35)',
                flexShrink: 0
              }}>
                <ShieldAlert size={22} />
              </div>
              <div>
                <div style={{
                  fontSize: '15px',
                  fontWeight: '800',
                  color: 'var(--text-main, #ffffff)',
                  letterSpacing: '-0.3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span>TelePulse</span>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: '900',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    background: '#ef4444',
                    color: '#ffffff'
                  }}>
                    ROOT
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
                  Platform Owner Center
                </div>
              </div>
            </div>

            {/* Nút đóng trên mobile */}
            <button
              type="button"
              onClick={onClose}
              className="admin-sidebar-close-btn"
              aria-label="Đóng menu admin"
            >
              <X size={18} />
            </button>
          </div>

          {/* Section title */}
          <div style={{
            fontSize: '10px',
            fontWeight: '800',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            padding: '0 12px',
            marginBottom: '10px'
          }}>
            Hệ Thống Quản Trị Trung Tâm
          </div>

          {/* Navigation items */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: isActive ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid transparent',
                  background: isActive ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.05) 100%)' : 'transparent',
                  color: isActive ? '#fca5a5' : '#94a3b8',
                  fontSize: '13px',
                  fontWeight: isActive ? '700' : '500',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  width: '100%'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={18} color={isActive ? '#ef4444' : '#64748b'} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span style={{
                    fontSize: '9px',
                    fontWeight: '800',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    background: isActive ? 'rgba(239, 68, 68, 0.35)' : 'rgba(30, 41, 59, 0.8)',
                    color: isActive ? '#fecaca' : '#64748b',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Logout */}
      <div style={{
        borderTop: '1px solid rgba(239, 68, 68, 0.2)',
        paddingTop: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 10px',
          background: 'rgba(15, 23, 42, 0.8)',
          borderRadius: '10px',
          border: '1px solid rgba(148, 163, 184, 0.12)'
        }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: '800',
            fontSize: '14px',
            border: '2px solid rgba(245, 158, 11, 0.6)',
            boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)',
            flexShrink: 0
          }}>
            👑
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              System Administrator
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {userEmail}
            </div>
            <div style={{ marginTop: '2px' }}>
              <span style={{
                fontSize: '9px',
                fontWeight: '900',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(239, 68, 68, 0.25)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.45)',
                letterSpacing: '0.3px'
              }}>
                SUPER ADMIN (ROOT)
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#f87171',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            width: '100%'
          }}
        >
          <LogOut size={14} />
          <span>Đăng Xuất Admin</span>
        </button>
      </div>
    </aside>
  </>
  );
}
