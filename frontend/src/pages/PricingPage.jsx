import React, { useState, useEffect } from 'react';
import {
  Crown,
  Check,
  X,
  Sparkles,
  Wallet,
  Loader2,
  HelpCircle,
  Clock,
  QrCode,
  Smartphone,
  Monitor
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { upgradeVipPlan, getSubscriptionPlans } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import VipUpgradeModal from '../components/common/VipUpgradeModal';

const DEFAULT_PLANS = {
  free: {
    name: 'Gói Miễn Phí (Free)',
    price: 0,
    duration_days: 3650,
    max_accounts: 3
  },
  vip: {
    name: 'VIP Pro Marketing (Cloud)',
    price: 199000,
    duration_days: 30,
    max_accounts: 10,
    features: [
      '10 Tài khoản Telegram chạy song song',
      'Hộp thư Live Chat 2 chiều nhận & trả lời tức thì',
      'Spintax xoay vòng & Hẹn giờ thông minh',
      'Chuyển tiếp tin nhắn riêng về Telegram cá nhân',
      'Tự động né tránh FloodWait & Circuit Breaker'
    ]
  },
  mobile_auto: {
    name: 'Tự Động Toàn Diện Bằng Điện Thoại',
    price: 299000,
    duration_days: 30,
    max_accounts: 20,
    features: [
      'Tự động hóa 100% mọi tác vụ ngay trên Điện Thoại',
      '20 Tài khoản Telegram chạy ngầm 24/7 khi tắt màn hình',
      'Đồng bộ tin nhắn 2 chiều Real-time với App Telegram ĐT',
      'Hẹn giờ thông minh đa ca & báo cáo Push về điện thoại',
      'Bao gồm toàn bộ đặc quyền gói VIP Pro Marketing'
    ]
  },
  pc_lifetime: {
    name: 'Tool Vĩnh Viễn (Cài Trên PC / Laptop)',
    price: 1490000,
    duration_days: 36500,
    max_accounts: 100,
    features: [
      'Bản quyền vĩnh viễn cài trực tiếp trên PC / Laptop cá nhân',
      'Mua 1 lần duy nhất - Không tốn phí gia hạn hàng tháng',
      'Kết nối tới 100 tài khoản Telegram chạy đa luồng',
      'Toàn quyền lưu trữ dữ liệu & session độc lập trên máy riêng',
      'Cập nhật phiên bản mới trọn đời & Hỗ trợ kỹ thuật 1-1'
    ]
  }
};

export default function PricingPage() {
  const { user, profile, refreshProfile, updateProfileLocally } = useAuth();
  const { showToast, addNotification } = useNotification();
  const [upgrading, setUpgrading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedPlanKey, setSelectedPlanKey] = useState('vip');
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const navigate = useNavigate();

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

  const currentBalance = profile?.balance || 0;
  const isVip = profile?.subscription_tier === 'VIP';
  const activePlanObj = plans[selectedPlanKey] || plans.vip;

  const handlePromptUpgrade = (planKey = 'vip') => {
    if (!user) return;
    setSelectedPlanKey(planKey);
    setShowConfirmModal(true);
  };

  const handleExecuteUpgrade = async () => {
    if (!user) return;

    setUpgrading(true);
    try {
      const minSpin = new Promise(resolve => setTimeout(resolve, 600));
      const [res] = await Promise.all([
        upgradeVipPlan(user.id, selectedPlanKey),
        minSpin
      ]);

      if (res && res.success) {
        if (updateProfileLocally && res.data) {
          updateProfileLocally({
            balance: res.data.new_balance,
            subscription_tier: 'VIP',
            tier_expires_at: res.data.tier_expires_at
          });
        }
        await refreshProfile();
        setShowConfirmModal(false);

        addNotification({
          title: `👑 Kích Hoạt ${activePlanObj.name} Thành Công`,
          message: res.data?.message || res.message || `Chúc mừng bạn đã kích hoạt ${activePlanObj.name} thành công!`,
          type: 'success'
        });
      } else {
        showToast({
          title: 'Lỗi nâng cấp',
          message: res?.error || res?.detail || 'Không thể nâng cấp gói. Vui lòng thử lại!',
          type: 'error'
        });
      }
    } catch (err) {
      showToast({
        title: 'Lỗi kết nối',
        message: err.message || 'Lỗi xử lý giao dịch nâng cấp gói.',
        type: 'error'
      });
    } finally {
      setUpgrading(false);
    }
  };

  const vipPlan = plans.vip || DEFAULT_PLANS.vip;
  const mobilePlan = plans.mobile_auto || DEFAULT_PLANS.mobile_auto;
  const pcPlan = plans.pc_lifetime || DEFAULT_PLANS.pc_lifetime;

  return (
    <div className="page-container pricing-page-container" style={{ padding: '28px', maxWidth: '1320px', margin: '0 auto' }}>
      {/* 1. Header Banner */}
      <div className="pricing-header-banner" style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div className="pricing-badge" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '999px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.1) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          color: '#fbbf24',
          fontSize: '13px',
          fontWeight: '700',
          marginBottom: '14px'
        }}>
          <Sparkles size={16} />
          <span>BẢNG GIÁ DỊCH VỤ HỘI VIÊN TELEPULSE</span>
        </div>
        <h1 className="pricing-title" style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text-main, #f8fafc)', margin: '0 0 10px 0', letterSpacing: '-0.5px' }}>
          Chọn Gói Giải Pháp Phù Hợp Với Nhu Cầu Của Bạn
        </h1>
        <p className="pricing-desc" style={{ fontSize: '15px', color: 'var(--text-muted, #94a3b8)', margin: '0 auto', maxWidth: '680px', lineHeight: '1.6' }}>
          Từ gói Cloud chạy trên trình duyệt, gói Tự động toàn diện bằng Điện Thoại đến bản quyền Tool Vĩnh Viễn cài trực tiếp trên PC / Laptop cá nhân.
        </p>
      </div>

      {/* 2. Thanh hiển thị số dư ví hiện tại */}
      <div className="pricing-wallet-bar" style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: '14px',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="pricing-wallet-icon" style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'var(--primary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Wallet size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Số dư khả dụng trong ví:</div>
            <div className="pricing-wallet-balance" style={{ fontSize: '20px', fontWeight: '800', color: '#818cf8' }}>
              {currentBalance.toLocaleString('vi-VN')} ₫
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {currentBalance < vipPlan.price && !isVip && (
            <span style={{ fontSize: '13px', color: '#f59e0b', fontWeight: '600' }}>
              (Còn thiếu {(vipPlan.price - currentBalance).toLocaleString('vi-VN')} ₫ để lên VIP Cloud)
            </span>
          )}
          <button
            onClick={() => navigate('/wallet')}
            className="btn btn-primary pricing-deposit-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              fontWeight: '700'
            }}
          >
            <QrCode size={16} />
            <span>Nạp Tiền VietQR</span>
          </button>
        </div>
      </div>

      {/* 3. Bảng So Sánh 4 Gói Cước */}
      <div className="pricing-plans-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '48px',
        alignItems: 'stretch'
      }}>
        {/* 1. Card Gói Free */}
        <div style={{
          background: 'var(--bg-card, #1e293b)',
          border: '1px solid var(--border-subtle, #334155)',
          borderRadius: '18px',
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
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
            <h3 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 6px 0', color: 'var(--text-main)' }}>
              {plans.free?.name || 'Gói Miễn Phí (Free)'}
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '18px', minHeight: '36px' }}>
              Dành cho người mới bắt đầu làm quen với hệ thống điều khiển bot Telegram.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '30px', fontWeight: '900', color: 'var(--text-main)' }}>0 ₫</span>
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}> / vĩnh viễn</span>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '18px', marginBottom: '20px' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-main)' }}>
                  <Check size={15} color="var(--success)" />
                  <span>Tối đa <strong>{plans.free?.max_accounts || 3}</strong> tài khoản Telegram</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-main)' }}>
                  <Check size={15} color="var(--success)" />
                  <span>Quét & đồng bộ danh sách nhóm</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-main)' }}>
                  <Check size={15} color="var(--success)" />
                  <span>Giới hạn 50 tin/ngày (1 mẫu tin)</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                  <X size={15} color="#ef4444" />
                  <span>Không hỗ trợ Live Chat 2 chiều</span>
                </li>
              </ul>
            </div>
          </div>

          <button
            disabled
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              background: 'rgba(148, 163, 184, 0.12)',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              color: '#94a3b8',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'default'
            }}
          >
            {!isVip ? '✓ Gói Bạn Đang Dùng' : 'Đã Nâng Cấp Cao Hơn'}
          </button>
        </div>

        {/* 2. Card Gói VIP Pro Cloud */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
          border: '2px solid rgba(245, 158, 11, 0.65)',
          borderRadius: '18px',
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          boxShadow: '0 14px 32px rgba(0, 0, 0, 0.35)'
        }}>
          <div style={{
            position: 'absolute',
            top: '-12px',
            right: '18px',
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
              GÓI VIP CLOUD
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 6px 0', color: '#fbbf24' }}>
              {vipPlan.name}
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '18px', minHeight: '36px' }}>
              Vận hành tự động trên đám mây cho cá nhân kinh doanh & đội ngũ marketing.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '30px', fontWeight: '900', color: '#fbbf24' }}>
                {Number(vipPlan.price).toLocaleString('vi-VN')} ₫
              </span>
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}> / {vipPlan.duration_days || 30} ngày</span>
            </div>

            <div style={{ borderTop: '1px solid rgba(245, 158, 11, 0.25)', paddingTop: '18px', marginBottom: '20px' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#f8fafc' }}>
                  <Check size={15} color="#fbbf24" />
                  <span>Kết nối tối đa <strong>{vipPlan.max_accounts || 10} tài khoản</strong> song song</span>
                </li>
                {(vipPlan.features || DEFAULT_PLANS.vip.features).slice(1).map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#f8fafc' }}>
                    <Check size={15} color="#fbbf24" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={() => handlePromptUpgrade('vip')}
            disabled={upgrading}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              border: 'none',
              color: '#fff',
              fontSize: '13.5px',
              fontWeight: '800',
              cursor: upgrading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Crown size={16} />
            <span>{isVip ? 'Gia Hạn Gói VIP Cloud' : 'Mua Gói VIP Cloud'}</span>
          </button>
        </div>

        {/* 3. Card Gói Tự Động Toàn Diện Bằng Điện Thoại */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(12, 25, 44, 0.96) 0%, rgba(15, 23, 42, 0.98) 100%)',
          border: '2px solid rgba(56, 189, 248, 0.65)',
          borderRadius: '18px',
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          boxShadow: '0 14px 32px rgba(0, 0, 0, 0.35)'
        }}>
          <div style={{
            position: 'absolute',
            top: '-12px',
            right: '18px',
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
              GÓI MOBILE AUTO 24/7
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 6px 0', color: '#38bdf8' }}>
              {mobilePlan.name}
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '18px', minHeight: '36px' }}>
              Điều khiển và tự động hóa 100% mọi thứ chỉ bằng chiếc điện thoại di động.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '30px', fontWeight: '900', color: '#38bdf8' }}>
                {Number(mobilePlan.price).toLocaleString('vi-VN')} ₫
              </span>
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}> / {mobilePlan.duration_days || 30} ngày</span>
            </div>

            <div style={{ borderTop: '1px solid rgba(56, 189, 248, 0.25)', paddingTop: '18px', marginBottom: '20px' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#f8fafc' }}>
                  <Check size={15} color="#38bdf8" />
                  <span>Tối đa <strong>{mobilePlan.max_accounts || 20} tài khoản</strong> chạy ngầm 24/7</span>
                </li>
                {(mobilePlan.features || DEFAULT_PLANS.mobile_auto.features).slice(1).map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#f8fafc' }}>
                    <Check size={15} color="#38bdf8" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={() => handlePromptUpgrade('mobile_auto')}
            disabled={upgrading}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
              border: 'none',
              color: '#fff',
              fontSize: '13.5px',
              fontWeight: '800',
              cursor: upgrading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Smartphone size={16} />
            <span>Mua Gói Tự Động ĐT</span>
          </button>
        </div>

        {/* 4. Card Gói Tool Vĩnh Viễn (Cài trên PC / Laptop) */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(27, 18, 44, 0.96) 0%, rgba(15, 23, 42, 0.98) 100%)',
          border: '2px solid rgba(168, 85, 247, 0.65)',
          borderRadius: '18px',
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          boxShadow: '0 14px 32px rgba(0, 0, 0, 0.35)'
        }}>
          <div style={{
            position: 'absolute',
            top: '-12px',
            right: '18px',
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
              CÀI TRÊN PC / LAPTOP
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 6px 0', color: '#c084fc' }}>
              {pcPlan.name}
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '18px', minHeight: '36px' }}>
              Cài đặt trực tiếp trên máy tính cá nhân, mua 1 lần dùng vĩnh viễn không gia hạn.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '30px', fontWeight: '900', color: '#c084fc' }}>
                {Number(pcPlan.price).toLocaleString('vi-VN')} ₫
              </span>
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}> / vĩnh viễn</span>
            </div>

            <div style={{ borderTop: '1px solid rgba(168, 85, 247, 0.25)', paddingTop: '18px', marginBottom: '20px' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#f8fafc' }}>
                  <Check size={15} color="#c084fc" />
                  <span>Kết nối tới <strong>{pcPlan.max_accounts || 100} tài khoản</strong> trên PC/Laptop</span>
                </li>
                {(pcPlan.features || DEFAULT_PLANS.pc_lifetime.features).slice(1).map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#f8fafc' }}>
                    <Check size={15} color="#c084fc" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={() => handlePromptUpgrade('pc_lifetime')}
            disabled={upgrading}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
              border: 'none',
              color: '#fff',
              fontSize: '13.5px',
              fontWeight: '800',
              cursor: upgrading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Monitor size={16} />
            <span>Mua Tool Vĩnh Viễn PC</span>
          </button>
        </div>
      </div>

      {/* 4. FAQ Giải Đáp Thắc Mắc */}
      <div style={{
        background: 'var(--bg-card, #1e293b)',
        borderRadius: '16px',
        padding: '28px',
        border: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <HelpCircle size={20} color="var(--primary-light)" />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>
            Câu Hỏi Thường Gặp Về Các Gói Dịch Vụ
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>
              1. Gói Tự Động Bằng Điện Thoại khác gì gói VIP Cloud?
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Gói Điện Thoại mở rộng lên 20 tài khoản chạy ngầm 24/7 ngay cả khi tắt màn hình điện thoại, đồng bộ tin nhắn 2 chiều trực tiếp với ứng dụng Telegram di động.
            </p>
          </div>

          <div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>
              2. Gói Tool Vĩnh Viễn (PC / Laptop) cài đặt thế nào?
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Sau khi thanh toán, bạn được kích hoạt bản quyền trọn đời kèm bộ cài đặt trực tiếp trên máy tính Windows/macOS và hỗ trợ kỹ thuật cài đặt 1-1 qua UltraViewer/Telegram.
            </p>
          </div>

          <div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>
              3. Nạp tiền VietQR bao lâu thì kích hoạt được gói?
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Tiền vào ví tự động sau 2–5 giây kể từ khi quét mã VietQR. Bạn có thể bấm mua và kích hoạt bất kỳ gói nào ngay lập tức.
            </p>
          </div>
        </div>
      </div>

      {/* MODAL XÁC NHẬN KÍCH HOẠT GÓI */}
      <VipUpgradeModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleExecuteUpgrade}
        vipPrice={activePlanObj.price}
        durationDays={activePlanObj.duration_days}
        planName={activePlanObj.name}
        planFeatures={activePlanObj.features}
        isLoading={upgrading}
        isRenewal={isVip && selectedPlanKey === 'vip'}
      />
    </div>
  );
}
