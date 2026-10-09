import React, { useState } from 'react';
import { X, Crown, ShieldAlert, Check, AlertCircle, Loader2, Sparkles, UserCheck } from 'lucide-react';
import { updateUserSubscription } from '../../lib/api';

export default function UserSubscriptionModal({ isOpen, user, onClose, onSuccess, showToast }) {
  const [selectedTier, setSelectedTier] = useState('VIP');
  const [days, setDays] = useState(30);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !user) return null;

  const isCurrentVip = user.subscription_tier === 'VIP';

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    try {
      const minSpin = new Promise(resolve => setTimeout(resolve, 600));
      const [res] = await Promise.all([
        updateUserSubscription(user.id, selectedTier, selectedTier === 'VIP' ? days : 0),
        minSpin
      ]);

      if (res && res.success) {
        if (showToast) {
          showToast({
            title: 'Thành công',
            message: `Đã cập nhật gói cước của ${user.email} thành ${selectedTier === 'VIP' ? `VIP Pro (${days} ngày)` : 'Gói Miễn Phí (Free)'}!`,
            type: 'success'
          });
        }
        if (onSuccess) onSuccess(user.id, res.tier, res.expires_at);
        onClose();
      } else {
        setErrorMsg(res?.detail || 'Không thể cập nhật gói cước');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi cập nhật gói cước');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.78)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    }}>
      <div className="card" style={{
        maxWidth: '480px',
        width: '100%',
        background: '#0f172a',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.7)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)'
            }}>
              <Crown size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#f8fafc' }}>
                Phân Quyền & Gói Cước
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                {user.email} ({user.full_name || 'Khách hàng'})
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px', borderRadius: '8px' }}
          >
            <X size={16} />
          </button>
        </div>

        {errorMsg && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleUpdate}>
          {/* Trạng thái hiện tại */}
          <div style={{
            padding: '12px 16px',
            background: 'rgba(30, 41, 59, 0.7)',
            borderRadius: '10px',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Gói cước hiện tại:</span>
            <span style={{
              fontSize: '12px',
              fontWeight: '800',
              padding: '4px 10px',
              borderRadius: '6px',
              background: isCurrentVip ? 'rgba(245, 158, 11, 0.2)' : 'rgba(148, 163, 184, 0.2)',
              color: isCurrentVip ? '#fbbf24' : '#cbd5e1',
              border: isCurrentVip ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(148, 163, 184, 0.3)'
            }}>
              {isCurrentVip ? '★ VIP Pro Marketing' : 'Free Tier (Miễn Phí)'}
            </span>
          </div>

          {/* Chọn gói muốn cấp */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', display: 'block', marginBottom: '8px' }}>
              Chọn Gói Cước Cần Thiết Lập:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setSelectedTier('VIP')}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: selectedTier === 'VIP' ? '2px solid #f59e0b' : '1px solid #334155',
                  background: selectedTier === 'VIP' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(30, 41, 59, 0.5)',
                  color: selectedTier === 'VIP' ? '#fbbf24' : '#94a3b8',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Crown size={20} />
                <span>Cấp VIP Pro</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTier('FREE')}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: selectedTier === 'FREE' ? '2px solid #94a3b8' : '1px solid #334155',
                  background: selectedTier === 'FREE' ? 'rgba(148, 163, 184, 0.15)' : 'rgba(30, 41, 59, 0.5)',
                  color: selectedTier === 'FREE' ? '#f8fafc' : '#94a3b8',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <UserCheck size={20} />
                <span>Đưa Về Gói Free</span>
              </button>
            </div>
          </div>

          {/* Nếu chọn VIP: Cho chọn số ngày */}
          {selectedTier === 'VIP' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', display: 'block', marginBottom: '8px' }}>
                Thời Gian Hiệu Lực:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { label: '30 Ngày', val: 30 },
                  { label: '60 Ngày', val: 60 },
                  { label: '90 Ngày', val: 90 },
                  { label: '1 Năm', val: 365 }
                ].map(item => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setDays(item.val)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      border: days === item.val ? '1px solid #f59e0b' : '1px solid #334155',
                      background: days === item.val ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                      color: days === item.val ? '#fbbf24' : '#cbd5e1',
                      cursor: 'pointer'
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="btn btn-secondary"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{
                background: selectedTier === 'VIP' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--primary)',
                border: 'none',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {saving ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
              <span>{saving ? 'Đang lưu...' : 'Xác Nhận Cập Nhật'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
