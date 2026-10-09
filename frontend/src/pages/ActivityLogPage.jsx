import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Wallet, 
  Users, 
  SendHorizontal, 
  ShieldCheck, 
  Settings, 
  Search, 
  RefreshCw, 
  Clock, 
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserActivities } from '../lib/api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const CATEGORIES = [
  { id: 'ALL', label: 'Toàn Bộ Lịch Sử', icon: Layers },
  { id: 'AUTH', label: 'Đăng Nhập', icon: ShieldCheck },
  { id: 'DEPOSIT', label: 'Nạp Tiền', icon: Wallet },
  { id: 'TELEGRAM', label: 'Tài Khoản Telegram', icon: Users },
  { id: 'CAMPAIGN', label: 'Chiến Dịch', icon: SendHorizontal },
];

export default function ActivityLogPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchActivities = async (isManual = false) => {
    if (!user) return;
    setLoading(true);
    try {
      const minSpin = isManual ? new Promise(resolve => setTimeout(resolve, 600)) : Promise.resolve();
      const [res] = await Promise.all([
        getUserActivities(user.id, 100),
        minSpin
      ]);
      if (res && res.success && res.data) {
        setActivities(res.data);
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách hoạt động:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [user]);

  // Lắng nghe Realtime trên Supabase bảng user_activities
  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;

    const channel = supabase
      .channel(`activities_realtime_${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_activities',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        if (payload.new) {
          setActivities(prev => [payload.new, ...prev]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filteredActivities = activities.filter((act) => {
    const type = (act.action_type || '').toUpperCase();
    let matchesCat = false;
    if (activeCategory === 'ALL') {
      matchesCat = true;
    } else if (activeCategory === 'AUTH') {
      matchesCat = type === 'AUTH' || type === 'LOGIN';
    } else if (activeCategory === 'DEPOSIT') {
      matchesCat = type === 'DEPOSIT' || type === 'TOPUP';
    } else if (activeCategory === 'PURCHASE') {
      matchesCat = type === 'PURCHASE' || type === 'BUY' || type === 'PAYMENT';
    } else if (activeCategory === 'TELEGRAM') {
      matchesCat = type === 'TELEGRAM' || type === 'ACCOUNT';
    } else if (activeCategory === 'CAMPAIGN') {
      matchesCat = type === 'CAMPAIGN';
    } else {
      matchesCat = type === activeCategory;
    }

    const matchesSearch = !searchTerm || 
      (act.action_title && act.action_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (act.description && act.description.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCat && matchesSearch;
  });

  const getActionBadge = (type) => {
    const t = (type || '').toUpperCase();
    switch (t) {
      case 'DEPOSIT':
      case 'TOPUP':
        return { label: 'Nạp Tiền', color: 'var(--success)', bg: 'rgba(16, 185, 129, 0.14)', icon: Wallet };
      case 'PURCHASE':
      case 'BUY':
      case 'PAYMENT':
        return { label: 'Mua Bán', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.14)', icon: ShoppingBag };
      case 'AUTH':
      case 'LOGIN':
        return { label: 'Đăng Nhập', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.14)', icon: ShieldCheck };
      case 'TELEGRAM':
      case 'ACCOUNT':
        return { label: 'Telegram', color: 'var(--primary-light)', bg: 'rgba(99, 102, 241, 0.14)', icon: Users };
      case 'CAMPAIGN':
        return { label: 'Chiến Dịch', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.14)', icon: SendHorizontal };
      default:
        return { label: 'Hệ Thống', color: 'var(--text-muted)', bg: 'rgba(255, 255, 255, 0.05)', icon: Settings };
    }
  };

  const depositCount = activities.filter(a => {
    const t = (a.action_type || '').toUpperCase();
    return t === 'DEPOSIT' || t === 'TOPUP';
  }).length;

  const purchaseCount = activities.filter(a => {
    const t = (a.action_type || '').toUpperCase();
    return t === 'PURCHASE' || t === 'BUY' || t === 'PAYMENT';
  }).length;

  const authCount = activities.filter(a => {
    const t = (a.action_type || '').toUpperCase();
    return t === 'AUTH' || t === 'LOGIN';
  }).length;

  return (
    <div className="page-body activity-page-container">
      {/* 1. Header & Thống Kê Tổng Quan (Click để lọc nhanh) */}
      <div className="activity-stats-grid">
        <div 
          className={`activity-stat-card ${activeCategory === 'ALL' ? 'active-filter' : ''}`}
          onClick={() => setActiveCategory('ALL')}
          title="Bấm để lọc: Toàn bộ lịch sử"
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.2)' }}>
            <Layers size={22} color="var(--primary-light)" />
          </div>
          <div>
            <div className="stat-label">Toàn bộ lịch sử</div>
            <div className="stat-value">{activities.length}</div>
          </div>
        </div>

        <div 
          className={`activity-stat-card ${activeCategory === 'AUTH' ? 'active-filter' : ''}`}
          onClick={() => setActiveCategory('AUTH')}
          title="Bấm để lọc: Lịch sử đăng nhập"
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-icon-wrapper" style={{ background: 'rgba(6, 182, 212, 0.1)', borderColor: 'rgba(6, 182, 212, 0.2)' }}>
            <ShieldCheck size={22} color="#22d3ee" />
          </div>
          <div>
            <div className="stat-label">Đăng nhập & Bảo mật</div>
            <div className="stat-value" style={{ color: '#22d3ee' }}>{authCount}</div>
          </div>
        </div>

        <div 
          className={`activity-stat-card ${activeCategory === 'DEPOSIT' ? 'active-filter' : ''}`}
          onClick={() => setActiveCategory('DEPOSIT')}
          title="Bấm để lọc: Lịch sử nạp tiền"
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            <Wallet size={22} color="var(--success)" />
          </div>
          <div>
            <div className="stat-label">Nạp tiền vào ví</div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>{depositCount}</div>
          </div>
        </div>

        <div 
          className={`activity-stat-card ${activeCategory === 'PURCHASE' ? 'active-filter' : ''}`}
          onClick={() => setActiveCategory('PURCHASE')}
          title="Bấm để lọc: Lịch sử mua bán & chi tiêu"
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)' }}>
            <ShoppingBag size={22} color="#fbbf24" />
          </div>
          <div>
            <div className="stat-label">Mua bán & Chi tiêu</div>
            <div className="stat-value" style={{ color: '#fbbf24' }}>{purchaseCount}</div>
          </div>
        </div>
      </div>

      {/* 2. Bộ Lọc & Tìm Kiếm */}
      <div className="card activity-filter-card">
        <div className="activity-filter-bar">
          {/* Tabs phân loại */}
          <div className="activity-category-tabs">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`activity-tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <Icon size={15} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Ô tìm kiếm & Nút làm mới */}
          <div className="activity-search-actions">
            <div className="activity-search-wrap">
              <Search size={15} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Tìm kiếm nhật ký..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="activity-search-input"
              />
            </div>
            <button
              type="button"
              onClick={() => fetchActivities(true)}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              title="Làm mới danh sách"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Danh Sách Lịch Sử Hoạt Động (Timeline) */}
      <div className="card activity-list-card">
        <div className="activity-list-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="var(--primary-light)" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>
              Dòng Thời Gian Hoạt Động ({filteredActivities.length})
            </h3>
          </div>
          <div className="activity-realtime-badge">
            <span className="live-dot" />
            <span>Đang ghi nhận 24/7</span>
          </div>
        </div>

        {filteredActivities.length === 0 ? (
          <div className="activity-empty-state">
            <Activity size={38} color="var(--text-dim)" />
            <p style={{ margin: '10px 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>
              Không tìm thấy nhật ký hoạt động nào phù hợp.
            </p>
          </div>
        ) : (
          <div className="activity-timeline">
            {filteredActivities.map((act) => {
              const badge = getActionBadge(act.action_type);
              const BadgeIcon = badge.icon;
              const dateStr = act.created_at ? new Date(act.created_at).toLocaleString('vi-VN') : 'Vừa xong';
              
              return (
                <div key={act.id} className="activity-timeline-item">
                  <div className="timeline-node">
                    <div className="timeline-icon-box" style={{ background: badge.bg, color: badge.color, borderColor: badge.color }}>
                      <BadgeIcon size={15} />
                    </div>
                    <div className="timeline-line" />
                  </div>

                  <div className="timeline-content-card">
                    <div className="timeline-card-header">
                      <div className="timeline-title-group">
                        <span className="timeline-action-title">{act.action_title}</span>
                        <span 
                          className="activity-badge-pill" 
                          style={{ color: badge.color, background: badge.bg }}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div className="timeline-timestamp">
                        <Clock size={12} />
                        <span>{dateStr}</span>
                      </div>
                    </div>

                    {act.description && (
                      <div className="timeline-desc">{act.description}</div>
                    )}

                    {act.metadata && Object.keys(act.metadata).length > 0 && (
                      <div className="timeline-metadata-tags">
                        {Object.entries(act.metadata).map(([k, v]) => (
                          <span key={k} className="meta-tag">
                            <strong>{k}:</strong> {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
