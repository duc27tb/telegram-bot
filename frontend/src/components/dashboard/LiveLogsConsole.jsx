import React, { useState, useMemo } from 'react';
import { 
  RefreshCw, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Terminal, 
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

export default function LiveLogsConsole({
  logs = [],
  accounts = [],
  refreshing = false,
  onRefresh,
  autoRefreshActive = true
}) {
  const [logFilter, setLogFilter] = useState('all'); // 'all' | 'error' | 'sent'
  const [logSearch, setLogSearch] = useState('');

  const errorLogCount = useMemo(() => {
    return logs.filter(l => l.log_type === 'error' || l.log_type === 'warning' || l.log_type === 'flood_wait').length;
  }, [logs]);

  const successLogCount = useMemo(() => {
    return logs.filter(l => l.log_type === 'sent').length;
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (logFilter === 'error') {
        const isErr = log.log_type === 'error' || log.log_type === 'warning' || log.log_type === 'flood_wait';
        if (!isErr) return false;
      } else if (logFilter === 'sent') {
        if (log.log_type !== 'sent') return false;
      }

      if (logSearch.trim()) {
        const q = logSearch.toLowerCase();
        return (log.message || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [logs, logFilter, logSearch]);

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
      {/* Header flex */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px'
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
            <Terminal size={18} color="var(--primary-light)" />
            <span>Nhật Ký Rải Tin Thời Gian Thực</span>
            {autoRefreshActive && (
              <span style={{
                fontSize: '10.5px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                Tự Động Cập Nhật (4s)
              </span>
            )}
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Cập nhật liên tục kết quả gửi tin • Tự động dọn dẹp sau 1 giờ để hệ thống luôn nhẹ và chạy mượt
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="btn btn-secondary btn-sm"
          style={{
            fontSize: '12px',
            padding: '6px 12px',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)'
          }}
          title="Tải lại nhật ký gần nhất"
        >
          <RefreshCw size={13} className={refreshing ? 'spin' : ''} />
          <span>{refreshing ? 'Đang tải...' : 'Làm mới'}</span>
        </button>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        marginBottom: '14px'
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
            Tất cả ({logs.length})
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

      {/* Danh sách nhật ký */}
      {filteredLogs.length === 0 ? (
        <div style={{
          padding: '32px 16px',
          textAlign: 'center',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '8px',
          border: '1px dashed var(--border-subtle)'
        }}>
          <Terminal size={26} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '8px' }} />
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
            {logs.length === 0 
              ? 'Chiến dịch đang kết nối, nhật ký các lượt gửi tin sẽ xuất hiện ngay tại đây...'
              : 'Không có nhật ký nào phù hợp với bộ lọc hiện tại'}
          </div>
          {logs.length > 0 && (
            <button
              onClick={() => { setLogFilter('all'); setLogSearch(''); }}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '8px', fontSize: '11px', padding: '3px 10px' }}
            >
              Bỏ bộ lọc để xem tất cả
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          maxHeight: '360px',
          overflowY: 'auto',
          paddingRight: '4px'
        }}>
          {filteredLogs.map((log) => {
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
                  fontSize: '12.5px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  {/* Timestamp */}
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

                  {/* Status Badge */}
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: badgeBg,
                    color: badgeColor,
                    border: `1px solid ${badgeBorder}`,
                    flexShrink: 0
                  }}>
                    {badgeText}
                  </span>

                  {/* Account Badge if available */}
                  {accLabel && (
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--primary-light)',
                      background: 'rgba(99, 102, 241, 0.1)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      flexShrink: 0,
                      fontWeight: '600'
                    }}>
                      {accLabel}
                    </span>
                  )}

                  {/* Message content */}
                  <span style={{
                    color: isError ? '#fca5a5' : isWarning ? '#fde68a' : 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    minWidth: 0
                  }} title={log.message}>
                    {log.message}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
