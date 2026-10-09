import React, { useState, useEffect, useRef } from 'react';
import { 
  Sun, 
  Moon, 
  Menu, 
  Wallet, 
  PlusCircle, 
  Bell, 
  CheckCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Clock, 
  ArrowRight,
  Crown,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';

export default function Header({ title, onOpenMobileMenu, onNavigateTab }) {
  const { profile } = useAuth();

  const handleGoToWallet = () => {
    if (onNavigateTab) {
      onNavigateTab('wallet');
    }
  };

  const currentBalance = profile?.balance || 0;
  const isVip = profile?.subscription_tier === 'VIP';

  return (
    <header className="top-header">
      <div className="header-left">
        {/* Nút Hamburger chỉ hiện trên Mobile */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="mobile-menu-btn"
          aria-label="Open navigation menu"
        >
          <Menu size={18} />
        </button>
        <h2 className="header-title">{title}</h2>
      </div>

      <div className="header-actions">
        {/* 1. NÚT GÓI CƯỚC VIP: ẨN HOÀN TOÀN NẾU ĐÃ MUA GÓI VIP PRO */}
        {profile?.subscription_tier !== 'VIP' && (
          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('pricing')}
            className="btn-header-vip pulse-gold"
            title="Nâng cấp VIP để mở khóa 10 tài khoản Telegram và tính năng nâng cao"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 16px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              border: 'none',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 3px 14px rgba(245, 158, 11, 0.45)',
              letterSpacing: '0.2px',
              transition: 'transform 0.15s, box-shadow 0.15s'
            }}
          >
            <Crown size={15} />
            <span>GÓI CƯỚC VIP</span>
            <span style={{
              fontSize: '9px',
              fontWeight: '900',
              padding: '2px 5px',
              borderRadius: '4px',
              background: 'rgba(0, 0, 0, 0.3)',
              color: '#fff'
            }}>
              HOT
            </span>
          </button>
        )}

        {/* 2. Chuông Thông Báo (Tái sử dụng Component dùng chung) */}
        <NotificationBell onNavigateTab={onNavigateTab} />

        {/* 3. Nhóm hiển thị Số Dư & Nút Nạp Tiền (NẰM BÊN PHẢI CHUÔNG THÔNG BÁO) */}
        <div className="header-wallet-group">
          {/* Ô hiển thị số dư hiện tại */}
          <div 
            className="header-balance-box" 
            onClick={handleGoToWallet}
            title="Bấm để xem lịch sử và nạp tiền"
          >
            <div className="header-balance-icon-wrap">
              <Wallet size={16} />
            </div>
            <div className="header-balance-info">
              <span className="header-balance-label">Số dư hiện tại</span>
              <span className="header-balance-value">
                {currentBalance.toLocaleString('vi-VN')} ₫
              </span>
            </div>
          </div>

          {/* Nút nạp tiền to, nổi bật */}
          <button
            type="button"
            onClick={handleGoToWallet}
            className="btn-header-deposit"
            title="Nạp tiền vào tài khoản qua VietQR"
          >
            <PlusCircle size={17} />
            <span>Nạp Tiền</span>
          </button>
        </div>

        {/* 4. Nút chuyển đổi Dark / Light Mode (Tái sử dụng Component dùng chung) */}
        <ThemeToggle />
      </div>
    </header>
  );
}
