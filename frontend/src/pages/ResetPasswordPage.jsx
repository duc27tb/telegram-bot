import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle, Loader2, Eye, EyeOff, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp!');
      return;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      await updatePassword(password);
      const elapsed = Date.now() - startTime;
      if (elapsed < 600) await new Promise(r => setTimeout(r, 600 - elapsed));
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2500);
    } catch (err) {
      const elapsed = Date.now() - startTime;
      if (elapsed < 400) await new Promise(r => setTimeout(r, 400 - elapsed));
      setError(err.message || 'Không thể cập nhật mật khẩu. Liên kết có thể đã hết hạn, vui lòng gửi lại yêu cầu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 15%, rgba(99, 102, 241, 0.15) 0%, #07090e 70%)',
      padding: '24px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-xl)',
        padding: '36px',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '14px',
            background: 'var(--accent-gradient)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 0 24px var(--primary-glow)',
            marginBottom: '16px'
          }}>
            <ShieldCheck size={28} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '6px', color: 'var(--text-main)' }}>
            Thiết Lập Mật Khẩu Mới
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Vui lòng nhập mật khẩu an toàn mới cho tài khoản TelePulse của bạn
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px',
            background: 'var(--danger-bg)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            fontSize: '13px',
            marginBottom: '20px'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--success)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>
              Đổi Mật Khẩu Thành Công!
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '20px' }}>
              Mật khẩu tài khoản đã được cập nhật an toàn. Hệ thống đang tự động đưa bạn vào Bảng điều khiển...
            </p>
            <Link to="/dashboard" className="btn btn-primary" style={{ width: '100%', textDecoration: 'none' }}>
              Vào Bảng Điều Khiển Ngay
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '13px' }}>Mật khẩu mới</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Tối thiểu 6 ký tự"
                  className="form-input"
                  style={{ paddingLeft: '40px', paddingRight: '42px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '11px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '13px' }}>Xác nhận mật khẩu mới</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập lại mật khẩu mới"
                  className="form-input"
                  style={{ paddingLeft: '40px' }}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', height: '44px', fontWeight: '700', marginTop: '10px' }}
            >
              {loading ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
              <span>Lưu Mật Khẩu Mới</span>
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Link
            to="/login"
            style={{
              color: 'var(--text-muted)',
              fontSize: '13px',
              textDecoration: 'none'
            }}
          >
            ← Quay lại màn hình đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
