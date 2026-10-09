import React from 'react';
import { 
  Users, 
  SendHorizontal, 
  MessageSquare, 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Play, 
  Loader2,
  Sparkles
} from 'lucide-react';

export default function SetupGuideCard({
  hasActiveAccount,
  hasActiveGroup,
  hasActiveTemplate,
  activeAccountCount,
  activeGroupCount,
  activeTemplateCount,
  onStartCampaign,
  isToggling,
  setActiveTab,
  onMissingSteps
}) {
  const steps = [
    {
      id: 1,
      title: 'Bước 1: Thêm tài khoản tele',
      desc: 'Bấm để sang trang /accounts • Cần từ 1 tài khoản không bị dừng',
      tab: 'accounts',
      icon: Users,
      isSuccess: hasActiveAccount,
      statText: hasActiveAccount ? `${activeAccountCount} tài khoản online` : 'Chưa có tài khoản online'
    },
    {
      id: 2,
      title: 'Bước 2: Quản lý nhóm spam',
      desc: 'Bấm để sang trang /groups • Cần từ 1 nhóm mục tiêu được bật',
      tab: 'groups',
      icon: SendHorizontal,
      isSuccess: hasActiveGroup,
      statText: hasActiveGroup ? `${activeGroupCount} nhóm đang bật` : 'Chưa có nhóm nào bật'
    },
    {
      id: 3,
      title: 'Bước 3: Điều chỉnh tốc độ + các tin nhắn spam',
      desc: 'Bấm để sang trang /campaign • Cần từ 1 tin nhắn hoạt động',
      tab: 'campaign',
      icon: MessageSquare,
      isSuccess: hasActiveTemplate,
      statText: hasActiveTemplate ? `${activeTemplateCount} mẫu tin đang bật` : 'Chưa có mẫu tin bật'
    }
  ];

  const completedCount = steps.filter(s => s.isSuccess).length;
  const allReady = completedCount === 3;

  return (
    <div className="card" style={{
      marginBottom: '20px',
      padding: '24px',
      border: '1px solid var(--border-subtle)',
      background: 'var(--bg-card)'
    }}>
      {/* Header hướng dẫn */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '18px'
      }}>
        <div>
          <h3 style={{
            fontSize: '17px',
            fontWeight: '700',
            color: 'var(--text-main)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Sparkles size={18} color="var(--primary-light)" />
            <span>Hướng Dẫn Khởi Chạy Rải Tin</span>
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Hoàn tất 3 bước thiết lập nhanh dưới đây để bắt đầu chiến dịch spam tự động
          </p>
        </div>

        {/* Progress badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: '999px',
          fontSize: '12px',
          fontWeight: '700',
          background: allReady ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.12)',
          color: allReady ? '#34d399' : 'var(--primary-light)',
          border: `1px solid ${allReady ? 'rgba(16, 185, 129, 0.35)' : 'rgba(99, 102, 241, 0.25)'}`
        }}>
          {allReady ? <CheckCircle2 size={14} color="#10b981" /> : null}
          <span>{completedCount}/3 Bước Sẵn Sàng</span>
        </div>
      </div>

      {/* 3 Bước Hướng Dẫn */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}>
        {steps.map((step) => {
          const StepIcon = step.icon;
          return (
            <div
              key={step.id}
              onClick={() => setActiveTab(step.tab)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: step.isSuccess 
                  ? 'rgba(16, 185, 129, 0.04)' 
                  : 'rgba(255, 255, 255, 0.02)',
                border: step.isSuccess 
                  ? '1.5px solid #10b981' 
                  : '1px solid var(--border-subtle)',
                boxShadow: step.isSuccess 
                  ? '0 0 14px rgba(16, 185, 129, 0.12)' 
                  : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                if (!step.isSuccess) {
                  e.currentTarget.style.borderColor = 'var(--border-medium)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                if (!step.isSuccess) {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    background: step.isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    color: step.isSuccess ? '#10b981' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <StepIcon size={18} />
                  </div>

                  {/* Status Indicator Icon */}
                  {step.isSuccess ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#10b981',
                      background: 'rgba(16, 185, 129, 0.15)',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}>
                      <CheckCircle2 size={12} color="#10b981" />
                      Thành công
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: 'var(--text-muted)',
                      background: 'rgba(255, 255, 255, 0.04)',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <Circle size={10} color="var(--text-dim)" />
                      Chưa đạt
                    </span>
                  )}
                </div>

                <div style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  color: step.isSuccess ? 'var(--text-main)' : 'var(--text-secondary)',
                  marginBottom: '4px'
                }}>
                  {step.title}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {step.desc}
                </div>
              </div>

              <div style={{
                marginTop: '14px',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px'
              }}>
                <span style={{ color: step.isSuccess ? '#34d399' : 'var(--text-dim)', fontWeight: '600' }}>
                  {step.statText}
                </span>
                <span style={{ color: 'var(--primary-light)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                  <span>Chi tiết</span>
                  <ArrowRight size={13} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Nút Bắt Đầu Spam */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        padding: '20px 24px',
        borderRadius: 'var(--radius-md)',
        background: allReady ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.04)',
        border: `1px solid ${allReady ? 'rgba(99, 102, 241, 0.35)' : 'rgba(99, 102, 241, 0.18)'}`
      }}>
        <div style={{ flex: 1, minWidth: '260px' }}>
          <div style={{ fontSize: '14.5px', fontWeight: '700', color: allReady ? 'var(--text-main)' : '#e2e8f0' }}>
            {allReady 
              ? '✅ Tất cả 3 bước đã sẵn sàng! Bạn có thể kích hoạt phát tin ngay bây giờ.' 
              : '⚡ Nút ở trạng thái màu nhạt. Cần hoàn tất cả 3 bước viền xanh lá để chuyển sang màu đậm.'}
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {allReady
              ? 'Hệ thống sẽ rải tin xoay vòng các tài khoản đang online tới toàn bộ nhóm mục tiêu.'
              : 'Click vào từng bước ở trên để kiểm tra tài khoản, nhóm và nội dung tin nhắn.'}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (isToggling) return;
            if (!allReady) {
              const missing = [];
              if (!hasActiveAccount) missing.push('Bước 1: Tài khoản');
              if (!hasActiveGroup) missing.push('Bước 2: Nhóm spam');
              if (!hasActiveTemplate) missing.push('Bước 3: Mẫu tin nhắn');
              if (onMissingSteps) onMissingSteps(missing);
              return;
            }
            onStartCampaign();
          }}
          disabled={isToggling}
          style={{
            height: '52px',
            padding: '0 32px',
            minWidth: '200px',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: '700',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            cursor: isToggling ? 'not-allowed' : 'pointer',
            transition: 'all 0.25s ease',
            /* Khi allReady: màu ĐẬM rực rỡ, phát sáng. Khi chưa đủ: màu NHẠT (soft visible indigo), KHÔNG bị đen sì */
            background: allReady 
              ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' 
              : 'rgba(99, 102, 241, 0.16)',
            color: allReady ? '#ffffff' : '#c7d2fe',
            border: allReady 
              ? '1px solid rgba(255, 255, 255, 0.2)' 
              : '1.5px solid rgba(99, 102, 241, 0.45)',
            boxShadow: allReady 
              ? '0 6px 24px rgba(99, 102, 241, 0.45)' 
              : '0 2px 10px rgba(99, 102, 241, 0.08)'
          }}
          onMouseEnter={(e) => {
            if (!isToggling) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              if (allReady) {
                e.currentTarget.style.boxShadow = '0 8px 28px rgba(99, 102, 241, 0.6)';
              } else {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.22)';
                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.6)';
              }
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            if (allReady) {
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(99, 102, 241, 0.45)';
            } else {
              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.16)';
              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.45)';
            }
          }}
          title={allReady ? 'Bấm để bắt đầu rải tin' : 'Bấm để xem các bước còn thiếu'}
        >
          {isToggling ? (
            <>
              <Loader2 size={18} className="spin" />
              <span>Đang khởi động...</span>
            </>
          ) : (
            <>
              <Play size={18} fill={allReady ? '#ffffff' : 'rgba(199, 210, 254, 0.5)'} />
              <span>Bắt đầu spam</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
