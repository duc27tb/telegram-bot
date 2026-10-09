import React, { useState } from 'react';
import { ShieldCheck, Lock, User, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { loginAdmin } from '../lib/api';

export default function AdminLoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('admin@telepulse.io');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ tên tài khoản và mật khẩu quản trị.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const minSpin = new Promise(resolve => setTimeout(resolve, 500));
      const [res] = await Promise.all([
        loginAdmin(username, password),
        minSpin
      ]);

      if (res && res.success) {
        if (onLoginSuccess) {
          onLoginSuccess(res.admin);
        } else {
          navigate('/admin');
        }
      } else {
        setErrorMsg(res?.detail || 'Thông tin xác thực Quản trị viên không chính xác.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi kết nối tới máy chủ quản trị.');
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
      background: 'radial-gradient(circle at 50% 20%, #1e1b4b 0%, #0f172a 60%, #020617 100%)',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(239, 68, 68, 0.1)',
        borderRadius: '16px',
        padding: '36px 32px',
        backdropFilter: 'blur(16px)'
      }}>
        {/* Header Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(185, 28, 28, 0.4) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#ef4444',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <ShieldCheck size={36} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.5px' }}>
            TelePulse Admin Portal
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>
            Hệ Thống Quản Trị Trung Tâm (System Administrator)
          </p>
          <div style={{
            display: 'inline-block',
            marginTop: '8px',
            fontSize: '11px',
            fontWeight: '700',
            padding: '2px 10px',
            borderRadius: '999px',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            ROLE: ROOT ADMINISTRATOR
          </div>
        </div>

        {errorMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '20px',
            color: '#fca5a5',
            fontSize: '13px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
              Tài Khoản Quản Trị
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin@telepulse.io"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 40px',
                  background: 'rgba(2, 6, 23, 0.7)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
              Mật Khẩu Quản Trị (Master Key)
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '10px 42px 10px 40px',
                  background: 'rgba(2, 6, 23, 0.7)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
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
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              border: 'none',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
              transition: 'opacity 0.2s'
            }}
          >
            {loading ? <Loader2 size={18} className="spin" /> : <ShieldCheck size={18} />}
            <span>{loading ? 'Đang xác thực...' : 'Đăng Nhập Quản Trị'}</span>
          </button>
        </form>

        <div style={{
          marginTop: '24px',
          paddingTop: '20px',
          borderTop: '1px solid rgba(148, 163, 184, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: 0
            }}
          >
            <ArrowLeft size={14} />
            <span>Về ứng dụng người dùng</span>
          </button>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            v2.6.0 Secure RBAC
          </span>
        </div>
      </div>
    </div>
  );
}
