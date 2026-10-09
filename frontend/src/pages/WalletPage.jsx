import React, { useState, useEffect, useRef } from 'react';
import {
  Wallet,
  CreditCard,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Zap,
  Sparkles,
  History,
  QrCode,
  X,
  Crown
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { createDeposit, checkDepositStatus, getWalletInfo, upgradeVipPlan } from '../lib/api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import VipUpgradeModal from '../components/common/VipUpgradeModal';

const PRESET_AMOUNTS = [
  { label: '10.000 ₫', value: 10000 },
  { label: '20.000 ₫', value: 20000 },
  { label: '50.000 ₫', value: 50000 },
  { label: '100.000 ₫', value: 100000 },
  { label: '200.000 ₫', value: 200000 },
  { label: '500.000 ₫', value: 500000 },
];

export default function WalletPage() {
  const { user, profile, refreshProfile, updateProfileLocally } = useAuth();
  const { showToast, addNotification } = useNotification();
  const location = useLocation();

  const [amount, setAmount] = useState(50000);
  const [customAmountText, setCustomAmountText] = useState('50,000');
  const [loading, setLoading] = useState(false);
  const [activeDeposit, setActiveDeposit] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [successAmount, setSuccessAmount] = useState(0);
  const [copiedField, setCopiedField] = useState(null);

  // Auto-close countdown cho modal thành công (5s)
  const [autoCloseCountdown, setAutoCloseCountdown] = useState(5);
  const autoCloseRef = useRef(null);

  // Lịch sử giao dịch
  const [transactions, setTransactions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [upgradingVip, setUpgradingVip] = useState(false);
  const [showConfirmVipModal, setShowConfirmVipModal] = useState(false);

  const handlePromptUpgradeVip = () => {
    if (!user) return;
    setShowConfirmVipModal(true);
  };

  useEffect(() => {
    if (location.state?.depositAmount) {
      const depAmt = Math.max(10000, location.state.depositAmount);
      setAmount(depAmt);
      setCustomAmountText(depAmt.toLocaleString('vi-VN'));
      window.scrollTo({ top: 300, behavior: 'smooth' });
    }
  }, [location.state]);

  const handleExecuteUpgradeVip = async () => {
    if (!user) return;
    setUpgradingVip(true);
    try {
      const minSpin = new Promise(resolve => setTimeout(resolve, 600));
      const [res] = await Promise.all([
        upgradeVipPlan(user.id),
        minSpin
      ]);

      if (res && res.success) {
        if (updateProfileLocally && res.data) {
          updateProfileLocally({
            balance: res.data.new_balance,
            subscription_tier: 'VIP',
            tier_expires_at: res.data.tier_expires_at
          });
        }
        await Promise.all([refreshProfile(), fetchHistory()]);
        setShowConfirmVipModal(false);
        addNotification({
          title: '👑 Nâng Cấp VIP Pro',
          message: res.data?.message || 'Nâng cấp gói VIP Pro 30 ngày thành công!',
          type: 'success'
        });
      } else {
        alert(res?.error || 'Không thể nâng cấp gói VIP Pro. Vui lòng thử lại sau.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối máy chủ khi nâng cấp gói.');
    } finally {
      setUpgradingVip(false);
    }
  };

  // Timer đếm ngược (15 phút = 900s)
  const [timeLeft, setTimeLeft] = useState(900);
  const pollingRef = useRef(null);
  const timerRef = useRef(null);

  // Helper lấy URL ảnh QR thuần túy (không dính text/logo ngoài)
  const getPureQrUrl = (deposit) => {
    if (!deposit) return '';
    if (deposit.vietqr_image_url) {
      return deposit.vietqr_image_url
        .replace('-compact2.png', '-qr_only.png')
        .replace('-compact.png', '-qr_only.png');
    }
    const bin = deposit.bank_bin || '970422';
    const accNum = deposit.bank_account_number || '0869098696';
    const name = encodeURIComponent(deposit.bank_account_name || 'TRAN NGOC DUC');
    return `https://img.vietqr.io/image/${bin}-${accNum}-qr_only.png?amount=${deposit.amount}&addInfo=${encodeURIComponent(deposit.description)}&accountName=${name}`;
  };

  // Load lịch sử giao dịch ban đầu (hỗ trợ minSpin 600ms khi bấm làm mới thủ công để thấy icon xoay mượt mà)
  const fetchHistory = async (isManual = false) => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const minSpin = isManual ? new Promise(resolve => setTimeout(resolve, 600)) : Promise.resolve();
      const [res] = await Promise.all([
        getWalletInfo(user.id),
        minSpin
      ]);
      if (res && res.success && res.data) {
        setTransactions(res.data.transactions || []);
      }
    } catch (err) {
      console.error('Lỗi tải lịch sử ví:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  // Lắng nghe Supabase Realtime cho bảng deposit_transactions và profiles
  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;

    const channel = supabase
      .channel(`wallet_realtime_${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'deposit_transactions',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const updatedTx = payload.new;
        if (updatedTx) {
          // Nếu đơn hàng đang mở chuyển sang PAID
          if (activeDeposit && updatedTx.order_code === activeDeposit.order_code && updatedTx.status === 'PAID') {
            handlePaymentComplete(updatedTx.amount);
          }
          fetchHistory();
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`
      }, () => {
        refreshProfile();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeDeposit]);

  // Polling fallback kiểm tra trạng thái đơn nạp mỗi 3s kèm đếm ngược 15 phút (900s)
  useEffect(() => {
    if (!activeDeposit || paymentSuccess) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Tính thời gian còn lại (tối đa 15 phút = 900 giây)
    let initialSeconds = 900;
    if (activeDeposit.created_at) {
      const elapsed = Math.floor((Date.now() - new Date(activeDeposit.created_at).getTime()) / 1000);
      initialSeconds = Math.max(0, 900 - elapsed);
    }
    setTimeLeft(initialSeconds);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await checkDepositStatus(activeDeposit.order_code);
        if (res && res.success && res.data) {
          if (res.data.status === 'PAID') {
            handlePaymentComplete(res.data.amount || activeDeposit.amount);
          }
        }
      } catch (e) {
        console.error('Lỗi polling trạng thái thanh toán:', e);
      }
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeDeposit, paymentSuccess]);

  // Mở lại mã QR từ đơn chờ trong lịch sử
  const handleResumeDeposit = (tx) => {
    const createdAt = tx.created_at ? new Date(tx.created_at).getTime() : Date.now();
    const elapsed = Math.floor((Date.now() - createdAt) / 1000);
    const remaining = Math.max(0, 900 - elapsed);

    if (remaining <= 0) {
      alert('Giao dịch này đã quá thời hạn 15 phút. Vui lòng tạo mã nạp mới!');
      fetchHistory();
      return;
    }

    setTimeLeft(remaining);
    setActiveDeposit({
      order_code: tx.order_code,
      amount: tx.amount,
      description: tx.description,
      bank_account_number: tx.bank_account_number || '0869098696',
      bank_account_name: tx.bank_account_name || 'TRAN NGOC DUC',
      bank_bin: tx.bank_bin || '970422',
      qr_code: tx.qr_code,
      qr_code_raw: tx.qr_code,
      vietqr_image_url: tx.vietqr_image_url,
      created_at: tx.created_at,
      status: tx.status
    });
    setPaymentSuccess(false);
  };

  const handleCloseModal = () => {
    if (autoCloseRef.current) clearInterval(autoCloseRef.current);
    setActiveDeposit(null);
    setPaymentSuccess(false);
  };

  // Tự động đóng modal nạp tiền thành công sau 5 giây kèm thanh tiến trình
  useEffect(() => {
    if (!paymentSuccess) {
      if (autoCloseRef.current) clearInterval(autoCloseRef.current);
      return;
    }

    setAutoCloseCountdown(5);
    const startTime = Date.now();
    const duration = 5000;

    autoCloseRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingSec = Math.max(0, Math.ceil((duration - elapsed) / 1000));
      setAutoCloseCountdown(remainingSec);

      if (elapsed >= duration) {
        clearInterval(autoCloseRef.current);
        setActiveDeposit(null);
        setPaymentSuccess(false);
      }
    }, 100);

    return () => {
      if (autoCloseRef.current) clearInterval(autoCloseRef.current);
    };
  }, [paymentSuccess]);

  const handlePaymentComplete = (paidAmount) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    setSuccessAmount(paidAmount);
    setPaymentSuccess(true);
    setAutoCloseCountdown(5);
    refreshProfile();
    fetchHistory();
    addNotification({
      title: '💰 Nạp Tiền Thành Công',
      message: `Đã nạp thành công +${paidAmount.toLocaleString('vi-VN')} ₫ vào tài khoản qua VietQR MBBank.`,
      type: 'success'
    });
  };

  // Xử lý chọn số tiền định sẵn
  const handleSelectPreset = (val) => {
    setAmount(val);
    setCustomAmountText(val.toLocaleString('vi-VN'));
  };

  // Xử lý nhập số tiền tùy chỉnh
  const handleCustomAmountChange = (e) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    if (!rawVal) {
      setCustomAmountText('');
      setAmount(0);
      return;
    }
    const num = parseInt(rawVal, 10);
    setAmount(num);
    setCustomAmountText(num.toLocaleString('vi-VN'));
  };

  // Bấm tạo mã QR nạp tiền
  const handleCreateDeposit = async () => {
    if (!user) return;
    if (amount < 10000) {
      alert('Số tiền nạp tối thiểu là 10.000 VNĐ');
      return;
    }

    setLoading(true);
    try {
      const res = await createDeposit(user.id, amount);
      if (res && res.success && res.data) {
        setActiveDeposit(res.data);
        setPaymentSuccess(false);
        fetchHistory();
      } else {
        alert(res?.detail || 'Không thể tạo đơn nạp tiền. Vui lòng thử lại sau.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối máy chủ khi tạo mã nạp tiền.');
    } finally {
      setLoading(false);
    }
  };

  // Copy thông tin vào clipboard
  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentBalance = profile?.balance || 0;

  return (
    <div className="page-body wallet-page-container">
      {/* 1. Header Banner & Card Số Dư Tổng Quan */}
      <div className="wallet-hero-grid">
        {/* Card số dư chính */}
        <div className="wallet-balance-card">
          <div className="wallet-balance-bg-glow" />

          <div className="wallet-card-header">
            <div className="wallet-badge">
              <Sparkles size={14} />
              <span>Số Dư Tài Khoản</span>
            </div>
            <div className="wallet-live-badge">
              <span className="live-dot" />
              <strong style={{ fontWeight: 700 }}>Tự động 24/7</strong>
            </div>
          </div>

          <div className="wallet-balance-amount">
            <span className="balance-number">{currentBalance.toLocaleString('vi-VN')}</span>
            <span className="balance-currency">₫</span>
          </div>

          <div className="wallet-card-footer">
            <div className="wallet-feature-item">
              <Zap size={14} color="var(--primary-light)" />
              <span>Cộng tiền tức thì sau 3-5 giây</span>
            </div>
            <div className="wallet-feature-item">
              <ShieldCheck size={14} color="var(--success)" />
              <span>Xác thực chuẩn OpenBanking MBBank</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="wallet-stats-column">
          <div className="wallet-sub-stat">
            <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
              <ArrowUpRight size={22} color="var(--success)" />
            </div>
            <div>
              <div className="stat-label">Tổng nạp thành công</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>
                {transactions
                  .filter(t => t.status === 'PAID')
                  .reduce((acc, t) => acc + (t.amount || 0), 0)
                  .toLocaleString('vi-VN')} ₫
              </div>
            </div>
          </div>

          <div className="wallet-sub-stat">
            <div className="stat-icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.2)' }}>
              <History size={22} color="var(--primary-light)" />
            </div>
            <div>
              <div className="stat-label">Số lần giao dịch</div>
              <div className="stat-value">{transactions.length} đơn</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Khu Vực Nhập Số Tiền Nạp */}
      <div className="card wallet-deposit-box">
        <div className="deposit-box-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="deposit-icon-badge">
              <QrCode size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Nạp Tiền Bằng Mã QR VietQR</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                Quét mã QR từ bất kỳ ứng dụng ngân hàng nào (MBBank, Vietcombank, Techcombank, VPBank,...)
              </p>
            </div>
          </div>
        </div>

        {/* Các mốc nạp nhanh */}
        <div className="deposit-presets-label">Chọn nhanh số tiền:</div>
        <div className="deposit-presets-grid">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className={`preset-btn ${amount === preset.value ? 'selected' : ''}`}
              onClick={() => handleSelectPreset(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Ô nhập tùy chỉnh */}
        <div className="deposit-custom-input-wrapper">
          <label className="input-label">Hoặc nhập số tiền tùy chọn (VNĐ):</label>
          <div className="custom-input-field">
            <input
              type="text"
              value={customAmountText}
              onChange={handleCustomAmountChange}
              placeholder="Ví dụ: 50,000"
              className="deposit-input"
            />
            <span className="currency-suffix">VNĐ</span>
          </div>
          {amount < 10000 && amount > 0 && (
            <div className="deposit-warning-hint" style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '12px' }}>
              <AlertCircle size={14} /> Số tiền nạp tối thiểu là 10.000 ₫
            </div>
          )}
        </div>

        {/* Nút sinh mã QR */}
        <div style={{ marginTop: '24px' }}>
          <button
            type="button"
            className="btn btn-primary btn-deposit-submit"
            onClick={handleCreateDeposit}
            disabled={loading || amount < 10000}
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="spin" />
                <span>Đang tạo mã QR VietQR...</span>
              </>
            ) : (
              <>
                <QrCode size={18} />
                <span>Tạo Mã QR Nạp {amount > 0 ? `${amount.toLocaleString('vi-VN')} ₫` : ''}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. MODAL HIỂN THỊ MÃ QR NẠP TIỀN */}
      {activeDeposit && (
        <div className="modal-overlay">
          <div className="modal-content wallet-qr-modal">
            {/* Header Modal */}
            <div className="wallet-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="modal-qr-icon">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700' }}>Quét Mã QR VietQR</h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Đơn hàng #{activeDeposit.order_code}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCloseModal}
              >
                <X size={18} />
              </button>
            </div>

            {/* Nội dung Modal: Đang thanh toán hoặc Thành công */}
            {paymentSuccess ? (
              <div className="payment-success-card">
                <div className="success-icon-pulse">
                  <CheckCircle2 size={54} color="var(--success)" />
                </div>
                <h3 className="success-title">Nạp Tiền Thành Công!</h3>
                <div className="success-amount">
                  +{(successAmount || activeDeposit.amount).toLocaleString('vi-VN')} ₫
                </div>
                <p className="success-subtitle">
                  Số dư của bạn đã được cập nhật ngay lập tức. Cảm ơn bạn đã sử dụng dịch vụ!
                </p>

                {/* Thanh tiến trình đếm ngược 5 giây tự động đóng */}
                <div style={{ marginTop: '20px', marginBottom: '8px', textAlign: 'left' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    marginBottom: '6px'
                  }}>
                    <span>Tự động đóng cửa sổ</span>
                    <strong style={{ color: 'var(--primary-light)', fontFamily: 'monospace' }}>
                      {autoCloseCountdown}s
                    </strong>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '5px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--primary), var(--success))',
                      borderRadius: '3px',
                      width: `${(autoCloseCountdown / 5) * 100}%`,
                      transition: 'width 0.15s linear'
                    }} />
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '12px' }}
                  onClick={handleCloseModal}
                >
                  Hoàn Tất & Đóng ({autoCloseCountdown}s)
                </button>
              </div>
            ) : (
              <div className="qr-payment-body">
                {/* Timer và trạng thái chờ */}
                <div className="qr-status-bar">
                  <div className="qr-waiting-status">
                    <span className="ping-dot" />
                    <span>Đang chờ chuyển khoản...</span>
                  </div>
                  <div className="qr-countdown">
                    <Clock size={14} />
                    <span>{formatSeconds(timeLeft)}</span>
                  </div>
                </div>

                {/* Hình ảnh QR code VietQR - Chỉ hiển thị duy nhất mã QR */}
                <div className="qr-image-container">
                  <img
                    src={getPureQrUrl(activeDeposit)}
                    alt="VietQR Code"
                    className="vietqr-image"
                    onError={(e) => {
                      // Fallback nếu ảnh vietqr.io tải chậm
                      if (activeDeposit.qr_code_raw || activeDeposit.qr_code) {
                        e.target.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(activeDeposit.qr_code_raw || activeDeposit.qr_code)}`;
                      }
                    }}
                  />
                </div>

                {timeLeft === 0 && (
                  <div style={{
                    margin: '12px 0',
                    padding: '10px 14px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1.5px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: 'var(--radius-md)',
                    color: '#f87171',
                    fontSize: '13px',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    ⚠️ Mã QR đã hết hạn 15 phút. Vui lòng đóng cửa sổ này và tạo mã nạp mới!
                  </div>
                )}

                {/* Thông tin chuyển khoản chi tiết */}
                <div className="transfer-details-box">
                  {/* Ngân hàng */}
                  <div className="transfer-row">
                    <span className="detail-label">Ngân hàng thụ hưởng:</span>
                    <span className="detail-value">MBBank (Ngân Hàng Quân Đội)</span>
                  </div>

                  {/* Số tài khoản */}
                  <div className="transfer-row">
                    <span className="detail-label">Số tài khoản:</span>
                    <div className="copy-value-group">
                      <span className="detail-value font-mono">{activeDeposit.bank_account_number}</span>
                      <button
                        type="button"
                        className="copy-mini-btn"
                        onClick={() => handleCopy(activeDeposit.bank_account_number, 'stk')}
                        title="Sao chép STK"
                      >
                        {copiedField === 'stk' ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Chủ tài khoản */}
                  <div className="transfer-row">
                    <span className="detail-label">Chủ tài khoản:</span>
                    <span className="detail-value font-bold">{activeDeposit.bank_account_name}</span>
                  </div>

                  {/* Số tiền */}
                  <div className="transfer-row highlight-row">
                    <span className="detail-label">Số tiền:</span>
                    <div className="copy-value-group">
                      <span className="detail-value text-primary font-bold">
                        {activeDeposit.amount.toLocaleString('vi-VN')} ₫
                      </span>
                      <button
                        type="button"
                        className="copy-mini-btn"
                        onClick={() => handleCopy(activeDeposit.amount.toString(), 'amount')}
                        title="Sao chép số tiền"
                      >
                        {copiedField === 'amount' ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Nội dung chuyển khoản - Rất quan trọng */}
                  <div className="transfer-row highlight-memo">
                    <div>
                      <span className="detail-label">Nội dung chuyển khoản:</span>
                      <div style={{ fontSize: '11px', color: '#f59e0b' }}>* Bắt buộc giữ nguyên nội dung này</div>
                    </div>
                    <div className="copy-value-group">
                      <span className="memo-tag font-mono">{activeDeposit.description}</span>
                      <button
                        type="button"
                        className="copy-mini-btn"
                        onClick={() => handleCopy(activeDeposit.description, 'memo')}
                        title="Sao chép nội dung"
                      >
                        {copiedField === 'memo' ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Hướng dẫn nạp tối thiểu nổi bật */}
                <div className="qr-footer-actions">
                  <div className="qr-instruction-tip" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(234, 88, 12, 0.12) 100%)',
                    border: '1.5px solid rgba(245, 158, 11, 0.5)',
                    borderRadius: 'var(--radius-md)',
                    color: '#fbbf24',
                    fontSize: '13px',
                    fontWeight: '700',
                    boxShadow: '0 0 16px rgba(245, 158, 11, 0.15)',
                    textAlign: 'center'
                  }}>
                    <AlertCircle size={18} color="#fbbf24" style={{ flexShrink: 0 }} />
                    <span>Vui lòng nạp tối thiểu 10.000 ₫ để hệ thống tự động cộng tiền</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Bảng Gói Dịch Vụ & Nâng Cấp VIP Pro (SCR-12 / UC-18) */}
      <div className="card" style={{ padding: '24px', borderRadius: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
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
              <Crown size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                Gói Dịch Vụ & Nâng Cấp Hội Viên VIP
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                Nâng cấp để mở khóa 10 tài khoản Telegram, Live Chat 2 chiều và tính năng chống khoá FloodWait
              </p>
            </div>
          </div>

          {profile?.subscription_tier === 'VIP' ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'transparent',
              border: '1.5px solid #f59e0b',
              color: '#fbbf24',
              fontSize: '12.5px',
              fontWeight: '600'
            }}>
              <Crown size={15} color="#f59e0b" />
              <span>
                Đang dùng VIP Pro (Hạn đến: {profile.tier_expires_at ? new Date(profile.tier_expires_at).toLocaleDateString('vi-VN') : '30 ngày'})
              </span>
            </div>
          ) : (
            <div style={{
              padding: '6px 12px',
              borderRadius: '20px',
              background: 'rgba(148, 163, 184, 0.15)',
              color: 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              Hiện tại: Gói Miễn Phí (Free Tier)
            </div>
          )}
        </div>

        {/* Pricing Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Card 1: Free Tier */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color, #334155)',
            borderRadius: '14px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '17px', fontWeight: '700' }}>Gói Miễn Phí (Free)</h4>
                <span className="badge badge-secondary">Cơ Bản</span>
              </div>
              <div style={{ fontSize: '26px', fontWeight: '800', marginTop: '12px', color: 'var(--text-main)' }}>
                0 ₫ <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>/ vĩnh viễn</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '8px 0 16px' }}>
                Trải nghiệm tính năng kết nối bot cơ bản và thử nghiệm phát tin nhóm
              </p>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <Check size={16} color="var(--success)" />
                  <span>Tối đa <strong>3</strong> tài khoản Telegram kết nối</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <Check size={16} color="var(--success)" />
                  <span>Quét và đồng bộ nhóm</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <Check size={16} color="var(--success)" />
                  <span>Chỉ spam <strong>1 loại tin nhắn</strong> (không xoay vòng)</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <X size={16} color="var(--text-dim)" />
                  <span>Không hỗ trợ chat 2 chiều (Live Chat)</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <X size={16} color="var(--text-dim)" />
                  <span>Không hỗ trợ chuyển tiếp về tài khoản cá nhân</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              disabled
              style={{ width: '100%', opacity: 0.65 }}
            >
              {profile?.subscription_tier === 'VIP' ? 'Gói Cơ Bản' : 'Đang Sử Dụng'}
            </button>
          </div>

          {/* Card 2: VIP Pro */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.03) 100%)',
            border: '2px solid rgba(245, 158, 11, 0.5)',
            borderRadius: '14px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            boxShadow: '0 0 24px rgba(245, 158, 11, 0.12)'
          }}>
            <div style={{
              position: 'absolute',
              top: '-12px',
              right: '20px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: '800',
              padding: '3px 10px',
              borderRadius: '20px',
              letterSpacing: '0.5px',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)'
            }}>
              ★ KHUYÊN DÙNG
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#fbbf24' }}>
                  VIP Pro (Marketer & Doanh Nghiệp)
                </h4>
              </div>
              <div style={{ fontSize: '26px', fontWeight: '800', marginTop: '12px', color: '#fbbf24' }}>
                199.000 ₫ <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>/ 30 Ngày</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '8px 0 16px' }}>
                Mở khóa toàn bộ sức mạnh tự động hóa marketing, gửi tin hàng loạt và tương tác khách hàng
              </p>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '600' }}>
                  <Check size={16} color="#fbbf24" />
                  <span><strong>10</strong> Tài khoản Telegram chạy song song</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '600' }}>
                  <Check size={16} color="#fbbf24" />
                  <span><strong>Live Chat</strong> tương tác 2 chiều không giới hạn</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <Check size={16} color="#fbbf24" />
                  <span>Tự động luân phiên tài khoản & chống khoá <strong>FloodWait</strong></span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <Check size={16} color="#fbbf24" />
                  <span>Soạn tin nhắn <strong>Spintax</strong> lồng nhau không giới hạn</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <Check size={16} color="#fbbf24" />
                  <span>Tự động chuyển tiếp lead về Telegram cá nhân</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePromptUpgradeVip}
              disabled={upgradingVip}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                border: 'none',
                fontWeight: '700',
                padding: '12px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)'
              }}
            >
              {upgradingVip ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  <span>Đang nâng cấp...</span>
                </>
              ) : (
                <>
                  <Crown size={17} />
                  <span>
                    {profile?.subscription_tier === 'VIP' ? 'Gia Hạn Thêm 30 Ngày (199.000 ₫)' : 'Nâng Cấp VIP Pro Ngay (199.000 ₫)'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bảng Lịch Sử Giao Dịch Nạp Tiền */}
      <div className="card wallet-history-card">
        <div className="history-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} color="var(--text-muted)" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Lịch Sử Giao Dịch Nạp Tiền</h3>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fetchHistory(true)}
            disabled={loadingHistory}
          >
            <RefreshCw size={14} className={loadingHistory ? 'spin' : ''} />
            <span>{loadingHistory ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="empty-history-placeholder">
            <Wallet size={36} color="var(--text-dim)" />
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Chưa có giao dịch nạp tiền nào được ghi nhận.
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Thời gian</th>
                  <th>Số tiền</th>
                  <th>Nội dung</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const isPaid = tx.status === 'PAID';
                  const isPending = tx.status === 'PENDING' || tx.status === 'pending';
                  const isExpired = tx.created_at
                    ? (Date.now() - new Date(tx.created_at).getTime()) > 15 * 60 * 1000
                    : false;

                  return (
                    <tr key={tx.id || tx.order_code}>
                      <td className="font-mono" style={{ fontSize: '13px' }}>
                        #{tx.order_code}
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {tx.created_at ? new Date(tx.created_at).toLocaleString('vi-VN') : 'Mới đây'}
                      </td>
                      <td className="font-bold" style={{ color: isPaid ? 'var(--success)' : 'var(--text-main)' }}>
                        +{tx.amount?.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {tx.description}
                      </td>
                      <td>
                        {isPaid && (
                          <span className="badge badge-success">
                            <CheckCircle2 size={12} /> Thành công
                          </span>
                        )}
                        {isPending && !isExpired && (
                          <span className="badge badge-warning">
                            <Clock size={12} /> Đang chờ
                          </span>
                        )}
                        {isPending && isExpired && (
                          <span className="badge badge-secondary" style={{ opacity: 0.65 }}>
                            <Clock size={12} /> Đã hết hạn
                          </span>
                        )}
                        {!isPaid && !isPending && (
                          <span className="badge badge-secondary">
                            {tx.status}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isPending && !isExpired && (
                          <button
                            type="button"
                            onClick={() => handleResumeDeposit(tx)}
                            className="btn btn-primary btn-sm"
                            style={{ padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            title="Mở lại mã QR để thanh toán"
                          >
                            <QrCode size={13} />
                            <span>Mã QR</span>
                          </button>
                        )}
                        {isPending && isExpired && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hết hạn</span>
                        )}
                        {isPaid && (
                          <span style={{ fontSize: '11px', color: 'var(--success)' }}>✓ Đã nạp</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL XÁC NHẬN NÂNG CẤP GÓI VIP PRO */}
      <VipUpgradeModal
        isOpen={showConfirmVipModal}
        onClose={() => setShowConfirmVipModal(false)}
        onConfirm={handleExecuteUpgradeVip}
        onDeposit={(shortage) => {
          const depAmt = Math.max(10000, shortage);
          setAmount(depAmt);
          setCustomAmountText(depAmt.toLocaleString('vi-VN'));
          setShowConfirmVipModal(false);
          window.scrollTo({ top: 300, behavior: 'smooth' });
        }}
        currentBalance={currentBalance}
        vipPrice={199000}
        durationDays={30}
        isLoading={upgradingVip}
        isRenewal={profile?.subscription_tier === 'VIP'}
      />
    </div>
  );
}
