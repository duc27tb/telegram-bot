import React from 'react';
import { 
  Users, 
  FolderSync, 
  Shuffle, 
  Clock, 
  MessageSquare, 
  QrCode, 
  ShieldCheck, 
  Cpu, 
  Sparkles 
} from 'lucide-react';

export default function LandingFeatures() {
  const features = [
    {
      icon: <Users size={24} color="#818cf8" />,
      tag: 'ACCOUNT FLEET',
      title: 'Quản Lý Hạm Đội Đa Tài Khoản',
      desc: 'Kết nối và điều phối cùng lúc tối đa 10 tài khoản Telegram MTProto thông qua mã xác thực OTP và mật khẩu 2FA, không cần cài đặt tool rườm rà.',
      color: 'rgba(99, 102, 241, 0.15)',
      borderColor: 'rgba(99, 102, 241, 0.3)'
    },
    {
      icon: <FolderSync size={24} color="#06b6d4" />,
      tag: 'GROUP HUB',
      title: 'Quét & Gom Nhóm Mục Tiêu 1-Chạm',
      desc: 'Hệ thống tự động rà soát, trích xuất hàng ngàn hội nhóm khách hàng tiềm năng, đồng bộ danh sách nhóm và cache link tự động tức thì.',
      color: 'rgba(6, 182, 212, 0.15)',
      borderColor: 'rgba(6, 182, 212, 0.3)'
    },
    {
      icon: <Shuffle size={24} color="#c084fc" />,
      tag: 'SPINTAX ENGINE',
      title: 'Soạn Thảo Spintax Né Trùng Lặp',
      desc: 'Trình sinh biến thể ngẫu nhiên với cú pháp {Chào|Hello|Hi}. Đảm bảo mỗi thông điệp gửi đi có cấu trúc độc nhất, hạn chế tối đa nguy cơ bị Telegram gán cờ.',
      color: 'rgba(192, 132, 252, 0.15)',
      borderColor: 'rgba(192, 132, 252, 0.3)'
    },
    {
      icon: <Clock size={24} color="#f59e0b" />,
      tag: 'SMART DELAY',
      title: 'Thuật Toán Luân Chuyển Né FloodWait',
      desc: 'Tự động tính toán độ trễ ngẫu nhiên giữa các lần phát tin, xoay vòng tài khoản round-robin thông minh để bot hoạt động bền bỉ, an toàn.',
      color: 'rgba(245, 158, 11, 0.15)',
      borderColor: 'rgba(245, 158, 11, 0.3)'
    },
    {
      icon: <MessageSquare size={24} color="#10b981" />,
      tag: 'TWO-WAY LIVE CHAT',
      title: 'Hộp Thư Live Chat 2 Chiều VIP',
      desc: 'Tiếp nhận câu hỏi từ khách hàng ngay trên trình duyệt web, chat phản hồi tức thì và tự động chuyển tiếp lead nóng về tài khoản Telegram cá nhân.',
      color: 'rgba(16, 185, 129, 0.15)',
      borderColor: 'rgba(16, 185, 129, 0.3)'
    },
    {
      icon: <QrCode size={24} color="#f43f5e" />,
      tag: 'PAYOS GATEWAY',
      title: 'Nạp Tiền VietQR Tự Động 3 Giây',
      desc: 'Tích hợp cổng thanh toán VietQR PayOS webhook trực tiếp. Quét mã QR ngân hàng thanh toán và kích hoạt gói cước VIP tự động 100% 24/7.',
      color: 'rgba(244, 63, 94, 0.15)',
      borderColor: 'rgba(244, 63, 94, 0.3)'
    }
  ];

  return (
    <section id="features" style={{
      padding: '80px 24px',
      position: 'relative'
    }}>
      <div style={{
        maxWidth: '1240px',
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
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            color: '#818cf8',
            fontSize: '12px',
            fontWeight: '700',
            marginBottom: '14px',
            letterSpacing: '0.5px'
          }}>
            <Cpu size={14} />
            <span>CÔNG NGHỆ CỐT LÕI VƯỢT TRỘI</span>
          </div>

          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: '800',
            letterSpacing: '-0.8px',
            color: 'var(--text-main)',
            margin: '0 0 14px'
          }}>
            Tất Cả Công Cụ Bạn Cần Để Thống Trị Thị Trường Telegram
          </h2>

          <p style={{
            fontSize: '16px',
            color: 'var(--text-secondary)',
            maxWidth: '680px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Được xây dựng từ nền tảng Pyrogram MTProto nguyên bản, mang lại tốc độ phản hồi cực nhanh, độ ổn định tuyệt đối và trải nghiệm liền mạch trên trình duyệt.
          </p>
        </div>

        {/* Features 3-Column Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px'
        }}>
          {features.map((item, index) => (
            <div
              key={index}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
                padding: '30px',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = item.borderColor;
                e.currentTarget.style.boxShadow = '0 12px 30px -10px rgba(0, 0, 0, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: item.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                {item.icon}
              </div>

              <div style={{
                fontSize: '11px',
                fontWeight: '800',
                color: 'var(--text-muted)',
                letterSpacing: '0.8px',
                marginBottom: '8px'
              }}>
                {item.tag}
              </div>

              <h3 style={{
                fontSize: '19px',
                fontWeight: '700',
                color: 'var(--text-main)',
                margin: '0 0 12px'
              }}>
                {item.title}
              </h3>

              <p style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                lineHeight: '1.6',
                margin: 0
              }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
