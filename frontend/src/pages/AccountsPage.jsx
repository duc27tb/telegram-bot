import React, { useState, useEffect } from 'react';
import { Plus, Play, Square, Trash2, RefreshCw, Phone, Shield, Loader2, Layers, ArrowRight, Zap, Crown, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import AutoJoinModal from '../components/groups/AutoJoinModal';
import ConfirmModal from '../components/common/ConfirmModal';

import { BACKEND_URL } from '../lib/api';

export default function AccountsPage({ onOpenAddAccount }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [groupCounts, setGroupCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const isVip = profile?.subscription_tier === 'VIP';
  const maxAccounts = isVip ? 10 : 3;
  const isQuotaExceeded = accounts.length >= maxAccounts;

  const handleAddAccountClick = () => {
    if (isQuotaExceeded) {
      if (!isVip) {
        setShowUpgradeModal(true);
      } else {
        alert(`Bạn đã đạt hạn mức tối đa ${maxAccounts} tài khoản của gói VIP.`);
      }
      return;
    }
    onOpenAddAccount();
  };

  // Auto-join modal state
  const [selectedAccountForAutoJoin, setSelectedAccountForAutoJoin] = useState(null);
  const [showAutoJoinModal, setShowAutoJoinModal] = useState(false);

  const fetchAccounts = async () => {
    if (!user) return;
    try {
      const [accRes, grpRes] = await Promise.all([
        supabase
          .from('telegram_accounts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('target_groups')
          .select('account_id')
          .eq('user_id', user.id)
      ]);

      if (accRes.data) setAccounts(accRes.data);
      if (grpRes.data) {
        const counts = {};
        grpRes.data.forEach(g => {
          if (g.account_id) {
            counts[g.account_id] = (counts[g.account_id] || 0) + 1;
          }
        });
        setGroupCounts(counts);
      }
    } catch (err) {
      console.error('Lỗi lấy tài khoản:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();

    // Lắng nghe thay đổi trạng thái tài khoản realtime
    const accChannel = supabase.channel('realtime_accounts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'telegram_accounts', filter: `user_id=eq.${user?.id}` }, () => {
        fetchAccounts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(accChannel);
    };
  }, [user]);

  const handleStartBot = async (accountId) => {
    setActionLoading(accountId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/accounts/start-bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || 'Không thể khởi động tài khoản này!');
      }
      fetchAccounts();
    } catch (e) {
      alert(`Không thể kết nối với Backend (${BACKEND_URL})!`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopBot = async (accountId) => {
    setActionLoading(accountId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/accounts/stop-bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || 'Lỗi khi dừng tài khoản!');
      }
      fetchAccounts();
    } catch (e) {
      alert(`Không thể kết nối với Backend (${BACKEND_URL})!`);
    } finally {
      setActionLoading(null);
    }
  };

  const [accountToDelete, setAccountToDelete] = useState(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const executeDeleteAccount = async () => {
    if (!accountToDelete?.id) return;
    setIsDeletingAccount(true);
    try {
      await supabase.from('telegram_accounts').delete().eq('id', accountToDelete.id);
      setAccounts(prev => prev.filter(a => a.id !== accountToDelete.id));
      setAccountToDelete(null);
    } catch (e) {
      alert('Lỗi xóa tài khoản');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="page-body">
      <div className="page-header-flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="mobile-only">
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Tài Khoản Telegram</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Quản lý và giám sát các nick Telegram được gán cho tài khoản của bạn
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto', flexWrap: 'wrap' }}>
          {/* Quota Indicator */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '999px',
            background: isQuotaExceeded ? 'rgba(239, 68, 68, 0.12)' : 'rgba(99, 102, 241, 0.12)',
            border: isQuotaExceeded ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(99, 102, 241, 0.25)',
            fontSize: '12px',
            fontWeight: '600',
            color: isQuotaExceeded ? '#f87171' : 'var(--primary-light)'
          }}>
            <span>Đã kết nối: <strong>{accounts.length}/{maxAccounts}</strong> nick</span>
            <span style={{ opacity: 0.5 }}>|</span>
            <span style={{ color: isVip ? '#fbbf24' : 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              {isVip ? <><Crown size={12} /> VIP Pro</> : 'Gói Miễn Phí'}
            </span>
          </div>

          <button onClick={handleAddAccountClick} className="btn btn-primary" style={{ flexShrink: 0 }}>
            <Plus size={16} />
            <span>Thêm Tài Khoản Mới</span>
          </button>
        </div>
      </div>

      {/* Quota limit banner for Free users */}
      {!isVip && accounts.length >= maxAccounts && (
        <div style={{
          marginTop: '16px',
          marginBottom: '8px',
          padding: '12px 18px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.14) 0%, rgba(217, 119, 6, 0.08) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#fbbf24' }}>
            <Crown size={18} style={{ flexShrink: 0 }} />
            <span>
              Bạn đã đạt giới hạn tối đa <strong>{accounts.length}/{maxAccounts}</strong> tài khoản của <strong>Gói Miễn Phí</strong>. Nâng cấp <strong>VIP Pro</strong> để mở khóa tới 10 tài khoản Telegram song song!
            </span>
          </div>
          <button
            onClick={() => navigate('/pricing')}
            className="btn btn-primary btn-sm"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              border: 'none',
              fontWeight: '700',
              padding: '6px 14px',
              fontSize: '12px',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Crown size={14} />
            <span>Nâng Cấp VIP (199k)</span>
          </button>
        </div>
      )}

      <div className="table-container">
        <table style={{ minWidth: '700px' }}>
          <thead>
            <tr>
              <th>Tài Khoản</th>
              <th>Số Điện Thoại</th>
              <th>Nhóm Mục Tiêu</th>
              <th>Trạng Thái</th>
              <th>Ngày Kết Nối</th>
              <th style={{ textAlign: 'right' }}>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                  <Loader2 className="spin" style={{ margin: '0 auto' }} />
                </td>
              </tr>
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                  Chưa có tài khoản nào được kết nối. Bấm "Thêm Tài Khoản Mới" để bắt đầu!
                </td>
              </tr>
            ) : (
              accounts.map((acc) => {
                const isOnline = acc.status === 'online';
                const isLoading = actionLoading === acc.id;
                const groupCount = groupCounts[acc.id] || 0;

                return (
                  <tr 
                    key={acc.id}
                    onClick={() => navigate(`/groups?account=${acc.id}`)}
                    className="clickable-row"
                    title="Bấm để xem danh sách nhóm của nick này"
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: 'rgba(99, 102, 241, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--primary-light)'
                        }}>
                          <Phone size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                            {acc.account_name || 'Tài khoản Telegram'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            API ID: {acc.api_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>{acc.phone_number}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', fontSize: '12px' }}>
                          <Layers size={13} />
                          <span>{groupCount} nhóm</span>
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/groups?account=${acc.id}`);
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Xem danh sách nhóm của tài khoản này"
                        >
                          <span>Xem nhóm</span>
                          <ArrowRight size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAccountForAutoJoin(acc);
                            setShowAutoJoinModal(true);
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--primary-light)' }}
                          title="Tự động tham gia các nhóm chung mẫu cho tài khoản này"
                        >
                          <Zap size={11} />
                          <span>⚡ Join Nhóm</span>
                        </button>
                      </div>
                    </td>
                    <td>
                      {acc.status === 'online' ? (
                        <span className="badge badge-online">Đang hoạt động</span>
                      ) : acc.status === 'error' ? (
                        <span 
                          className="badge" 
                          style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                          title="Phiên Telegram đã bị lỗi hoặc thu hồi. Hãy xóa và thêm lại nick!"
                        >
                          ⚠️ Lỗi phiên
                        </span>
                      ) : (
                        <span className="badge badge-offline">Tạm dừng</span>
                      )}
                    </td>
                    <td>
                      {new Date(acc.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        {isOnline ? (
                          <button
                            onClick={() => handleStopBot(acc.id)}
                            disabled={isLoading}
                            className="btn btn-secondary btn-sm"
                            title="Tạm dừng nick này"
                          >
                            <Square size={14} />
                            <span>Dừng</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartBot(acc.id)}
                            disabled={isLoading}
                            className="btn btn-primary btn-sm"
                            title={acc.status === 'error' ? "Thử bật lại hoặc xóa nick để kết nối lại" : "Khởi động nick này"}
                          >
                            <Play size={14} />
                            <span>{acc.status === 'error' ? 'Bật lại' : 'Bật'}</span>
                          </button>
                        )}
                        <button
                          onClick={() => setAccountToDelete(acc)}
                          className="btn btn-danger btn-sm"
                          title="Xóa tài khoản"
                        >
                          <Trash2 size={14} />
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

      {/* MODAL AUTO-JOIN NHÓM CHUNG */}
      <AutoJoinModal
        isOpen={showAutoJoinModal}
        onClose={() => {
          setShowAutoJoinModal(false);
          setSelectedAccountForAutoJoin(null);
        }}
        account={selectedAccountForAutoJoin}
        onComplete={fetchAccounts}
      />

      {/* MODAL XÁC NHẬN XÓA TÀI KHOẢN TRONG MÀN HÌNH */}
      <ConfirmModal
        isOpen={Boolean(accountToDelete)}
        onClose={() => setAccountToDelete(null)}
        onConfirm={executeDeleteAccount}
        title="Xác nhận xóa tài khoản"
        message={
          <span>
            Bạn có chắc chắn muốn xóa tài khoản Telegram <strong style={{ color: 'var(--text-main)' }}>{accountToDelete?.account_name || accountToDelete?.phone_number}</strong> ({accountToDelete?.phone_number})?
          </span>
        }
        subMessage="Tài khoản này sẽ bị xóa khỏi hệ thống và ngắt phiên đăng nhập hoàn toàn."
        confirmText="Xác nhận xóa"
        isLoading={isDeletingAccount}
      />

      {/* MODAL CẢNH BÁO GIỚI HẠN TÀI KHOẢN GÓI FREE */}
      {showUpgradeModal && (
        <div className="modal-overlay" onClick={() => setShowUpgradeModal(false)} style={{ zIndex: 120 }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '460px',
              padding: '28px',
              border: '2px solid rgba(245, 158, 11, 0.45)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(245, 158, 11, 0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
                }}>
                  <Crown size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>
                    Đạt Giới Hạn Tài Khoản
                  </h3>
                  <div style={{ fontSize: '12px', color: '#fbbf24', fontWeight: '600' }}>
                    Gói Miễn Phí (Tối đa 3 tài khoản)
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="btn-icon-subtle"
                style={{ cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 16px 0' }}>
              Bạn đang sử dụng <strong>Gói Miễn Phí</strong> đã kết nối đủ <strong>{accounts.length}/3 tài khoản Telegram</strong>. Để kết nối thêm và mở rộng quy mô phát tán tin nhắn, hãy nâng cấp lên <strong>VIP Pro</strong>!
            </p>

            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '10px',
              padding: '14px',
              marginBottom: '22px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#fbbf24', marginBottom: '8px', textTransform: 'uppercase' }}>
                Đặc quyền khi nâng cấp VIP Pro (199k):
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                  <Check size={15} color="#fbbf24" />
                  <span><strong>10 tài khoản Telegram</strong> chạy song song</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                  <Check size={15} color="#fbbf24" />
                  <span><strong>Live Chat 2 chiều</strong> tương tác khách hàng tức thì</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                  <Check size={15} color="#fbbf24" />
                  <span><strong>Chuyển tiếp báo cáo lead</strong> về Telegram cá nhân</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                  <Check size={15} color="#fbbf24" />
                  <span><strong>Spintax đa dạng mẫu tin</strong> chống trùng lặp</span>
                </li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="btn btn-secondary"
                style={{ padding: '9px 16px', fontSize: '13px' }}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUpgradeModal(false);
                  navigate('/pricing');
                }}
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  border: 'none',
                  fontWeight: '700',
                  padding: '9px 18px',
                  fontSize: '13px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#fff',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
                }}
              >
                <Crown size={16} />
                <span>Nâng Cấp VIP Ngay (199k)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
