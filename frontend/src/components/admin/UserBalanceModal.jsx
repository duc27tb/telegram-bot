import React, { useState } from 'react';
import { X, Wallet, DollarSign, Check, AlertCircle, Loader2 } from 'lucide-react';
import { adjustUserBalance } from '../../lib/api';

export default function UserBalanceModal({ isOpen, user, onClose, onSuccess, showToast }) {
  const [amount, setAmount] = useState(50000);
  const [isDeduct, setIsDeduct] = useState(false);
  const [note, setNote] = useState('Hỗ trợ nạp tiền từ quản trị viên');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !user) return null;

  const handleAdjust = async (e) => {
    e.preventDefault();
    if (amount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền hợp lệ (> 0 ₫)');
      return;
    }

    const finalAmount = isDeduct ? -Math.abs(amount) : Math.abs(amount);
    setSaving(true);
    setErrorMsg('');

    try {
      const minSpin = new Promise(resolve => setTimeout(resolve, 600));
      const [res] = await Promise.all([
        adjustUserBalance(user.id, finalAmount, note),
        minSpin
      ]);

      if (res && res.success) {
        if (showToast) {
          showToast({
            title: 'Thành công',
            message: `Đã ${isDeduct ? 'trừ' : 'cộng'} ${amount.toLocaleString('vi-VN')} ₫ cho tài khoản ${user.email}!`,
            type: 'success'
          });
        }
        if (onSuccess) onSuccess(user.id, res.new_balance);
        onClose();
      } else {
        setErrorMsg(res?.detail || 'Không thể điều chỉnh số dư');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi điều chỉnh số dư');
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
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    }}>
      <div className="card" style={{
        maxWidth: '460px',
        width: '100%',
        background: 'var(--bg-card, #1e293b)',
        border: '1px solid var(--border-color, #334155)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Wallet size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text-main, #f8fafc)' }}>
                Điều Chỉnh Số Dư Ví
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                {user.email}
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
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleAdjust}>
          {/* Số dư hiện tại */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '12px 14px',
            borderRadius: '8px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Số dư hiện tại:</span>
            <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary, #38bdf8)' }}>
              {(user.balance || 0).toLocaleString('vi-VN')} ₫
            </span>
          </div>

          {/* Chọn Loại: Cộng tiền / Trừ tiền */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            <button
              type="button"
              className={`btn ${!isDeduct ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setIsDeduct(false)}
              style={{ fontSize: '13px' }}
            >
              + Cộng Tiền Ví
            </button>
            <button
              type="button"
              className={`btn ${isDeduct ? 'btn-danger' : 'btn-secondary'}`}
              onClick={() => setIsDeduct(true)}
              style={{
                fontSize: '13px',
                backgroundColor: isDeduct ? '#ef4444' : '',
                borderColor: isDeduct ? '#ef4444' : ''
              }}
            >
              - Trừ Tiền Ví
            </button>
          </div>

          {/* Nhập số tiền */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-main, #f8fafc)' }}>
              Số Tiền Điều Chỉnh (VNĐ)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                className="form-input input-field"
                value={amount}
                onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value || 0, 10)))}
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
                min={1000}
                step={10000}
                required
              />
              <DollarSign size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* Lý do / Ghi chú */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-main, #f8fafc)' }}>
              Lý Do Điều Chỉnh
            </label>
            <input
              type="text"
              className="form-input input-field"
              value={note}
              onChange={(e) => setNote(e.target.value)}
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

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={saving}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{
                backgroundColor: isDeduct ? '#ef4444' : '',
                borderColor: isDeduct ? '#ef4444' : '',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Xác Nhận {isDeduct ? 'Trừ' : 'Cộng'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
