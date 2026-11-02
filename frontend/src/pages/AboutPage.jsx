import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bot, Zap, ShieldCheck, Clock, Users, MessageSquare, Headphones, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { getPublicSupportInfo } from '../lib/api';

export default function AboutPage() {
  const navigate = useNavigate();
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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main, #0b0f19)',
      color: 'var(--text-main, #f8fafc)',
      padding: '40px 20px 80px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        {/* Navigation Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: '1px solid var(--border-medium, rgba(148, 163, 184, 0.25))',
              color: 'var(--text-secondary, #cbd5e1)',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              transition: 'all 0.15s ease'
            }}
          >
            <ArrowLeft size={16} />
            <span>Quay lại</span>
          </button>

          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'var(--accent-gradient, linear-gradient(135deg, #6366f1 0%, #a855f7 100%))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Bot size={16} />
            </div>
            <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main, #fff)' }}>TelePulse</span>
          </Link>
        </div>

        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 14px',
            borderRadius: '999px',
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: 'var(--primary-light, #818cf8)',
            fontSize: '12px',
            fontWeight: '600',
            marginBottom: '16px'
          }}>
            <Zap size={14} />
            <span>Nền tảng tự động hóa tiếp thị Telegram hàng đầu</span>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 14px 0', letterSpacing: '-0.5px' }}>
            Về Chúng Tôi — TelePulse Automation
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted, #94a3b8)', maxWidth: '640px', margin: '0 auto', lineHeight: 1.6 }}>
            TelePulse ra đời với sứ mệnh giải phóng 90% thời gian cho các Marketer, chủ doanh nghiệp và nhà bán lẻ bằng việc tự động hóa toàn diện quy trình tiếp thị & chăm sóc khách hàng trên Telegram.
          </p>
        </div>

        {/* Giá Trị Cốt Lõi (Cards) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          <div style={{
            background: 'var(--bg-card, rgba(15, 23, 42, 0.7))',
            border: '1px solid var(--border-subtle, rgba(148, 163, 184, 0.15))',
            borderRadius: '14px',
            padding: '24px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399',
              marginBottom: '16px'
            }}>
              <ShieldCheck size={22} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', margin: '0 0 8px 0' }}>An Toàn & Bền Vững</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary, #cbd5e1)', margin: 0, lineHeight: 1.6 }}>
              Không như các công cụ spam ồ ạt, TelePulse tích hợp thuật toán phân bổ giãn cách Delay thông minh, xoay vòng Spintax và tự động nghỉ đêm để bảo vệ tài khoản tối đa.
            </p>
          </div>

          <div style={{
            background: 'var(--bg-card, rgba(15, 23, 42, 0.7))',
            border: '1px solid var(--border-subtle, rgba(148, 163, 184, 0.15))',
            borderRadius: '14px',
            padding: '24px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8',
              marginBottom: '16px'
            }}>
              <Users size={22} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', margin: '0 0 8px 0' }}>Đa Tài Khoản Song Song</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary, #cbd5e1)', margin: 0, lineHeight: 1.6 }}>
              Hệ thống xử lý bất đồng bộ cho phép vận hành đồng thời lên đến 10 tài khoản Telegram cùng lúc, nhân gấp 10 lần hiệu suất tiếp cận khách hàng tiềm năng.
            </p>
          </div>

          <div style={{
            background: 'var(--bg-card, rgba(15, 23, 42, 0.7))',
            border: '1px solid var(--border-subtle, rgba(148, 163, 184, 0.15))',
            borderRadius: '14px',
            padding: '24px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fbbf24',
              marginBottom: '16px'
            }}>
              <MessageSquare size={22} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', margin: '0 0 8px 0' }}>Live Chat Tập Trung 2 Chiều</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary, #cbd5e1)', margin: 0, lineHeight: 1.6 }}>
              Đọc và trả lời trực tiếp toàn bộ tin nhắn riêng của khách hàng gửi tới các nick Telegram ngay trên một giao diện thống nhất, không cần cài đặt thêm app.
            </p>
          </div>
        </div>

        {/* Thông tin liên hệ & Hỗ trợ */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '16px',
          padding: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '24px'
        }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: '0 0 6px 0' }}>
              Cần Tư Vấn Triển Khai Hoặc Hợp Tác?
            </h3>
            <p style={{ fontSize: '13.5px', color: '#cbd5e1', margin: 0 }}>
              Đội ngũ chăm sóc khách hàng và kỹ thuật của TelePulse luôn sẵn sàng hỗ trợ bạn 24/7.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <a
              href={`https://t.me/${(supportInfo.support_telegram || 'vhoang25').replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ padding: '10px 18px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <span>Telegram: @{supportInfo.support_telegram || 'vhoang25'}</span>
              <ExternalLink size={14} />
            </a>

            <a
              href={`https://zalo.me/${(supportInfo.support_zalo || '0869098696').replace(/[\s\-\.]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ padding: '10px 18px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <span>Zalo: {supportInfo.support_zalo || '0869098696'}</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
