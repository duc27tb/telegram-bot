import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldAlert,
  Activity,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Code,
  Copy,
  Check,
  X,
  Server,
  Zap,
  DollarSign,
  ShieldCheck,
  Bot
} from 'lucide-react';
import { getAdminAuditLogs } from '../../lib/api';

const CATEGORIES = [
  { id: 'ALL', label: 'Tất Cả Nhật Ký', icon: Activity },
  { id: 'WEBHOOK', label: 'Webhook PayOS', icon: Zap },
  { id: 'BOT_ERROR', label: 'Lỗi MTProto / Worker', icon: Bot },
  { id: 'BILLING', label: 'Dòng Tiền & Ví', icon: DollarSign },
  { id: 'SECURITY', label: 'Quản Trị & Bảo Mật', icon: ShieldCheck }
];

export default function AdminAuditLogsTab({ adminId, showToast }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLogModal, setSelectedLogModal] = useState(null);
  const [copied, setCopied] = useState(false);

  // Fetch logs
  const fetchLogs = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    const start = Date.now();
    try {
      const res = await getAdminAuditLogs(adminId, 100, selectedCategory);
      const elapsed = Date.now() - start;
      if (isManual && elapsed < 600) {
        await new Promise(r => setTimeout(r, 600 - elapsed));
      }
      if (res?.success) {
        setLogs(res.data || []);
      } else {
        if (showToast) showToast({ title: 'Lỗi', message: 'Không thể tải nhật ký hệ thống', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast({ title: 'Lỗi', message: 'Lỗi kết nối máy chủ', type: 'error' });
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, [adminId, selectedCategory, showToast]);

  useEffect(() => {
    fetchLogs(false);
  }, [fetchLogs]);

  // Copy JSON to clipboard
  const handleCopyJson = (data) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (showToast) showToast({ title: 'Thành công', message: 'Đã sao chép JSON payload!', type: 'success' });
    } catch (err) {
      console.error(err);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = logs.length;
    const webhookCount = logs.filter(l => l.category === 'WEBHOOK').length;
    const errorCount = logs.filter(l => l.severity === 'ERROR').length;
    const securityCount = logs.filter(l => l.category === 'SECURITY').length;
    return { total, webhookCount, errorCount, securityCount };
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    let result = logs;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.description && l.description.toLowerCase().includes(q)) ||
        (l.actor && String(l.actor).toLowerCase().includes(q)) ||
        (l.ip_address && l.ip_address.toLowerCase().includes(q))
      );
    }
    return result;
  }, [logs, searchQuery]);

  const renderSeverityBadge = (severity) => {
    switch (severity) {
      case 'ERROR':
        return (
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            padding: '2px 8px',
            borderRadius: '6px',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <XCircle size={12} /> ERROR
          </span>
        );
      case 'WARNING':
        return (
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            padding: '2px 8px',
            borderRadius: '6px',
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#fbbf24',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <AlertTriangle size={12} /> WARN
          </span>
        );
      default:
        return (
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            padding: '2px 8px',
            borderRadius: '6px',
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Info size={12} /> INFO
          </span>
        );
    }
  };

  const renderCategoryBadge = (category) => {
    let color = '#94a3b8';
    let bg = 'rgba(148, 163, 184, 0.1)';
    let border = 'rgba(148, 163, 184, 0.2)';

    if (category === 'WEBHOOK') {
      color = '#38bdf8';
      bg = 'rgba(56, 189, 248, 0.12)';
      border = 'rgba(56, 189, 248, 0.3)';
    } else if (category === 'BOT_ERROR') {
      color = '#f43f5e';
      bg = 'rgba(244, 63, 94, 0.12)';
      border = 'rgba(244, 63, 94, 0.3)';
    } else if (category === 'BILLING') {
      color = '#10b981';
      bg = 'rgba(16, 185, 129, 0.12)';
      border = 'rgba(16, 185, 129, 0.3)';
    } else if (category === 'SECURITY') {
      color = '#eab308';
      bg = 'rgba(234, 179, 8, 0.12)';
      border = 'rgba(234, 179, 8, 0.3)';
    }

    return (
      <span style={{
        fontSize: '11px',
        fontWeight: '600',
        padding: '2px 8px',
        borderRadius: '6px',
        background: bg,
        color: color,
        border: `1px solid ${border}`
      }}>
        {category}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. Header & KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(99, 102, 241, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary-light)'
          }}>
            <Activity size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>TỔNG BẢN GHI LOGS</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>{metrics.total}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(56, 189, 248, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8'
          }}>
            <Zap size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>PAYOS WEBHOOK IPN</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>{metrics.webhookCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f87171'
          }}>
            <XCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>LỖI / NGOẠI LỆ KỸ THUẬT</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: metrics.errorCount > 0 ? '#f87171' : 'var(--text-main)', marginTop: '2px' }}>{metrics.errorCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(234, 179, 8, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fbbf24'
          }}>
            <ShieldAlert size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>SỰ KIỆN QUẢN TRỊ</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>{metrics.securityCount}</div>
          </div>
        </div>
      </div>

      {/* 2. Filter Bar & Controls */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
          
          {/* Category Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {CATEGORIES.map((cat) => {
              const IconComp = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '6px 13px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: isActive ? '700' : '500',
                    background: isActive ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
                    color: isActive ? '#fff' : 'var(--text-muted)',
                    border: isActive ? '1px solid var(--primary-light)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <IconComp size={14} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search & Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Tìm IP, actor, lỗi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: '34px',
                  paddingLeft: '32px',
                  paddingRight: '10px',
                  fontSize: '12px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: 'var(--text-main)',
                  outline: 'none'
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => fetchLogs(true)}
              disabled={refreshing}
              className="btn btn-secondary"
              style={{
                height: '34px',
                padding: '0 14px',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Làm mới danh sách nhật ký"
            >
              <RefreshCw size={13} className={refreshing ? 'spin' : ''} />
              <span>{refreshing ? 'Đang tải...' : 'Làm Mới'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Table of Audit Logs */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '12px 18px', fontWeight: '700', color: 'var(--text-dim)', fontSize: '11px', width: '160px' }}>THỜI GIAN</th>
                <th style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--text-dim)', fontSize: '11px', width: '100px' }}>MỨC ĐỘ</th>
                <th style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--text-dim)', fontSize: '11px', width: '130px' }}>PHÂN HỆ</th>
                <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text-dim)', fontSize: '11px' }}>SỰ KIỆN & NỘI DUNG</th>
                <th style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--text-dim)', fontSize: '11px', width: '180px' }}>TÁC NHÂN / IP</th>
                <th style={{ padding: '12px 18px', fontWeight: '700', color: 'var(--text-dim)', fontSize: '11px', width: '110px', textAlign: 'center' }}>PAYLOAD</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <RefreshCw size={20} className="spin" style={{ margin: '0 auto 8px auto', display: 'block', color: 'var(--primary-light)' }} />
                    <span>Đang nạp dữ liệu nhật ký hệ thống...</span>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Không có bản ghi nhật ký nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 18px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {renderSeverityBadge(log.severity)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {renderCategoryBadge(log.category)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{log.action}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.4' }}>
                        {log.description}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: '500' }}>
                        {log.actor}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'monospace', marginTop: '2px' }}>
                        IP: {log.ip_address}
                      </div>
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedLogModal(log)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          fontSize: '11.5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                        title="Xem JSON Payload chi tiết"
                      >
                        <Code size={13} />
                        <span>Chi Tiết</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Modal Xem Chi Tiết JSON Payload */}
      {selectedLogModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#0d1117',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Code size={18} color="var(--primary-light)" />
                <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-main)' }}>
                  Chi Tiết Sự Kiện Kiểm Toán #{selectedLogModal.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogModal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>HÀNH ĐỘNG</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px' }}>
                    {selectedLogModal.action}
                  </div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>THỜI GIAN GHI NHẬN</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginTop: '2px', fontFamily: 'monospace' }}>
                    {new Date(selectedLogModal.timestamp).toLocaleString('vi-VN')}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-dim)' }}>RAW JSON PAYLOAD & METADATA</span>
                <button
                  type="button"
                  onClick={() => handleCopyJson(selectedLogModal)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: copied ? '#10b981' : 'var(--primary-light)',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? 'Đã chép!' : 'Sao chép JSON'}</span>
                </button>
              </div>

              <pre style={{
                background: '#07090e',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '14px',
                color: '#38bdf8',
                fontFamily: 'monospace',
                fontSize: '12px',
                lineHeight: '1.5',
                overflowX: 'auto',
                margin: 0
              }}>
                {JSON.stringify(selectedLogModal, null, 2)}
              </pre>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'flex-end',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <button
                type="button"
                onClick={() => setSelectedLogModal(null)}
                className="btn btn-secondary"
                style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
