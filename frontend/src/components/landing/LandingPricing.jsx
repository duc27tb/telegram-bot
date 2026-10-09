import React from 'react';
import { Crown, Check, X, Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function LandingPricing({ onAuthClick }) {
  return (
    <section id="pricing" style={{
      padding: '80px 24px',
      position: 'relative'
    }}>
      <div style={{
        maxWidth: '1100px',
        margin: '0 auto'
      }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 14px',
            borderRadius: '999px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#fbbf24',
            fontSize: '12px',
            fontWeight: '700',
            marginBottom: '14px',
            letterSpacing: '0.5px'
          }}>
            <Sparkles size={14} />
            <span>BẢNG GIÁ DỊCH VỤ MINH BẠCH</span>
          </div>

          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: '800',
            letterSpacing: '-0.8px',
            color: 'var(--text-main)',
            margin: '0 0 14px'
          }}>
            Đầu Tư Đúng Đắn Để Đột Phá Doanh Số
          </h2>

          <p style={{
            fontSize: '16px',
            color: 'var(--text-secondary)',
            maxWidth: '640px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Khởi đầu hoàn toàn miễn phí, nâng cấp linh hoạt theo quy mô kinh doanh của bạn. Không phát sinh chi phí ẩn.
          </p>
        </div>

        {/* Pricing Cards Comparison Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '28px',
          alignItems: 'stretch'
        }}>
          {/* 1. Gói Free */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-medium)',
            borderRadius: '20px',
            padding: '36px 30px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div>
              <div style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(148, 163, 184, 0.15)',
                color: '#94a3b8',
                fontSize: '11px',
                fontWeight: '700',
                marginBottom: '14px'
              }}>
                GÓI CƠ BẢN
              </div>

              <h3 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 8px', color: 'var(--text-main)' }}>
                Gói Miễn Phí (Free)
              </h3>

              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px', minHeight: '38px' }}>
                Phù hợp cho cá nhân mới bắt đầu trải nghiệm sức mạnh của việc tự động hóa Telegram.
              </p>

              <div style={{ marginBottom: '28px' }}>
                <span style={{ fontSize: '38px', fontWeight: '900', color: 'var(--text-main)' }}>0 ₫</span>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}> / vĩnh viễn</span>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '24px', marginBottom: '28px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase' }}>
                  Tính Năng Khả Dụng:
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-main)' }}>
                    <Check size={16} color="var(--success)" />
                    <span>Tối đa <strong>3</strong> tài khoản Telegram kết nối</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-main)' }}>
                    <Check size={16} color="var(--success)" />
                    <span>Quét & đồng bộ danh sách nhóm mục tiêu</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-main)' }}>
                    <Check size={16} color="var(--success)" />
                    <span>Gửi <strong>1 mẫu tin</strong> (không xoay vòng Spintax)</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                    <X size={16} color="#ef4444" />
                    <span>Không hỗ trợ Live Chat 2 chiều nhận phản hồi</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                    <X size={16} color="#ef4444" />
                    <span>Không hỗ trợ chuyển tiếp lead về Telegram cá nhân</span>
                  </li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onAuthClick('register')}
              className="btn btn-secondary"
              style={{
                width: '100%',
                height: '46px',
                fontSize: '14px',
                fontWeight: '700',
                borderRadius: '10px'
              }}
            >
              Bắt Đầu Miễn Phí
            </button>
          </div>

          {/* 2. Gói VIP Pro */}
          <div style={{
            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
            border: '2px solid rgba(245, 158, 11, 0.7)',
            borderRadius: '20px',
            padding: '36px 30px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5), 0 0 35px rgba(245, 158, 11, 0.18)'
          }}>
            {/* Top Ribbon Badge */}
            <div style={{
              position: 'absolute',
              top: '-14px',
              right: '24px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#fff',
              fontSize: '11px',
              fontWeight: '800',
              padding: '5px 14px',
              borderRadius: '999px',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
              letterSpacing: '0.5px'
            }}>
              ★ KHUYÊN DÙNG CHO DOANH NGHIỆP
            </div>

            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '6px',
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#fbbf24',
                fontSize: '11px',
                fontWeight: '800',
                marginBottom: '14px'
              }}>
                <Crown size={14} />
                <span>GÓI VIP ENTERPRISE</span>
              </div>

              <h3 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 8px', color: '#fbbf24' }}>
                VIP Pro Marketing
              </h3>

              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px', minHeight: '38px' }}>
                Dành cho đội ngũ tiếp thị, kinh doanh & cá nhân cần phủ sóng thị trường quy mô lớn.
              </p>

              <div style={{ marginBottom: '28px' }}>
                <span style={{ fontSize: '40px', fontWeight: '900', color: '#fbbf24' }}>199.000 ₫</span>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}> / 30 ngày sử dụng</span>
              </div>

              <div style={{ borderTop: '1px solid rgba(245, 158, 11, 0.25)', paddingTop: '24px', marginBottom: '28px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#fbbf24', marginBottom: '16px', textTransform: 'uppercase' }}>
                  Toàn Bộ Đặc Quyền Cao Cấp:
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#f8fafc' }}>
                    <Check size={16} color="#fbbf24" />
                    <span><strong>10</strong> Tài khoản Telegram kết nối đồng thời</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#f8fafc' }}>
                    <Check size={16} color="#fbbf24" />
                    <span><strong>Hộp Thư Live Chat 2 chiều</strong> nhận và phản hồi tức thì</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#f8fafc' }}>
                    <Check size={16} color="#fbbf24" />
                    <span><strong>Spintax biến thiên không giới hạn</strong> né spam tối đa</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#f8fafc' }}>
                    <Check size={16} color="#fbbf24" />
                    <span><strong>Chuyển tiếp tin nhắn khách hàng</strong> về Telegram Admin</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#f8fafc' }}>
                    <Check size={16} color="#fbbf24" />
                    <span><strong>Thuật toán né tránh FloodWait</strong> bảo vệ an toàn bot</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#f8fafc' }}>
                    <Check size={16} color="#fbbf24" />
                    <span>Hỗ trợ kỹ thuật ưu tiên 24/7 trực tiếp</span>
                  </li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onAuthClick('register')}
              style={{
                width: '100%',
                height: '48px',
                padding: '0 20px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                border: 'none',
                color: '#fff',
                fontSize: '15px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 6px 18px rgba(245, 158, 11, 0.4)',
                transition: 'opacity 0.2s'
              }}
            >
              <Crown size={18} />
              <span>Nâng Cấp Gói VIP Ngay</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
