import React, { useState } from 'react';
import { Bot, ArrowRight, Menu, X, Sparkles, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingNavbar({ user, onAuthClick }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(7, 9, 14, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      transition: 'background-color 0.2s ease'
    }}>
      <div style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '0 24px',
        height: '70px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Brand Logo */}
        <Link 
          to="/" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            textDecoration: 'none',
            color: 'inherit'
          }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 0 20px var(--primary-glow)'
          }}>
            <Bot size={22} />
          </div>
          <div>
            <div style={{ 
              fontSize: '18px', 
              fontWeight: '800', 
              letterSpacing: '-0.3px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>TelePulse</span>
              <span style={{
                fontSize: '10px',
                fontWeight: '700',
                padding: '2px 6px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
                color: '#818cf8',
                border: '1px solid rgba(99, 102, 241, 0.3)'
              }}>
                SAAS 2.0
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Telegram Automation Fleet
            </div>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div style={{
          display: 'none',
          alignItems: 'center',
          gap: '32px',
          fontSize: '14px',
          fontWeight: '500',
          color: 'var(--text-secondary)'
        }} className="desktop-links">
          <button 
            type="button" 
            onClick={() => scrollToSection('features')}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 'inherit', fontWeight: 'inherit', padding: 0 }}
          >
            Tính Năng Nổi Bật
          </button>
          <button 
            type="button" 
            onClick={() => scrollToSection('workflow')}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 'inherit', fontWeight: 'inherit', padding: 0 }}
          >
            Cách Vận Hành
          </button>
          <button 
            type="button" 
            onClick={() => scrollToSection('pricing')}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 'inherit', fontWeight: 'inherit', padding: 0 }}
          >
            Bảng Giá Dịch Vụ
          </button>
          <button 
            type="button" 
            onClick={() => scrollToSection('faq')}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 'inherit', fontWeight: 'inherit', padding: 0 }}
          >
            Hỏi Đáp (FAQ)
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user ? (
            <Link
              to="/dashboard"
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                height: '40px',
                padding: '0 18px',
                fontSize: '13px',
                fontWeight: '700',
                textDecoration: 'none'
              }}
            >
              <LayoutDashboard size={16} />
              <span>Vào Bảng Điều Khiển</span>
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onAuthClick('login')}
                className="btn btn-secondary"
                style={{
                  height: '40px',
                  padding: '0 16px',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                Đăng Nhập
              </button>
              <button
                type="button"
                onClick={() => onAuthClick('register')}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '40px',
                  padding: '0 18px',
                  fontSize: '13px',
                  fontWeight: '700'
                }}
              >
                <Sparkles size={15} />
                <span>Bắt Đầu Miễn Phí</span>
              </button>
            </>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              color: 'var(--text-main)',
              cursor: 'pointer',
              padding: '8px'
            }}
            className="mobile-toggle"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div style={{
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-medium)',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <button 
            type="button" 
            onClick={() => scrollToSection('features')}
            style={{ textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '14px', fontWeight: '600', padding: '6px 0' }}
          >
            Tính Năng Nổi Bật
          </button>
          <button 
            type="button" 
            onClick={() => scrollToSection('workflow')}
            style={{ textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '14px', fontWeight: '600', padding: '6px 0' }}
          >
            Cách Vận Hành
          </button>
          <button 
            type="button" 
            onClick={() => scrollToSection('pricing')}
            style={{ textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '14px', fontWeight: '600', padding: '6px 0' }}
          >
            Bảng Giá Dịch Vụ
          </button>
          <button 
            type="button" 
            onClick={() => scrollToSection('faq')}
            style={{ textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '14px', fontWeight: '600', padding: '6px 0' }}
          >
            Hỏi Đáp (FAQ)
          </button>
        </div>
      )}

      {/* Inline media query CSS cho navbar responsive */}
      <style>{`
        @media (min-width: 768px) {
          .desktop-links {
            display: flex !important;
          }
          .mobile-toggle {
            display: none !important;
          }
        }
        @media (max-width: 767px) {
          .desktop-links {
            display: none !important;
          }
          .mobile-toggle {
            display: block !important;
          }
        }
      `}</style>
    </nav>
  );
}
