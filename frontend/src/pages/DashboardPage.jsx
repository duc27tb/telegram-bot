import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, 
  SendHorizontal, 
  MessageSquare, 
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { supabase } from '../lib/supabase';
import { 
  startCampaign, 
  stopCampaign, 
  getCampaignStatus, 
  getCampaignLogs 
} from '../lib/api';
import SetupGuideCard from '../components/dashboard/SetupGuideCard';
import CampaignControlCard from '../components/dashboard/CampaignControlCard';
import LiveLogsConsole from '../components/dashboard/LiveLogsConsole';

export default function DashboardPage({ setActiveTab, onOpenAddAccount }) {
  const { user } = useAuth();
  const { showToast } = useNotification();

  // Core Data States
  const [accounts, setAccounts] = useState([]);
  const [rawGroups, setRawGroups] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [conversationsCount, setConversationsCount] = useState(0);

  // Campaign Settings & Running State
  const [isRunning, setIsRunning] = useState(false);
  const [isTogglingCampaign, setIsTogglingCampaign] = useState(false);
  const [groupDelay, setGroupDelay] = useState(120);
  const [cycleDelay, setCycleDelay] = useState(1200);

  // Logs State
  const [logs, setLogs] = useState([]);
  const [refreshingLogs, setRefreshingLogs] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch bot logs from backend API (bypassing RLS, 1-hour auto-purged)
  const loadLogs = useCallback(async (isManual = false) => {
    if (!user) return;
    if (isManual) setRefreshingLogs(true);
    const start = Date.now();
    try {
      const apiRes = await getCampaignLogs(user.id, 50);
      if (apiRes && apiRes.success && Array.isArray(apiRes.data)) {
        setLogs(apiRes.data);
      } else {
        const res = await supabase
          .from('bot_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (res.data) setLogs(res.data);
      }
      const elapsed = Date.now() - start;
      if (isManual && elapsed < 600) {
        await new Promise(r => setTimeout(r, 600 - elapsed));
      }
    } catch (e) {
      console.error('Error fetching logs:', e);
    } finally {
      if (isManual) setRefreshingLogs(false);
    }
  }, [user]);

  // Initial Data Load (Parallel Promise.all)
  useEffect(() => {
    if (!user) return;

    const loadDashboardData = async () => {
      try {
        const [accRes, grpRes, tmplRes, convRes, campRes, statusRes] = await Promise.all([
          supabase.from('telegram_accounts').select('id, phone_number, status, account_name').eq('user_id', user.id),
          supabase.from('target_groups').select('id, is_active, account_id').eq('user_id', user.id),
          supabase.from('message_templates').select('id, is_active, content').eq('user_id', user.id),
          supabase.from('customer_conversations').select('id', { count: 'exact' }).eq('user_id', user.id),
          supabase.from('campaign_settings').select('*').eq('user_id', user.id).maybeSingle(),
          getCampaignStatus(user.id).catch(() => null)
        ]);

        if (accRes.data) setAccounts(accRes.data);
        if (grpRes.data) setRawGroups(grpRes.data);
        if (tmplRes.data) setTemplates(tmplRes.data);
        if (convRes.count !== undefined && convRes.count !== null) setConversationsCount(convRes.count);

        if (campRes.data) {
          setGroupDelay(campRes.data.group_delay_seconds || 120);
          setCycleDelay(campRes.data.cycle_delay_seconds || 1200);
        }

        if (statusRes) {
          setIsRunning(Boolean(statusRes.is_task_running || statusRes.settings?.is_running));
        } else if (campRes.data) {
          setIsRunning(Boolean(campRes.data.is_running));
        }
      } catch (err) {
        console.error('Lỗi nạp dữ liệu Dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
    loadLogs(false);

    // Lắng nghe realtime các thay đổi trong Supabase
    const channel = supabase.channel('dashboard_realtime_events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bot_logs', filter: `user_id=eq.${user.id}` }, (payload) => {
        setLogs(prev => [payload.new, ...prev.slice(0, 49)]);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_templates', filter: `user_id=eq.${user.id}` }, () => {
        supabase.from('message_templates').select('id, is_active, content').eq('user_id', user.id).then(r => {
          if (r.data) setTemplates(r.data);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadLogs]);

  // Tự động làm mới log mỗi 4 giây khi chiến dịch đang chạy (Auto-Polling Stream)
  useEffect(() => {
    if (!isRunning || !user) return;
    const timer = setInterval(() => {
      loadLogs(false);
    }, 4000);
    return () => clearInterval(timer);
  }, [isRunning, user, loadLogs]);

  // Step 1: Phải có từ 1 tài khoản ĐANG ONLINE (status === 'online')
  const activeAccounts = useMemo(() => {
    return accounts.filter(a => a.status === 'online');
  }, [accounts]);
  const hasActiveAccount = activeAccounts.length > 0;

  // Step 2: Có từ 1 nhóm được bật (is_active === true)
  const activeGroups = useMemo(() => {
    return rawGroups.filter(g => g.is_active === true);
  }, [rawGroups]);
  const hasActiveGroup = activeGroups.length > 0;

  // Step 3: Có từ 1 tin nhắn hoạt động (is_active === true)
  const activeTemplates = useMemo(() => {
    return templates.filter(t => t.is_active === true);
  }, [templates]);
  const hasActiveTemplate = activeTemplates.length > 0;

  // Group metrics cho bảng điều khiển
  const groupMetrics = useMemo(() => {
    const onlineAccIds = new Set(accounts.filter(a => a.status === 'online').map(a => a.id));
    let ready = 0;
    let pausedWithOffline = 0;

    rawGroups.forEach(g => {
      if (!g.is_active) return;
      if (!g.account_id) {
        if (onlineAccIds.size > 0) ready++;
        else pausedWithOffline++;
      } else if (onlineAccIds.has(g.account_id)) {
        ready++;
      } else {
        pausedWithOffline++;
      }
    });

    return {
      readyToBroadcast: ready,
      total: rawGroups.length,
      pausedWithOfflineAcc: pausedWithOffline
    };
  }, [accounts, rawGroups]);

  // Bắt đầu chiến dịch
  const handleStartCampaign = async () => {
    if (!user) return;
    if (!hasActiveAccount || !hasActiveGroup || !hasActiveTemplate) {
      showToast({
        title: 'Chưa đủ điều kiện',
        message: 'Vui lòng hoàn thành cả 3 bước màu xanh lá trước khi bắt đầu!',
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
          message: 'Chiến dịch rải tin tự động đã bắt đầu! Đang hiển thị Trung tâm điều khiển & Nhật ký.',
          type: 'success'
        });
        loadLogs(false);
      } else {
        showToast({
          title: 'Lỗi khởi động',
          message: res?.error || 'Không thể bắt đầu chiến dịch rải tin',
          type: 'error'
        });
      }
    } catch (err) {
      showToast({ title: 'Lỗi', message: 'Không thể kết nối máy chủ backend!', type: 'error' });
    } finally {
      setIsTogglingCampaign(false);
    }
  };

  // Tạm dừng chiến dịch
  const handleStopCampaign = async () => {
    if (!user) return;
    setIsTogglingCampaign(true);
    const start = Date.now();
    try {
      const res = await stopCampaign(user.id);
      const elapsed = Date.now() - start;
      if (elapsed < 600) await new Promise(r => setTimeout(r, 600 - elapsed));

      setIsRunning(false);
      showToast({
        title: 'Đã Tạm Dừng',
        message: 'Đã dừng tiến trình gửi tin tự động. Bạn có thể xem lại các bước thiết lập.',
        type: 'info'
      });
      loadLogs(false);
    } catch (err) {
      showToast({ title: 'Lỗi', message: 'Không thể dừng chiến dịch', type: 'error' });
    } finally {
      setIsTogglingCampaign(false);
    }
  };

  return (
    <div className="page-body">
      {/* 4 Thẻ Thống Kê Tổng Quan Ở Đầu Dashboard */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <Users size={24} />
          </div>
          <div>
            <div className="stat-label">Tài Khoản Đã Kết Nối</div>
            <div className="stat-value">{accounts.length}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(6, 182, 212, 0.1)', borderColor: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)' }}>
            <SendHorizontal size={24} />
          </div>
          <div>
            <div className="stat-label">Nhóm Telegram Mục Tiêu</div>
            <div className="stat-value">{rawGroups.length}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.1)', borderColor: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>
            <MessageSquare size={24} />
          </div>
          <div>
            <div className="stat-label">Mẫu Tin Nhắn Xoay Vòng</div>
            <div className="stat-value">{templates.length}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="stat-label">Khách Hàng Đã Nhắn Tin</div>
            <div className="stat-value">{conversationsCount}</div>
          </div>
        </div>
      </div>

      {/* ĐIỀU KIỆN HIỂN THỊ THEO TRẠNG THÁI CHIẾN DỊCH: */}
      {!isRunning ? (
        /* KHI CHƯA CHẠY / ĐANG TẠM DỪNG:
           - Hiển thị thẻ Hướng Dẫn 3 Bước Khởi Chạy
           - Nút Bắt đầu spam: màu nhạt nếu chưa đủ 3 bước, màu đậm khi cả 3 bước đều viền xanh lá
           - Phần Nhật Ký tạm thời ẩn đi
        */
        <SetupGuideCard
          hasActiveAccount={hasActiveAccount}
          hasActiveGroup={hasActiveGroup}
          hasActiveTemplate={hasActiveTemplate}
          activeAccountCount={activeAccounts.length}
          activeGroupCount={activeGroups.length}
          activeTemplateCount={activeTemplates.length}
          onStartCampaign={handleStartCampaign}
          isToggling={isTogglingCampaign}
          setActiveTab={setActiveTab}
          onMissingSteps={(missing) => {
            showToast({
              title: 'Chưa đủ điều kiện',
              message: `Vui lòng hoàn thành: ${missing.join(', ')} (cần viền xanh lá) trước khi bắt đầu!`,
              type: 'warning'
            });
          }}
        />
      ) : (
        /* KHI ĐANG BẬT CHIẾN DỊCH (isRunning === true):
           - 3 bước hướng dẫn tạm thời bị ẩn đi
           - Hiển thị Trung Tâm Điều Khiển Rải Tin Đa Nick
           - Hiển thị Nhật Ký Rải Tin Thời Gian Thực
        */
        <>
          <CampaignControlCard
            isRunning={isRunning}
            isToggling={isTogglingCampaign}
            onStopCampaign={handleStopCampaign}
            accounts={accounts}
            groupMetrics={groupMetrics}
            activeTemplateCount={activeTemplates.length}
            groupDelay={groupDelay}
            cycleDelay={cycleDelay}
            setActiveTab={setActiveTab}
          />

          <LiveLogsConsole
            logs={logs}
            accounts={accounts}
            refreshing={refreshingLogs}
            onRefresh={() => loadLogs(true)}
            autoRefreshActive={isRunning}
          />
        </>
      )}
    </div>
  );
}
