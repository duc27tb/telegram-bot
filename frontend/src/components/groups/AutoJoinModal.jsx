import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  X, 
  Loader2, 
  ExternalLink,
  Info,
  Check,
  PauseCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function AutoJoinModal({ isOpen, onClose, account, onComplete }) {
  const { user } = useAuth();
  const { showToast } = useNotification();

  const [masterGroups, setMasterGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [selectedGroupIds, setSelectedGroupIds] = useState(new Set());
  
  // Anti-ban configuration
  const [minDelay, setMinDelay] = useState(6);
  const [maxDelay, setMaxDelay] = useState(12);

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0 });
  const [currentMessage, setCurrentMessage] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [results, setResults] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [abortedReason, setAbortedReason] = useState(null);

  const abortControllerRef = useRef(null);
  const countdownTimerRef = useRef(null);

  // Load master groups when modal opens
  useEffect(() => {
    if (!isOpen || !user?.id) return;
    fetchMasterGroups();
    setIsRunning(false);
    setIsCompleted(false);
    setResults([]);
    setCurrentMessage('');
    setAbortedReason(null);
  }, [isOpen, user?.id]);

  const fetchMasterGroups = async () => {
    setLoadingGroups(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/groups/master?user_id=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setMasterGroups(data.data || []);
        // Default select all active master groups
        const activeIds = (data.data || []).filter(g => g.is_active !== false).map(g => g.id);
        setSelectedGroupIds(new Set(activeIds));
      }
    } catch (err) {
      console.error('Lỗi tải nhóm chung:', err);
    } finally {
      setLoadingGroups(false);
    }
  };

  const toggleSelectGroup = (id) => {
    if (isRunning) return;
    setSelectedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (isRunning) return;
    if (selectedGroupIds.size === masterGroups.length) {
      setSelectedGroupIds(new Set());
    } else {
      setSelectedGroupIds(new Set(masterGroups.map(g => g.id)));
    }
  };

  const handleStartAutoJoin = async () => {
    if (!account?.id) {
      alert('Vui lòng chọn tài khoản Telegram để thực hiện join!');
      return;
    }
    if (selectedGroupIds.size === 0) {
      alert('Vui lòng chọn ít nhất 1 nhóm chung để tham gia!');
      return;
    }

    setIsRunning(true);
    setIsCompleted(false);
    setResults([]);
    setAbortedReason(null);
    setProgress({ current: 0, total: selectedGroupIds.size, percent: 0 });
    setCurrentMessage('Đang khởi động kết nối an toàn Telegram...');

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${BACKEND_URL}/api/groups/auto-join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          account_id: account.id,
          group_ids: Array.from(selectedGroupIds),
          min_delay: Number(minDelay),
          max_delay: Number(maxDelay)
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.detail || 'Không thể bắt đầu auto-join');
      }

      // Read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // Giữ lại phần chưa hoàn chỉnh

        for (const block of lines) {
          if (!block.trim()) continue;
          const match = block.match(/data:\s*(.*)/);
          if (!match) continue;

          try {
            const event = JSON.parse(match[1]);
            handleStreamEvent(event);
          } catch (e) {
            console.error('Lỗi parse SSE event:', e);
          }
        }
      }

      setIsCompleted(true);
      setIsRunning(false);
      showToast({
        title: 'Hoàn tất Auto-Join',
        message: 'Đã hoàn thành tiến trình tham gia nhóm chung an toàn',
        type: 'success'
      });
      if (onComplete) onComplete();

    } catch (err) {
      if (err.name === 'AbortError') {
        setCurrentMessage('Đã dừng tiến trình theo yêu cầu của bạn.');
      } else {
        alert(err.message || 'Lỗi trong quá trình auto-join');
        setCurrentMessage(`Lỗi: ${err.message}`);
      }
      setIsRunning(false);
    }
  };

  const handleStreamEvent = (evt) => {
    switch (evt.type) {
      case 'start':
        setCurrentMessage(evt.message);
        break;

      case 'progress':
        setCurrentMessage(evt.message);
        setProgress({
          current: evt.current,
          total: evt.total,
          percent: Math.round(((evt.current - 1) / evt.total) * 100)
        });
        break;

      case 'item_done':
        setResults(prev => [...prev, {
          title: evt.group_title,
          success: evt.result.success,
          status: evt.result.status,
          message: evt.result.message
        }]);
        setProgress({
          current: evt.current,
          total: evt.total,
          percent: Math.round((evt.current / evt.total) * 100)
        });
        break;

      case 'delay':
        setCurrentMessage(evt.message);
        startCountdown(Math.round(evt.seconds));
        break;

      case 'aborted':
        setAbortedReason(evt.reason);
        setCurrentMessage(`⚠️ Dừng an toàn: ${evt.reason}`);
        setIsRunning(false);
        setIsCompleted(true);
        break;

      case 'completed':
        setCurrentMessage(evt.message);
        setIsCompleted(true);
        setIsRunning(false);
        break;

      default:
        break;
    }
  };

  const startCountdown = (sec) => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setCountdown(sec);
    countdownTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStopProcess = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    setIsRunning(false);
    setCurrentMessage('Đã dừng tiến trình.');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={!isRunning ? onClose : undefined} style={{ zIndex: 9999 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '640px', width: '92%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
            }}>
              <Zap size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>
                Tự Động Tham Gia Nhóm Chung (Auto-Join)
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Gán nick: <strong style={{ color: 'var(--primary-light)' }}>{account?.account_name}</strong> ({account?.phone_number})
              </div>
            </div>
          </div>
          {!isRunning && (
            <button onClick={onClose} className="btn-icon-subtle" style={{ fontSize: '18px' }}>
              ✕
            </button>
          )}
        </div>

        {/* Body */}
        <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>
          {/* Cảnh báo an toàn Telegram (Anti-Ban Advisory) */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.05) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            marginBottom: '16px',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start'
          }}>
            <ShieldCheck size={20} color="#818cf8" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '12px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--primary-light)', display: 'block', marginBottom: '2px' }}>
                Cơ Chế Bảo Vệ Chống Khóa Tài Khoản (Anti-Ban):
              </strong>
              Hệ thống tự động tạo <strong>độ trễ ngẫu nhiên (Jitter)</strong> giữa mỗi nhóm và lắng nghe tín hiệu <code>FloodWait</code> từ Telegram. Nếu nick mới tạo, khuyến nghị không join quá 10–15 nhóm/ngày để giữ tài khoản an toàn tuyệt đối.
            </div>
          </div>

          {/* Thiết lập độ trễ an toàn */}
          {!isRunning && !isCompleted && (
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.02)', 
              border: '1px solid var(--border-subtle)', 
              borderRadius: 'var(--radius-md)', 
              padding: '12px 14px',
              marginBottom: '16px' 
            }}>
              <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={15} color="var(--primary-light)" />
                <span>Khoảng thời gian nghỉ ngẫu nhiên giữa 2 nhóm:</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Từ:</span>
                  <input
                    type="number"
                    min="3"
                    max="60"
                    value={minDelay}
                    onChange={(e) => setMinDelay(Math.max(3, parseInt(e.target.value) || 3))}
                    style={{ width: '64px', padding: '6px 8px', textAlign: 'center' }}
                    className="form-input"
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>giây</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Đến:</span>
                  <input
                    type="number"
                    min={minDelay + 1}
                    max="120"
                    value={maxDelay}
                    onChange={(e) => setMaxDelay(Math.max(minDelay + 1, parseInt(e.target.value) || minDelay + 1))}
                    style={{ width: '64px', padding: '6px 8px', textAlign: 'center' }}
                    className="form-input"
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>giây</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  (Khuyên dùng: 6 - 12s cho nick an toàn)
                </span>
              </div>
            </div>
          )}

          {/* Tiến trình khi đang chạy hoặc hoàn tất */}
          {(isRunning || isCompleted) && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                  {isRunning ? <Loader2 size={16} className="spin" color="var(--primary-light)" /> : <CheckCircle2 size={16} color="var(--success)" />}
                  <span>{isRunning ? 'Đang Xử Lý Auto-Join...' : 'Hoàn Tất Quy Trình'}</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary-light)' }}>
                  {progress.percent}% ({progress.current}/{progress.total})
                </span>
              </div>

              {/* Progress bar */}
              <div style={{
                height: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '12px'
              }}>
                <div style={{
                  height: '100%',
                  width: `${progress.percent}%`,
                  background: isCompleted ? 'var(--success)' : 'linear-gradient(90deg, #6366f1, #a855f7)',
                  borderRadius: '4px',
                  transition: 'width 0.4s ease'
                }} />
              </div>

              {/* Status text & Countdown */}
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-main)' }}>{currentMessage}</span>
                {countdown > 0 && isRunning && (
                  <span style={{ color: '#f59e0b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} />
                    <span>Nghỉ {countdown}s</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Danh sách kết quả từng nhóm (Live List) */}
          {results.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Chi tiết kết quả ({results.length} nhóm):
              </div>
              <div style={{ 
                maxHeight: '160px', 
                overflowY: 'auto', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '6px',
                padding: '4px'
              }}>
                {results.map((r, i) => (
                  <div key={i} style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: r.success ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                    border: `1px solid ${r.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px'
                  }}>
                    <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{r.title}</span>
                    <span style={{ color: r.success ? 'var(--success)' : 'var(--danger)', fontSize: '11px' }}>
                      {r.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Danh sách chọn nhóm chung (khi chưa chạy) */}
          {!isRunning && !isCompleted && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                  Chọn Nhóm Chung Muốn Tham Gia ({selectedGroupIds.size}/{masterGroups.length}):
                </div>
                {masterGroups.length > 0 && (
                  <button 
                    onClick={toggleSelectAll} 
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                  >
                    {selectedGroupIds.size === masterGroups.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                )}
              </div>

              {loadingGroups ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  <Loader2 size={24} className="spin" style={{ margin: '0 auto 8px' }} />
                  <div>Đang tải kho nhóm chung...</div>
                </div>
              ) : masterGroups.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '36px 16px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-subtle)'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>
                    Kho nhóm chung đang trống!
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Bạn chưa có nhóm nào trong kho nhóm chung. Hãy mở tab "Kho Nhóm Chung" hoặc bấm biểu tượng ⭐ ở danh sách nhóm để lưu vào kho.
                  </div>
                </div>
              ) : (
                <div style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '6px'
                }}>
                  {masterGroups.map((grp) => {
                    const isSelected = selectedGroupIds.has(grp.id);
                    return (
                      <div
                        key={grp.id}
                        onClick={() => toggleSelectGroup(grp.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                          border: isSelected ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
                          marginBottom: '4px',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ cursor: 'pointer' }}
                          />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                              {grp.group_title}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              {grp.invite_link}
                            </div>
                          </div>
                        </div>

                        {grp.notes && (
                          <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                            {grp.notes}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          {isRunning ? (
            <button
              onClick={handleStopProcess}
              className="btn btn-danger"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <PauseCircle size={16} />
              <span>Dừng Lại Ngay</span>
            </button>
          ) : isCompleted ? (
            <button
              onClick={onClose}
              className="btn btn-primary"
            >
              Đóng & Xem Danh Sách Nhóm
            </button>
          ) : (
            <>
              <button onClick={onClose} className="btn btn-secondary">
                Hủy Bỏ
              </button>
              <button
                onClick={handleStartAutoJoin}
                disabled={selectedGroupIds.size === 0 || masterGroups.length === 0}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Zap size={16} />
                <span>Bắt Đầu Auto-Join ({selectedGroupIds.size} Nhóm)</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
