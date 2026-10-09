import React, { useState, useEffect } from 'react';
import { User, Shield, Check, Save, Bell, Database, Crown, Lock, Send, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { supabase } from '../lib/supabase';
import { testTelegramAlert } from '../lib/api';

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { showToast } = useNotification();
  const [adminUsername, setAdminUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);
  const navigate = useNavigate();

  const isVip = profile?.subscription_tier === 'VIP';

  useEffect(() => {
    if (profile) {
      setAdminUsername(isVip ? (profile.telegram_admin_username || '') : '');
      setFullName(profile.full_name || '');
    }
  }, [profile, isVip]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const cleanUsername = adminUsername.trim().replace('@', '');
      const updatePayload = {
        full_name: fullName.trim(),
        updated_at: 'now()'
      };

      // Chỉ tài khoản VIP mới được phép lưu telegram_admin_username
      if (isVip) {
        updatePayload.telegram_admin_username = cleanUsername;
      }

      await supabase.from('profiles').update(updatePayload).eq('id', user.id);

      refreshProfile();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      alert('Lỗi lưu cấu hình hồ sơ');
    } finally {
      setSaving(false);
    }
  };

  const handleTestAlert = async () => {
    const cleanUser = adminUsername.trim().replace(/^@/, '');
    if (!cleanUser) {
      showToast({ title: 'Cảnh báo', message: 'Vui lòng nhập Telegram Username trước khi thử nghiệm!', type: 'warning' });
      return;
    }
    setTestingAlert(true);
    const start = Date.now();
    try {
      const res = await testTelegramAlert(user.id, cleanUser);
      const elapsed = Date.now() - start;
      if (elapsed < 600) await new Promise(r => setTimeout(r, 600 - elapsed));
      if (res.success) {
        showToast({
          title: 'Thành Công',
          message: res.detail || `Đã gửi thông báo thử nghiệm tới Telegram @${cleanUser}!`,
          type: 'success'
        });
      } else {
        showToast({
          title: 'Chưa Gửi Được',
          message: res.error || 'Vui lòng kiểm tra lại username hoặc chat_id Telegram.',
          type: 'warning'
        });
      }
    } catch (err) {
      showToast({ title: 'Lỗi', message: 'Không thể kết nối máy chủ backend!', type: 'error' });
    } finally {
      setTestingAlert(false);
    }
  };

  return (
    <div className="page-body">
      <div className="mobile-only" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Cài Đặt Hồ Sơ & Thông Báo</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
          Cấu hình tài khoản cá nhân và chỉ định Telegram nhận tin báo cáo
        </p>
      </div>

      <div style={{ maxWidth: '640px' }}>
        <div className="card">
          <form onSubmit={handleSaveProfile}>
            <div className="form-group">
              <label className="form-label">Email tài khoản</label>
              <input
                type="text"
                disabled
                className="form-input"
                value={user?.email || ''}
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tên hiển thị</label>
              <input
                type="text"
                className="form-input"
                placeholder="Nhập họ và tên..."
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            {/* Tính năng chỉ dành riêng cho tài khoản VIP */}
            <div className="form-group" style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '20px',
              marginTop: '20px',
              opacity: isVip ? 1 : 0.85
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Bell size={16} color="var(--primary-light)" />
                  <span>Username Telegram Admin Nhận Báo Cáo</span>
                </label>

                {isVip ? (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Crown size={12} /> ĐÃ KÍCH HOẠT VIP
                  </span>
                ) : (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Lock size={12} /> ĐẶC QUYỀN VIP
                  </span>
                )}
              </div>

              <div className="input-with-prefix">
                <span className="input-prefix">@</span>
                <input
                  type="text"
                  placeholder={isVip ? "Lxpzalo" : "Chỉ khả dụng trên gói VIP"}
                  className="form-input"
                  style={{
                    paddingLeft: '32px',
                    cursor: isVip ? 'text' : 'not-allowed',
                    background: isVip ? 'inherit' : 'rgba(15, 23, 42, 0.5)'
                  }}
                  value={isVip ? adminUsername : ''}
                  disabled={!isVip}
                  onChange={(e) => isVip && setAdminUsername(e.target.value.replace(/^@/, ''))}
                />
              </div>

              {isVip ? (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', flex: 1, minWidth: '220px' }}>
                    Khi có nạp tiền VietQR, nâng cấp VIP hoặc hoàn tất rải tin, bot sẽ gửi thông báo tự động về Telegram này.
                  </span>
                  {adminUsername && (
                    <button
                      type="button"
                      onClick={handleTestAlert}
                      disabled={testingAlert}
                      className="btn btn-secondary"
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        borderRadius: '6px'
                      }}
                    >
                      {testingAlert ? <Loader2 size={13} className="spin" /> : <Send size={13} />}
                      <span>{testingAlert ? 'Đang gửi...' : 'Gửi thử thông báo'}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div style={{
                  marginTop: '10px',
                  padding: '10px 14px',
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.06) 100%)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ fontSize: '12px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Crown size={15} style={{ flexShrink: 0 }} />
                    <span>Tài khoản của bạn là <strong>Gói Miễn Phí (Free)</strong>. Nâng cấp VIP để bật tính năng chuyển tiếp báo cáo về Telegram cá nhân!</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/pricing')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      border: 'none',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                    }}
                  >
                    ⭐ Lên VIP Ngay (199K)
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="submit" disabled={saving} className="btn btn-primary">
                {savedSuccess ? <Check size={16} /> : <Save size={16} />}
                <span>{savedSuccess ? 'Đã Lưu Thay Đổi!' : 'Lưu Thay Đổi'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
