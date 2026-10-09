import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function LandingFaq() {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      q: '1. Tôi có bị khóa hoặc hạn chế tài khoản Telegram khi dùng TelePulse không?',
      a: 'TelePulse được thiết kế đặc thù với cơ chế điều phối Round-Robin đa tài khoản, kết hợp cùng trình Spintax biến thiên chống trùng lặp nội dung và độ trễ ngẫu nhiên (Smart Delay). Cơ chế này mô phỏng chân thực hành vi người dùng tự nhiên, giúp giảm thiểu tối đa nguy cơ bị Telegram gán cờ hoặc hạn chế gửi tin.'
    },
    {
      q: '2. Sau khi chuyển tiền VietQR, gói VIP Pro có được kích hoạt ngay không?',
      a: 'Có. TelePulse kết nối với cổng thanh toán tự động VietQR PayOS Webhook thời gian thực. Sau khi chuyển khoản đúng nội dung khớp mã QR, tài khoản của bạn sẽ được kích hoạt tức thì sau 2 đến 5 giây mà không cần chờ Admin phê duyệt.'
    },
    {
      q: '3. Tôi có cần phải tải tool hoặc treo máy tính 24/24 không?',
      a: 'Hoàn toàn không. Hệ thống TelePulse chạy 100% trên máy chủ MTProto đám mây. Bạn chỉ cần thao tác cấu hình trên trình duyệt web, sau đó có thể tắt máy và hệ thống vẫn duy trì gửi tin và nhận Live Chat 24/7 theo lịch trình đã đặt.'
    },
    {
      q: '4. Tôi có thể nhận tin nhắn phản hồi của khách hàng ở đâu?',
      a: 'Với gói VIP Pro, bạn có thể xem và trả lời tin nhắn trực tiếp tại tab "Hộp Thư Trực Tiếp (Live Chat)" trên web, đồng thời hệ thống tự động chuyển tiếp toàn bộ tin nhắn riêng của khách hàng về tài khoản Telegram cá nhân của bạn.'
    }
  ];

  const toggle = (idx) => {
    setOpenIndex(openIndex === idx ? -1 : idx);
  };

  return (
    <section id="faq" style={{
      padding: '80px 24px',
      background: 'rgba(11, 14, 23, 0.4)',
      borderTop: '1px solid var(--border-subtle)'
    }}>
      <div style={{
        maxWidth: '860px',
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
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            color: '#818cf8',
            fontSize: '12px',
            fontWeight: '700',
            marginBottom: '14px',
            letterSpacing: '0.5px'
          }}>
            <HelpCircle size={14} />
            <span>GIẢI ĐÁP THẮC MẮC</span>
          </div>

          <h2 style={{
            fontSize: 'clamp(26px, 3.5vw, 36px)',
            fontWeight: '800',
            letterSpacing: '-0.8px',
            color: 'var(--text-main)',
            margin: '0 0 12px'
          }}>
            Câu Hỏi Thường Gặp (FAQ)
          </h2>

          <p style={{
            fontSize: '15px',
            color: 'var(--text-secondary)',
            margin: 0
          }}>
            Những thắc mắc phổ biến nhất của người dùng khi bắt đầu làm quen với TelePulse.
          </p>
        </div>

        {/* Accordion FAQ list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-card)',
                  border: isOpen ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s ease'
                }}
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  style={{
                    width: '100%',
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-main)',
                    fontSize: '15px',
                    fontWeight: '700',
                    textAlign: 'left',
                    cursor: 'pointer',
                    gap: '16px'
                  }}
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp size={18} color="var(--primary-light)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                </button>

                {isOpen && (
                  <div style={{
                    padding: '0 24px 20px',
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.6',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '16px'
                  }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
