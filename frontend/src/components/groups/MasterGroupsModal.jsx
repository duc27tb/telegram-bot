import React, { useState, useEffect } from 'react';
import { 
  FolderCheck, 
  Plus, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  X, 
  Loader2, 
  Search,
  Check,
  Link as LinkIcon,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import ConfirmModal from '../common/ConfirmModal';
import Tooltip from '../common/Tooltip';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function MasterGroupsModal({ isOpen, onClose, onUpdated }) {
  const { user } = useAuth();
  const { showToast } = useNotification();

  const [masterGroups, setMasterGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form thêm / sửa
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    group_title: '',
    invite_link: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchMasterGroups();
      setShowForm(false);
      setEditingId(null);
    }
  }, [isOpen, user?.id]);

  const fetchMasterGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/groups/master?user_id=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setMasterGroups(data.data || []);
      }
    } catch (err) {
      console.error('Lỗi tải nhóm chung:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ group_title: '', invite_link: '', notes: '' });
    setShowForm(true);
  };

  const handleOpenEdit = (group) => {
    setEditingId(group.id);
    setFormData({
      group_title: group.group_title,
      invite_link: group.invite_link,
      notes: group.notes || ''
    });
    setShowForm(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.invite_link.trim()) {
      alert('Vui lòng nhập Link mời hoặc Username nhóm!');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        // Cập nhật
        const res = await fetch(`${BACKEND_URL}/api/groups/master/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            group_title: formData.group_title || 'Nhóm Telegram',
            invite_link: formData.invite_link,
            notes: formData.notes
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Lỗi cập nhật');
        showToast({ title: 'Thành công', message: 'Đã cập nhật nhóm chung', type: 'success' });
      } else {
        // Thêm mới
        const res = await fetch(`${BACKEND_URL}/api/groups/master`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            group_title: formData.group_title || 'Nhóm Telegram',
            invite_link: formData.invite_link,
            notes: formData.notes
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Lỗi thêm nhóm');
        showToast({ title: 'Thành công', message: 'Đã thêm nhóm vào Kho Nhóm Chung', type: 'success' });
      }

      setShowForm(false);
      fetchMasterGroups();
      if (onUpdated) onUpdated();
    } catch (err) {
      alert(err.message || 'Lỗi lưu thông tin');
    } finally {
      setSubmitting(false);
    }
  };

  const [groupToDelete, setGroupToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const executeDelete = async () => {
    if (!groupToDelete?.id) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/groups/master/${groupToDelete.id}?user_id=${user.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setMasterGroups(prev => prev.filter(g => g.id !== groupToDelete.id));
        showToast({ title: 'Đã xóa', message: 'Đã gỡ nhóm khỏi Kho Nhóm Chung', type: 'info' });
        if (onUpdated) onUpdated();
        setGroupToDelete(null);
      }
    } catch (err) {
      showToast({ title: 'Lỗi', message: 'Không thể xóa nhóm', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredGroups = masterGroups.filter(g => 
    g.group_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.invite_link?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9998 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '680px', width: '92%', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
            }}>
              <FolderCheck size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>
                Kho Nhóm Dùng Chung (Master Groups)
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Tập hợp nhóm mẫu dùng chung để các nick Telegram mới có thể 1-click tham gia
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon-subtle" style={{ fontSize: '18px' }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Action Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Tìm kiếm nhóm theo tên, link, ghi chú..."
                className="form-input"
                style={{ paddingLeft: '32px', fontSize: '13px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button
              onClick={handleOpenAdd}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
            >
              <Plus size={15} />
              <span>Thêm Nhóm Vào Kho</span>
            </button>
          </div>

          {/* Form thêm / sửa popup con */}
          {showForm && (
            <form onSubmit={handleSubmitForm} style={{
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '18px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary-light)', marginBottom: '12px' }}>
                {editingId ? 'Chỉnh Sửa Nhóm Chung' : 'Thêm Nhóm Chung Mới'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>
                    Tên gợi nhớ nhóm:
                  </label>
                  <input
                    type="text"
                    required
                    readOnly={Boolean(editingId)}
                    placeholder="VD: Hội Rao Vặt Toàn Quốc"
                    className="form-input"
                    style={editingId ? { background: 'rgba(255, 255, 255, 0.04)', cursor: 'not-allowed', opacity: 0.85 } : {}}
                    value={formData.group_title}
                    onChange={(e) => !editingId && setFormData({ ...formData, group_title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>
                    Link Mời hoặc Username Telegram <span style={{ color: 'var(--danger)' }}>*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: https://t.me/raovat hoặc https://t.me/+xxxx"
                    className="form-input"
                    value={formData.invite_link}
                    onChange={(e) => setFormData({ ...formData, invite_link: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>
                  Ghi chú / Phân loại (Tùy chọn):
                </label>
                <input
                  type="text"
                  placeholder="VD: Nhóm Bất Động Sản, Nhóm Crypto, Rao Vặt..."
                  className="form-input"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  {submitting ? <Loader2 size={13} className="spin" /> : <Check size={13} />}
                  <span>{editingId ? 'Cập Nhật' : 'Lưu Nhóm'}</span>
                </button>
              </div>
            </form>
          )}

          {/* List of Master Groups */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <Loader2 size={24} className="spin" style={{ margin: '0 auto 8px' }} />
              <div>Đang tải kho nhóm chung...</div>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-subtle)'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>
                {searchQuery ? 'Không tìm thấy nhóm phù hợp' : 'Kho nhóm chung chưa có dữ liệu'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Bấm "Thêm Nhóm Vào Kho" hoặc vào danh sách nhóm của nick để ghim ⭐ vào kho chung.
              </div>
              {!searchQuery && (
                <button onClick={handleOpenAdd} className="btn btn-secondary btn-sm">
                  + Thêm nhóm đầu tiên
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredGroups.map((grp) => (
                <div
                  key={grp.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <Tooltip text={grp.group_title}>
                        <span style={{ 
                          fontWeight: '600', 
                          fontSize: '14px', 
                          color: 'var(--text-main)',
                          maxWidth: '240px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                          verticalAlign: 'middle',
                          cursor: 'default'
                        }}>
                          {grp.group_title}
                        </span>
                      </Tooltip>
                      {grp.members_count > 0 && (
                        <span 
                          className="group-members-badge" 
                          title={`${grp.members_count.toLocaleString('vi-VN')} thành viên`}
                          style={{ margin: 0 }}
                        >
                          <Users size={11} />
                          <span>{grp.members_count.toLocaleString('vi-VN')} TV</span>
                        </span>
                      )}
                      {grp.notes && (
                        <span style={{ fontSize: '11px', padding: '2px 6px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-light)', borderRadius: '4px' }}>
                          {grp.notes}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                      <LinkIcon size={12} color="var(--text-muted)" />
                      <a
                        href={grp.invite_link}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '12px', color: 'var(--primary-light)', textDecoration: 'none', fontFamily: 'monospace' }}
                      >
                        {grp.invite_link}
                      </a>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={() => handleOpenEdit(grp)}
                      className="btn-icon-subtle"
                      title="Sửa thông tin nhóm"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => setGroupToDelete(grp)}
                      className="btn-icon-subtle"
                      style={{ color: 'var(--danger)' }}
                      title="Xóa khỏi kho nhóm chung"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Tổng cộng: <strong style={{ color: 'var(--text-main)' }}>{masterGroups.length}</strong> nhóm trong kho
          </span>
          <button onClick={onClose} className="btn btn-secondary">
            Đóng
          </button>
        </div>
      </div>

      {/* MODAL XÁC NHẬN XÓA NHÓM CHUNG */}
      <ConfirmModal
        isOpen={Boolean(groupToDelete)}
        onClose={() => setGroupToDelete(null)}
        onConfirm={executeDelete}
        title="Xác nhận xóa nhóm chung"
        message={
          <span>
            Bạn có chắc chắn muốn xóa nhóm <strong style={{ color: 'var(--text-main)' }}>{groupToDelete?.group_title}</strong> khỏi Kho Nhóm Chung?
          </span>
        }
        subMessage="Nhóm này sẽ không còn xuất hiện trong kho nhóm dùng chung, nhưng không ảnh hưởng tới nhóm riêng của tài khoản."
        confirmText="Xác nhận xóa"
        isLoading={isDeleting}
      />
    </div>
  );
}
