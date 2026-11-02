import React from 'react';
import { Crown, Check, X, Loader2 } from 'lucide-react';

export default function VipUpgradeModal({
  isOpen,
  onClose,
  onConfirm,
  vipPrice = 199000,
  durationDays = 30,
  planName = 'VIP Pro Marketing (Cloud)',
  planFeatures = null,
  isLoading = false,
  isRenewal = false
}) {
  if (!isOpen) return null;

  const isLifetime = durationDays >= 3650;
  const defaultFeatures = [
    'Kết nối tối đa 10 tài khoản Telegram chạy song song',
    'Hộp thư Live Chat 2 chiều nhận và trả lời tức thì',
    'Chuyển tiếp báo cáo lead về Telegram cá nhân của Admin',
    'Soạn tin nhắn Spintax biến thiên không giới hạn',
    'Tự động né tránh FloodWait chống block tài khoản'
  ];
  const featuresToRender = Array.isArray(planFeatures) && planFeatures.length > 0 ? planFeatures : defaultFeatures;

  return (
    <div className="modal-overlay" onClick={isLoading ? undefined : onClose} style={{ zIndex: 130 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '480px',
          width: '92%',
          padding: '28px',
          border: '2px solid rgba(245, 158, 11, 0.55)',
          borderRadius: '20px',
          boxShadow: '0 24px 50px rgba(0, 0, 0, 0.7), 0 0 40px rgba(245, 158, 11, 0.25)',
          background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.45)',
              flexShrink: 0
            }}>
              <Crown size={26} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-main, #f8fafc)' }}>
                {isRenewal ? 'Xác Nhận Gia Hạn Gói Cước' : 'Xác Nhận Kích Hoạt Gói Cước'}
              </h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#fbbf24', fontWeight: '600' }}>
                {isLifetime ? 'Bản Quyền Vĩnh Viễn • Trọn Đời' : `Gói Tiếp Thị Tự Động • Thời hạn ${durationDays} ngày`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="btn-icon-subtle"
            style={{ cursor: isLoading ? 'not-allowed' : 'pointer', padding: '4px' }}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Thông tin gói cước */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '14px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Gói dịch vụ đăng ký:</div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#fbbf24', marginTop: '2px' }}>
              {planName}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Chi phí:</div>
            <div style={{ fontSize: '18px', fontWeight: '900', color: '#f59e0b', fontFamily: 'monospace', marginTop: '2px' }}>
              {Number(vipPrice || 0).toLocaleString('vi-VN')} ₫
            </div>
          </div>
        </div>

        {/* Danh sách quyền lợi kích hoạt */}
        <div style={{ marginBottom: '26px' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Toàn bộ đặc quyền được kích hoạt ngay:
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            {featuresToRender.map((feat, idx) => (
              <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)' }}>
                <Check size={16} color="#fbbf24" style={{ flexShrink: 0 }} />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="btn btn-secondary"
            style={{ padding: '10px 20px', fontSize: '13px', minWidth: '90px' }}
          >
            Hủy Bỏ
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="btn btn-primary"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              border: 'none',
              fontWeight: '800',
              padding: '10px 24px',
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#ffffff',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.45)',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>Đang xử lý giao dịch...</span>
              </>
            ) : (
              <>
                <Crown size={16} />
                <span>{isRenewal ? `Gia Hạn (${Number(vipPrice || 0).toLocaleString('vi-VN')} ₫)` : `Xác Nhận Mua (${Number(vipPrice || 0).toLocaleString('vi-VN')} ₫)`}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
