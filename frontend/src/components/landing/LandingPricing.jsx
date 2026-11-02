import React, { useState, useEffect } from 'react';
import { Crown, Check, X, Sparkles, ArrowRight, Smartphone, Monitor } from 'lucide-react';
import { getSubscriptionPlans } from '../../lib/api';

const DEFAULT_PLANS = {
  free: { name: 'Gói Miễn Phí (Free)', price: 0, max_accounts: 3, duration_days: 3650 },
  vip: { name: 'VIP Pro Marketing (Cloud)', price: 199000, max_accounts: 10, duration_days: 30 },
  mobile_auto: { name: 'Tự Động Toàn Diện Bằng Điện Thoại', price: 299000, max_accounts: 20, duration_days: 30 },
  pc_lifetime: { name: 'Tool Vĩnh Viễn (Cài Trên PC / Laptop)', price: 1490000, max_accounts: 100, duration_days: 36500 }
};

export default function LandingPricing({ onAuthClick }) {
  const [plans, setPlans] = useState(DEFAULT_PLANS);

  useEffect(() => {
    getSubscriptionPlans()
      .then((res) => {
        if (res && res.success && res.data) {
          setPlans((prev) => ({
            free: { ...prev.free, ...(res.data.free || {}) },
            vip: { ...prev.vip, ...(res.data.vip || {}) },
            mobile_auto: { ...prev.mobile_auto, ...(res.data.mobile_auto || {}) },
            pc_lifetime: { ...prev.pc_lifetime, ...(res.data.pc_lifetime || {}) }
          }));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section id="pricing" style={{
      padding: 'clamp(50px, 8vw, 80px) clamp(16px, 4vw, 24px)',
      position: 'relative'
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
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
            fontSize: 'clamp(24px, 4vw, 40px)',
            fontWeight: '800',
            letterSpacing: '-0.8px',
            color: 'var(--text-main)',
            margin: '0 0 14px'
          }}>
            Đầu Tư Đúng Đắn Để Đột Phá Doanh Số
          </h2>

          <p style={{
            fontSize: 'clamp(14px, 2vw, 16px)',
            color: 'var(--text-secondary)',
            maxWidth: '680px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Đầy đủ lựa chọn: Gói Cloud Web, Gói Tự Động Bằng Điện Thoại 24/7 và Bản Quyền Tool Vĩnh Viễn cài trực tiếp trên PC/Laptop.
          </p>
        </div>

        {/* Pricing Cards Comparison Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 275px), 1fr))',
          gap: '20px',
          alignItems: 'stretch'
        }}>
          {/* 1. Gói Free */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-medium)',
            borderRadius: '20px',
            padding: '30px 24px',
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
                marginBottom: '12px'
              }}>
                GÓI CƠ BẢN
              </div>

              <h3 style={{ fontSize: '21px', fontWeight: '800', margin: '0 0 8px', color: 'var(--text-main)' }}>
                {plans.free?.name || 'Gói Miễn Phí (Free)'}
              </h3>

              <div style={{ marginBottom: '22px' }}>
                <span style={{ fontSize: '32px', fontWeight: '900', color: 'var(--text-main)' }}>0 ₫</span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}> / vĩnh viễn</span>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px', marginBottom: '24px' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-main)' }}>
                    <Check size={15} color="var(--success)" />
                    <span>Tối đa <strong>{plans.free?.max_accounts || 3}</strong> tài khoản Telegram</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-main)' }}>
                    <Check size={15} color="var(--success)" />
                    <span>Quét & đồng bộ danh sách nhóm</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-main)' }}>
                    <Check size={15} color="var(--success)" />
                    <span>Giới hạn 50 tin/ngày (1 mẫu tin)</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                    <X size={15} color="#ef4444" />
                    <span>Không hỗ trợ Live Chat 2 chiều</span>
                  </li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onAuthClick('register')}
              className="btn btn-secondary"
              style={{ width: '100%', height: '44px', fontSize: '13.5px', fontWeight: '700', borderRadius: '10px' }}
            >
              Bắt Đầu Miễn Phí
            </button>
          </div>

          {/* 2. Gói VIP Pro Cloud */}
          <div style={{
            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
            border: '2px solid rgba(245, 158, 11, 0.7)',
            borderRadius: '20px',
            padding: '30px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              position: 'absolute',
              top: '-13px',
              right: '20px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#fff',
              fontSize: '10.5px',
              fontWeight: '800',
              padding: '4px 12px',
              borderRadius: '999px'
            }}>
              ★ PHỔ BIẾN NHẤT
            </div>

            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#fbbf24',
                fontSize: '11px',
                fontWeight: '800',
                marginBottom: '12px'
              }}>
                <Crown size={14} />
                <span>GÓI VIP CLOUD</span>
              </div>

              <h3 style={{ fontSize: '21px', fontWeight: '800', margin: '0 0 8px', color: '#fbbf24' }}>
                {plans.vip?.name || 'VIP Pro Marketing'}
              </h3>

              <div style={{ marginBottom: '22px' }}>
                <span style={{ fontSize: '32px', fontWeight: '900', color: '#fbbf24' }}>
                  {Number(plans.vip?.price || 199000).toLocaleString('vi-VN')} ₫
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}> / {plans.vip?.duration_days || 30} ngày</span>
              </div>

              <div style={{ borderTop: '1px solid rgba(245, 158, 11, 0.25)', paddingTop: '20px', marginBottom: '24px' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#f8fafc' }}>
                    <Check size={15} color="#fbbf24" />
                    <span><strong>{plans.vip?.max_accounts || 10}</strong> Tài khoản chạy song song</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#f8fafc' }}>
                    <Check size={15} color="#fbbf24" />
                    <span><strong>Live Chat 2 chiều</strong> phản hồi tức thì</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#f8fafc' }}>
                    <Check size={15} color="#fbbf24" />
                    <span><strong>Spintax & Hẹn giờ</strong> thông minh</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#f8fafc' }}>
                    <Check size={15} color="#fbbf24" />
                    <span>Chuyển tiếp tin về Telegram Admin</span>
                  </li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onAuthClick('register')}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                border: 'none',
                color: '#fff',
                fontSize: '13.5px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Crown size={16} />
              <span>Đăng Ký VIP Cloud</span>
              <ArrowRight size={15} />
            </button>
          </div>

          {/* 3. Gói Tự Động Bằng Điện Thoại */}
          <div style={{
            background: 'linear-gradient(180deg, rgba(12, 25, 44, 0.96) 0%, rgba(15, 23, 42, 0.98) 100%)',
            border: '2px solid rgba(56, 189, 248, 0.65)',
            borderRadius: '20px',
            padding: '30px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              position: 'absolute',
              top: '-13px',
              right: '20px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
              color: '#fff',
              fontSize: '10.5px',
              fontWeight: '800',
              padding: '4px 12px',
              borderRadius: '999px'
            }}>
              📱 TỰ ĐỘNG BẰNG ĐT
            </div>

            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(56, 189, 248, 0.18)',
                color: '#38bdf8',
                fontSize: '11px',
                fontWeight: '800',
                marginBottom: '12px'
              }}>
                <Smartphone size={14} />
                <span>MOBILE AUTO 24/7</span>
              </div>

              <h3 style={{ fontSize: '21px', fontWeight: '800', margin: '0 0 8px', color: '#38bdf8' }}>
                {plans.mobile_auto?.name || 'Tự Động Bằng Điện Thoại'}
              </h3>

              <div style={{ marginBottom: '22px' }}>
                <span style={{ fontSize: '32px', fontWeight: '900', color: '#38bdf8' }}>
                  {Number(plans.mobile_auto?.price || 299000).toLocaleString('vi-VN')} ₫
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}> / {plans.mobile_auto?.duration_days || 30} ngày</span>
              </div>

              <div style={{ borderTop: '1px solid rgba(56, 189, 248, 0.25)', paddingTop: '20px', marginBottom: '24px' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#f8fafc' }}>
                    <Check size={15} color="#38bdf8" />
                    <span><strong>{plans.mobile_auto?.max_accounts || 20}</strong> Tài khoản tự động trên ĐT</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#f8fafc' }}>
                    <Check size={15} color="#38bdf8" />
                    <span>Chạy ngầm 24/7 khi tắt màn hình ĐT</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#f8fafc' }}>
                    <Check size={15} color="#38bdf8" />
                    <span>Đồng bộ 2 chiều với App Telegram ĐT</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#f8fafc' }}>
                    <Check size={15} color="#38bdf8" />
                    <span>Toàn bộ đặc quyền VIP Pro Cloud</span>
                  </li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onAuthClick('register')}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                border: 'none',
                color: '#fff',
                fontSize: '13.5px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Smartphone size={16} />
              <span>Đăng Ký Gói Điện Thoại</span>
            </button>
          </div>

          {/* 4. Gói Tool Vĩnh Viễn (PC / Laptop) */}
          <div style={{
            background: 'linear-gradient(180deg, rgba(27, 18, 44, 0.96) 0%, rgba(15, 23, 42, 0.98) 100%)',
            border: '2px solid rgba(168, 85, 247, 0.65)',
            borderRadius: '20px',
            padding: '30px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              position: 'absolute',
              top: '-13px',
              right: '20px',
              background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
              color: '#fff',
              fontSize: '10.5px',
              fontWeight: '800',
              padding: '4px 12px',
              borderRadius: '999px'
            }}>
              💻 BẢN QUYỀN VĨNH VIỄN
            </div>

            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(168, 85, 247, 0.18)',
                color: '#c084fc',
                fontSize: '11px',
                fontWeight: '800',
                marginBottom: '12px'
              }}>
                <Monitor size={14} />
                <span>CÀI TRÊN PC / LAPTOP</span>
              </div>

              <h3 style={{ fontSize: '21px', fontWeight: '800', margin: '0 0 8px', color: '#c084fc' }}>
                {plans.pc_lifetime?.name || 'Tool Vĩnh Viễn (PC / Laptop)'}
              </h3>

              <div style={{ marginBottom: '22px' }}>
                <span style={{ fontSize: '32px', fontWeight: '900', color: '#c084fc' }}>
                  {Number(plans.pc_lifetime?.price || 1490000).toLocaleString('vi-VN')} ₫
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}> / vĩnh viễn</span>
              </div>

              <div style={{ borderTop: '1px solid rgba(168, 85, 247, 0.25)', paddingTop: '20px', marginBottom: '24px' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#f8fafc' }}>
                    <Check size={15} color="#c084fc" />
                    <span>Kết nối tới <strong>{plans.pc_lifetime?.max_accounts || 100}</strong> tài khoản</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#f8fafc' }}>
                    <Check size={15} color="#c084fc" />
                    <span>Cài trực tiếp trên PC / Laptop cá nhân</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#f8fafc' }}>
                    <Check size={15} color="#c084fc" />
                    <span>Mua 1 lần duy nhất - Không gia hạn</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#f8fafc' }}>
                    <Check size={15} color="#c084fc" />
                    <span>Cập nhật trọn đời & Hỗ trợ cài đặt 1-1</span>
                  </li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onAuthClick('register')}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
                border: 'none',
                color: '#fff',
                fontSize: '13.5px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Monitor size={16} />
              <span>Mua Bản Vĩnh Viễn PC</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
