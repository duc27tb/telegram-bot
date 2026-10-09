import React, { useState, useEffect } from 'react';
import { X, Tag, DollarSign, Users, Calendar, Check, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { getAdminPricing, updateAdminPricing } from '../../lib/api';

export default function AdminPricingModal({ isOpen, onClose, onSuccess, showToast }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [price, setPrice] = useState(199000);
  const [maxAccounts, setMaxAccounts] = useState(10);
  const [durationDays, setDurationDays] = useState(30);
  const [planName, setPlanName] = useState('VIP Pro (Doanh Nghiệp / Marketer)');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCurrentPricing();
    }
  }, [isOpen]);

  const loadCurrentPricing = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await getAdminPricing();
      if (res && res.success && res.data && res.data.vip) {
        const vip = res.data.vip;
        setPrice(vip.price || 199000);
        setMaxAccounts(vip.max_accounts || 10);
        setDurationDays(vip.duration_days || 30);
        if (vip.name) setPlanName(vip.name);
      }
    } catch (err) {
      console.error('Lỗi tải bảng giá admin:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (price <= 0) {
      setErrorMsg('Giá gói cước phải lớn hơn 0 ₫');
      return;
    }
    if (maxAccounts <= 0) {
      setErrorMsg('Số tài khoản tối đa phải ít nhất là 1');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      const minSpin = new Promise(resolve => setTimeout(resolve, 600));
      const [res] = await Promise.all([
        updateAdminPricing({
          price: parseInt(price, 10),
          max_accounts: parseInt(maxAccounts, 10),
          duration_days: parseInt(durationDays, 10),
          name: planName
        }),
        minSpin
      ]);

      if (res && res.success) {
        if (showToast) {
          showToast({
            title: 'Thành công',
            message: 'Đã cập nhật bảng giá và hạn mức gói VIP Pro thành công!',
            type: 'success'
          });
        }
        if (onSuccess) onSuccess(res.data);
        onClose();
      } else {
        setErrorMsg(res?.detail || 'Không thể lưu cấu hình bảng giá');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Đã xảy ra lỗi khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    }}>
      <div className="card" style={{
        maxWidth: '520px',
        width: '100%',
        background: 'var(--bg-card, #0f172a)',
        border: '1px solid var(--border-medium, rgba(148, 163, 184, 0.25))',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.7)'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
            }}>
              <Sparkles size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-main, #f8fafc)' }}>
                Cấu Hình Bảng Giá & Hạn Mức VIP
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                Thiết lập giá cước và hạn mức tài khoản gói VIP Pro
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px', borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            marginBottom: '16px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '8px',
            color: '#f87171',
            fontSize: '13px'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={32} className="spin" color="var(--primary)" style={{ margin: '0 auto 12px' }} />
            <div>Đang tải cấu hình bảng giá...</div>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Tên gói */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-main, #f8fafc)' }}>
                  Tên Gói Dịch Vụ
                </label>
                <input
                  type="text"
                  className="form-input input-field"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    background: 'var(--bg-input, rgba(15, 23, 42, 0.8))',
                    border: '1px solid var(--border-medium, rgba(148, 163, 184, 0.25))',
                    borderRadius: '10px',
                    color: 'var(--text-main, #f8fafc)',
                    fontSize: '14px'
                  }}
                  required
                />
              </div>

              {/* Giá cước */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-main, #f8fafc)' }}>
                  Giá Gói Cước (VNĐ / Chu kỳ)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    className="form-input input-field"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 40px',
                      fontWeight: '700',
                      background: 'var(--bg-input, rgba(15, 23, 42, 0.8))',
                      border: '1px solid var(--border-medium, rgba(148, 163, 184, 0.25))',
                      borderRadius: '10px',
                      color: 'var(--text-main, #f8fafc)',
                      fontSize: '15px'
                    }}
                    min={10000}
                    step={10000}
                    required
                  />
                  <DollarSign size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Tương đương: <strong style={{ color: '#fbbf24' }}>{parseInt(price || 0, 10).toLocaleString('vi-VN')} ₫</strong>
                </div>
              </div>

              {/* Số tài khoản tối đa & Chu kỳ */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-main, #f8fafc)' }}>
                    Tài Khoản Tối Đa
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      className="form-input input-field"
                      value={maxAccounts}
                      onChange={(e) => setMaxAccounts(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 14px 11px 40px',
                        fontWeight: '700',
                        background: 'var(--bg-input, rgba(15, 23, 42, 0.8))',
                        border: '1px solid var(--border-medium, rgba(148, 163, 184, 0.25))',
                        borderRadius: '10px',
                        color: 'var(--text-main, #f8fafc)',
                        fontSize: '14px'
                      }}
                      min={1}
                      max={100}
                      required
                    />
                    <Users size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-main, #f8fafc)' }}>
                    Thời Hạn (Ngày)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      className="form-input input-field"
                      value={durationDays}
                      onChange={(e) => setDurationDays(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 14px 11px 40px',
                        fontWeight: '700',
                        background: 'var(--bg-input, rgba(15, 23, 42, 0.8))',
                        border: '1px solid var(--border-medium, rgba(148, 163, 184, 0.25))',
                        borderRadius: '10px',
                        color: 'var(--text-main, #f8fafc)',
                        fontSize: '14px'
                      }}
                      min={1}
                      max={365}
                      required
                    />
                    <Calendar size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  </div>
                </div>
              </div>

              {/* Box ghi chú nghiệp vụ */}
              <div style={{
                background: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(37, 99, 235, 0.25)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '12px',
                color: 'var(--text-secondary, #cbd5e1)'
              }}>
                💡 Thay đổi mức giá sẽ có hiệu lực ngay lập tức trên trang Nâng cấp VIP của khách hàng và bảng giá công khai.
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={saving}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Lưu Cấu Hình</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
