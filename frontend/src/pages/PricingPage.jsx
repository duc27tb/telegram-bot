import React, { useState } from 'react';
import {
  Crown,
  Check,
  X,
  Sparkles,
  Zap,
  ShieldCheck,
  Users,
  MessageSquare,
  Wallet,
  ArrowRight,
  Loader2,
  HelpCircle,
  Clock,
  QrCode
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { upgradeVipPlan } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import VipUpgradeModal from '../components/common/VipUpgradeModal';

export default function PricingPage() {
  const { user, profile, refreshProfile, updateProfileLocally } = useAuth();
  const { showToast, addNotification } = useNotification();
  const [upgrading, setUpgrading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const navigate = useNavigate();

  const currentBalance = profile?.balance || 0;
  const isVip = profile?.subscription_tier === 'VIP';
  const VIP_PRICE = 199000;

  const handlePromptUpgrade = () => {
    if (!user) return;
    setShowConfirmModal(true);
  };

  const handleExecuteUpgrade = async () => {
    if (!user) return;

    setUpgrading(true);
    try {
      const minSpin = new Promise(resolve => setTimeout(resolve, 600));
      const [res] = await Promise.all([
        upgradeVipPlan(user.id),
        minSpin
      ]);

      if (res && res.success) {
        // Cập nhật state profile ngay lập tức trong React
        if (updateProfileLocally && res.data) {
          updateProfileLocally({
            balance: res.data.new_balance,
            subscription_tier: 'VIP',
            tier_expires_at: res.data.tier_expires_at
          });
        }
        await refreshProfile();
        setShowConfirmModal(false);

        // Lưu thông báo chính thức vào Chuông Notification
        addNotification({
          title: '👑 Nâng Cấp VIP Pro Thành Công',
          message: res.data?.message || res.message || 'Chúc mừng bạn đã kích hoạt gói VIP Pro Enterprise thành công!',
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
        message: err.message || 'Lỗi xử lý giao dịch nâng cấp VIP.',
        type: 'error'
      });
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div className="page-container pricing-page-container" style={{ padding: '28px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* 1. Header Banner */}
      <div className="pricing-header-banner" style={{ textAlign: 'center', marginBottom: '36px' }}>
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
          Đầu Tư Đúng Đắn Để Tăng Tốc Tiếp Thị Telegram
        </h1>
        <p className="pricing-desc" style={{ fontSize: '15px', color: 'var(--text-muted, #94a3b8)', margin: '0 auto', maxWidth: '640px', lineHeight: '1.6' }}>
          Mở khóa khả năng vận hành 10 tài khoản bot song song, Live Chat 2 chiều tức thì và thuật toán chống khoá FloodWait thông minh.
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
          {currentBalance < VIP_PRICE && !isVip && (
            <span style={{ fontSize: '13px', color: '#f59e0b', fontWeight: '600' }}>
              (Còn thiếu {(VIP_PRICE - currentBalance).toLocaleString('vi-VN')} ₫ để lên VIP)
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

      {/* 3. Bảng So Sánh 2 Gói Cước */}
      <div className="pricing-plans-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        marginBottom: '48px'
      }}>
        {/* Card Gói Free */}
        <div style={{
          background: 'var(--bg-card, #1e293b)',
          border: isVip ? '1px solid var(--border-subtle, #334155)' : '2px solid rgba(148, 163, 184, 0.3)',
          borderRadius: '18px',
          padding: '32px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative'
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
            <h3 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 6px 0', color: 'var(--text-main)' }}>
              Gói Miễn Phí (Free)
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', minHeight: '38px' }}>
              Dành cho người mới bắt đầu làm quen với hệ thống điều khiển bot Telegram.
            </p>

            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontSize: '34px', fontWeight: '900', color: 'var(--text-main)' }}>0 ₫</span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}> / vĩnh viễn</span>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px', marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '14px', textTransform: 'uppercase' }}>
                Tính Năng Bao Gồm:
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-main)' }}>
                  <Check size={16} color="var(--success)" />
                  <span>Tối đa <strong>3</strong> tài khoản Telegram kết nối</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-main)' }}>
                  <Check size={16} color="var(--success)" />
                  <span>Quét & đồng bộ danh sách nhóm</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-main)' }}>
                  <Check size={16} color="var(--success)" />
                  <span>Chỉ spam <strong>1 loại tin nhắn</strong> (không xoay vòng)</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                  <X size={16} color="#ef4444" />
                  <span>Không hỗ trợ chat 2 chiều (Live Chat)</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                  <X size={16} color="#ef4444" />
                  <span>Không hỗ trợ chuyển tiếp về tài khoản cá nhân</span>
                </li>
              </ul>
            </div>
          </div>

          <div>
            {!isVip ? (
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
                ✓ Gói Bạn Đang Dùng
              </button>
            ) : (
              <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                Tài khoản của bạn đã được nâng cấp lên VIP Pro
              </div>
            )}
          </div>
        </div>

        {/* Card Gói VIP Pro Enterprise */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
          border: '2px solid rgba(245, 158, 11, 0.65)',
          borderRadius: '18px',
          padding: '32px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(245, 158, 11, 0.15)'
        }}>
          {/* Badge Khuyên Dùng */}
          <div style={{
            position: 'absolute',
            top: '-13px',
            right: '24px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#fff',
            fontSize: '11px',
            fontWeight: '800',
            padding: '4px 14px',
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
              marginBottom: '12px'
            }}>
              <Crown size={14} />
              GÓI VIP ENTERPRISE
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 6px 0', color: '#fbbf24' }}>
              VIP Pro Marketing
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', minHeight: '38px' }}>
              Dành cho đội ngũ tiếp thị, cá nhân kinh doanh & doanh nghiệp cần quy mô phủ sóng lớn.
            </p>

            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontSize: '36px', fontWeight: '900', color: '#fbbf24' }}>
                {VIP_PRICE.toLocaleString('vi-VN')} ₫
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}> / 30 ngày sử dụng</span>
            </div>

            <div style={{ borderTop: '1px solid rgba(245, 158, 11, 0.25)', paddingTop: '20px', marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#fbbf24', marginBottom: '14px', textTransform: 'uppercase' }}>
                Toàn Bộ Đặc Quyền Cao Cấp:
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#f8fafc' }}>
                  <Check size={16} color="#fbbf24" />
                  <span><strong>10</strong> Tài khoản Telegram kết nối đồng thời</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#f8fafc' }}>
                  <Check size={16} color="#fbbf24" />
                  <span><strong>Hộp Thư Trực Tiếp (Live Chat) 2 chiều</strong> nhận và trả lời tức thì</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#f8fafc' }}>
                  <Check size={16} color="#fbbf24" />
                  <span><strong>Spintax biến thiên không giới hạn</strong> chống trùng lặp</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#f8fafc' }}>
                  <Check size={16} color="#fbbf24" />
                  <span><strong>Chuyển tiếp tin nhắn riêng</strong> về Telegram cá nhân của Admin</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#f8fafc' }}>
                  <Check size={16} color="#fbbf24" />
                  <span><strong>Tự động luân chuyển & né tránh FloodWait</strong> chống block tài khoản</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#f8fafc' }}>
                  <Check size={16} color="#fbbf24" />
                  <span><strong>Không giới hạn</strong> số lượng tin nhắn và chiến dịch</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#f8fafc' }}>
                  <Check size={16} color="#fbbf24" />
                  <span>Hỗ trợ kỹ thuật ưu tiên 24/7 trực tiếp qua Telegram</span>
                </li>
              </ul>
            </div>
          </div>

          <div>
            {isVip ? (
              <div>
                <div style={{
                  padding: '9px 14px',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: '1.5px solid #f59e0b',
                  textAlign: 'center',
                  color: '#fbbf24',
                  fontSize: '13px',
                  fontWeight: '700',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'default'
                }}>
                  <Crown size={15} color="#f59e0b" />
                  <span>Đang Kích Hoạt (Hạn đến: {profile?.tier_expires_at ? new Date(profile.tier_expires_at).toLocaleDateString('vi-VN') : '30 ngày'})</span>
                </div>
                <button
                  onClick={handlePromptUpgrade}
                  disabled={upgrading}
                  style={{
                    width: '100%',
                    padding: '12px 18px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: '800',
                    cursor: upgrading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
                    transition: 'opacity 0.2s, transform 0.15s'
                  }}
                >
                  {upgrading ? <Loader2 size={16} className="spin" /> : <Clock size={16} />}
                  <span>Gia Hạn Thêm 30 Ngày (+199.000 ₫)</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handlePromptUpgrade}
                disabled={upgrading}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: '800',
                  cursor: upgrading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 6px 18px rgba(245, 158, 11, 0.4)',
                  transition: 'opacity 0.2s'
                }}
              >
                {upgrading ? (
                  <>
                    <Loader2 size={18} className="spin" />
                    <span>Đang kích hoạt gói VIP...</span>
                  </>
                ) : (
                  <>
                    <Crown size={18} />
                    <span>Nâng Cấp Gói VIP Ngay (199.000 ₫)</span>
                  </>
                )}
              </button>
            )}
          </div>
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
            Câu Hỏi Thường Gặp Về Gói Cước
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>
              1. Sau khi bấm nâng cấp, gói VIP có hiệu lực ngay không?
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Có. Hệ thống tự động trừ số dư trong ví và kích hoạt tức thì toàn bộ 10 tài khoản bot và tính năng Live Chat mà không cần chờ duyệt.
            </p>
          </div>

          <div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>
              2. Làm thế nào để nạp tiền vào ví trước khi mua gói?
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Bạn chỉ cần bấm nút "Nạp Tiền VietQR", nhập số tiền từ 10.000 ₫ và quét mã QR trên ứng dụng ngân hàng. Tiền sẽ vào ví sau 2-5 giây.
            </p>
          </div>

          <div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>
              3. Gói VIP có tự động gia hạn và trừ tiền khi hết hạn không?
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Không. Hệ thống không tự động trừ tiền. Bạn hoàn toàn chủ động quyết định việc gia hạn khi có nhu cầu tiếp tục sử dụng.
            </p>
          </div>
        </div>
      </div>

      {/* MODAL XÁC NHẬN NÂNG CẤP GÓI VIP PRO */}
      <VipUpgradeModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleExecuteUpgrade}
        onDeposit={(shortage) => {
          setShowConfirmModal(false);
          navigate('/wallet', { state: { depositAmount: shortage } });
        }}
        currentBalance={currentBalance}
        vipPrice={VIP_PRICE}
        durationDays={30}
        isLoading={upgrading}
        isRenewal={isVip}
      />
    </div>
  );
}
