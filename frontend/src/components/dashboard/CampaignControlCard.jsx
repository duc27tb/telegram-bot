import React from 'react';
import { 
  Radio, 
  Square, 
  Loader2, 
  Users, 
  Zap, 
  MessageSquare, 
  Sliders, 
  ExternalLink 
} from 'lucide-react';

export default function CampaignControlCard({
  isRunning,
  isToggling,
  onStopCampaign,
  accounts = [],
  groupMetrics = { readyToBroadcast: 0, total: 0, pausedWithOfflineAcc: 0 },
  activeTemplateCount = 0,
  groupDelay = 120,
  cycleDelay = 1200,
  setActiveTab
}) {
  const onlineCount = accounts.filter(a => a.status === 'online').length;

  return (
    <div className="card" style={{
      marginBottom: '20px',
      padding: '24px',
      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(99, 102, 241, 0.06) 100%)',
      border: '1px solid rgba(16, 185, 129, 0.35)',
      boxShadow: '0 10px 30px rgba(16, 185, 129, 0.1)',
      transition: 'all 0.3s ease'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        {/* Tiêu đề & Trạng thái phát tin */}
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399'
            }}>
              <Radio size={20} className="spin" />
            </div>
            <div>
              <h3 style={{
                fontSize: '17px',
                fontWeight: '800',
                color: 'var(--text-main)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap'
              }}>
                <span>Trung Tâm Điều Khiển Rải Tin Đa Nick</span>
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
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                Hệ thống tự động điều phối các tài khoản Telegram rải tin Spintax tới toàn bộ nhóm mục tiêu đã tham gia.
              </p>
            </div>
          </div>
        </div>

        {/* Nút Hành Động (Tạm dừng & Tùy chỉnh) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('campaign')}
            className="btn btn-secondary"
            style={{
              height: '42px',
              fontSize: '13px',
              fontWeight: '600',
              padding: '0 14px',
              gap: '6px'
            }}
          >
            <span>Tùy Chỉnh Chiến Dịch</span>
            <ExternalLink size={14} />
          </button>

          <button
            type="button"
            onClick={onStopCampaign}
            disabled={isToggling}
            className="btn btn-danger"
            style={{
              height: '48px',
              padding: '0 24px',
              fontSize: '14.5px',
              fontWeight: '700',
              borderRadius: '10px',
              gap: '8px',
              cursor: isToggling ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 18px rgba(239, 68, 68, 0.4)'
            }}
          >
            {isToggling ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <Square size={14} fill="currentColor" />
                <span>Tạm dừng spam</span>
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px'
      }}>
        {/* KPI 1 */}
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>TÀI KHOẢN TELEGRAM</div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={15} color="var(--primary-light)" />
            <span>{accounts.length} nick ({onlineCount} online)</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
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

        {/* KPI 3 */}
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>MẪU TIN SPINTAX</div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageSquare size={15} color="#c084fc" />
            <span>{activeTemplateCount} mẫu xoay vòng</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>TỐC ĐỘ PHÁT TIN</div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sliders size={15} color="#fbbf24" />
            <span>{groupDelay}s / nhóm (Chu kỳ: {Math.round(cycleDelay / 60)}p)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
