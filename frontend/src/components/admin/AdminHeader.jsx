import React from 'react';
import {
  RefreshCw,
  LogOut
} from 'lucide-react';
import NotificationBell from '../NotificationBell';
import ThemeToggle from '../ThemeToggle';

export default function AdminHeader({
  title,
  subtitle,
  onRefresh,
  loading,
  onRequestLogout,
  onSelectTab
}) {
  return (
    <header className="admin-header" style={{
      background: 'var(--bg-sidebar, rgba(11, 15, 25, 0.95))',
      borderBottom: '1px solid var(--border-subtle, rgba(239, 68, 68, 0.25))',
      padding: '16px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      backdropFilter: 'blur(16px)',
      transition: 'background-color 0.2s ease, border-color 0.2s ease'
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--text-main, #f8fafc)', letterSpacing: '-0.3px' }}>
            {title}
          </h1>
          <span style={{
            fontSize: '10px',
            fontWeight: '900',
            padding: '2px 8px',
            borderRadius: '6px',
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#f87171',
            border: '1px solid rgba(239, 68, 68, 0.4)'
          }}>
            CHỦ NỀN TẢNG
          </span>
        </div>
        {subtitle && (
          <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
            {subtitle}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Live system indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600',
          color: '#10b981',
          height: '38px',
          boxSizing: 'border-box'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 8px #10b981',
            display: 'inline-block'
          }} />
          <span>Hệ Thống Trực Tuyến</span>
        </div>

        {/* Nút Làm Mới Dữ Liệu */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md, 8px)',
            background: 'var(--bg-card, rgba(30, 41, 59, 0.8))',
            border: '1px solid var(--border-medium, rgba(148, 163, 184, 0.2))',
            color: 'var(--text-main, #f8fafc)',
            fontSize: '12px',
            fontWeight: '600',
            cursor: loading ? 'default' : 'pointer',
            transition: 'all 0.2s ease',
            height: '38px',
            boxSizing: 'border-box'
          }}
        >
          <RefreshCw
            size={14}
            className={loading ? 'spin' : ''}
            style={{
              transformOrigin: 'center',
              willChange: 'transform'
            }}
          />
          <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
        </button>

        {/* Chuông Thông Báo (Tái sử dụng chung chuẩn với màn hình khách hàng) */}
        <NotificationBell
          onNavigateTab={onSelectTab}
          alignRight={true}
          isAdmin={true}
        />

        {/* Nút Chuyển Đổi Dark / Light Mode (Tái sử dụng chung chuẩn) */}
        <ThemeToggle />

        {/* Nút Thoát / Đăng xuất Admin (Mở Popup xác nhận) */}
        {onRequestLogout && (
          <button
            type="button"
            onClick={onRequestLogout}
            title="Đăng xuất khỏi phiên Quản trị viên"
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md, 8px)',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#f87171',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              height: '38px',
              boxSizing: 'border-box'
            }}
          >
            <LogOut size={13} />
            <span>Thoát</span>
          </button>
        )}
      </div>
    </header>
  );
}
