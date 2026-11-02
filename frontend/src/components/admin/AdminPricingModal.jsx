import React, { useState, useEffect } from 'react';
import { X, DollarSign, Users, Calendar, Check, AlertCircle, Loader2, Sparkles, Crown, Smartphone, Monitor } from 'lucide-react';
import { getAdminPricing, updateAdminPricing } from '../../lib/api';

const PLAN_TABS = [
  { key: 'vip', label: 'VIP Pro (Cloud)', icon: Crown, color: '#f59e0b' },
  { key: 'mobile_auto', label: 'Tự Động Bằng ĐT', icon: Smartphone, color: '#38bdf8' },
  { key: 'pc_lifetime', label: 'Tool Vĩnh Viễn PC', icon: Monitor, color: '#a855f7' }
];

const DEFAULT_FALLBACKS = {
  vip: { name: 'VIP Pro Marketing (Cloud)', price: 199000, max_accounts: 10, duration_days: 30 },
  mobile_auto: { name: 'Tự Động Toàn Diện Bằng Điện Thoại', price: 299000, max_accounts: 20, duration_days: 30 },
  pc_lifetime: { name: 'Tool Vĩnh Viễn (Cài Trên PC / Laptop)', price: 1490000, max_accounts: 100, duration_days: 36500 }
};

export default function AdminPricingModal({ isOpen, onClose, onSuccess, showToast, initialPlanKey = 'vip' }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allPlans, setAllPlans] = useState({});
  const [selectedKey, setSelectedKey] = useState(initialPlanKey || 'vip');
  const [price, setPrice] = useState(199000);
  const [maxAccounts, setMaxAccounts] = useState(10);
  const [durationDays, setDurationDays] = useState(30);
  const [planName, setPlanName] = useState('VIP Pro Marketing (Cloud)');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      const target = initialPlanKey || 'vip';
      setSelectedKey(target);
      loadCurrentPricing(target);
    }
  }, [isOpen, initialPlanKey]);

  const applyPlanToForm = (key, plansDict) => {
    const fallback = DEFAULT_FALLBACKS[key] || DEFAULT_FALLBACKS.vip;
    const p = (plansDict && plansDict[key]) || fallback;
    setPrice(p.price ?? fallback.price);
    setMaxAccounts(p.max_accounts ?? fallback.max_accounts);
    setDurationDays(p.duration_days ?? fallback.duration_days);
    setPlanName(p.name || fallback.name);
  };

  const loadCurrentPricing = async (targetKey = selectedKey) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await getAdminPricing();
      if (res && res.success && res.data) {
        setAllPlans(res.data);
        applyPlanToForm(targetKey, res.data);
      } else {
        applyPlanToForm(targetKey, DEFAULT_FALLBACKS);
      }
    } catch (err) {
      console.error('Lỗi tải bảng giá admin:', err);
      applyPlanToForm(targetKey, DEFAULT_FALLBACKS);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTab = (key) => {
    setSelectedKey(key);
    setErrorMsg('');
    applyPlanToForm(key, allPlans);
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
          plan_key: selectedKey,
          price: parseInt(price, 10),
          max_accounts: parseInt(maxAccounts, 10),
          duration_days: parseInt(durationDays, 10),
          name: planName
        }),
        minSpin
      ]);

      if (res && res.success) {
        const updatedPlans = { ...allPlans, [selectedKey]: res.data };
        setAllPlans(updatedPlans);
        if (showToast) {
          showToast({
            title: 'Đã cập nhật giá gói cước',
            message: `Đã lưu cấu hình gói "${planName}" (${parseInt(price, 10).toLocaleString('vi-VN')} ₫) thành công!`,
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
        maxWidth: '560px',
        width: '100%',
        background: 'var(--bg-card, #0f172a)',
        border: '1px solid var(--border-medium, rgba(148, 163, 184, 0.25))',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.7)'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
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
                Chỉnh Sửa Bảng Giá & Hạn Mức Các Gói
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                Chọn gói bên dưới để đổi tên, giá bán và giới hạn tài khoản
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

        {/* Plan Selector Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          marginBottom: '18px',
          background: 'rgba(15, 23, 42, 0.9)',
          padding: '6px',
          borderRadius: '12px',
          border: '1px solid rgba(148, 163, 184, 0.18)'
        }}>
          {PLAN_TABS.map((t) => {
            const Icon = t.icon;
            const active = selectedKey === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => handleSelectTab(t.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 8px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  border: active ? `1px solid ${t.color}` : '1px solid transparent',
                  background: active ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  color: active ? t.color : '#94a3b8',
                  transition: 'all 0.15s'
                }}
              >
                <Icon size={14} />
                <span>{t.label}</span>
              </button>
            );
          })}
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
                  Tên Hiển Thị Của Gói
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
                  Giá Bán (VNĐ)
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
                    step={1000}
                    required
                  />
                  <DollarSign size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Hiển thị trên web: <strong style={{ color: '#fbbf24' }}>{parseInt(price || 0, 10).toLocaleString('vi-VN')} ₫</strong>
                </div>
              </div>

              {/* Số tài khoản tối đa & Chu kỳ */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-main, #f8fafc)' }}>
                    Số Tài Khoản Telegram Tối Đa
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
                      max={999}
                      required
                    />
                    <Users size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-main, #f8fafc)' }}>
                    Thời Hạn Sử Dụng (Ngày)
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
                      max={36500}
                      required
                    />
                    <Calendar size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                    {parseInt(durationDays, 10) >= 3650 ? 'Mặc định hiển thị: Vĩnh viễn' : `${durationDays} ngày`}
                  </div>
                </div>
              </div>

              <div style={{
                background: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(37, 99, 235, 0.25)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '12px',
                color: 'var(--text-secondary, #cbd5e1)'
              }}>
                💡 Thay đổi giá và thông tin sẽ đồng bộ ngay lập tức lên Supabase Cloud và hiển thị tại trang Bảng Giá của khách hàng.
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
                    <span>Lưu Giá Gói Này</span>
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
