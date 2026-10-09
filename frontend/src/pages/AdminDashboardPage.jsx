import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Users,
  Bot,
  Sparkles,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Wallet,
  Settings,
  Calendar,
  Layers,
  ArrowUpRight,
  Clock,
  ExternalLink,
  Crown,
  Server,
  Activity,
  CreditCard,
  Sliders,
  ShieldCheck,
  Check
} from 'lucide-react';
import {
  getAdminOverview,
  getAdminUsers,
  getAdminTransactions,
  updateUserStatus,
  getAdminPricing,
  getAdminBots,
  getPlatformSettings,
  updatePlatformSettings
} from '../lib/api';
import AdminPricingModal from '../components/admin/AdminPricingModal';
import UserBalanceModal from '../components/admin/UserBalanceModal';
import UserSubscriptionModal from '../components/admin/UserSubscriptionModal';
import AdminAuditLogsTab from '../components/admin/AdminAuditLogsTab';

export default function AdminDashboardPage({ activeTab = 'overview', setActiveTab, showToast, onSetRefresh, setParentLoading }) {
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState({
    total_revenue: 0,
    mrr_revenue: 0,
    paid_transactions: 0,
    total_users: 0,
    vip_users: 0,
    total_accounts: 0,
    active_accounts: 0,
    total_messages_sent: 0,
    success_rate: 98.6
  });

  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL'); // 'ALL' | 'VIP' | 'FREE' | 'SUSPENDED'

  const [transactions, setTransactions] = useState([]);
  const [txFilter, setTxFilter] = useState('');

  const [bots, setBots] = useState([]);
  const [pricingPlans, setPricingPlans] = useState(null);

  // Platform Settings state
  const [settingsData, setSettingsData] = useState({
    bank_bin: '970422',
    bank_name: 'MBBank (Ngân hàng Quân Đội)',
    bank_account_number: '0869098696',
    bank_account_name: 'TRAN NGOC DUC',
    admin_alert_telegram: 'vhoang25'
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Modals state
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [selectedUserForBalance, setSelectedUserForBalance] = useState(null);
  const [selectedUserForSubscription, setSelectedUserForSubscription] = useState(null);

  const fetchData = async (isManual = false) => {
    setLoading(true);
    if (setParentLoading) setParentLoading(true);
    try {
      const minSpin = isManual ? new Promise(resolve => setTimeout(resolve, 600)) : Promise.resolve();
      const [ovRes, uRes, txRes, pricingRes, botsRes, setRes] = await Promise.all([
        getAdminOverview(),
        getAdminUsers(),
        getAdminTransactions(50, txFilter),
        getAdminPricing(),
        getAdminBots(),
        getPlatformSettings(),
        minSpin
      ]);

      if (ovRes && ovRes.success && ovRes.data) {
        setOverview(ovRes.data);
      }
      if (uRes && uRes.success && uRes.data) {
        setUsers(uRes.data);
      }
      if (txRes && txRes.success && txRes.data) {
        setTransactions(txRes.data);
      }
      if (pricingRes && pricingRes.success && pricingRes.data) {
        setPricingPlans(pricingRes.data);
      }
      if (botsRes && botsRes.success && botsRes.data) {
        setBots(botsRes.data);
      }
      if (setRes && setRes.success && setRes.data) {
        setSettingsData(setRes.data);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu quản trị:', err);
    } finally {
      setLoading(false);
      if (setParentLoading) setParentLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [txFilter]);

  useEffect(() => {
    if (onSetRefresh) {
      onSetRefresh(() => () => fetchData(true));
    }
  }, [onSetRefresh]);

  const handleToggleUserStatus = async (user) => {
    const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
    try {
      const res = await updateUserStatus(user.id, newStatus);
      if (res && res.success) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
        if (showToast) {
          showToast({
            title: 'Thành công',
            message: `Đã ${newStatus === 'active' ? 'mở khóa' : 'đình chỉ'} tài khoản ${user.email}!`,
            type: 'success'
          });
        }
      }
    } catch (err) {
      console.error('Lỗi cập nhật trạng thái user:', err);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const minSpin = new Promise(resolve => setTimeout(resolve, 600));
      const [res] = await Promise.all([
        updatePlatformSettings(settingsData),
        minSpin
      ]);
      if (res && res.success) {
        if (showToast) {
          showToast({
            title: 'Đã lưu cấu hình',
            message: 'Thông tin thanh toán VietQR và cấu hình sàn đã được cập nhật thành công!',
            type: 'success'
          });
        }
      }
    } catch (err) {
      console.error('Lỗi lưu cài đặt:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchSearch = (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.full_name || '').toLowerCase().includes(userSearch.toLowerCase());
    
    if (!matchSearch) return false;
    if (userRoleFilter === 'VIP') return u.subscription_tier === 'VIP';
    if (userRoleFilter === 'FREE') return u.subscription_tier !== 'VIP';
    if (userRoleFilter === 'SUSPENDED') return u.status === 'suspended';
    return true;
  });

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* ============================================================ */}
      {/* 1. TAB: TỔNG QUAN HỆ THỐNG (OVERVIEW) */}
      {/* ============================================================ */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* KPI Top Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '16px'
          }}>
            {/* Tổng Doanh Thu */}
            <div className="card" style={{ padding: '22px', borderRadius: '16px', background: '#0f172a', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>
                    Tổng Doanh Thu Nền Tảng (Gross)
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: '#10b981', marginTop: '6px' }}>
                    {(overview.total_revenue || 0).toLocaleString('vi-VN')} ₫
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    {overview.paid_transactions || 0} giao dịch thành công qua VietQR
                  </div>
                </div>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981'
                }}>
                  <DollarSign size={24} />
                </div>
              </div>
            </div>

            {/* Doanh thu 30 ngày (MRR) */}
            <div className="card" style={{ padding: '22px', borderRadius: '16px', background: '#0f172a', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>
                    Doanh Thu 30 Ngày Gần Nhất (MRR)
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: '#38bdf8', marginTop: '6px' }}>
                    {(overview.mrr_revenue || 0).toLocaleString('vi-VN')} ₫
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Chỉ số tăng trưởng dòng tiền thuê bao
                  </div>
                </div>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8'
                }}>
                  <TrendingUp size={24} />
                </div>
              </div>
            </div>

            {/* Khách hàng VIP Pro */}
            <div className="card" style={{ padding: '22px', borderRadius: '16px', background: '#0f172a', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>
                    Thuê Bao VIP Pro (Khách Hàng)
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: '#fbbf24', marginTop: '6px' }}>
                    {overview.vip_users || 0} <span style={{ fontSize: '15px', color: '#64748b' }}>/ {overview.total_users || 0} khách</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Tỷ lệ chuyển đổi VIP: {((overview.vip_users / Math.max(1, overview.total_users)) * 100).toFixed(1)}%
                  </div>
                </div>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fbbf24'
                }}>
                  <Crown size={24} />
                </div>
              </div>
            </div>

            {/* Tài Khoản Telegram Bots */}
            <div className="card" style={{ padding: '22px', borderRadius: '16px', background: '#0f172a', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>
                    Bot MTProto Toàn Nền Tảng
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: '#c084fc', marginTop: '6px' }}>
                    {overview.active_accounts || 0} <span style={{ fontSize: '15px', color: '#64748b' }}>/ {overview.total_accounts || 0} Online</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Đã phát {overview.total_messages_sent || 0} tin nhắn • {overview.success_rate || 98.6}% OK
                  </div>
                </div>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(168, 85, 247, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#c084fc'
                }}>
                  <Bot size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Infrastructure Health & Quick Actions Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {/* Trạng thái hạ tầng Server */}
            <div className="card" style={{ padding: '24px', borderRadius: '16px', background: '#0f172a', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <Server size={20} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#f8fafc' }}>
                  Giám Sát Hạ Tầng & Dịch Vụ Nền Tảng
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { name: 'FastAPI Backend Core (Port 8000)', status: 'Hoạt động tốt', latency: '4ms', ok: true },
                  { name: 'Supabase PostgreSQL & Auth Database', status: 'Kết nối ổn định', latency: '28ms', ok: true },
                  { name: 'PayOS VietQR Webhook Listener', status: 'Sẵn sàng nhận tiền', latency: 'Tự động', ok: true },
                  { name: 'Telethon MTProto Client Workers', status: 'Đang chạy', latency: 'Polling', ok: true },
                  { name: 'Khách Hàng Đăng Ký Hệ Thống', status: `${users.length} tài khoản`, latency: 'Đã xác thực', ok: true }
                ].map((srv, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'rgba(30, 41, 59, 0.5)',
                    borderRadius: '10px',
                    border: '1px solid rgba(148, 163, 184, 0.1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#10b981',
                        boxShadow: '0 0 6px #10b981'
                      }} />
                      <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '500' }}>{srv.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{srv.latency}</span>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#34d399' }}>{srv.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Thao Tác Nhanh Dành Cho Chủ Sàn */}
            <div className="card" style={{ padding: '24px', borderRadius: '16px', background: '#0f172a', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <Sliders size={20} color="#f59e0b" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#f8fafc' }}>
                  Lối Tắt Vận Hành Chủ Nền Tảng
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab && setActiveTab('users')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Users size={18} />
                    <span>Quản lý & Cấp VIP Cho Khách Hàng</span>
                  </div>
                  <ArrowUpRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => setIsPricingModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: '#fbbf24',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Crown size={18} />
                    <span>Cấu Hình Bảng Giá VIP Pro (199.000 ₫)</span>
                  </div>
                  <ArrowUpRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab && setActiveTab('transactions')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#34d399',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CreditCard size={18} />
                    <span>Kiểm Tra Dòng Tiền Nạp VietQR ({transactions.length} GD)</span>
                  </div>
                  <ArrowUpRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab && setActiveTab('settings')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: 'rgba(148, 163, 184, 0.08)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    color: '#cbd5e1',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Settings size={18} />
                    <span>Thiết Lập Số Tài Khoản Ngân Hàng Nhận Tiền</span>
                  </div>
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. TAB: QUẢN LÝ KHÁCH HÀNG (USERS) */}
      {/* ============================================================ */}
      {activeTab === 'users' && (
        <div className="card" style={{ padding: '24px', borderRadius: '16px', background: '#0f172a', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
          {/* Header toolbar */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '20px'
          }}>
            {/* Search */}
            <div style={{ position: 'relative', maxWidth: '380px', width: '100%' }}>
              <input
                type="text"
                className="form-input input-field"
                placeholder="Tìm khách hàng theo email, họ tên..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: '38px',
                  borderRadius: '10px',
                  background: 'var(--bg-input, rgba(15, 23, 42, 0.8))',
                  border: '1px solid var(--border-medium, rgba(148, 163, 184, 0.25))',
                  color: 'var(--text-main, #f8fafc)'
                }}
              />
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            </div>

            {/* Filter pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: `Tất cả (${users.length})` },
                { id: 'VIP', label: `★ VIP Pro (${users.filter(u => u.subscription_tier === 'VIP').length})` },
                { id: 'FREE', label: `Free Tier (${users.filter(u => u.subscription_tier !== 'VIP').length})` },
                { id: 'SUSPENDED', label: `Bị Khóa (${users.filter(u => u.status === 'suspended').length})` }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setUserRoleFilter(f.id)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    border: userRoleFilter === f.id ? '1px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.2)',
                    background: userRoleFilter === f.id ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                    color: userRoleFilter === f.id ? '#38bdf8' : '#94a3b8'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="custom-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Khách Hàng (Customer)</th>
                  <th>Gói Cước</th>
                  <th>Số Dư Ví</th>
                  <th>Bot Accounts</th>
                  <th>Trạng Thái</th>
                  <th>Ngày Tham Gia</th>
                  <th style={{ textAlign: 'right' }}>Thao Tác Quản Trị</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      Không tìm thấy khách hàng nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isVip = u.subscription_tier === 'VIP';
                    const isSuspended = u.status === 'suspended';

                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              background: isVip
                                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '700',
                              fontSize: '14px',
                              color: '#ffffff',
                              border: isVip ? '2px solid #fbbf24' : '2px solid transparent'
                            }}>
                              {u.email ? u.email[0].toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div style={{ fontWeight: '700', color: '#f8fafc', fontSize: '13px' }}>
                                {u.full_name || 'Khách Hàng TelePulse'}
                              </div>
                              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          {isVip ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              background: 'rgba(245, 158, 11, 0.18)',
                              color: '#fbbf24',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              fontSize: '12px',
                              fontWeight: '800'
                            }}>
                              <Crown size={12} /> ★ VIP Pro
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: 'rgba(148, 163, 184, 0.15)',
                              color: '#cbd5e1',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              Free Tier
                            </span>
                          )}
                        </td>

                        <td className="font-mono" style={{ fontWeight: '800', color: '#f8fafc', fontSize: '13px' }}>
                          {(u.balance || 0).toLocaleString('vi-VN')} ₫
                        </td>

                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                            <Bot size={14} color="#a855f7" />
                            <strong>{u.account_count || 0}</strong> acc
                          </span>
                        </td>

                        <td>
                          {isSuspended ? (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: 'rgba(239, 68, 68, 0.2)',
                              color: '#f87171',
                              fontSize: '11px',
                              fontWeight: '700'
                            }}>
                              Đã Khóa
                            </span>
                          ) : (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#34d399',
                              fontSize: '11px',
                              fontWeight: '700'
                            }}>
                              Hoạt Động
                            </span>
                          )}
                        </td>

                        <td style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : 'Mới đây'}
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            {/* Nút cộng/trừ số dư ví */}
                            <button
                              type="button"
                              onClick={() => setSelectedUserForBalance(u)}
                              title="Cộng hoặc trừ số dư ví của khách hàng"
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                background: 'rgba(56, 189, 248, 0.15)',
                                border: '1px solid rgba(56, 189, 248, 0.35)',
                                color: '#38bdf8',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Wallet size={13} />
                              <span>Nạp Tiền</span>
                            </button>

                            {/* Nút cấp VIP / hạ Free */}
                            <button
                              type="button"
                              onClick={() => setSelectedUserForSubscription(u)}
                              title="Nâng cấp VIP hoặc chuyển về Free"
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                background: isVip ? 'rgba(245, 158, 11, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                                border: '1px solid rgba(245, 158, 11, 0.4)',
                                color: '#fbbf24',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Crown size={13} />
                              <span>{isVip ? 'Gia Hạn VIP' : 'Cấp VIP'}</span>
                            </button>

                            {/* Nút khóa / mở khóa */}
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(u)}
                              title={isSuspended ? 'Mở khóa tài khoản' : 'Khóa tài khoản khách hàng'}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                background: isSuspended ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.15)',
                                border: isSuspended ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.35)',
                                color: isSuspended ? '#34d399' : '#f87171',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {isSuspended ? <Unlock size={13} /> : <Lock size={13} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. TAB: DÒNG TIỀN & GIAO DỊCH (TRANSACTIONS) */}
      {/* ============================================================ */}
      {activeTab === 'transactions' && (
        <div className="card" style={{ padding: '24px', borderRadius: '16px', background: '#0f172a', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`btn btn-sm ${txFilter === '' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTxFilter('')}
              >
                Tất cả ({transactions.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${txFilter === 'PAID' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTxFilter('PAID')}
              >
                Thành công (PAID)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${txFilter === 'PENDING' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTxFilter('PENDING')}
              >
                Chờ thanh toán (PENDING)
              </button>
            </div>

            <div style={{ fontSize: '13px', color: '#94a3b8' }}>
              Doanh thu thực thu: <strong style={{ color: '#10b981' }}>{(overview.total_revenue || 0).toLocaleString('vi-VN')} ₫</strong>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Mã Đơn PayOS</th>
                  <th>Khách Hàng Nạp Tiền</th>
                  <th>Số Tiền (₫)</th>
                  <th>Nội Dung Chuyển Khoản</th>
                  <th>Trạng Thái</th>
                  <th>Thời Gian Giao Dịch</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      Chưa có giao dịch nạp tiền nào được ghi nhận.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const isPaid = tx.status === 'PAID';
                    return (
                      <tr key={tx.id || tx.order_code}>
                        <td className="font-mono" style={{ fontWeight: '800', color: '#38bdf8' }}>
                          #{tx.order_code}
                        </td>
                        <td>
                          <div style={{ fontSize: '13px', color: '#f8fafc', fontWeight: '600' }}>
                            {tx.profiles?.full_name || 'Khách hàng'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {tx.profiles?.email || tx.user_id?.substring(0, 10) + '...'}
                          </div>
                        </td>
                        <td className="font-mono" style={{ fontWeight: '800', color: isPaid ? '#10b981' : '#cbd5e1', fontSize: '14px' }}>
                          +{tx.amount?.toLocaleString('vi-VN')} ₫
                        </td>
                        <td className="font-mono" style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {tx.description}
                        </td>
                        <td>
                          {isPaid ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: 'rgba(16, 185, 129, 0.18)',
                              color: '#34d399',
                              fontSize: '11px',
                              fontWeight: '800'
                            }}>
                              <CheckCircle2 size={12} /> PAID (ĐÃ NHẬN TIỀN)
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: 'rgba(245, 158, 11, 0.18)',
                              color: '#fbbf24',
                              fontSize: '11px',
                              fontWeight: '800'
                            }}>
                              <Clock size={12} /> {tx.status || 'PENDING'}
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {tx.created_at ? new Date(tx.created_at).toLocaleString('vi-VN') : 'Mới đây'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. TAB: BẢNG GIÁ & GÓI CƯỚC VIP (PRICING) */}
      {/* ============================================================ */}
      {activeTab === 'pricing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.8)',
            padding: '20px 24px',
            borderRadius: '16px',
            border: '1px solid rgba(245, 158, 11, 0.25)'
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#f8fafc' }}>
                Cấu Hình Bảng Giá Dịch Vụ & Giới Hạn Gói Cước
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                Thay đổi giá gói, số lượng tài khoản Telegram tối đa và các đặc quyền mở khóa cho toàn sàn
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPricingModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#fff',
                fontWeight: '800',
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)'
              }}
            >
              <Sparkles size={16} />
              <span>Chỉnh Sửa Giá VIP Pro</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
            {/* Gói Free */}
            <div className="card" style={{ padding: '24px', borderRadius: '16px', background: '#0f172a', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc' }}>Gói Miễn Phí (Free)</span>
                <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' }}>
                  MẶC ĐỊNH
                </span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#f8fafc', marginBottom: '16px' }}>
                0 ₫ <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '400' }}>/ trọn đời</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#cbd5e1' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={16} color="#10b981" /> Tối đa 1 tài khoản Telegram MTProto
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={16} color="#10b981" /> Quét đồng bộ danh sách nhóm mục tiêu
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={16} color="#10b981" /> Giới hạn 50 tin nhắn rải/ngày
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                  ✕ Không hỗ trợ Live Chat 2 chiều
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                  ✕ Không hỗ trợ chuyển tiếp tin về Telegram cá nhân
                </li>
              </ul>
            </div>

            {/* Gói VIP Pro */}
            <div className="card" style={{
              padding: '24px',
              borderRadius: '16px',
              background: 'linear-gradient(180deg, #131929 0%, #0f172a 100%)',
              border: '2px solid rgba(245, 158, 11, 0.5)',
              boxShadow: '0 8px 30px rgba(245, 158, 11, 0.15)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Crown size={20} color="#fbbf24" />
                  <span style={{ fontSize: '18px', fontWeight: '900', color: '#fbbf24' }}>VIP Pro Marketing</span>
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#fff'
                }}>
                  HOT GÓI THUÊ BAO
                </span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#fbbf24', marginBottom: '16px' }}>
                {(pricingPlans?.vip?.price || 199000).toLocaleString('vi-VN')} ₫ <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '400' }}>/ 30 ngày</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#e2e8f0' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={16} color="#fbbf24" /> Kết nối tối đa <strong>{pricingPlans?.vip?.max_accounts || 10} Tài khoản Telegram</strong>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={16} color="#fbbf24" /> <strong>Live Chat 2 Chiều:</strong> Nhắn tin với khách hàng không cần rời web
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={16} color="#fbbf24" /> <strong>Forwarding:</strong> Chuyển tiếp tin nhắn khách hàng về Telegram Admin
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={16} color="#fbbf24" /> Không giới hạn kho tin nhắn & Spintax xoay vòng
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={16} color="#fbbf24" /> Tự động ngắt nghỉ thông minh chống khóa nick FloodWait
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. TAB: GIÁM SÁT BOT TOÀN SÀN (BOTS) */}
      {/* ============================================================ */}
      {activeTab === 'bots' && (
        <div className="card" style={{ padding: '24px', borderRadius: '16px', background: '#0f172a', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#f8fafc' }}>
                Giám Sát Tài Khoản Bot Telegram Khách Hàng
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                Danh sách toàn bộ các phiên Telegram MTProto đang vận hành trên server
              </p>
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>
              Tổng số bot trên hệ thống: <strong style={{ color: '#c084fc' }}>{bots.length} accounts</strong>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Số Điện Thoại / Account</th>
                  <th>Tên Telegram</th>
                  <th>Chủ Sở Hữu (Khách Hàng)</th>
                  <th>Trạng Thái</th>
                  <th>Ngày Kết Nối</th>
                </tr>
              </thead>
              <tbody>
                {bots.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      Chưa có tài khoản Telegram bot nào được kết nối bởi khách hàng.
                    </td>
                  </tr>
                ) : (
                  bots.map((b) => (
                    <tr key={b.id}>
                      <td className="font-mono" style={{ fontWeight: '700', color: '#f8fafc' }}>
                        {b.phone_number || 'N/A'}
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', color: '#f8fafc' }}>
                          {b.first_name || ''} {b.last_name || ''}
                        </div>
                        {b.username && <div style={{ fontSize: '11px', color: '#94a3b8' }}>@{b.username}</div>}
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', color: '#38bdf8' }}>
                          {b.profiles?.email || b.user_id?.substring(0, 8) + '...'}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: b.status === 'online' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: b.status === 'online' ? '#34d399' : '#fbbf24',
                          fontSize: '11px',
                          fontWeight: '800'
                        }}>
                          {b.status?.toUpperCase() || 'READY'}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {b.created_at ? new Date(b.created_at).toLocaleString('vi-VN') : 'Mới đây'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. TAB: CẤU HÌNH NỀN TẢNG (SETTINGS) */}
      {/* ============================================================ */}
      {activeTab === 'settings' && (
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto', padding: '28px', borderRadius: '16px', background: '#0f172a', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Settings size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#f8fafc' }}>
                Cấu Hình Nền Tảng & Ngân Hàng Nhận Tiền
              </h2>
              <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                Thiết lập thông tin tài khoản đối soát nội bộ và nhận tiền từ khách hàng
              </p>
            </div>
          </div>

          {/* Banner lưu ý về PayOS */}
          <div style={{
            padding: '14px 18px',
            borderRadius: '12px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            marginBottom: '20px',
            fontSize: '13px',
            color: '#93c5fd',
            lineHeight: 1.5
          }}>
            <strong style={{ color: '#bfdbfe' }}>ℹ️ Lưu ý về Cổng Tự Động PayOS:</strong>
            <br />
            Với các giao dịch nạp tiền quét mã PayOS tự động, số tài khoản và Webhook được quản lý trực tiếp qua <strong>PayOS Dashboard</strong> (gắn với bộ API Keys trong file <code>.env</code>). Cấu hình tại đây phục vụ <strong>đối soát nội bộ & hiển thị chuyển khoản trực tiếp</strong>, không tự động ghi đè tài khoản đã đăng ký trên cổng PayOS.
          </div>

          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', display: 'block', marginBottom: '6px' }}>
                  Số Tài Khoản Ngân Hàng Nhận Tiền:
                </label>
                <input
                  type="text"
                  className="form-input input-field"
                  value={settingsData.bank_account_number}
                  onChange={(e) => setSettingsData({ ...settingsData, bank_account_number: e.target.value })}
                  style={{
                    width: '100%',
                    borderRadius: '10px',
                    padding: '11px 14px',
                    background: 'var(--bg-input, rgba(15, 23, 42, 0.8))',
                    border: '1px solid var(--border-medium, rgba(148, 163, 184, 0.25))',
                    color: 'var(--text-main, #f8fafc)'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', display: 'block', marginBottom: '6px' }}>
                  Tên Chủ Tài Khoản (In hoa không dấu):
                </label>
                <input
                  type="text"
                  className="form-input input-field"
                  value={settingsData.bank_account_name}
                  onChange={(e) => setSettingsData({ ...settingsData, bank_account_name: e.target.value })}
                  style={{
                    width: '100%',
                    borderRadius: '10px',
                    padding: '11px 14px',
                    background: 'var(--bg-input, rgba(15, 23, 42, 0.8))',
                    border: '1px solid var(--border-medium, rgba(148, 163, 184, 0.25))',
                    color: 'var(--text-main, #f8fafc)'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', display: 'block', marginBottom: '6px' }}>
                  Tên Ngân Hàng:
                </label>
                <input
                  type="text"
                  className="form-input input-field"
                  value={settingsData.bank_name}
                  onChange={(e) => setSettingsData({ ...settingsData, bank_name: e.target.value })}
                  style={{
                    width: '100%',
                    borderRadius: '10px',
                    padding: '11px 14px',
                    background: 'var(--bg-input, rgba(15, 23, 42, 0.8))',
                    border: '1px solid var(--border-medium, rgba(148, 163, 184, 0.25))',
                    color: 'var(--text-main, #f8fafc)'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', display: 'block', marginBottom: '6px' }}>
                  Mã BIN Ngân Hàng (VietQR):
                </label>
                <input
                  type="text"
                  className="form-input input-field"
                  value={settingsData.bank_bin}
                  onChange={(e) => setSettingsData({ ...settingsData, bank_bin: e.target.value })}
                  style={{
                    width: '100%',
                    borderRadius: '10px',
                    padding: '11px 14px',
                    background: 'var(--bg-input, rgba(15, 23, 42, 0.8))',
                    border: '1px solid var(--border-medium, rgba(148, 163, 184, 0.25))',
                    color: 'var(--text-main, #f8fafc)'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', display: 'block', marginBottom: '6px' }}>
                Telegram Username Nhận Cảnh Báo Doanh Thu (Admin):
              </label>
              <input
                type="text"
                className="form-input input-field"
                placeholder="Ví dụ: vhoang25"
                value={settingsData.admin_alert_telegram}
                onChange={(e) => setSettingsData({ ...settingsData, admin_alert_telegram: e.target.value })}
                style={{
                  width: '100%',
                  borderRadius: '10px',
                  padding: '11px 14px',
                  background: 'var(--bg-input, rgba(15, 23, 42, 0.8))',
                  border: '1px solid var(--border-medium, rgba(148, 163, 184, 0.25))',
                  color: 'var(--text-main, #f8fafc)'
                }}
              />
              <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Bot TelePulse sẽ gửi thông báo tức thì về tài khoản này khi có khách nạp tiền hoặc đăng ký mới.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="submit"
                disabled={savingSettings}
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                  border: 'none',
                  padding: '12px 24px',
                  fontWeight: '800',
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Check size={16} />
                <span>{savingSettings ? 'Đang lưu cấu hình...' : 'Lưu Thay Đổi Nền Tảng'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. TAB: NHẬT KÝ KIỂM TOÁN & VẬN HÀNH (AUDIT LOGS - UC-23) */}
      {/* ============================================================ */}
      {activeTab === 'audit_logs' && (
        <AdminAuditLogsTab
          adminId="admin_root"
          showToast={showToast}
        />
      )}

      {/* ============================================================ */}
      {/* MODALS */}
      {/* ============================================================ */}
      <AdminPricingModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        onSuccess={() => fetchData(true)}
        showToast={showToast}
      />

      <UserBalanceModal
        isOpen={Boolean(selectedUserForBalance)}
        user={selectedUserForBalance}
        onClose={() => setSelectedUserForBalance(null)}
        onSuccess={(uid, newBal) => {
          setUsers(prev => prev.map(u => u.id === uid ? { ...u, balance: newBal } : u));
          fetchData();
        }}
        showToast={showToast}
      />

      <UserSubscriptionModal
        isOpen={Boolean(selectedUserForSubscription)}
        user={selectedUserForSubscription}
        onClose={() => setSelectedUserForSubscription(null)}
        onSuccess={(uid, newTier, expAt) => {
          setUsers(prev => prev.map(u => u.id === uid ? { ...u, subscription_tier: newTier, tier_expires_at: expAt } : u));
          fetchData();
        }}
        showToast={showToast}
      />
    </div>
  );
}
