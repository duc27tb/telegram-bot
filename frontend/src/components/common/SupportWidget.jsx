import React, { useState, useEffect } from 'react';
import { 
  Headphones, 
  X, 
  Send, 
  Phone, 
  MessageCircle, 
  ExternalLink, 
  HelpCircle, 
  ShieldCheck,
  FileText
} from 'lucide-react';
import { getPublicSupportInfo } from '../../lib/api';
import { Link, useLocation } from 'react-router-dom';

export default function SupportWidget() {
  const location = useLocation();
  const isChatPage = location.pathname === '/chat';
  const [isOpen, setIsOpen] = useState(false);
  const [supportInfo, setSupportInfo] = useState({
    support_telegram: 'vhoang25',
    support_zalo: '0869098696',
    support_hotline: '0869098696'
  });

  useEffect(() => {
    getPublicSupportInfo().then((res) => {
      if (res && res.success && res.data) {
        setSupportInfo(res.data);
      }
    });
  }, []);

  const getTelegramUrl = (val) => {
    if (!val) return 'https://t.me/vhoang25';
    const clean = val.trim().replace(/^@/, '');
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    return `https://t.me/${clean}`;
  };

  const getZaloUrl = (val) => {
    if (!val) return 'https://zalo.me/0869098696';
    const clean = val.trim().replace(/[\s\-\.]/g, '');
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    return `https://zalo.me/${clean}`;
  };

  const getPhoneTel = (val) => {
    if (!val) return 'tel:0869098696';
    const clean = val.trim().replace(/[\s\-\.]/g, '');
    return `tel:${clean}`;
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: isChatPage ? '92px' : '24px',
      right: '24px',
      zIndex: 9990,
      fontFamily: 'Inter, system-ui, sans-serif',
      transition: 'bottom 0.25s ease'
    }}>
      {/* POPUP HỖ TRỢ */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '60px',
          right: '0',
          width: '320px',
          borderRadius: '16px',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(99, 102, 241, 0.2)',
          padding: '18px',
          color: '#f8fafc',
          animation: 'fadeInUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid rgba(148, 163, 184, 0.15)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}>
                <Headphones size={18} />
              </div>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '800', margin: 0, color: '#fff' }}>Hỗ Trợ Khách Hàng</h4>
                <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                  Trực tuyến 24/7
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>

          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 14px 0', lineHeight: 1.4 }}>
            Chào bạn! Cần trợ giúp kỹ thuật, kích hoạt VIP hoặc thắc mắc thanh toán? Hãy kết nối với chúng tôi ngay:
          </p>

          {/* Các kênh liên hệ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Telegram CSKH */}
            <a
              href={getTelegramUrl(supportInfo.support_telegram)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                textDecoration: 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Send size={18} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#f0f9ff' }}>Chat Telegram Trực Tiếp</div>
                <div style={{ fontSize: '11px', color: '#7dd3fc' }}>@{supportInfo.support_telegram || 'vhoang25'} (Phản hồi nhanh)</div>
              </div>
              <ExternalLink size={14} color="#38bdf8" />
            </a>

            {/* Zalo CSKH */}
            <a
              href={getZaloUrl(supportInfo.support_zalo)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'rgba(37, 99, 235, 0.12)',
                border: '1px solid rgba(37, 99, 235, 0.3)',
                color: '#60a5fa',
                textDecoration: 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <MessageCircle size={18} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#eff6ff' }}>Hỗ Trợ Qua Zalo</div>
                <div style={{ fontSize: '11px', color: '#93c5fd' }}>{supportInfo.support_zalo || '0869098696'} (CSKH Nạp Tiền)</div>
              </div>
              <ExternalLink size={14} color="#60a5fa" />
            </a>

            {/* Hotline */}
            {supportInfo.support_hotline && (
              <a
                href={getPhoneTel(supportInfo.support_hotline)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  color: '#34d399',
                  textDecoration: 'none'
                }}
              >
                <Phone size={18} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#ecfdf5' }}>Hotline Hỗ Trợ Kỹ Thuật</div>
                  <div style={{ fontSize: '11px', color: '#a7f3d0' }}>{supportInfo.support_hotline}</div>
                </div>
              </a>
            )}
          </div>

          {/* Quick helpful links */}
          <div style={{
            marginTop: '14px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(148, 163, 184, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11.5px',
            color: '#94a3b8'
          }}>
            <Link to="/guide/telegram-api" style={{ color: '#818cf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <HelpCircle size={12} />
              <span>Hướng dẫn API</span>
            </Link>
            <Link to="/terms" style={{ color: '#94a3b8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileText size={12} />
              <span>Điều khoản dịch vụ</span>
            </Link>
          </div>
        </div>
      )}

      {/* NÚT BẤM NỔI (FLOATING TRIGGER BUTTON) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 24px rgba(99, 102, 241, 0.45), 0 2px 6px rgba(0, 0, 0, 0.3)',
          color: '#ffffff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: isOpen ? 'rotate(90deg) scale(0.95)' : 'scale(1)'
        }}
        title="Trung tâm hỗ trợ CSKH (Telegram & Zalo)"
      >
        {isOpen ? <X size={22} /> : <Headphones size={22} />}
      </button>
    </div>
  );
}
