import React, { useState, useEffect } from 'react';
import { Star, Check, X, Loader2, Link as LinkIcon, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function AddToMasterModal({ isOpen, onClose, group, onSaved }) {
  const { user } = useAuth();
  const { showToast } = useNotification();

  const [title, setTitle] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectedStatus, setDetectedStatus] = useState(null);

  useEffect(() => {
    if (isOpen && group) {
      setTitle(group.group_title || group.title || 'Nhóm Telegram');
      setNotes('');
      setDetectedStatus(null);

      // Nếu đã có sẵn link hoặc username
      if (group.invite_link) {
        setInviteLink(group.invite_link);
      } else if (group.username) {
        setInviteLink(`https://t.me/${group.username}`);
      } else if (group.account_id && group.chat_id) {
        // Tự động truy vấn lấy link từ Telegram API qua nick đã tham gia
        setDetecting(true);
        fetch(`${BACKEND_URL}/api/groups/detect-link?account_id=${group.account_id}&chat_id=${group.chat_id}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.found && data.link) {
              setInviteLink(data.link);
              setDetectedStatus({ success: true, message: data.message });
            } else if (data.message) {
              setDetectedStatus({ success: false, message: data.message });
            }
          })
          .catch(() => {})
          .finally(() => setDetecting(false));
      } else {
        setInviteLink('');
      }
    }
  }, [isOpen, group]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Vui lòng nhập tên nhóm!');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/groups/master`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          group_title: title.trim(),
          invite_link: inviteLink.trim(),
          chat_id: group.chat_id,
          notes: notes.trim(),
          is_active: true
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Lỗi thêm nhóm vào kho');

      showToast({
        title: 'Đã lưu nhóm chung',
        message: `Đã thêm "${title}" vào Kho Nhóm Chung thành công`,
        type: 'success'
      });

      if (onSaved) onSaved(data.data);
      onClose();
    } catch (err) {
      alert(err.message || 'Lỗi khi lưu nhóm');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !group) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '480px', width: '92%' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)'
            }}>
              <Star size={18} fill="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>
                Lưu Thành Nhóm Dùng Chung
              </h3>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Đưa vào Kho Nhóm Chung để các nick mới có thể 1-click tham gia
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon-subtle" style={{ fontSize: '18px' }}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ fontSize: '12px', margin: 0 }}>
                  Tên Nhóm:
                </label>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Chỉ đọc (Đồng bộ từ Telegram)</span>
              </div>
              <input
                type="text"
                readOnly
                className="form-input"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  cursor: 'not-allowed',
                  opacity: 0.85,
                  borderColor: 'var(--border-subtle)'
                }}
                value={title}
                onChange={() => {}}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ fontSize: '12px', margin: 0 }}>
                  Link Mời hoặc Username Telegram:
                </label>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tùy chọn</span>
              </div>
              <input
                type="text"
                placeholder="VD: https://t.me/tennhom hoặc https://t.me/+xxxx hoặc @tennhom"
                className="form-input"
                value={inviteLink}
                onChange={(e) => setInviteLink(e.target.value)}
              />
              {detecting && (
                <div style={{ fontSize: '11px', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
                  <Loader2 size={12} className="spin" />
                  <span>Đang tự động dò tìm link từ Telegram qua tài khoản đã tham gia...</span>
                </div>
              )}
              {detectedStatus && !detecting && (
                <div style={{
                  fontSize: '11px',
                  color: detectedStatus.success ? 'var(--success)' : 'var(--text-muted)',
                  marginTop: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span>{detectedStatus.success ? '✨' : 'ℹ️'}</span>
                  <span>{detectedStatus.message}</span>
                </div>
              )}
              {!detecting && !detectedStatus && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Không bắt buộc. Nếu chưa có link, bạn có thể lưu nhóm trước và bổ sung sau khi cần auto-join.
                </div>
              )}
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '12px', marginBottom: '6px' }}>
                Ghi chú / Thể loại (Tùy chọn):
              </label>
              <input
                type="text"
                placeholder="VD: Nhóm BĐS Sài Gòn, Rao vặt..."
                className="form-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {submitting ? <Loader2 size={15} className="spin" /> : <Star size={15} fill="#fff" />}
              <span>Lưu Vào Kho Chung</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
