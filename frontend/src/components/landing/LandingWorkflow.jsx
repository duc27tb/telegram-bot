import React from 'react';
import { KeyRound, Target, Rocket, ArrowRight } from 'lucide-react';

export default function LandingWorkflow({ onAuthClick }) {
  const steps = [
    {
      num: '01',
      icon: <KeyRound size={24} color="#818cf8" />,
      title: 'Kết Nối Tài Khoản Bot',
      desc: 'Nhập số điện thoại và điền mã OTP gửi về Telegram. Không cần API ID phức tạp, phiên đăng nhập được mã hóa an toàn.'
    },
    {
      num: '02',
      icon: <Target size={24} color="#c084fc" />,
      title: 'Quét & Gom Nhóm Mục Tiêu',
      desc: 'Hệ thống tự động rà quét tất cả nhóm mà bot đang tham gia, hoặc import hàng loạt link nhóm t.me chỉ trong 1 nốt nhạc.'
    },
    {
      num: '03',
      icon: <Rocket size={24} color="#10b981" />,
      title: 'Soạn Spintax & Bật Chiến Dịch',
      desc: 'Viết mẫu tin xoay vòng biến thiên né spam, chọn tần suất gửi và bấm Bắt Đầu. Khách hàng sẽ phản hồi ngay tại Live Chat.'
    }
  ];

  return (
    <section id="workflow" style={{
      padding: 'clamp(50px, 8vw, 80px) clamp(16px, 4vw, 24px)',
      background: 'linear-gradient(180deg, rgba(11, 14, 23, 0.4) 0%, rgba(17, 22, 36, 0.6) 100%)',
      borderTop: '1px solid var(--border-subtle)',
      borderBottom: '1px solid var(--border-subtle)'
    }}>
      <div style={{
        maxWidth: '1240px',
        margin: '0 auto'
      }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 14px',
            borderRadius: '999px',
            background: 'rgba(168, 85, 247, 0.1)',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            color: '#c084fc',
            fontSize: '12px',
            fontWeight: '700',
            marginBottom: '14px',
            letterSpacing: '0.5px'
          }}>
            <span>QUY TRÌNH VẬN HÀNH</span>
          </div>

          <h2 style={{
            fontSize: 'clamp(24px, 4vw, 40px)',
            fontWeight: '800',
            letterSpacing: '-0.8px',
            color: 'var(--text-main)',
            margin: '0 0 14px'
          }}>
            Bắt Đầu Chiến Dịch Chỉ Trong 3 Bước Đơn Giản
          </h2>

          <p style={{
            fontSize: 'clamp(14px, 2vw, 16px)',
            color: 'var(--text-secondary)',
            maxWidth: '640px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Không yêu cầu kiến thức kỹ thuật lập trình. Mọi thao tác cấu hình đều trực quan 100% trên nền tảng web hiện đại.
          </p>
        </div>

        {/* 3 Step Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: '20px',
          position: 'relative',
          marginBottom: '48px'
        }}>
          {steps.map((step, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                borderRadius: '16px',
                padding: '32px 28px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px'
              }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--border-subtle)'
                }}>
                  {step.icon}
                </div>
                <div style={{
                  fontSize: '32px',
                  fontWeight: '900',
                  color: 'rgba(255, 255, 255, 0.1)',
                  fontFamily: 'monospace'
                }}>
                  {step.num}
                </div>
              </div>

              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: 'var(--text-main)',
                margin: '0 0 10px'
              }}>
                {step.title}
              </h3>

              <p style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                lineHeight: '1.6',
                margin: 0
              }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Workflow CTA */}
        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => onAuthClick('register')}
            className="btn btn-primary"
            style={{
              padding: '12px 28px',
              fontSize: '14px',
              fontWeight: '700',
              borderRadius: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>Trải Nghiệm Toàn Diện Miễn Phí Ngay</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
