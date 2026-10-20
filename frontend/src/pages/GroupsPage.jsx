import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Phone, 
  RefreshCw, 
  Plus, 
  Search, 
  Shield, 
  Check, 
  AlertCircle, 
  Copy, 
  Layers, 
  ChevronRight, 
  Radio, 
  ExternalLink,
  Loader2,
  CheckCircle2,
  Star,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { supabase } from '../lib/supabase';
import { getGroupsErrorStatus } from '../lib/api';
import AutoJoinModal from '../components/groups/AutoJoinModal';
import MasterGroupsDrawer from '../components/groups/MasterGroupsDrawer';
import BatchMasterConfirmModal from '../components/groups/BatchMasterConfirmModal';
import Tooltip from '../components/common/Tooltip';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// Bộ nhớ đệm RAM module-level: Giúp điều hướng vào /groups phản hồi tức thì 0ms, không bị nháy hay load lại
let cachedAccounts = null;
let cachedGroups = null;
let cachedSelectedAccountId = null;
let cachedGroupMetadata = null;
let cachedGroupErrors = null;

export default function GroupsPage() {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Khởi tạo từ cache nếu có (tránh màn hình trắng/spinner giật lag khi chuyển tab)
  const [accounts, setAccounts] = useState(() => cachedAccounts || []);
  const [groups, setGroups] = useState(() => cachedGroups || []);
  const [groupMetadata, setGroupMetadata] = useState(() => cachedGroupMetadata || {});
  const [groupErrors, setGroupErrors] = useState(() => cachedGroupErrors || {});
  const [loading, setLoading] = useState(() => !cachedAccounts);
  const [groupsLoading, setGroupsLoading] = useState(false);

  // Selected account ID
  const [selectedAccountId, setSelectedAccountId] = useState(() => {
    const urlAccId = searchParams.get('account') || searchParams.get('acc');
    if (urlAccId) return urlAccId;
    if (cachedSelectedAccountId) return cachedSelectedAccountId;
    if (cachedAccounts && cachedAccounts.length > 0) return cachedAccounts[0].id;
    return null;
  });

  // Filters & Search
  const [accountSearch, setAccountSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');

  // Scanning & Adding
  const [isScanning, setIsScanning] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChatId, setNewChatId] = useState('');
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);

  // Modals & Drawer for Master Groups & Auto-Join
  const [showAutoJoinModal, setShowAutoJoinModal] = useState(false);
  const [showMasterDrawer, setShowMasterDrawer] = useState(false);
  const [masterGroupChatIds, setMasterGroupChatIds] = useState(new Set());
  const [copiedId, setCopiedId] = useState(null);
  const [batchConfirmState, setBatchConfirmState] = useState({
    isOpen: false,
    action: 'add'
  });

  // Data fetch với mô hình Stale-While-Revalidate (SWR) không giật lag
  const fetchData = async (isManualRefresh = false) => {
    if (!user) return;
    if (!cachedAccounts || isManualRefresh) {
      if (!cachedAccounts) setLoading(true);
    }
    try {
      const [accRes, grpRes] = await Promise.all([
        supabase
          .from('telegram_accounts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('target_groups')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      const accData = accRes.data || [];
      const grpData = grpRes.data || [];

      cachedAccounts = accData;
      cachedGroups = grpData;

      setAccounts(accData);
      setGroups(grpData);

      // Tải song song danh sách chat_id các nhóm chung & metadata nhóm & trạng thái lỗi nhóm
      Promise.all([
        fetch(`${BACKEND_URL}/api/groups/master?user_id=${user.id}`).then(res => res.json()).catch(() => null),
        fetch(`${BACKEND_URL}/api/groups/metadata`).then(res => res.json()).catch(() => null),
        getGroupsErrorStatus(user.id).catch(() => null)
      ]).then(([masterData, metaData, errData]) => {
        if (masterData?.success && masterData.data) {
          const chatIds = new Set(masterData.data.map(g => String(g.chat_id)).filter(Boolean));
          setMasterGroupChatIds(chatIds);
        }
        if (metaData?.success && metaData.data) {
          cachedGroupMetadata = metaData.data;
          setGroupMetadata(metaData.data);
        }
        if (errData) {
          cachedGroupErrors = errData;
          setGroupErrors(errData);
        }
      }).catch(() => {});

      // Đồng bộ nick được chọn mà không gây re-render URL vòng lặp
      setSelectedAccountId(prev => {
        const urlAccId = searchParams.get('account') || searchParams.get('acc');
        if (urlAccId && accData.some(a => a.id === urlAccId)) {
          cachedSelectedAccountId = urlAccId;
          return urlAccId;
        }
        if (prev && accData.some(a => a.id === prev)) {
          cachedSelectedAccountId = prev;
          return prev;
        }
        if (accData.length > 0) {
          cachedSelectedAccountId = accData[0].id;
          return accData[0].id;
        }
        return null;
      });
    } catch (err) {
      console.error('Lỗi tải dữ liệu nhóm mục tiêu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Lắng nghe realtime bot_logs để cập nhật trạng thái lỗi nhóm tức thì khi spam đang chạy
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('groups_page_bot_logs_sync')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bot_logs', filter: `user_id=eq.${user.id}` },
        () => {
          getGroupsErrorStatus(user.id).then(errData => {
            if (errData) {
              cachedGroupErrors = errData;
              setGroupErrors(errData);
            }
          }).catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Sync selected account with URL changes khi người dùng bấm trực tiếp
  useEffect(() => {
    const urlAccId = searchParams.get('account') || searchParams.get('acc');
    if (urlAccId && urlAccId !== selectedAccountId && accounts.some(a => a.id === urlAccId)) {
      setSelectedAccountId(urlAccId);
      cachedSelectedAccountId = urlAccId;
    }
  }, [searchParams]);

  const handleSelectAccount = (accId) => {
    setSelectedAccountId(accId);
    cachedSelectedAccountId = accId;
    setSearchParams({ account: accId }, { replace: true });
  };

  // 1-Click Toggle Ngôi Sao: Tự động thêm hoặc gỡ khỏi Kho Nhóm Chung ngay tức thì, không cần popup
  const handleToggleMaster = async (grp) => {
    if (!user?.id) {
      alert('Vui lòng đăng nhập để lưu nhóm chung');
      return;
    }

    const key = String(grp.chat_id);
    const wasMaster = masterGroupChatIds.has(key);

    // Cập nhật giao diện lập tức (Optimistic UI)
    setMasterGroupChatIds(prev => {
      const next = new Set(prev);
      if (wasMaster) next.delete(key);
      else next.add(key);
      return next;
    });

    try {
      const res = await fetch(`${BACKEND_URL}/api/groups/master/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          group_title: grp.group_title || 'Nhóm Telegram',
          chat_id: grp.chat_id ? Number(grp.chat_id) : null,
          account_id: grp.account_id || selectedAccountId || null,
          invite_link: grp.invite_link || ''
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Lỗi máy chủ (${res.status})`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.detail || 'Lỗi xử lý');
      }

      showToast({
        title: data.is_master ? 'Đã thêm nhóm chung' : 'Đã gỡ nhóm chung',
        message: data.message,
        type: data.is_master ? 'success' : 'info'
      });
    } catch (err) {
      // Hoàn tác nếu có lỗi
      setMasterGroupChatIds(prev => {
        const next = new Set(prev);
        if (wasMaster) next.add(key);
        else next.delete(key);
        return next;
      });
      alert('Không thể cập nhật trạng thái nhóm chung: ' + (err.message || err));
    }
  };

  // Group count map by account_id
  const groupCountMap = useMemo(() => {
    const map = {};
    groups.forEach(g => {
      if (g.account_id) {
        map[g.account_id] = (map[g.account_id] || 0) + 1;
      }
    });
    return map;
  }, [groups]);

  // Filtered accounts for left sidebar
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const term = accountSearch.toLowerCase();
      const name = (acc.account_name || '').toLowerCase();
      const phone = (acc.phone_number || '').toLowerCase();
      return name.includes(term) || phone.includes(term);
    });
  }, [accounts, accountSearch]);

  // Selected account object
  const selectedAccount = useMemo(() => {
    return accounts.find(a => a.id === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  // Groups for selected account
  const accountGroups = useMemo(() => {
    if (!selectedAccountId) return [];
    return groups.filter(g => g.account_id === selectedAccountId);
  }, [groups, selectedAccountId]);

  // Filtered groups by search term
  const filteredGroups = useMemo(() => {
    return accountGroups.filter(grp => {
      const term = groupSearch.toLowerCase();
      const title = (grp.group_title || '').toLowerCase();
      const cid = String(grp.chat_id || '').toLowerCase();
      return title.includes(term) || cid.includes(term);
    });
  }, [accountGroups, groupSearch]);

  // Tổng số lượng thành viên tiếp cận của nick này
  const totalAccountMembers = useMemo(() => {
    return accountGroups.reduce((acc, g) => {
      const m = groupMetadata[String(g.chat_id)]?.members_count || 0;
      return acc + m;
    }, 0);
  }, [accountGroups, groupMetadata]);

  // Đếm số nhóm chung của nick này
  const masterGroupCountForAccount = useMemo(() => {
    return accountGroups.filter(g => masterGroupChatIds.has(String(g.chat_id))).length;
  }, [accountGroups, masterGroupChatIds]);

  const isAllMaster = useMemo(() => {
    if (accountGroups.length === 0) return false;
    return masterGroupCountForAccount === accountGroups.length;
  }, [accountGroups, masterGroupCountForAccount]);

  const [isTogglingMasterAll, setIsTogglingMasterAll] = useState(false);

  // 1-Click All: Mở modal xác nhận Ghim hoặc Bỏ ghim toàn bộ nhóm trong màn hình
  const handleToggleAllMaster = () => {
    if (!user?.id || !selectedAccountId || accountGroups.length === 0) return;
    const nextAction = isAllMaster ? 'remove' : 'add';
    setBatchConfirmState({
      isOpen: true,
      action: nextAction
    });
  };

  // Thực thi thao tác hàng loạt sau khi người dùng bấm xác nhận trong Modal
  const executeBatchToggleMaster = async () => {
    if (!user?.id || !selectedAccountId || accountGroups.length === 0) return;
    const nextAction = batchConfirmState.action;
    const targetChatIds = accountGroups.map(g => String(g.chat_id)).filter(Boolean);

    // Cập nhật giao diện tức thì (Optimistic UI)
    setMasterGroupChatIds(prev => {
      const next = new Set(prev);
      if (nextAction === 'add') {
        targetChatIds.forEach(id => next.add(id));
      } else {
        targetChatIds.forEach(id => next.delete(id));
      }
      return next;
    });

    setIsTogglingMasterAll(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/groups/master/toggle-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          account_id: selectedAccountId,
          action: nextAction,
          groups: accountGroups.map(g => ({
            chat_id: g.chat_id,
            group_title: g.group_title,
            invite_link: g.invite_link || ''
          }))
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Lỗi xử lý hàng loạt');
      }

      const data = await res.json();
      showToast({
        title: nextAction === 'add' ? 'Đã ghim toàn bộ' : 'Đã bỏ ghim toàn bộ',
        message: data.message || `Đã ${nextAction === 'add' ? 'thêm' : 'gỡ'} nhóm chung thành công`,
        type: nextAction === 'add' ? 'success' : 'info'
      });
      setBatchConfirmState(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      showToast({
        title: 'Lỗi',
        message: 'Không thể cập nhật nhóm chung hàng loạt: ' + (err.message || err),
        type: 'error'
      });
      // Re-fetch nếu có lỗi để đồng bộ lại
      fetch(`${BACKEND_URL}/api/groups/master?user_id=${user.id}`)
        .then(r => r.json())
        .then(d => {
          if (d.success && d.data) {
            setMasterGroupChatIds(new Set(d.data.map(g => String(g.chat_id)).filter(Boolean)));
          }
        })
        .catch(() => {});
    } finally {
      setIsTogglingMasterAll(false);
    }
  };

  // Scan groups from Telegram via Backend
  const handleScanGroups = async () => {
    if (!selectedAccountId) return;
    setIsScanning(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/accounts/scan-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: selectedAccountId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Không thể quét danh sách nhóm');
      }

      // Re-fetch groups from Supabase
      const { data: updatedGroups } = await supabase
        .from('target_groups')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (updatedGroups) setGroups(updatedGroups);

      // Cập nhật lại cache metadata số lượng thành viên
      fetch(`${BACKEND_URL}/api/groups/metadata`)
        .then(r => r.json())
        .then(d => {
          if (d.success && d.data) {
            cachedGroupMetadata = d.data;
            setGroupMetadata(d.data);
          }
        }).catch(() => {});

      showToast({
        title: 'Quét nhóm thành công!',
        message: data.message || `Đã tìm thấy ${data.count || 0} nhóm Telegram cho tài khoản này`,
        type: 'success'
      });
    } catch (err) {
      showToast({
        title: 'Lỗi quét nhóm',
        message: err.message,
        type: 'error'
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Toggle group is_active
  const handleToggleActive = async (group) => {
    const newStatus = !group.is_active;
    try {
      const { error } = await supabase
        .from('target_groups')
        .update({ is_active: newStatus })
        .eq('id', group.id);

      if (error) throw error;

      setGroups(prev => prev.map(g => g.id === group.id ? { ...g, is_active: newStatus } : g));
    } catch (err) {
      alert('Không thể cập nhật trạng thái nhóm');
    }
  };


  // Toggle all groups of selected account
  const handleToggleAll = async (targetActive) => {
    if (!selectedAccountId || accountGroups.length === 0) return;
    try {
      const { error } = await supabase
        .from('target_groups')
        .update({ is_active: targetActive })
        .eq('account_id', selectedAccountId);

      if (error) throw error;

      setGroups(prev => prev.map(g => g.account_id === selectedAccountId ? { ...g, is_active: targetActive } : g));
      showToast({
        title: targetActive ? 'Đã bật tất cả' : 'Đã tắt tất cả',
        message: `Đã ${targetActive ? 'kích hoạt' : 'tạm dừng'} toàn bộ nhóm của nick này`,
        type: 'success'
      });
    } catch (err) {
      alert('Lỗi thao tác');
    }
  };

  // Add manual group
  const handleAddManualGroup = async (e) => {
    e.preventDefault();
    if (!selectedAccountId || !newChatId) return;

    setIsSubmittingGroup(true);
    try {
      const parsedId = parseInt(newChatId.trim(), 10);
      if (isNaN(parsedId)) {
        throw new Error('ID nhóm phải là số nguyên (ví dụ: -100123456789)');
      }

      const { data, error } = await supabase
        .from('target_groups')
        .insert({
          user_id: user.id,
          account_id: selectedAccountId,
          chat_id: parsedId,
          group_title: newGroupTitle.trim() || 'Nhóm Telegram thủ công',
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setGroups([data, ...groups]);
        setNewChatId('');
        setNewGroupTitle('');
        setShowAddModal(false);
        showToast({
          title: 'Thêm nhóm thành công',
          message: `Đã thêm "${data.group_title}" vào danh sách`,
          type: 'success'
        });
      }
    } catch (err) {
      alert(err.message || 'Lỗi thêm nhóm thủ công');
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(String(text));
    const copyKey = id || text;
    setCopiedId(copyKey);
    setTimeout(() => {
      setCopiedId(prev => (prev === copyKey ? null : prev));
    }, 5000);
    showToast({
      title: 'Đã sao chép ID',
      message: `${text} đã được lưu vào clipboard`,
      type: 'info'
    });
  };

  // Chỉ hiển thị spinner toàn màn hình nếu hoàn toàn chưa có bất kỳ dữ liệu nào trong RAM
  if (loading && accounts.length === 0) {
    return (
      <div className="page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={36} className="spin" color="var(--primary)" />
      </div>
    );
  }

  return (
    <div className="page-body groups-page-container">
      {/* Header Bar */}
      <div className="page-header-flex" style={{ marginBottom: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="mobile-only">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Quản Lý Nhóm Mục Tiêu</h2>
            <span className="badge badge-primary" style={{ fontSize: '12px' }}>
              {groups.length} nhóm tổng
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Xem và cấu hình danh sách nhóm Telegram riêng biệt cho từng tài khoản spam
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
          <button 
            onClick={() => setShowMasterDrawer(true)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Mở kho nhóm dùng chung để nick mới có thể auto-join"
          >
            <Star size={15} color="#f59e0b" fill="#f59e0b" />
            <span>Kho Nhóm Chung</span>
          </button>

          <button 
            onClick={() => navigate('/accounts')}
            className="btn btn-secondary btn-sm"
          >
            <Users size={14} />
            <span>Quản Lý Nick</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Master Detail Layout */}
      <div className="groups-master-detail-grid">
        {/* LEFT COLUMN: ACCOUNTS LIST */}
        <div className="card groups-accounts-pane">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} color="var(--primary-light)" />
              <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)' }}>
                Tài Khoản ({accounts.length})
              </span>
            </div>
            <button 
              onClick={fetchData} 
              className="btn btn-secondary btn-sm" 
              style={{ padding: '4px 8px' }}
              title="Làm mới danh sách"
            >
              <RefreshCw size={12} />
            </button>
          </div>

          {/* Search Account */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT..."
              value={accountSearch}
              onChange={(e) => setAccountSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '32px', fontSize: '12px', height: '34px' }}
            />
          </div>

          {/* Account Items List */}
          <div className="groups-account-list">
            {filteredAccounts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '13px' }}>
                {accounts.length === 0 
                  ? 'Chưa có tài khoản nào. Vui lòng thêm tài khoản trước!'
                  : 'Không tìm thấy tài khoản phù hợp'}
              </div>
            ) : (
              filteredAccounts.map((acc) => {
                const isSelected = acc.id === selectedAccountId;
                const isOnline = acc.status === 'online';
                const count = groupCountMap[acc.id] || 0;

                return (
                  <div
                    key={acc.id}
                    onClick={() => handleSelectAccount(acc.id)}
                    className={`groups-account-item ${isSelected ? 'active' : ''}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div className="account-avatar-wrap">
                        <Phone size={15} />
                        <span className={`status-indicator-dot ${isOnline ? 'online' : 'offline'}`} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="account-item-name">
                          {acc.account_name || 'Tài khoản Telegram'}
                        </div>
                        <div className="account-item-phone">
                          {acc.phone_number}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span className={`badge ${isSelected ? 'badge-primary' : 'badge-neutral'}`} style={{ fontSize: '11px', padding: '2px 7px' }}>
                        {count} nhóm
                      </span>
                      <ChevronRight size={14} color={isSelected ? 'var(--primary-light)' : 'var(--text-muted)'} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: GROUPS LIST FOR SELECTED ACCOUNT */}
        <div className="card groups-content-pane">
          {!selectedAccount ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <Layers size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                Chưa chọn tài khoản
              </h3>
              <p style={{ fontSize: '13px' }}>
                Vui lòng chọn một tài khoản Telegram ở danh sách bên trái để xem và quản lý các nhóm.
              </p>
            </div>
          ) : (
            <>
              {/* Selected Account Header & Actions Bar */}
              <div className="groups-pane-header">
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                      {selectedAccount.account_name || 'Tài khoản'}
                    </h3>
                    <span style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--primary-light)', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                      {selectedAccount.phone_number}
                    </span>
                    <span className={`badge ${selectedAccount.status === 'online' ? 'badge-online' : 'badge-offline'}`}>
                      {selectedAccount.status === 'online' ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Tổng cộng: <strong style={{ color: 'var(--text-main)' }}>{accountGroups.length} nhóm</strong>
                    {totalAccountMembers > 0 && (
                      <span style={{ marginLeft: '6px', color: '#38bdf8', fontWeight: '600' }}>
                        • 👥 {totalAccountMembers.toLocaleString('vi-VN')} TV tiếp cận
                      </span>
                    )}
                    {' '}({accountGroups.filter(g => g.is_active).length} đang bật gửi tin)
                  </div>
                </div>

                <div className="groups-header-actions">
                  <button
                    onClick={() => setShowAutoJoinModal(true)}
                    className="btn btn-primary btn-sm"
                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    title="Tự động tham gia tất cả các nhóm chung"
                  >
                    <Zap size={14} />
                    <span>⚡ Auto-Join Nhóm Chung</span>
                  </button>

                  <button
                    onClick={handleScanGroups}
                    disabled={isScanning}
                    className="btn btn-secondary btn-sm"
                    title="Đọc toàn bộ nhóm/supergroup mà nick này đã tham gia trên Telegram"
                  >
                    {isScanning ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                    <span>{isScanning ? 'Đang quét...' : 'Quét lại từ Telegram'}</span>
                  </button>

                  <button
                    onClick={() => setShowAddModal(true)}
                    className="btn btn-secondary btn-sm"
                  >
                    <Plus size={14} />
                    <span>Thêm Thủ Công</span>
                  </button>
                </div>
              </div>

              {/* Group Filters & Batch Action Bar */}
              <div className="groups-toolbar-row">
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Lọc theo tên nhóm hoặc chat ID..."
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '32px', fontSize: '13px', height: '34px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
                  {/* Click All Star (Ghim / Bỏ sao tất cả) */}
                  <button
                    onClick={handleToggleAllMaster}
                    disabled={isTogglingMasterAll || accountGroups.length === 0}
                    className="btn btn-secondary btn-sm"
                    title={isAllMaster ? "Bỏ sao tất cả các nhóm của nick này" : "Đánh dấu tất cả nhóm làm Nhóm Chung"}
                    style={{
                      fontSize: '12px',
                      padding: '6px 11px',
                      color: isAllMaster ? '#f59e0b' : 'var(--text-secondary)',
                      borderColor: isAllMaster ? 'rgba(245, 158, 11, 0.4)' : undefined,
                      background: isAllMaster ? 'rgba(245, 158, 11, 0.08)' : undefined,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    {isTogglingMasterAll ? (
                      <Loader2 size={13} className="spin" color="#f59e0b" />
                    ) : (
                      <Star
                        size={13}
                        fill={isAllMaster ? '#f59e0b' : (masterGroupCountForAccount > 0 ? '#f59e0b' : 'none')}
                        color="#f59e0b"
                        style={{ opacity: isAllMaster || masterGroupCountForAccount > 0 ? 1 : 0.6 }}
                      />
                    )}
                    <span>{isAllMaster ? 'Bỏ sao hết' : 'Ghim sao hết'}</span>
                    {masterGroupCountForAccount > 0 && (
                      <span style={{
                        fontSize: '10px',
                        padding: '1px 5px',
                        borderRadius: '999px',
                        background: 'rgba(245, 158, 11, 0.2)',
                        color: '#f59e0b',
                        fontWeight: '600'
                      }}>
                        {masterGroupCountForAccount}/{accountGroups.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => handleToggleAll(true)}
                    className="btn btn-secondary btn-sm"
                    title="Kích hoạt gửi tin vào tất cả nhóm của nick này"
                    style={{ fontSize: '12px', padding: '6px 10px' }}
                  >
                    <CheckCircle2 size={13} color="var(--success)" />
                    <span>Bật hết</span>
                  </button>
                  <button
                    onClick={() => handleToggleAll(false)}
                    className="btn btn-secondary btn-sm"
                    title="Tắt gửi tin vào tất cả nhóm của nick này"
                    style={{ fontSize: '12px', padding: '6px 10px' }}
                  >
                    <span style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1 }}>✕</span>
                    <span>Tắt hết</span>
                  </button>
                </div>
              </div>

              {/* Groups List */}
              <div className="groups-card-list">
                {filteredGroups.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
                    <Layers size={36} style={{ opacity: 0.25, marginBottom: '12px' }} />
                    <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-main)', marginBottom: '4px' }}>
                      {accountGroups.length === 0 
                        ? 'Nick này chưa có nhóm mục tiêu nào' 
                        : 'Không tìm thấy nhóm khớp với từ khóa tìm kiếm'}
                    </div>
                    <div style={{ fontSize: '12px', maxWidth: '380px', margin: '0 auto 16px auto' }}>
                      {accountGroups.length === 0 
                        ? 'Nhấn "Quét lại từ Telegram" để tự động đồng bộ tất cả nhóm mà tài khoản đã tham gia, hoặc thêm thủ công qua ID.'
                        : 'Thử tìm kiếm với tên hoặc Chat ID khác.'}
                    </div>
                    {accountGroups.length === 0 && (
                      <button
                        onClick={handleScanGroups}
                        disabled={isScanning}
                        className="btn btn-primary btn-sm"
                        style={{ margin: '0 auto' }}
                      >
                        {isScanning ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                        <span>Quét Danh Sách Nhóm Ngay</span>
                      </button>
                    )}
                  </div>
                ) : (
                  filteredGroups.map((grp, index) => {
                    const isMaster = masterGroupChatIds.has(String(grp.chat_id));
                    const meta = groupMetadata[String(grp.chat_id)];
                    const membersCount = meta?.members_count || 0;

                    // Tìm lỗi gần nhất của nhóm linh hoạt theo chat_id, title hoặc title chuẩn hóa
                    const grpErr = (() => {
                      if (!groupErrors || typeof groupErrors !== 'object') return null;
                      const cid = String(grp.chat_id);
                      if (groupErrors[cid]) return groupErrors[cid];
                      if (grp.group_title && groupErrors[grp.group_title]) return groupErrors[grp.group_title];
                      if (grp.group_title && groupErrors[grp.group_title.trim()]) return groupErrors[grp.group_title.trim()];
                      const norm = (grp.group_title || '').trim().toLowerCase();
                      if (norm) {
                        for (const [k, v] of Object.entries(groupErrors)) {
                          if (k.trim().toLowerCase() === norm) return v;
                        }
                      }
                      return null;
                    })();

                    return (
                      <div key={grp.id} className={`group-row-item ${!grp.is_active ? 'inactive' : ''}`}>
                        <div className="group-row-main">
                          {/* 1-Click Toggle Ngôi Sao (Kho Nhóm Chung) - Trước Số Thứ Tự */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleMaster(grp);
                            }}
                            className={`btn-star-toggle ${isMaster ? 'active' : 'inactive'}`}
                            title={isMaster ? 'Đang là nhóm chung (Click để gỡ)' : 'Click để đặt làm nhóm chung'}
                          >
                            <Star
                              size={16}
                              fill={isMaster ? '#f59e0b' : 'none'}
                              color={isMaster ? '#f59e0b' : 'currentColor'}
                            />
                          </button>

                          <div className="group-index-badge">
                            {index + 1}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <Tooltip text={grp.group_title}>
                              <div className="group-title-text">
                                {grp.group_title}
                              </div>
                            </Tooltip>
                            <div className="group-id-row">
                              <span className="group-id-code">
                                ID: {grp.chat_id}
                              </span>
                              {(() => {
                                const isCopied = copiedId === grp.id || copiedId === grp.chat_id;
                                return (
                                  <button
                                    onClick={() => copyToClipboard(grp.chat_id, grp.id)}
                                    className={`btn-icon-subtle ${isCopied ? 'copied' : ''}`}
                                    title={isCopied ? "Đã sao chép vào clipboard!" : "Sao chép ID nhóm"}
                                    style={{ transition: 'all 0.2s ease' }}
                                  >
                                    {isCopied ? (
                                      <Check size={11} color="var(--success)" strokeWidth={2.5} />
                                    ) : (
                                      <Copy size={11} />
                                    )}
                                  </button>
                                );
                              })()}
                              {membersCount > 0 ? (
                                <span 
                                  className={`group-members-badge ${membersCount < 5 ? 'low-members' : ''}`}
                                  title={membersCount < 5 ? `${membersCount} thành viên (Dưới 5 người - Tự động bỏ qua)` : `${membersCount.toLocaleString('vi-VN')} thành viên`}
                                >
                                  <Users size={11} />
                                  <span>{membersCount.toLocaleString('vi-VN')} TV</span>
                                  {membersCount < 5 && <span style={{ fontSize: '10px', opacity: 0.85 }}>• Bỏ qua</span>}
                                </span>
                              ) : (
                                <span 
                                  className="group-members-badge empty" 
                                  title="Chưa có dữ liệu thành viên (quét lại nhóm để cập nhật)"
                                >
                                  <Users size={11} />
                                  <span>-- TV</span>
                                </span>
                              )}
                              {grpErr && grpErr.last_error && (
                                <Tooltip text={`Lỗi gần nhất: ${grpErr.last_error} ${grpErr.last_error_at ? `(${new Date(grpErr.last_error_at).toLocaleTimeString('vi-VN')})` : ''}`}>
                                  <span 
                                    className={`group-status-badge ${grpErr.is_forbidden || grpErr.is_skipped ? 'skipped' : 'warning'}`}
                                  >
                                    <AlertTriangle size={11} style={{ flexShrink: 0 }} />
                                    <span>
                                      {grpErr.is_forbidden
                                        ? 'Khóa chat (Chỉ Admin)'
                                        : grpErr.is_skipped
                                          ? 'Bỏ qua (Bị cấm chat)'
                                          : grpErr.is_banned
                                            ? 'Bị cấm chat'
                                            : grpErr.last_error.length > 25
                                              ? grpErr.last_error.slice(0, 25) + '...'
                                              : grpErr.last_error}
                                    </span>
                                  </span>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="group-row-actions">
                          {/* Switch Bật / Tắt */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '500', color: grp.is_active ? 'var(--success)' : 'var(--text-muted)' }}>
                              {grp.is_active ? 'Đang gửi' : 'Tạm dừng'}
                            </span>
                            <label className="switch switch-sm">
                              <input
                                type="checkbox"
                                checked={grp.is_active}
                                onChange={() => handleToggleActive(grp)}
                              />
                              <span className="slider"></span>
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL THÊM NHÓM THỦ CÔNG */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} color="var(--primary-light)" />
                <span>Thêm Nhóm Thủ Công</span>
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="btn-icon-subtle"
                style={{ fontSize: '18px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManualGroup}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '13px', marginBottom: '6px' }}>
                    Tài khoản Telegram được gán:
                  </label>
                  <div style={{ 
                    padding: '8px 12px', 
                    background: 'rgba(255, 255, 255, 0.04)', 
                    border: '1px solid var(--border-subtle)', 
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}>
                    {selectedAccount?.account_name} ({selectedAccount?.phone_number})
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '13px', marginBottom: '6px' }}>
                    Chat ID của Nhóm Telegram <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: -1001964880211"
                    className="form-input"
                    value={newChatId}
                    onChange={(e) => setNewChatId(e.target.value)}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    ID nhóm Telegram thường bắt đầu bằng số âm <code>-100...</code>
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '13px', marginBottom: '6px' }}>
                    Tên gợi nhớ nhóm (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Nhóm Rao Vặt Miền Bắc"
                    className="form-input"
                    value={newGroupTitle}
                    onChange={(e) => setNewGroupTitle(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGroup || !newChatId}
                  className="btn btn-primary btn-sm"
                >
                  {isSubmittingGroup ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
                  <span>Thêm Vào Danh Sách</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AUTO-JOIN NHÓM CHUNG */}
      <AutoJoinModal
        isOpen={showAutoJoinModal}
        onClose={() => setShowAutoJoinModal(false)}
        account={selectedAccount}
        onComplete={fetchData}
      />

      {/* SIDEBAR TRƯỢT PHẢI: KHO NHÓM CHUNG */}
      <MasterGroupsDrawer
        isOpen={showMasterDrawer}
        onClose={() => setShowMasterDrawer(false)}
        selectedAccount={selectedAccount}
        onOpenAutoJoin={() => setShowAutoJoinModal(true)}
        onUpdated={() => fetchData(true)}
      />

      {/* MODAL XÁC NHẬN THAO TÁC GHIM/BỎ GHIM HÀNG LOẠT TRONG MÀN HÌNH */}
      <BatchMasterConfirmModal
        isOpen={batchConfirmState.isOpen}
        onClose={() => setBatchConfirmState(prev => ({ ...prev, isOpen: false }))}
        action={batchConfirmState.action}
        account={selectedAccount}
        groupCount={batchConfirmState.action === 'add' ? accountGroups.length : masterGroupCountForAccount}
        onConfirm={executeBatchToggleMaster}
        isLoading={isTogglingMasterAll}
      />
    </div>
  );
}
