import React, { useState, useEffect } from 'react';
import { X, Phone, KeyRound, ShieldCheck, CheckCircle2, AlertCircle, Loader2, Crown, ExternalLink, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { requestOTP, verifyOTP } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const normalizePhone = (input) => {
  if (!input) return '';
  const clean = input.trim().replace(/[\s\-\.]/g, '');
  if (clean.startsWith('0')) {
    return '+84' + clean.slice(1);
  }
  if (clean.startsWith('84') && !clean.startsWith('+84')) {
    return '+' + clean;
  }
  if (!clean.startsWith('+')) {
    return '+' + clean;
  }
  return clean;
};

export default function AddAccountModal({ isOpen, onClose, onSuccess, initialAccount = null }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Nhập SĐT, 2: Nhập OTP
  const [phone, setPhone] = useState(initialAccount?.phone_number || '');
  const [apiId, setApiId] = useState(initialAccount?.api_id ? String(initialAccount.api_id) : '');
  const [apiHash, setApiHash] = useState('');
  const [loginId, setLoginId] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [need2FA, setNeed2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accountCount, setAccountCount] = useState(0);

  const isVip = profile?.subscription_tier === 'VIP';
  const maxAccounts = isVip ? 10 : 3;
  const isLimitReached = !initialAccount && accountCount >= maxAccounts;

  useEffect(() => {
    if (isOpen) {
      if (initialAccount) {
        setPhone(initialAccount.phone_number || '');
        setApiId(initialAccount.api_id ? String(initialAccount.api_id) : '');
        setApiHash(initialAccount.api_hash ? String(initialAccount.api_hash) : '');
      } else {
        setPhone('');
        setApiId('');
        setApiHash('');
      }
      if (user) {
        supabase
          .from('telegram_accounts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .then(({ count }) => {
            if (count !== null) setAccountCount(count);
          });
      }
    }
  }, [isOpen, initialAccount, user]);

  if (!isOpen) return null;

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!phone) {
      setError('Vui lòng nhập số điện thoại');
      return;
    }
    if (!initialAccount && (!apiId.trim() || !apiHash.trim())) {
      setError('Bắt buộc phải nhập đầy đủ API ID và API Hash riêng của bạn! Vui lòng xem hướng dẫn bên dưới.');
      return;
    }
    if (isLimitReached) {
      setError(`Bạn đã đạt giới hạn tối đa ${maxAccounts} tài khoản của ${isVip ? 'Gói VIP' : 'Gói Miễn Phí'}.`);
      return;
    }
    const cleanPhone = normalizePhone(phone);
    setError('');
    setLoading(true);
    try {
      const res = await requestOTP(cleanPhone, apiId || null, apiHash || null, user?.id);
      if (res.success) {
        setLoginId(res.login_id);
        setPhone(cleanPhone); // Hiển thị số đã chuẩn hóa +84 cho bước tiếp theo
        setStep(2);
      } else {
        setError(res.error || 'Lỗi gửi mã OTP');
      }
    } catch (err) {
      setError(err.message || 'Không thể kết nối với Backend!');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!loginId) {
      setError('Phiên yêu cầu mã OTP chưa được tạo hoặc đã hết hạn. Vui lòng quay lại bước 1 để gửi mã OTP!');
      setStep(1);
      return;
    }
    if (!code) {
      setError('Vui lòng nhập mã OTP từ Telegram');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await verifyOTP(loginId, code, password || null, user.id);
      if (res.success) {
        onSuccess(res.message);
        handleClose();
      } else if (res.need_2fa) {
        setNeed2FA(true);
        setError(res.error || 'Tài khoản có bảo mật 2FA. Vui lòng nhập mật khẩu!');
      } else {
        setError(res.error || 'Mã OTP không hợp lệ!');
      }
    } catch (err) {
      setError(err.message || 'Lỗi khi kết nối với máy chủ!');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setPhone('');
    setCode('');
    setPassword('');
    setNeed2FA(false);
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px' }}>
            {initialAccount 
              ? (step === 1 ? `Đăng Nhập Lại (${initialAccount.phone_number})` : 'Xác Thực Mã OTP Đăng Nhập Lại')
              : (step === 1 ? 'Thêm Tài Khoản Telegram Mới' : 'Xác Thực Mã OTP')}
          </h3>
          <button 
            onClick={handleClose} 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {initialAccount && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            marginBottom: '16px',
            fontSize: '13px',
            color: 'var(--primary-light)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <ShieldCheck size={18} style={{ flexShrink: 0 }} />
            <span>
              Đang làm mới phiên cho nick <strong>{initialAccount.account_name || initialAccount.phone_number}</strong> ({initialAccount.phone_number}). Toàn bộ <strong>nhóm mục tiêu và cấu hình sẽ được giữ nguyên 100%</strong>!
            </span>
          </div>
        )}

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 14px',
            background: 'var(--danger-bg)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {isLimitReached && (
          <div style={{
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.1) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div style={{ fontSize: '13px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Crown size={16} style={{ flexShrink: 0 }} />
              <span>
                Đã đạt giới hạn <strong>{accountCount}/{maxAccounts}</strong> tài khoản ({isVip ? 'Gói VIP' : 'Gói Miễn Phí'}).
                {!isVip && ' Nâng cấp VIP Pro để kết nối tới 10 tài khoản Telegram!'}
              </span>
            </div>
            {!isVip && (
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  navigate('/pricing');
                }}
                className="btn btn-primary btn-sm"
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  border: 'none',
                  color: '#fff'
                }}
              >
                Nâng Cấp VIP (199k)
              </button>
            )}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestOTP}>
            <div className="form-group">
              <label className="form-label">Số điện thoại Telegram</label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Ví dụ: 0912345678 hoặc +84912345678"
                  className="form-input"
                  style={{ paddingLeft: '42px' }}
                  value={phone}
                  disabled={isLimitReached}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px', display: 'block' }}>
                💡 <em>Bạn có thể nhập số <strong>09...</strong> bình thường, hệ thống sẽ tự động chuyển thành <strong>+84</strong></em>.
              </span>
            </div>

            {/* Cảnh báo đỏ nếu người dùng chưa nhập API ID hoặc API Hash */}
            {!initialAccount && (!apiId.trim() || !apiHash.trim()) && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: '600', fontSize: '13px' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>Bắt buộc cần cung cấp API ID và API Hash riêng</span>
                </div>
                <div style={{ fontSize: '12px', color: '#fca5a5', lineHeight: '1.5' }}>
                  Để bảo vệ tài khoản và tránh bị Telegram quét spam hàng loạt do dùng chung cổng, bạn cần tự lấy API ID & Hash riêng của mình từ Telegram (hoàn toàn miễn phí).
                </div>
                <div>
                  <a
                    href="/guide/telegram-api"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#38bdf8',
                      fontSize: '12px',
                      fontWeight: '600',
                      textDecoration: 'underline'
                    }}
                  >
                    <span>👉 Xem video & 4 bước hướng dẫn lấy mã (chỉ 1 phút)</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>API ID</span>
                  <span style={{ color: '#ef4444', fontWeight: 'bold' }}>*</span>
                  <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '500' }}>(Bắt buộc)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 12345678"
                  className="form-input"
                  style={{
                    borderColor: !initialAccount && !apiId.trim() ? 'rgba(239, 68, 68, 0.5)' : undefined
                  }}
                  value={apiId}
                  onChange={(e) => setApiId(e.target.value)}
                  required={!initialAccount}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>API Hash</span>
                  <span style={{ color: '#ef4444', fontWeight: 'bold' }}>*</span>
                  <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '500' }}>(Bắt buộc)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 948150d078ea..."
                  className="form-input"
                  style={{
                    borderColor: !initialAccount && !apiHash.trim() ? 'rgba(239, 68, 68, 0.5)' : undefined
                  }}
                  value={apiHash}
                  onChange={(e) => setApiHash(e.target.value)}
                  required={!initialAccount}
                />
              </div>
            </div>

            <div style={{ marginTop: '-4px', marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <a
                href="/guide/telegram-api"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: '#38bdf8',
                  fontSize: '12px',
                  fontWeight: '500',
                  textDecoration: 'none'
                }}
              >
                <HelpCircle size={13} />
                <span>Chưa có mã? Bấm xem video hướng dẫn lấy API</span>
                <ExternalLink size={12} />
              </a>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button type="button" onClick={handleClose} className="btn btn-secondary">
                Hủy
              </button>
              <button type="submit" disabled={loading || isLimitReached} className="btn btn-primary">
                {loading ? <Loader2 size={16} className="spin" /> : <Phone size={16} />}
                <span>{loading ? 'Đang gửi mã...' : (initialAccount ? 'Gửi OTP Đăng Nhập Lại' : 'Nhận Mã Xác Nhận')}</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <div className="form-group">
              <label className="form-label">Mã xác nhận (OTP) gửi về Telegram</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Nhập 5 số OTP..."
                  className="form-input"
                  style={{ paddingLeft: '42px', letterSpacing: '4px', fontSize: '18px', fontWeight: 'bold' }}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Kiểm tra tin nhắn thông báo trong ứng dụng Telegram của bạn.
              </span>
            </div>

            {need2FA && (
              <div className="form-group">
                <label className="form-label">Mật khẩu xác minh 2 bước (2FA)</label>
                <div style={{ position: 'relative' }}>
                  <ShieldCheck size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }} />
                  <input
                    type="password"
                    placeholder="Nhập mật khẩu 2FA..."
                    className="form-input"
                    style={{ paddingLeft: '42px' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
              <button type="button" onClick={() => setStep(1)} className="btn btn-secondary btn-sm">
                Quay lại
              </button>
              <button type="submit" disabled={loading} className="btn btn-success">
                {loading ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
                <span>{loading ? 'Đang xác thực...' : 'Hoàn Tất Đăng Nhập'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
