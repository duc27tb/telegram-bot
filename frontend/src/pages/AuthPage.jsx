import React, { useState, useEffect } from 'react';
import { Bot, Mail, Lock, ArrowRight, AlertCircle, Loader2, Eye, EyeOff, ShieldAlert, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

export default function AuthPage({ defaultMode = 'login', onBackToLanding }) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, isConfigured } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Mode: 'login' | 'register' | 'forgot'
  const [authMode, setAuthMode] = useState(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam === 'register') return 'register';
    if (modeParam === 'forgot') return 'forgot';
    return defaultMode || 'login';
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam && ['login', 'register', 'forgot'].includes(modeParam)) {
      setAuthMode(modeParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    const startTime = Date.now();

    try {
      if (authMode === 'register') {
        await signUpWithEmail(email, password);
        // Đảm bảo visual feedback mượt mà tối thiểu 600ms
        const elapsed = Date.now() - startTime;
        if (elapsed < 600) await new Promise(r => setTimeout(r, 600 - elapsed));
        setSuccessMessage('Đăng ký tài khoản thành công! Hãy kiểm tra hộp thư email để xác thực tài khoản nếu có yêu cầu.');
      } else if (authMode === 'login') {
        await signInWithEmail(email, password);
        const elapsed = Date.now() - startTime;
        if (elapsed < 600) await new Promise(r => setTimeout(r, 600 - elapsed));
        navigate('/dashboard');
      } else if (authMode === 'forgot') {
        await resetPassword(email);
        const elapsed = Date.now() - startTime;
        if (elapsed < 600) await new Promise(r => setTimeout(r, 600 - elapsed));
        setSuccessMessage('Đã gửi liên kết khôi phục mật khẩu tới email của bạn! Vui lòng kiểm tra hộp thư (cả mục Spam) và nhấp vào liên kết để đổi mật khẩu.');
      }
    } catch (err) {
      const elapsed = Date.now() - startTime;
      if (elapsed < 400) await new Promise(r => setTimeout(r, 400 - elapsed));
      setError(err.message || 'Lỗi xác thực người dùng. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Lỗi đăng nhập Google');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 15%, rgba(99, 102, 241, 0.15) 0%, #07090e 70%)',
      padding: '24px',
      position: 'relative'
    }}>
      {/* Nút quay về trang chủ */}
      <div style={{
        position: 'absolute',
        top: '24px',
        left: '24px',
        zIndex: 10
      }}>
        {onBackToLanding ? (
          <button
            type="button"
            onClick={onBackToLanding}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <ArrowLeft size={16} />
            <span>Trang Chủ TelePulse</span>
          </button>
        ) : (
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: '500',
              textDecoration: 'none',
              transition: 'all 0.15s'
            }}
          >
            <ArrowLeft size={16} />
            <span>Trang Chủ TelePulse</span>
          </Link>
        )}
      </div>

      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-xl)',
        padding: '36px',
        boxShadow: 'var(--shadow-lg)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'var(--accent-gradient)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 0 24px var(--primary-glow)',
            marginBottom: '14px'
          }}>
            {authMode === 'forgot' ? <KeyRound size={26} /> : <Bot size={28} />}
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '6px', color: 'var(--text-main)' }}>
            {authMode === 'register' && 'Đăng Ký Tài Khoản Mới'}
            {authMode === 'login' && 'Chào Mừng Đến TelePulse'}
            {authMode === 'forgot' && 'Khôi Phục Mật Khẩu'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {authMode === 'register' && 'Khởi tạo tài khoản chỉ trong 30 giây để bắt đầu'}
            {authMode === 'login' && 'Hệ thống điều khiển & tự động hóa tiếp thị Telegram Bot'}
            {authMode === 'forgot' && 'Nhập email để nhận liên kết khôi phục mật khẩu tài khoản'}
          </p>
        </div>

        {!isConfigured && (
          <div style={{
            background: 'var(--warning-bg)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            fontSize: '12px',
            color: '#fbbf24',
            marginBottom: '20px'
          }}>
            ⚠️ Chưa phát hiện cấu hình Supabase trong frontend/.env. Vui lòng cấu hình VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY.
          </div>
        )}

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

        {successMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '14px',
            background: 'var(--success-bg)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#6ee7b7',
            fontSize: '13px',
            lineHeight: '1.5',
            marginBottom: '20px'
          }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{successMessage}</div>
          </div>
        )}

        {/* Nút Đăng nhập bằng Google (Chỉ hiện khi login hoặc register) */}
        {authMode !== 'forgot' && (
          <>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="btn btn-secondary"
              style={{
                width: '100%',
                height: '44px',
                gap: '10px',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '18px'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Tiếp tục với Google</span>
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '18px 0',
              color: 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: '600'
            }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              <span>HOẶC BẰNG EMAIL</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            </div>
          </>
        )}

        {/* Form Email / Password */}
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label" style={{ fontSize: '13px' }}>Địa chỉ Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }} />
              <input
                type="email"
                placeholder="name@example.com"
                className="form-input"
                style={{ paddingLeft: '40px' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {authMode !== 'forgot' && (
            <div className="form-group" style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ fontSize: '13px', margin: 0 }}>Mật khẩu</label>
                {authMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setAuthMode('forgot'); setError(''); setSuccessMessage(''); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary-light)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Quên mật khẩu?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
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
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', height: '44px', marginTop: '16px', fontWeight: '700' }}
          >
            {loading ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
            <span>
              {authMode === 'register' && 'Tạo Tài Khoản Mới'}
              {authMode === 'login' && 'Đăng Nhập'}
              {authMode === 'forgot' && 'Gửi Liên Kết Khôi Phục'}
            </span>
          </button>
        </form>

        {/* Footer chuyển đổi qua lại giữa các màn hình */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          {authMode === 'forgot' ? (
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setError(''); setSuccessMessage(''); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-light)',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ArrowLeft size={14} />
              <span>Quay lại trang Đăng nhập</span>
            </button>
          ) : authMode === 'register' ? (
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setError(''); setSuccessMessage(''); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Đã có tài khoản? <strong style={{ color: 'var(--primary-light)' }}>Đăng nhập ngay</strong>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setError(''); setSuccessMessage(''); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Chưa có tài khoản? <strong style={{ color: 'var(--primary-light)' }}>Đăng ký miễn phí</strong>
            </button>
          )}
        </div>

        {/* Link Cổng Quản Trị Viên */}
        <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <a
            href="/admin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              transition: 'color 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <ShieldAlert size={14} color="#ef4444" />
            <span>Cổng Đăng Nhập Quản Trị Viên (/admin) →</span>
          </a>
        </div>
      </div>
    </div>
  );
}
