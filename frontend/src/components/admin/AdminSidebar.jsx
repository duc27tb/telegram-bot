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
  Layers
} from 'lucide-react';

export default function AdminSidebar({ activeTab, onSelectTab, onLogout, userEmail = 'admin@telepulse.io' }) {
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

  return (
    <aside className="admin-sidebar" style={{
      width: '270px',
      minWidth: '270px',
      height: '100vh',
      position: 'sticky',
      top: 0,
      background: 'var(--bg-sidebar, #0b0f19)',
      borderRight: '1px solid var(--border-subtle, rgba(239, 68, 68, 0.25))',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '20px 16px',
      zIndex: 50,
      boxShadow: '4px 0 24px rgba(0, 0, 0, 0.1)',
      transition: 'background-color 0.2s ease, border-color 0.2s ease'
    }}>
      {/* Top Branding */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 12px',
          background: 'rgba(239, 68, 68, 0.08)',
          borderRadius: '12px',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          marginBottom: '24px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(239, 68, 68, 0.45)',
            flexShrink: 0
          }}>
            <ShieldAlert size={22} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '15px', fontWeight: '900', color: '#f8fafc', letterSpacing: '-0.3px' }}>
                TelePulse Control
              </span>
            </div>
            <div style={{
              fontSize: '10px',
              fontWeight: '800',
              color: '#f87171',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginTop: '1px'
            }}>
              👑 Chủ Nền Tảng (Owner)
            </div>
          </div>
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
                onClick={() => onSelectTab(item.id)}
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
  );
}
