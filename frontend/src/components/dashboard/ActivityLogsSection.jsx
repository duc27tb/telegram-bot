import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Activity, 
  Terminal, 
  ChevronDown, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  Wallet,
  Users,
  SendHorizontal,
  ShieldCheck,
  ShoppingBag,
  Settings,
  Sparkles,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserActivities, formatFriendlyLogMessage } from '../../lib/api';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import LiveLogsConsole from './LiveLogsConsole';

export default function ActivityLogsSection({
  logs = [],
  accounts = [],
  refreshing = false,
  onRefresh,
  isRunning = false,
  defaultExpanded = null,
  setActiveTab
}) {
  const { user } = useAuth();

  // Trạng thái mở / đóng của thanh nhật ký
  const [isExpanded, setIsExpanded] = useState(() => {
    if (defaultExpanded !== null) return defaultExpanded;
    if (isRunning) return true;
    try {
      const saved = localStorage.getItem('telepulse_dashboard_logs_expanded');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  // Tự động mở khi chiến dịch được bật chạy
  useEffect(() => {
    if (isRunning) {
      setIsExpanded(true);
    }
  }, [isRunning]);

  const toggleExpand = () => {
    setIsExpanded(prev => {
      const next = !prev;
      try {
        localStorage.setItem('telepulse_dashboard_logs_expanded', String(next));
      } catch {}
      return next;
    });
  };

  // Sub-tabs: 'bot_logs' (Nhật ký rải tin) | 'user_activities' (Lịch sử hoạt động)
  const [activeSubTab, setActiveSubTab] = useState('bot_logs');
  const [userActivities, setUserActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [refreshingActivities, setRefreshingActivities] = useState(false);

  // Thống kê nhanh từ danh sách bot_logs
  const errorLogCount = useMemo(() => {
    return logs.filter(l => l.log_type === 'error' || l.log_type === 'warning' || l.log_type === 'flood_wait').length;
  }, [logs]);

  const successLogCount = useMemo(() => {
    return logs.filter(l => l.log_type === 'sent').length;
  }, [logs]);

  // Log mới nhất để hiển thị preview trên thanh
  const latestLog = useMemo(() => {
    if (!logs || logs.length === 0) return null;
    return logs[0];
  }, [logs]);

  // Nạp danh sách hoạt động tài khoản (user_activities)
  const fetchUserActivities = useCallback(async (isManual = false) => {
    if (!user) return;
    if (isManual) setRefreshingActivities(true);
    else setLoadingActivities(true);
    const start = Date.now();
    try {
      const res = await getUserActivities(user.id, 20);
      if (res && res.success && Array.isArray(res.data)) {
        setUserActivities(res.data);
      }
      const elapsed = Date.now() - start;
      if (isManual && elapsed < 600) {
        await new Promise(r => setTimeout(r, 600 - elapsed));
      }
    } catch (err) {
      console.error('Lỗi nạp hoạt động tài khoản:', err);
    } finally {
      setLoadingActivities(false);
      if (isManual) setRefreshingActivities(false);
    }
  }, [user]);

  // Nạp userActivities khi người dùng mở tab hoạt động
  useEffect(() => {
    if (isExpanded && activeSubTab === 'user_activities' && userActivities.length === 0) {
      fetchUserActivities(false);
    }
  }, [isExpanded, activeSubTab, userActivities.length, fetchUserActivities]);

  // Lắng nghe realtime các hoạt động mới trên user_activities
  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;

    const channel = supabase
      .channel(`dashboard_logs_activities_${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_activities',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        if (payload.new) {
          setUserActivities(prev => [payload.new, ...prev.slice(0, 19)]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Badge helper cho user activities
  const getActivityBadge = (type) => {
    const t = (type || '').toUpperCase();
    switch (t) {
      case 'DEPOSIT':
      case 'TOPUP':
        return { label: 'Nạp Tiền', color: 'var(--success)', bg: 'rgba(16, 185, 129, 0.14)', icon: Wallet };
      case 'PURCHASE':
      case 'BUY':
      case 'PAYMENT':
        return { label: 'Mua Gói', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.14)', icon: ShoppingBag };
      case 'AUTH':
      case 'LOGIN':
        return { label: 'Đăng Nhập', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.14)', icon: ShieldCheck };
      case 'TELEGRAM':
      case 'ACCOUNT':
        return { label: 'Telegram Bot', color: 'var(--primary-light)', bg: 'rgba(99, 102, 241, 0.14)', icon: Users };
      case 'CAMPAIGN':
        return { label: 'Chiến Dịch', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.14)', icon: SendHorizontal };
      default:
        return { label: 'Hệ Thống', color: 'var(--text-muted)', bg: 'rgba(255, 255, 255, 0.05)', icon: Settings };
    }
  };

  const formatActivityTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + 
        ' ' + d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={`activity-logs-section ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}>
      {/* =========================================================
          1. THANH XEM NHẬT KÝ HOẠT ĐỘNG (INTERACTIVE BAR)
          Click vào thanh để mở / thu gọn bảng nhật ký ra
      ========================================================= */}
      <div 
        className="activity-logs-bar"
        onClick={toggleExpand}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpand();
          }
        }}
        title={isExpanded ? 'Bấm để thu gọn bảng nhật ký' : 'Bấm để mở bảng nhật ký hoạt động'}
      >
        {/* Bên trái: Icon động & Tiêu đề & Tóm tắt */}
        <div className="activity-logs-bar-left">
          <div className={`activity-logs-icon-wrapper ${isRunning ? 'pulse-green' : ''}`}>
            <Activity size={20} />
            {isRunning && <span className="activity-live-ping" />}
          </div>

          <div className="activity-logs-text-group">
            <div className="activity-logs-title-row">
              <span className="activity-logs-title">Nhật Ký Hoạt Động</span>
              {isRunning ? (
                <span className="activity-status-badge running">
                  <span className="status-dot green" />
                  Đang Gửi Tin (Realtime)
                </span>
              ) : (
                <span className="activity-status-badge idle">
                  <span className="status-dot purple" />
                  {logs.length > 0 ? `${logs.length} Bản Ghi` : 'Sẵn Sàng'}
                </span>
              )}
            </div>

            {/* Subtitle / Preview thông tin */}
            <p className="activity-logs-subtitle">
              {!isExpanded ? (
                latestLog ? (
                  <span className="preview-snippet">
                    <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                    Mới nhất: <strong>{formatFriendlyLogMessage(latestLog.message)}</strong>
                  </span>
                ) : (
                  'Nhấp vào thanh này để mở bảng xem nhật ký hoạt động và tiến trình gửi tin'
                )
              ) : (
                'Đang hiển thị bảng nhật ký chi tiết • Nhấp vào thanh này để thu gọn'
              )}
            </p>
          </div>
        </div>

        {/* Bên phải: Thống kê nhanh + Nút mở / thu gọn */}
        <div className="activity-logs-bar-right">
          {/* Quick Metrics (ẩn trên màn hình quá nhỏ) */}
          <div className="activity-quick-pills">
            {successLogCount > 0 && (
              <span className="pill-success" title={`${successLogCount} tin đã gửi thành công`}>
                <CheckCircle2 size={13} />
                <span>{successLogCount} thành công</span>
              </span>
            )}
            {errorLogCount > 0 && (
              <span className="pill-warning" title={`${errorLogCount} cảnh báo hoặc lỗi gửi tin`}>
                <AlertTriangle size={13} />
                <span>{errorLogCount} lỗi/chờ</span>
              </span>
            )}
            <span className="pill-total">
              {logs.length} bản ghi
            </span>
          </div>

          {/* Nút Xem nhật ký / Thu gọn kèm Chevron */}
          <div className="activity-toggle-trigger">
            <span className="trigger-text">
              {isExpanded ? 'Thu gọn' : 'Xem nhật ký'}
            </span>
            <div className={`activity-chevron-box ${isExpanded ? 'rotated' : ''}`}>
              <ChevronDown size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          2. BẢNG NHẬT KÝ KHI MỞ RA (EXPANDED PANEL)
      ========================================================= */}
      {isExpanded && (
        <div className="activity-logs-body">
          {/* Sub-Tabs Điều Hướng */}
          <div className="activity-subtabs-bar">
            <div className="activity-subtabs-group">
              <button
                type="button"
                className={`activity-subtab-btn ${activeSubTab === 'bot_logs' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('bot_logs')}
              >
                <Terminal size={15} />
                <span>Nhật Ký Rải Tin Bot MTProto</span>
                <span className="tab-count-badge">{logs.length}</span>
              </button>

              <button
                type="button"
                className={`activity-subtab-btn ${activeSubTab === 'user_activities' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('user_activities')}
              >
                <Layers size={15} />
                <span>Lịch Sử Hoạt Động Tài Khoản</span>
                {userActivities.length > 0 && (
                  <span className="tab-count-badge purple">{userActivities.length}</span>
                )}
              </button>
            </div>

            {/* Nút Xem Trang Lịch Sử Đầy Đủ */}
            {setActiveTab && (
              <button
                type="button"
                className="btn-view-full-history"
                onClick={() => setActiveTab('activities')}
                title="Mở toàn màn hình trang Lịch Sử Hoạt Động & Nhật Ký"
              >
                <span>Xem trang lịch sử đầy đủ</span>
                <ExternalLink size={13} />
              </button>
            )}
          </div>

          {/* NỘI DUNG TAB 1: NHẬT KÝ RẢI TIN BOT MTPROTO (LIVELOGSCONSOLE) */}
          {activeSubTab === 'bot_logs' && (
            <div className="subtab-content-fade">
              <LiveLogsConsole
                logs={logs}
                accounts={accounts}
                refreshing={refreshing}
                onRefresh={onRefresh}
                autoRefreshActive={isRunning}
                isEmbedded={true}
              />
            </div>
          )}

          {/* NỘI DUNG TAB 2: LỊCH SỬ HOẠT ĐỘNG TÀI KHOẢN (USER_ACTIVITIES) */}
          {activeSubTab === 'user_activities' && (
            <div className="subtab-content-fade">
              <div className="user-activities-embedded-header">
                <div className="ua-header-info">
                  <h4 className="ua-title">Lịch Sử Tương Tác & Sự Kiện Hệ Thống Gần Nhất</h4>
                  <p className="ua-desc">
                    Ghi nhận tức thì các sự kiện nạp tiền VietQR, kết nối Telegram bot, thao tác chiến dịch và đăng nhập tài khoản.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fetchUserActivities(true)}
                  disabled={refreshingActivities}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '12px', padding: '6px 12px', gap: '6px' }}
                >
                  <RefreshCw size={13} className={refreshingActivities ? 'spin' : ''} />
                  <span>{refreshingActivities ? 'Đang tải...' : 'Làm mới'}</span>
                </button>
              </div>

              {loadingActivities ? (
                <div className="ua-loading-box">
                  <RefreshCw size={24} className="spin text-primary" />
                  <p>Đang tải lịch sử hoạt động...</p>
                </div>
              ) : userActivities.length === 0 ? (
                <div className="ua-empty-box">
                  <Activity size={32} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '8px' }} />
                  <p className="empty-title">Chưa có bản ghi hoạt động nào</p>
                  <p className="empty-desc">Các sự kiện nạp tiền, kết nối tài khoản hoặc cấu hình chiến dịch sẽ tự động xuất hiện tại đây.</p>
                </div>
              ) : (
                <div className="ua-list-scroll">
                  {userActivities.map((act) => {
                    const badge = getActivityBadge(act.action_type);
                    const IconComponent = badge.icon;
                    return (
                      <div key={act.id || act.created_at} className="ua-item-row">
                        <div 
                          className="ua-item-icon-box"
                          style={{ background: badge.bg, color: badge.color }}
                        >
                          <IconComponent size={16} />
                        </div>

                        <div className="ua-item-content">
                          <div className="ua-item-title-row">
                            <span className="ua-item-title">{act.action_title || 'Hoạt động hệ thống'}</span>
                            <span 
                              className="ua-item-badge"
                              style={{ background: badge.bg, color: badge.color }}
                            >
                              {badge.label}
                            </span>
                          </div>
                          {act.description && (
                            <p className="ua-item-desc">{act.description}</p>
                          )}
                        </div>

                        <div className="ua-item-time">
                          <Clock size={12} />
                          <span>{formatActivityTime(act.created_at)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
