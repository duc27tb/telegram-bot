import React from 'react';
import { Bot, ShieldAlert, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingFooter() {
  return (
    <footer style={{
      background: 'var(--bg-main)',
      borderTop: '1px solid var(--border-subtle)',
      padding: '48px 24px 32px',
      color: 'var(--text-muted)',
      fontSize: '13px'
    }}>
      <div style={{
        maxWidth: '1240px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          paddingBottom: '28px',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Bot size={18} />
            </div>
            <div>
              <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>TelePulse</span>
              <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>SaaS Automation Platform</span>
            </div>
          </div>

          {/* Quick links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <a href="#features" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Tính năng</a>
            <a href="#pricing" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Bảng giá</a>
            <a href="#faq" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Hỏi đáp</a>
            <Link to="/login" style={{ color: 'var(--primary-light)', textDecoration: 'none', fontWeight: '600' }}>Đăng nhập</Link>
          </div>
        </div>

        {/* Bottom copyright & admin link */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          fontSize: '12px'
        }}>
          <div>
            © {new Date().getFullYear()} TelePulse. Phát triển và tối ưu hóa cho hệ sinh thái Telegram Marketing.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <a
              href="/admin"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--text-dim)',
                textDecoration: 'none',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-dim)'}
            >
              <ShieldAlert size={13} />
              <span>Cổng Quản Trị Hệ Thống (/admin)</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
