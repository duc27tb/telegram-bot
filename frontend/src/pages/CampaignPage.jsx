import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Sliders, 
  MessageSquare, 
  Plus, 
  Trash2, 
  Save, 
  Check, 
  Layers, 
  ArrowRight, 
  Edit3, 
  Search, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  Play, 
  Square, 
  Radio, 
  Terminal, 
  AlertTriangle, 
  RefreshCw, 
  Zap, 
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { supabase } from '../lib/supabase';
import { 
  startCampaign, 
  stopCampaign, 
  getCampaignStatus, 
  getCampaignLogs,
  updateCampaignSettings 
} from '../lib/api';
import ConfirmModal from '../components/common/ConfirmModal';

export default function CampaignPage() {
  const { user, profile } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const isVip = profile?.subscription_tier === 'VIP';
  
  // Campaign Runner States
  const [isRunning, setIsRunning] = useState(false);
  const [isTogglingCampaign, setIsTogglingCampaign] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [campaignLogs, setCampaignLogs] = useState([]);
  const [refreshingLogs, setRefreshingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState('all'); // 'all' | 'error' | 'sent'
  const [logSearch, setLogSearch] = useState('');

  // Settings
  const [groupDelay, setGroupDelay] = useState(120);
  const [cycleDelay, setCycleDelay] = useState(1200);
  const [forwardTelegram, setForwardTelegram] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Message Templates List
  const [templates, setTemplates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Editor State (Bên trái: Thêm / Sửa)
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [editorIsActive, setEditorIsActive] = useState(true);
  const [isSubmittingTemplate, setIsSubmittingTemplate] = useState(false);

  // Delete Confirm Modal State
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);

  // Target Groups Raw State
  const [rawGroups, setRawGroups] = useState([]);

  // Loading
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async (isManual = false) => {
    if (!user) return;
    if (isManual) setRefreshingLogs(true);
    const start = Date.now();
    try {
      // 1. Lấy trực tiếp từ Backend Service Role API (Đảm bảo 100% nhận đủ log)
      const apiRes = await getCampaignLogs(user.id, 50);
      if (apiRes && apiRes.success && Array.isArray(apiRes.data)) {
        setCampaignLogs(apiRes.data);
      } else {
        // Fallback Supabase client
        const res = await supabase
          .from('bot_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (res.data) setCampaignLogs(res.data);
      }
      const elapsed = Date.now() - start;
      if (isManual && elapsed < 600) {
        await new Promise(r => setTimeout(r, 600 - elapsed));
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (isManual) setRefreshingLogs(false);
    }
  }, [user]);

  // Tự động làm mới log mỗi 4 giây khi chiến dịch đang phát tin (Auto-Polling Stream)
  useEffect(() => {
    if (!isRunning || !user) return;
    const timer = setInterval(() => {
      loadLogs(false);
    }, 4000);
    return () => clearInterval(timer);
  }, [isRunning, user, loadLogs]);

  useEffect(() => {
    if (!user) return;

    const loadCampaignData = async () => {
      try {
        const [campRes, tmplRes, grpRes, accRes, statusRes] = await Promise.all([
          supabase.from('campaign_settings').select('*').eq('user_id', user.id).single(),
          supabase.from('message_templates').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('target_groups').select('id, is_active, account_id').eq('user_id', user.id),
          supabase.from('telegram_accounts').select('id, phone_number, status, account_name').eq('user_id', user.id),
          getCampaignStatus(user.id).catch(() => null)
        ]);

        if (campRes.data) {
          setGroupDelay(campRes.data.group_delay_seconds || 120);
          setCycleDelay(campRes.data.cycle_delay_seconds || 1200);
          setForwardTelegram(campRes.data.forward_to_telegram ?? true);
        }
        if (tmplRes.data) {
          setTemplates(tmplRes.data);
        }
        if (grpRes.data) {
          setRawGroups(grpRes.data);
        }
        if (accRes.data) {
          setAccounts(accRes.data);
        }
        if (statusRes) {
          setIsRunning(Boolean(statusRes.is_task_running || statusRes.settings?.is_running));
        }
      } catch (e) {
        console.error('Lỗi tải dữ liệu Campaign:', e);
      } finally {
        setLoading(false);
      }
    };

    loadCampaignData();
    loadLogs(false);

    // Lắng nghe bot_logs, telegram_accounts và target_groups realtime từ Supabase
    const realtimeChannel = supabase.channel('campaign_realtime_events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bot_logs', filter: `user_id=eq.${user.id}` }, (payload) => {
        setCampaignLogs(prev => [payload.new, ...prev.slice(0, 24)]);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'telegram_accounts', filter: `user_id=eq.${user.id}` }, () => {
        supabase.from('telegram_accounts').select('id, phone_number, status, account_name').eq('user_id', user.id).then(r => {
          if (r.data) setAccounts(r.data);
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'target_groups', filter: `user_id=eq.${user.id}` }, () => {
        supabase.from('target_groups').select('id, is_active, account_id').eq('user_id', user.id).then(r => {
          if (r.data) setRawGroups(r.data);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, [user, loadLogs]);

  // Các tài khoản đang Online và số liệu nhóm khả dụng theo thời gian thực
  const onlineAccountIds = useMemo(() => {
    return new Set(accounts.filter(a => a.status === 'online').map(a => a.id));
  }, [accounts]);

  const groupMetrics = useMemo(() => {
    const total = rawGroups.length;
    const activeTotal = rawGroups.filter(g => g.is_active).length;
    // Nhóm thực sự phát tin: nhóm đang active VÀ (là nhóm chung HOẶC thuộc nick đang online)
    const readyToBroadcast = rawGroups.filter(g => g.is_active && (!g.account_id || onlineAccountIds.has(g.account_id))).length;
    const pausedWithOfflineAcc = rawGroups.filter(g => g.is_active && g.account_id && !onlineAccountIds.has(g.account_id)).length;

    return {
      total,
      activeTotal,
      readyToBroadcast,
      pausedWithOfflineAcc
    };
  }, [rawGroups, onlineAccountIds]);

  // Bắt đầu hoặc Tạm dừng chiến dịch rải tin tự động (UC-14 Core)
  const handleToggleCampaign = async () => {
    if (!isRunning) {
      if (accounts.length === 0) {
        showToast({
          title: 'Chưa có tài khoản Telegram',
          message: 'Vui lòng kết nối ít nhất 1 tài khoản Telegram trước khi khởi động chiến dịch rải tin!',
          type: 'warning'
        });
        return;
      }
      if (onlineAccountIds.size === 0) {
        showToast({
          title: 'Tất cả tài khoản đang Tạm dừng',
          message: 'Vui lòng bật lại ít nhất 1 tài khoản Telegram ở trang Tài Khoản trước khi phát tin!',
          type: 'warning'
        });
        return;
      }
      if (templates.filter(t => t.is_active).length === 0) {
        showToast({
          title: 'Chưa có mẫu tin nhắn',
          message: 'Vui lòng tạo và kích hoạt ít nhất 1 mẫu tin nhắn Spintax để xoay vòng!',
          type: 'warning'
        });
        return;
      }
      if (groupMetrics.readyToBroadcast === 0) {
        showToast({
          title: 'Không có nhóm khả dụng',
          message: groupMetrics.pausedWithOfflineAcc > 0
            ? `Tất cả ${groupMetrics.pausedWithOfflineAcc} nhóm đang tạm nghỉ vì tài khoản kết nối đang tắt. Hãy bật lại nick để phát tin!`
            : 'Vui lòng quét hoặc thêm nhóm Telegram mục tiêu đang hoạt động!',
          type: 'warning'
        });
        return;
      }

      setIsTogglingCampaign(true);
      const start = Date.now();
      try {
        const res = await startCampaign(user.id);
        const elapsed = Date.now() - start;
        if (elapsed < 600) await new Promise(r => setTimeout(r, 600 - elapsed));

        if (res && res.success) {
          setIsRunning(true);
          showToast({
            title: 'Khởi Động Thành Công',
            message: 'Chiến dịch rải tin tự động trên toàn bộ nhóm Telegram đã bắt đầu!',
            type: 'success'
          });
          loadLogs(false);
        } else {
          showToast({
            title: 'Lỗi',
            message: res?.error || 'Không thể khởi động chiến dịch rải tin',
            type: 'error'
          });
        }
      } catch (err) {
        showToast({ title: 'Lỗi', message: 'Không thể kết nối máy chủ backend!', type: 'error' });
      } finally {
        setIsTogglingCampaign(false);
      }
    } else {
      // Dừng chiến dịch
      setIsTogglingCampaign(true);
      const start = Date.now();
      try {
        const res = await stopCampaign(user.id);
        const elapsed = Date.now() - start;
        if (elapsed < 600) await new Promise(r => setTimeout(r, 600 - elapsed));

        setIsRunning(false);
        showToast({
          title: 'Đã Tạm Dừng',
          message: 'Đã tạm dừng tiến trình gửi tin tự động.',
          type: 'info'
        });
        loadLogs(false);
      } catch (err) {
        showToast({ title: 'Lỗi', message: 'Không thể dừng chiến dịch', type: 'error' });
      } finally {
        setIsTogglingCampaign(false);
      }
    }
  };

  // Lưu cấu hình thời gian delay & chuyển tiếp tin nhắn (Giữ nguyên)
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await updateCampaignSettings(user.id, {
        group_delay_seconds: parseInt(groupDelay, 10),
        cycle_delay_seconds: parseInt(cycleDelay, 10),
        forward_to_telegram: isVip ? forwardTelegram : false
      });
      setSavedSuccess(true);
      showToast({
        title: 'Thành công',
        message: 'Đã lưu cấu hình thời gian delay & chuyển tiếp!',
        type: 'success'
      });
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      showToast({
        title: 'Lỗi',
        message: 'Không thể lưu cài đặt chiến dịch: ' + (e.message || e),
        type: 'error'
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Chọn một tin nhắn từ danh sách bên phải để nạp sang bên trái chỉnh sửa
  const handleSelectTemplate = (tmpl) => {
    setEditingTemplateId(tmpl.id);
    setEditorContent(tmpl.content);
    setEditorIsActive(tmpl.is_active ?? true);
  };

  // Hủy chỉnh sửa để chuyển về chế độ thêm tin nhắn mới
  const handleResetToNew = () => {
    setEditingTemplateId(null);
    setEditorContent('');
    setEditorIsActive(true);
  };

  // Lưu tin nhắn (Tạo mới hoặc Cập nhật)
  const handleSubmitEditor = async (e) => {
    e.preventDefault();
    const content = editorContent.trim();
    if (!content) {
      showToast({ title: 'Cảnh báo', message: 'Vui lòng nhập nội dung tin nhắn!', type: 'warning' });
      return;
    }

    // Giới hạn Gói Miễn Phí: Chỉ cho phép 1 loại tin nhắn duy nhất
    if (!editingTemplateId && !isVip && templates.length >= 1) {
      showToast({
        title: 'Giới Hạn Gói Miễn Phí',
        message: 'Gói Miễn Phí (Free) chỉ cho phép lưu tối đa 1 mẫu tin nhắn duy nhất. Vui lòng nâng cấp VIP Pro để tạo nhiều mẫu tin xoay vòng!',
        type: 'warning'
      });
      return;
    }

    setIsSubmittingTemplate(true);
    try {
      if (editingTemplateId) {
        // Cập nhật tin nhắn đã chọn
        const { data, error } = await supabase
          .from('message_templates')
          .update({
            content,
            is_active: editorIsActive
          })
          .eq('id', editingTemplateId)
          .select()
          .single();

        if (error) throw error;

        setTemplates(prev => prev.map(t => (t.id === editingTemplateId ? data : t)));
        showToast({
          title: 'Đã cập nhật',
          message: 'Nội dung tin nhắn mẫu đã được cập nhật thành công!',
          type: 'success'
        });
      } else {
        // Thêm tin nhắn mới
        const { data, error } = await supabase
          .from('message_templates')
          .insert({
            user_id: user.id,
            content,
            is_active: editorIsActive
          })
          .select()
          .single();

        if (error) throw error;

        setTemplates(prev => [data, ...prev]);
        setEditorContent('');
        showToast({
          title: 'Đã thêm',
          message: 'Đã thêm mẫu tin nhắn mới vào kho xoay vòng!',
          type: 'success'
        });
      }
    } catch (err) {
      showToast({
        title: 'Lỗi',
        message: 'Không thể lưu mẫu tin: ' + (err.message || err),
        type: 'error'
      });
    } finally {
      setIsSubmittingTemplate(false);
    }
  };

  // Bật/tắt trạng thái kích hoạt trực tiếp từ danh sách bên phải
  const handleToggleTemplateActive = async (e, tmpl) => {
    e.stopPropagation();
    const newStatus = !tmpl.is_active;

    // Optimistic UI
    setTemplates(prev => prev.map(t => (t.id === tmpl.id ? { ...t, is_active: newStatus } : t)));
    if (editingTemplateId === tmpl.id) {
      setEditorIsActive(newStatus);
    }

    try {
      const { error } = await supabase
        .from('message_templates')
        .update({ is_active: newStatus })
        .eq('id', tmpl.id);

      if (error) throw error;
      showToast({
        title: newStatus ? 'Đã bật mẫu tin' : 'Đã tắt mẫu tin',
        message: `Mẫu tin đã được ${newStatus ? 'kích hoạt' : 'tạm dừng'} gửi`,
        type: newStatus ? 'success' : 'info'
      });
    } catch (err) {
      // Revert if error
      setTemplates(prev => prev.map(t => (t.id === tmpl.id ? { ...t, is_active: !newStatus } : t)));
      showToast({ title: 'Lỗi', message: 'Không thể thay đổi trạng thái', type: 'error' });
    }
  };

  // Xóa mẫu tin nhắn (sử dụng ConfirmModal)
  const executeDeleteTemplate = async () => {
    if (!templateToDelete?.id) return;
    setIsDeletingTemplate(true);
    try {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', templateToDelete.id);

      if (error) throw error;

      setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
      if (editingTemplateId === templateToDelete.id) {
        handleResetToNew();
      }
      showToast({
        title: 'Đã xóa',
        message: 'Đã xóa mẫu tin nhắn khỏi kho xoay vòng',
        type: 'info'
      });
      setTemplateToDelete(null);
    } catch (err) {
      showToast({
        title: 'Lỗi',
        message: 'Không thể xóa mẫu tin: ' + (err.message || err),
        type: 'error'
      });
    } finally {
      setIsDeletingTemplate(false);
    }
  };

  // Lọc danh sách theo từ khóa tìm kiếm
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const q = searchQuery.toLowerCase();
    return templates.filter(t => (t.content || '').toLowerCase().includes(q));
  }, [templates, searchQuery]);

  const activeCount = useMemo(() => {
    return templates.filter(t => t.is_active).length;
  }, [templates]);

  const errorLogCount = useMemo(() => {
    return campaignLogs.filter(l => l.log_type === 'error' || l.log_type === 'warning' || l.log_type === 'flood_wait').length;
  }, [campaignLogs]);

  const successLogCount = useMemo(() => {
    return campaignLogs.filter(l => l.log_type === 'sent').length;
  }, [campaignLogs]);

  const filteredCampaignLogs = useMemo(() => {
    return campaignLogs.filter(log => {
      const isSent = log.log_type === 'sent';
      const isError = log.log_type === 'error' || log.log_type === 'warning' || log.log_type === 'flood_wait';
      if (logFilter === 'error' && !isError) return false;
      if (logFilter === 'sent' && !isSent) return false;
      if (logSearch.trim()) {
        const q = logSearch.toLowerCase();
        return (log.message || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [campaignLogs, logFilter, logSearch]);

  return (
    <div className="page-body">
      {/* Tiêu đề trang (chỉ hiển thị trên Mobile, Desktop đã có trên Header) */}
      <div className="mobile-only" style={{ marginBottom: '18px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>
          Cấu Hình Chiến Dịch & Kho Tin Nhắn
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
          Thiết lập độ trễ an toàn và quản lý nội dung tin nhắn rải xoay vòng tự động
        </p>
      </div>

      {/* ============================================================ */}
      {/* 🚀 BẢNG ĐIỀU KHIỂN CHIẾN DỊCH PHÁT TIN TRUNG TÂM (UC-14) */}
      {/* ============================================================ */}
      <div className="card" style={{
        marginBottom: '20px',
        padding: '24px',
        background: isRunning 
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(99, 102, 241, 0.06) 100%)' 
          : 'linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(15, 23, 42, 0.5) 100%)',
        border: isRunning ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border-subtle)',
        boxShadow: isRunning ? '0 10px 30px rgba(16, 185, 129, 0.1)' : 'none',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          
          {/* Header & Status Indicator */}
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: isRunning ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isRunning ? '#34d399' : 'var(--primary-light)'
              }}>
                <Radio size={18} className={isRunning ? 'spin' : ''} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>Trung Tâm Điều Khiển Rải Tin Đa Nick</span>
                  {/* Status Badge */}
                  {isRunning ? (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: '#10b981',
                        boxShadow: '0 0 8px #10b981'
                      }} />
                      ĐANG PHÁT TIN TUẦN HOÀN
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      background: 'rgba(148, 163, 184, 0.1)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: 'var(--text-dim)'
                      }} />
                      ĐANG TẠM DỪNG
                    </span>
                  )}
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                  Hệ thống tự động điều phối các tài khoản Telegram rải tin Spintax tới toàn bộ nhóm mục tiêu đã tham gia.
                </p>
              </div>
            </div>
          </div>

          {/* Action Trigger Button */}
          <div>
            <button
              type="button"
              onClick={handleToggleCampaign}
              disabled={isTogglingCampaign}
              className={`btn ${isRunning ? 'btn-danger' : 'btn-primary'} btn-campaign-toggle`}
              style={{
                height: '42px',
                padding: '0 20px',
                fontSize: '14px',
                fontWeight: '600',
                gap: '8px',
                cursor: isTogglingCampaign ? 'not-allowed' : 'pointer',
                boxShadow: isRunning ? '0 4px 16px rgba(239, 68, 68, 0.35)' : '0 4px 16px var(--primary-glow)'
              }}
            >
              {isTogglingCampaign ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Đang cập nhật...</span>
                </>
              ) : isRunning ? (
                <>
                  <Square size={14} fill="currentColor" />
                  <span>Tạm dừng spam</span>
                </>
              ) : (
                <>
                  <Play size={15} fill="currentColor" />
                  <span>Bắt đầu spam</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 4 Mini KPIs Vận Hành */}
        <div style={{
          marginTop: '20px',
          paddingTop: '18px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '14px'
        }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>TÀI KHOẢN TELEGRAM</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={15} color="var(--primary-light)" />
              <span>{accounts.length} nick ({accounts.filter(a => a.status === 'online').length} online)</span>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>NHÓM PHỦ SÓNG SẴN SÀNG</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={15} color="#38bdf8" />
              <span>{groupMetrics.readyToBroadcast} / {groupMetrics.total} nhóm</span>
            </div>
            {groupMetrics.pausedWithOfflineAcc > 0 && (
              <div style={{ fontSize: '10.5px', color: '#f59e0b', marginTop: '3px', fontWeight: '500' }}>
                ({groupMetrics.pausedWithOfflineAcc} nhóm tạm nghỉ theo nick offline)
              </div>
            )}
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>MẪU TIN SPINTAX</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquare size={15} color="#c084fc" />
              <span>{activeCount} mẫu xoay vòng</span>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>TỐC ĐỘ PHÁT TIN</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={15} color="#fbbf24" />
              <span>{groupDelay}s / nhóm (Chu kỳ: {Math.round(cycleDelay / 60)}p)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 1. CÀI ĐẶT THỜI GIAN DELAY & CHUYỂN TIẾP TIN NHẮN (GIỮ NGUYÊN) */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header-flex" style={{ marginBottom: '20px' }}>
          <div>
            <h3 className="card-title">
              <Sliders size={18} color="var(--primary-light)" />
              <span>Thời Gian Delay & Chuyển Tiếp Tin Nhắn</span>
            </h3>
            <p className="card-desc">Điều chỉnh tốc độ gửi tin để bảo vệ nick Telegram không bị FloodWait hoặc ban</p>
          </div>
          <button 
            onClick={handleSaveSettings} 
            disabled={isSavingSettings}
            className="btn btn-primary btn-sm" 
            style={{ flexShrink: 0 }}
          >
            {isSavingSettings ? (
              <Loader2 size={14} className="spin" />
            ) : savedSuccess ? (
              <Check size={14} />
            ) : (
              <Save size={14} />
            )}
            <span>{savedSuccess ? 'Đã Lưu Thành Công!' : 'Lưu Cài Đặt'}</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label className="form-label" style={{ margin: 0 }}>
                Giãn cách giữa 2 nhóm (Group Delay):
              </label>
              <span style={{
                fontFamily: 'Consolas, Monaco, monospace',
                fontSize: '12.5px',
                fontWeight: '700',
                color: groupDelay < 60 ? '#ef4444' : groupDelay < 120 ? '#f59e0b' : 'var(--primary-light)',
                background: groupDelay < 60 ? 'rgba(239, 68, 68, 0.15)' : groupDelay < 120 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                padding: '2px 8px',
                borderRadius: '4px',
                border: `1px solid ${groupDelay < 60 ? 'rgba(239, 68, 68, 0.3)' : groupDelay < 120 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
              }}>
                {groupDelay}s ({Math.round(groupDelay / 60 * 10) / 10}p)
              </span>
            </div>

            <input
              type="range"
              min="10"
              max="600"
              step="10"
              value={groupDelay}
              onChange={(e) => setGroupDelay(parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                accentColor: groupDelay < 60 ? '#ef4444' : groupDelay < 120 ? '#f59e0b' : 'var(--primary)'
              }}
            />

            {/* Cảnh báo khi người dùng kéo về phía bên trái (< 120s) */}
            {groupDelay < 60 ? (
              <div style={{
                marginTop: '8px',
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                fontSize: '12px',
                color: '#fca5a5'
              }}>
                <AlertTriangle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: '#ef4444' }}>! Cảnh báo nguy hiểm cao:</strong> Giãn cách dưới 60 giây có nguy cơ rất cao bị Telegram áp lệnh <strong>FloodWait</strong> hoặc chặn quyền gửi tin (Spam block) của tài khoản!
                </div>
              </div>
            ) : groupDelay < 120 ? (
              <div style={{
                marginTop: '8px',
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                fontSize: '12px',
                color: '#fde68a'
              }}>
                <AlertCircle size={15} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: '#f59e0b' }}>! Cảnh báo tốc độ nhanh:</strong> Dưới 120 giây có thể làm tăng nguy cơ bị Telegram kiểm duyệt nếu tài khoản chưa có độ uy tín (trust) cao.
                </div>
              </div>
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                ✓ Mức an toàn khuyến nghị: 120 giây (2 phút) để tài khoản hoạt động bền vững.
              </span>
            )}
          </div>

          <div>
            <label className="form-label">
              Giãn cách giữa 2 chu kỳ (Cycle Delay): <strong style={{ color: 'var(--primary-light)' }}>{cycleDelay} giây</strong> ({Math.round(cycleDelay / 60)} phút)
            </label>
            <input
              type="range"
              min="60"
              max="3600"
              step="60"
              value={cycleDelay}
              onChange={(e) => setCycleDelay(e.target.value)}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Khuyến nghị: 1200 giây (20 phút) sau khi rải hết một lượt
            </span>
          </div>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <label className="switch" style={{ opacity: isVip ? 1 : 0.6, cursor: isVip ? 'pointer' : 'not-allowed' }}>
            <input 
              type="checkbox" 
              checked={isVip ? forwardTelegram : false} 
              disabled={!isVip}
              onChange={(e) => isVip && setForwardTelegram(e.target.checked)} 
            />
            <span className="slider"></span>
          </label>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: '500' }}>
                Tự động chuyển tiếp tin nhắn riêng của khách tới Telegram Admin
              </span>
              {!isVip && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#fbbf24',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  <Crown size={11} /> VIP PRO
                </span>
              )}
            </div>
            {!isVip && (
              <span style={{ fontSize: '12px', color: '#f59e0b', marginTop: '2px', display: 'block' }}>
                Gói Miễn Phí không hỗ trợ chuyển tiếp tin nhắn về Telegram cá nhân. Nâng cấp VIP để bật tính năng này.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. CHIA 2 CỘT: BÊN TRÁI THÊM/SỬA TIN NHẮN, BÊN PHẢI DANH SÁCH TIN NHẮN ĐÃ LƯU */}
      <div className="campaign-grid">
        
        {/* CỘT TRÁI: FORM THÊM / CHỈNH SỬA TIN NHẮN */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header-flex" style={{ marginBottom: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="card-title" style={{ margin: 0 }}>
                  {editingTemplateId ? (
                    <>
                      <Edit3 size={18} color="#f59e0b" />
                      <span style={{ color: '#f59e0b' }}>Chỉnh Sửa Tin Nhắn</span>
                    </>
                  ) : (
                    <>
                      <Plus size={18} color="var(--primary-light)" />
                      <span>Thêm Tin Nhắn Mới</span>
                    </>
                  )}
                </h3>

                {editingTemplateId && (
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    fontWeight: '600'
                  }}>
                    Đang sửa
                  </span>
                )}
              </div>

              <p className="card-desc" style={{ marginTop: '4px' }}>
                {editingTemplateId
                  ? 'Chỉnh sửa nội dung mẫu tin bên dưới và bấm "Lưu Thay Đổi"'
                  : 'Nhập nội dung mẫu tin nhắn mới để thêm vào kho xoay vòng'}
              </p>
            </div>

            {/* Banner giới hạn 1 mẫu tin cho gói Free */}
            {!isVip && !editingTemplateId && templates.length >= 1 && (
              <div style={{
                marginBottom: '14px',
                padding: '10px 14px',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.08) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <div style={{ fontSize: '12px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Crown size={15} style={{ flexShrink: 0 }} />
                  <span>Gói Miễn Phí giới hạn <strong>1/1 mẫu tin</strong>. Bấm vào mẫu tin bên phải để sửa, hoặc nâng cấp VIP để tạo không giới hạn.</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/pricing')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Lên VIP
                </button>
              </div>
            )}

            {editingTemplateId && (
              <button
                type="button"
                onClick={handleResetToNew}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                title="Bỏ chế độ sửa và quay lại thêm mới"
              >
                <Plus size={13} />
                <span>Tạo Mới</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSubmitEditor} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ position: 'relative', flex: 1, marginBottom: '12px' }}>
              <textarea
                className="form-textarea"
                placeholder="Nhập nội dung tin nhắn quảng cáo/rao vặt tại đây...&#10;&#10;Mẹo: Có thể dùng định dạng Telegram, chèn link, icon emoji sinh động để thu hút khách hàng."
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                required
                style={{
                  width: '100%',
                  minHeight: '260px',
                  maxHeight: '450px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  fontFamily: 'inherit',
                  padding: '12px 14px',
                  borderColor: editingTemplateId ? 'rgba(245, 158, 11, 0.4)' : undefined,
                  boxShadow: editingTemplateId ? '0 0 0 1px rgba(245, 158, 11, 0.2)' : undefined
                }}
              />

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '6px',
                fontSize: '11px',
                color: 'var(--text-muted)'
              }}>
                <span>
                  Độ dài: <strong style={{ color: 'var(--text-secondary)' }}>{editorContent.length}</strong> ký tự
                </span>
                <span>
                  {editorContent.length > 500 && (
                    <span style={{ color: '#f59e0b' }}>⚠️ Tin nhắn khá dài, nên rút gọn để tránh rối mắt</span>
                  )}
                </span>
              </div>
            </div>

            {/* Trạng thái kích hoạt */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px'
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                  Kích hoạt mẫu tin này
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Khi bật, bot sẽ đưa mẫu tin này vào danh sách rải tin ngẫu nhiên
                </div>
              </div>

              <label className="switch" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={editorIsActive}
                  onChange={(e) => setEditorIsActive(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: 'auto' }}>
              {editingTemplateId && (
                <button
                  type="button"
                  onClick={handleResetToNew}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Hủy Sửa
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmittingTemplate || !editorContent.trim()}
                className="btn btn-primary"
                style={{
                  padding: '8px 20px',
                  background: editingTemplateId
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : undefined,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '600'
                }}
              >
                {isSubmittingTemplate ? (
                  <>
                    <Loader2 size={15} className="spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : editingTemplateId ? (
                  <>
                    <Check size={15} />
                    <span>Lưu Thay Đổi</span>
                  </>
                ) : (
                  <>
                    <Plus size={15} />
                    <span>Thêm Vào Kho Tin</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* CỘT PHẢI: DANH SÁCH CÁC TIN NHẮN ĐÃ LƯU */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header-flex" style={{ marginBottom: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="card-title" style={{ margin: 0 }}>
                  <MessageSquare size={18} color="var(--primary-light)" />
                  <span>Kho Mẫu Tin Đã Lưu ({templates.length})</span>
                </h3>
                <span className="badge badge-primary" style={{ fontSize: '11px' }}>
                  {activeCount} đang bật
                </span>
              </div>
              <p className="card-desc" style={{ marginTop: '4px' }}>
                Click vào mẫu tin bất kỳ để nạp sang bên trái chỉnh sửa
              </p>
            </div>
          </div>

          {/* Ô tìm kiếm nhanh */}
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Tìm kiếm nội dung mẫu tin..."
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '32px', fontSize: '12px', height: '34px' }}
            />
          </div>

          {/* Danh sách các item tin nhắn (Scrollable) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxHeight: '440px',
            overflowY: 'auto',
            paddingRight: '4px',
            flex: 1
          }}>
            {filteredTemplates.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 16px',
                color: 'var(--text-muted)',
                fontSize: '13px',
                background: 'rgba(255, 255, 255, 0.01)',
                border: '1px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-md)'
              }}>
                <FileText size={32} style={{ opacity: 0.25, margin: '0 auto 8px auto' }} />
                <div>
                  {templates.length === 0 
                    ? 'Chưa có mẫu tin nhắn nào.' 
                    : 'Không tìm thấy mẫu tin khớp với tìm kiếm.'}
                </div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}>
                  {templates.length === 0 && 'Hãy soạn nội dung ở cột bên trái và bấm "Thêm Vào Kho Tin".'}
                </div>
              </div>
            ) : (
              filteredTemplates.map((tmpl, index) => {
                const isSelected = editingTemplateId === tmpl.id;
                const isActive = tmpl.is_active ?? true;

                return (
                  <div
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl)}
                    style={{
                      padding: '12px 14px',
                      background: isSelected 
                        ? 'rgba(99, 102, 241, 0.08)' 
                        : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected 
                        ? '1px solid var(--primary-light)' 
                        : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 0 12px rgba(99, 102, 241, 0.15)' : 'none'
                    }}
                    title="Bấm để chỉnh sửa tin nhắn này ở cột bên trái"
                  >
                    {/* Item Top Row */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '11px',
                      color: 'var(--text-muted)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontWeight: '700',
                          color: isSelected ? 'var(--primary-light)' : 'var(--text-secondary)'
                        }}>
                          #{index + 1}
                        </span>

                        {isSelected && (
                          <span style={{
                            padding: '1px 6px',
                            background: 'rgba(99, 102, 241, 0.2)',
                            color: 'var(--primary-light)',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '600'
                          }}>
                            Đang sửa ✏️
                          </span>
                        )}

                        <span style={{
                          padding: '1px 6px',
                          background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: isActive ? '#34d399' : 'var(--text-muted)',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '600'
                        }}>
                          {isActive ? 'Đang bật' : 'Đang tắt'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                        {/* Switch Bật/Tắt nhanh */}
                        <label className="switch" style={{ transform: 'scale(0.8)', margin: 0 }} title="Bật/Tắt mẫu tin này">
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => handleToggleTemplateActive(e, tmpl)}
                          />
                          <span className="slider"></span>
                        </label>

                        {/* Nút Xóa */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTemplateToDelete(tmpl);
                          }}
                          className="btn-icon-subtle"
                          style={{ color: 'var(--danger)', padding: '4px' }}
                          title="Xóa mẫu tin này"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Item Content Preview */}
                    <div style={{
                      whiteSpace: 'pre-wrap',
                      color: isSelected ? 'var(--text-main)' : 'var(--text-secondary)',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      wordBreak: 'break-word',
                      maxHeight: '90px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {tmpl.content}
                    </div>

                    {/* Item Footer info */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                      borderTop: '1px solid rgba(255, 255, 255, 0.03)',
                      paddingTop: '6px'
                    }}>
                      <span>{tmpl.content.length} ký tự</span>
                      <span style={{ color: isSelected ? 'var(--primary-light)' : undefined }}>
                        {isSelected ? 'Đang hiển thị ở khung trái' : 'Click để sửa →'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* ============================================================ */}
      {/* 📡 NHẬT KÝ PHÁT TIN THỜI GIAN THỰC (LIVE TRANSMISSION TERMINAL) */}
      {/* ============================================================ */}
      <div className="card" style={{
        marginTop: '24px',
        padding: '20px 24px',
        background: 'var(--bg-card, #131722)',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary-light, #818cf8)'
            }}>
              <Terminal size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                  Nhật Ký Phát Tin Thời Gian Thực
                </h3>
                {isRunning ? (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#34d399',
                    background: 'rgba(16, 185, 129, 0.1)',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    border: '1px solid rgba(16, 185, 129, 0.25)'
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#10b981',
                      boxShadow: '0 0 6px #10b981'
                    }} />
                    Live Feed
                  </span>
                ) : (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: 'var(--text-muted)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '2px 8px',
                    borderRadius: '999px'
                  }}>
                    Đang nghỉ
                  </span>
                )}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Cập nhật tức thời qua Supabase Realtime khi bot gửi tin tới từng nhóm Telegram
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => loadLogs(true)}
              disabled={refreshingLogs}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                padding: '6px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)'
              }}
              title="Tải lại nhật ký gần nhất"
            >
              <RefreshCw size={13} className={refreshingLogs ? 'spin' : ''} />
              <span>{refreshingLogs ? 'Đang tải...' : 'Làm mới'}</span>
            </button>
          </div>
        </div>

        {/* Thanh công cụ lọc & tìm kiếm nhóm lỗi */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          marginTop: '14px',
          marginBottom: '10px'
        }}>
          {/* Filter Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setLogFilter('all')}
              style={{
                fontSize: '11px',
                fontWeight: '600',
                padding: '4px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                border: logFilter === 'all' ? '1px solid var(--primary-light)' : '1px solid var(--border-subtle)',
                background: logFilter === 'all' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                color: logFilter === 'all' ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.15s ease'
              }}
            >
              Tất cả ({campaignLogs.length})
            </button>

            <button
              type="button"
              onClick={() => setLogFilter('error')}
              style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '4px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                border: logFilter === 'error' ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
                background: logFilter === 'error' ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                color: logFilter === 'error' ? '#f87171' : (errorLogCount > 0 ? '#fb7185' : 'var(--text-muted)'),
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease'
              }}
            >
              <span>⚠️ Nhóm lỗi & cảnh báo ({errorLogCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setLogFilter('sent')}
              style={{
                fontSize: '11px',
                fontWeight: '600',
                padding: '4px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                border: logFilter === 'sent' ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                background: logFilter === 'sent' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                color: logFilter === 'sent' ? '#34d399' : 'var(--text-muted)',
                transition: 'all 0.15s ease'
              }}
            >
              ✅ Gửi thành công ({successLogCount})
            </button>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Lọc tên nhóm, SĐT, lý do lỗi..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '5px 10px 5px 28px',
                fontSize: '11.5px',
                borderRadius: '6px',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Danh sách nhật ký dạng Console / Stream List */}
        <div style={{ marginTop: '10px' }}>
          {filteredCampaignLogs.length === 0 ? (
            <div style={{
              padding: '32px 16px',
              textAlign: 'center',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
              border: '1px dashed var(--border-subtle)'
            }}>
              <Terminal size={26} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '8px' }} />
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                {campaignLogs.length === 0 
                  ? 'Chưa có lượt gửi tin nào được ghi nhận'
                  : 'Không có nhật ký nào phù hợp với bộ lọc hiện tại'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {campaignLogs.length === 0 
                  ? 'Khi bạn bấm nút "Bắt Đầu Rải Tin Toàn Bộ Nhóm", nhật ký gửi tin thành công, thời gian delay và cảnh báo sẽ hiển thị trực tiếp tại đây.'
                  : (
                    <button
                      onClick={() => { setLogFilter('all'); setLogSearch(''); }}
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: '8px', fontSize: '11px', padding: '3px 10px' }}
                    >
                      Bỏ bộ lọc để xem tất cả
                    </button>
                  )}
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              maxHeight: '380px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}>
              {filteredCampaignLogs.map((log) => {
                const isSent = log.log_type === 'sent';
                const isWarning = log.log_type === 'warning' || log.log_type === 'flood_wait';
                const isError = log.log_type === 'error';

                const acc = accounts.find(a => a.id === log.account_id);
                const accLabel = acc ? (acc.account_name || acc.phone_number) : null;

                const badgeBg = isSent ? 'rgba(16, 185, 129, 0.12)' : isWarning ? 'rgba(245, 158, 11, 0.12)' : isError ? 'rgba(239, 68, 68, 0.12)' : 'rgba(99, 102, 241, 0.12)';
                const badgeColor = isSent ? '#34d399' : isWarning ? '#fbbf24' : isError ? '#f87171' : '#818cf8';
                const badgeBorder = isSent ? 'rgba(16, 185, 129, 0.3)' : isWarning ? 'rgba(245, 158, 11, 0.3)' : isError ? 'rgba(239, 68, 68, 0.3)' : 'rgba(99, 102, 241, 0.3)';
                const badgeText = isSent ? 'THÀNH CÔNG' : isWarning ? 'CẢNH BÁO' : isError ? 'THẤT BẠI' : 'HỆ THỐNG';

                const logTime = new Date(log.created_at).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });

                return (
                  <div
                    key={log.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '9px 12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      fontSize: '12.5px',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      {/* Monospace Timestamp */}
                      <span style={{
                        fontFamily: 'Consolas, Monaco, monospace',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        flexShrink: 0,
                        background: 'rgba(0, 0, 0, 0.3)',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        {logTime}
                      </span>

                      {/* Status Tag */}
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: badgeBg,
                        color: badgeColor,
                        border: `1px solid ${badgeBorder}`,
                        flexShrink: 0
                      }}>
                        {badgeText}
                      </span>

                      {/* Account tag if available */}
                      {accLabel && (
                        <span style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          background: 'rgba(255, 255, 255, 0.04)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          flexShrink: 0
                        }}>
                          {accLabel}
                        </span>
                      )}

                      {/* Log Message */}
                      <span style={{
                        color: isError ? '#fca5a5' : isWarning ? '#fde68a' : 'var(--text-secondary)',
                        wordBreak: 'break-word',
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {log.message}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* POPUP XÁC NHẬN XÓA TIN NHẮN MẪU TRONG MÀN HÌNH */}
      <ConfirmModal
        isOpen={Boolean(templateToDelete)}
        onClose={() => setTemplateToDelete(null)}
        onConfirm={executeDeleteTemplate}
        title="Xác nhận xóa mẫu tin nhắn"
        message={
          <div>
            <p style={{ margin: '0 0 8px 0' }}>
              Bạn có chắc chắn muốn xóa mẫu tin nhắn này khỏi kho xoay vòng không?
            </p>
            <div style={{
              padding: '8px 10px',
              background: 'rgba(0, 0, 0, 0.25)',
              borderRadius: '6px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              maxHeight: '80px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'pre-wrap'
            }}>
              "{templateToDelete?.content}"
            </div>
          </div>
        }
        subMessage="Mẫu tin này sẽ bị xóa vĩnh viễn và không còn được dùng trong các đợt gửi tin tiếp theo."
        confirmText="Xác nhận xóa"
        isLoading={isDeletingTemplate}
      />
    </div>
  );
}
