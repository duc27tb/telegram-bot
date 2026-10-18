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
  Info,
  X,
  Copy,
  Check
} from 'lucide-react';
import { formatFriendlyLogMessage } from '../../lib/api';

export default function LiveLogsConsole({
  logs = [],
  accounts = [],
  refreshing = false,
  onRefresh,
  autoRefreshActive = true,
  isEmbedded = false
}) {
  const [logFilter, setLogFilter] = useState('all'); // 'all' | 'error' | 'sent'
  const [logSearch, setLogSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [copiedLogText, setCopiedLogText] = useState(false);

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
    <div 
      className={isEmbedded ? "livelogs-embedded" : "card"} 
      style={isEmbedded ? { padding: '8px 0 0 0', background: 'transparent', border: 'none', boxShadow: 'none' } : { padding: '24px', marginBottom: '20px' }}
    >
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
            const logTimeShort = new Date(log.created_at).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit'
            });
            const friendlyText = formatFriendlyLogMessage(log.message);

            return (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="campaign-log-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
                title="Bấm để xem chi tiết bản ghi nhật ký này"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
                  {/* Timestamp */}
                  <span className="campaign-log-time" style={{
                    fontFamily: 'Consolas, Monaco, monospace',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    flexShrink: 0,
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    <span className="log-time-desktop">{logTime}</span>
                    <span className="log-time-mobile mobile-only" style={{ display: 'none' }}>{logTimeShort}</span>
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
                    <span className="campaign-log-account" style={{
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
                  <span className="campaign-log-message" style={{
                    color: isError ? '#fca5a5' : isWarning ? '#fde68a' : 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    minWidth: 0,
                    flex: 1
                  }}>
                    {friendlyText}
                  </span>
                </div>

                <div style={{ flexShrink: 0, color: 'var(--text-muted)', opacity: 0.6, display: 'inline-flex', alignItems: 'center' }}>
                  <Info size={13} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* POPUP XEM CHI TIẾT NHẬT KÝ */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '15px', color: 'var(--text-main)' }}>
                <Terminal size={18} color="var(--primary-light)" />
                <span>Chi Tiết Nhật Ký Rải Tin</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="btn-icon-subtle"
                style={{ padding: '4px' }}
                title="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(0, 0, 0, 0.25)', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Thời gian:</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--text-main)' }}>
                  {new Date(selectedLog.created_at).toLocaleString('vi-VN')}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(0, 0, 0, 0.25)', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Trạng thái:</span>
                <span style={{
                  fontWeight: '700',
                  color: selectedLog.log_type === 'sent' ? '#34d399' : selectedLog.log_type === 'warning' ? '#fbbf24' : '#f87171'
                }}>
                  {selectedLog.log_type === 'sent' ? '✅ Gửi thành công' : selectedLog.log_type === 'warning' ? '⚠️ Cảnh báo' : '❌ Thất bại'}
                </span>
              </div>

              {selectedLog.account_id && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(0, 0, 0, 0.25)', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tài khoản bot:</span>
                  <span style={{ color: '#c7d2fe', fontWeight: '600' }}>
                    {(() => {
                      const a = accounts.find(acc => acc.id === selectedLog.account_id);
                      return a ? (a.account_name || a.phone_number) : selectedLog.account_id;
                    })()}
                  </span>
                </div>
              )}

              {/* Hộp nội dung / lý do chi tiết */}
              <div style={{ marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>Nội dung nhật ký / Lý do chi tiết:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedLog.message || '');
                      setCopiedLogText(true);
                      setTimeout(() => setCopiedLogText(false), 2000);
                    }}
                    className="btn-icon-subtle"
                    title="Sao chép nội dung log"
                    style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 6px' }}
                  >
                    {copiedLogText ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                    <span>{copiedLogText ? 'Đã sao chép' : 'Sao chép'}</span>
                  </button>
                </div>
                <div style={{
                  padding: '12px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: selectedLog.log_type === 'error' ? '#fca5a5' : 'var(--text-main)',
                  fontFamily: 'Consolas, Monaco, monospace'
                }}>
                  {formatFriendlyLogMessage(selectedLog.message)}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedLog(null)}
              className="btn btn-primary"
              style={{ width: '100%', height: '40px', justifyContent: 'center', fontWeight: '700' }}
            >
              Đóng Cửa Sổ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
