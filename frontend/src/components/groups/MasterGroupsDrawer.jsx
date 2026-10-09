import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Loader2, 
  Check, 
  Link as LinkIcon,
  Zap,
  Info,
  Copy,
  Globe,
  Lock,
  FileText,
  Users
} from 'lucide-react';
import RightDrawer from '../common/RightDrawer';
import ConfirmModal from '../common/ConfirmModal';
import Tooltip from '../common/Tooltip';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function MasterGroupsDrawer({ 
  isOpen, 
  onClose, 
  selectedAccount,
  onOpenAutoJoin,
  onUpdated 
}) {
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
      invite_link: group.invite_link || '',
      notes: group.notes || ''
    });
    setShowForm(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.group_title.trim()) {
      alert('Vui lòng nhập tên nhóm!');
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
            group_title: formData.group_title.trim(),
            invite_link: formData.invite_link.trim(),
            notes: formData.notes.trim()
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Lỗi cập nhật');
        showToast({ title: 'Thành công', message: 'Đã cập nhật thông tin nhóm chung', type: 'success' });
      } else {
        // Thêm mới
        const res = await fetch(`${BACKEND_URL}/api/groups/master`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            group_title: formData.group_title.trim(),
            invite_link: formData.invite_link.trim(),
            notes: formData.notes.trim()
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
      } else {
        throw new Error('Lỗi từ máy chủ');
      }
    } catch (err) {
      showToast({ title: 'Lỗi', message: 'Không thể xóa nhóm này khỏi Kho Nhóm Chung', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const [detectingMap, setDetectingMap] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);

  const copyToClipboard = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    const key = id || text;
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(prev => (prev === key ? null : prev));
    }, 5000);
    showToast({ title: 'Đã sao chép link', message: text, type: 'info' });
  };

  const handleDetectLink = async (grp) => {
    if (!selectedAccount?.id) {
      alert('Vui lòng chọn tài khoản online bên ngoài để quét link!');
      return;
    }
    if (!grp.chat_id) {
      alert('Nhóm này không có Chat ID để quét link.');
      return;
    }

    setDetectingMap(prev => ({ ...prev, [grp.id]: true }));
    try {
      const res = await fetch(`${BACKEND_URL}/api/groups/detect-link?account_id=${selectedAccount.id}&chat_id=${grp.chat_id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Không thể dò link');

      if (data.found && data.link) {
        // Cập nhật nhóm chung với link tìm được
        const updateRes = await fetch(`${BACKEND_URL}/api/groups/master/${grp.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            invite_link: data.link
          })
        });
        if (updateRes.ok) {
          setMasterGroups(prev => prev.map(g => g.id === grp.id ? { ...g, invite_link: data.link } : g));
          showToast({
            title: 'Dò link thành công!',
            message: data.message || `Đã tìm thấy link: ${data.link}`,
            type: 'success'
          });
          if (onUpdated) onUpdated();
        }
      } else {
        showToast({
          title: 'Chưa thể tự động lấy link',
          message: 'Nhóm riêng tư Telegram cần quyền admin để tạo link mời. Vui lòng bấm "+ Bổ sung" để dán link mời thủ công.',
          type: 'warning'
        });
      }
    } catch (err) {
      showToast({
        title: 'Lỗi dò link',
        message: err.message || 'Không thể kết nối Telegram client',
        type: 'error'
      });
    } finally {
      setDetectingMap(prev => ({ ...prev, [grp.id]: false }));
    }
  };

  // Helper phân loại loại link
  const getLinkType = (link) => {
    if (!link || !link.trim()) return 'none';
    const l = link.trim().toLowerCase();
    if (l.includes('+') || l.includes('joinchat')) return 'private';
    return 'public';
  };

  // Filter & Sort
  const [linkFilter, setLinkFilter] = useState('all'); // 'all' | 'no_link' | 'public' | 'private' | 'has_notes'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'need_link_first' | 'name'

  const totalCount = masterGroups.length;
  const noLinkCount = masterGroups.filter(g => getLinkType(g.invite_link) === 'none').length;
  const publicCount = masterGroups.filter(g => getLinkType(g.invite_link) === 'public').length;
  const privateCount = masterGroups.filter(g => getLinkType(g.invite_link) === 'private').length;
  const notesCount = masterGroups.filter(g => Boolean(g.notes && g.notes.trim())).length;

  const filteredGroups = masterGroups.filter(g => {
    // 1. Tìm kiếm
    const matchSearch = !searchQuery.trim() || 
      g.group_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.invite_link?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;

    // 2. Lọc theo danh mục
    const lType = getLinkType(g.invite_link);
    if (linkFilter === 'no_link') return lType === 'none';
    if (linkFilter === 'public') return lType === 'public';
    if (linkFilter === 'private') return lType === 'private';
    if (linkFilter === 'has_notes') return Boolean(g.notes && g.notes.trim());

    return true;
  }).sort((a, b) => {
    if (sortBy === 'name') {
      return (a.group_title || '').localeCompare(b.group_title || '');
    }
    if (sortBy === 'need_link_first') {
      const aNo = getLinkType(a.invite_link) === 'none' ? 0 : 1;
      const bNo = getLinkType(b.invite_link) === 'none' ? 0 : 1;
      return aNo - bNo;
    }
    return 0; // Default: newest (giữ nguyên thứ tự tạo)
  });

  const totalMasterMembers = masterGroups.reduce((acc, g) => acc + (g.members_count || 0), 0);

  return (
    <RightDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Kho Nhóm Dùng Chung"
      subtitle="Tập hợp nhóm mẫu để tự động join cho tài khoản mới"
      icon={Star}
      iconColor="#f59e0b"
      badge={totalMasterMembers > 0 ? `${masterGroups.length} nhóm • ${totalMasterMembers.toLocaleString('vi-VN')} TV` : `${masterGroups.length} nhóm`}
      width="540px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Tổng cộng: <strong style={{ color: 'var(--text-main)' }}>{masterGroups.length}</strong> nhóm ({noLinkCount > 0 ? <span style={{ color: '#f59e0b' }}>{noLinkCount} chưa có link</span> : 'Tất cả đã có link'})
          </span>
          {selectedAccount && onOpenAutoJoin && (
            <button
              onClick={() => {
                onClose();
                onOpenAutoJoin();
              }}
              disabled={masterGroups.length === 0}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Zap size={14} />
              <span>Auto-Join Nick Hiện Tại</span>
            </button>
          )}
        </div>
      }
    >
      {/* Search & Add Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Tìm theo tên nhóm, link, ghi chú..."
            className="form-input"
            style={{ paddingLeft: '32px', fontSize: '13px', height: '36px' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button
          onClick={handleOpenAdd}
          className="btn btn-primary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', height: '36px' }}
        >
          <Plus size={15} />
          <span>Thêm Nhóm</span>
        </button>
      </div>

      {/* Filter Tabs (Lọc nhóm chưa có link, công khai, riêng tư, có ghi chú) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Tất cả */}
          <button
            onClick={() => setLinkFilter('all')}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              borderRadius: '999px',
              border: '1px solid',
              borderColor: linkFilter === 'all' ? 'var(--primary)' : 'var(--border-subtle)',
              background: linkFilter === 'all' ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
              color: linkFilter === 'all' ? 'var(--primary-light)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: linkFilter === 'all' ? '600' : '400',
              transition: 'all 0.15s'
            }}
          >
            Tất cả ({totalCount})
          </button>

          {/* Chưa có link */}
          <button
            onClick={() => setLinkFilter('no_link')}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              borderRadius: '999px',
              border: '1px solid',
              borderColor: linkFilter === 'no_link' ? '#f59e0b' : 'var(--border-subtle)',
              background: linkFilter === 'no_link' ? 'rgba(245, 158, 11, 0.14)' : 'transparent',
              color: linkFilter === 'no_link' ? '#f59e0b' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: linkFilter === 'no_link' ? '600' : '400',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s'
            }}
            title="Lọc các nhóm kín chưa có link mời cần bổ sung"
          >
            <span>⚠️ Chưa có link</span>
            <span style={{ fontSize: '11px', background: noLinkCount > 0 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '4px' }}>
              {noLinkCount}
            </span>
          </button>

          {/* Công khai */}
          <button
            onClick={() => setLinkFilter('public')}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              borderRadius: '999px',
              border: '1px solid',
              borderColor: linkFilter === 'public' ? 'var(--primary-light)' : 'var(--border-subtle)',
              background: linkFilter === 'public' ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
              color: linkFilter === 'public' ? 'var(--primary-light)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: linkFilter === 'public' ? '600' : '400',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s'
            }}
            title="Nhóm công khai có username (@...)"
          >
            <span>🌐 Công khai</span>
            <span style={{ fontSize: '11px', background: 'rgba(99, 102, 241, 0.2)', padding: '1px 5px', borderRadius: '4px' }}>
              {publicCount}
            </span>
          </button>

          {/* Riêng tư */}
          <button
            onClick={() => setLinkFilter('private')}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              borderRadius: '999px',
              border: '1px solid',
              borderColor: linkFilter === 'private' ? '#a855f7' : 'var(--border-subtle)',
              background: linkFilter === 'private' ? 'rgba(168, 85, 247, 0.12)' : 'transparent',
              color: linkFilter === 'private' ? '#a855f7' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: linkFilter === 'private' ? '600' : '400',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s'
            }}
            title="Nhóm kín tham gia bằng link mời bí mật (t.me/+...)"
          >
            <span>🔒 Riêng tư</span>
            <span style={{ fontSize: '11px', background: 'rgba(168, 85, 247, 0.2)', padding: '1px 5px', borderRadius: '4px' }}>
              {privateCount}
            </span>
          </button>

          {/* Có ghi chú */}
          {notesCount > 0 && (
            <button
              onClick={() => setLinkFilter('has_notes')}
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                borderRadius: '999px',
                border: '1px solid',
                borderColor: linkFilter === 'has_notes' ? 'var(--info)' : 'var(--border-subtle)',
                background: linkFilter === 'has_notes' ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                color: linkFilter === 'has_notes' ? 'var(--info)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: linkFilter === 'has_notes' ? '600' : '400',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s'
              }}
              title="Lọc các nhóm có gắn ghi chú"
            >
              <span>📝 Có ghi chú</span>
              <span style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.2)', padding: '1px 5px', borderRadius: '4px' }}>
                {notesCount}
              </span>
            </button>
          )}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="form-input"
          style={{ width: 'auto', padding: '2px 8px', fontSize: '11px', height: '26px' }}
        >
          <option value="newest">Mới nhất</option>
          <option value="need_link_first">Ưu tiên chưa có link</option>
          <option value="name">Tên A - Z</option>
        </select>
      </div>

      {/* Form thêm / sửa popup con */}
      {showForm && (
        <form onSubmit={handleSubmitForm} style={{
          background: 'rgba(245, 158, 11, 0.05)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '18px'
        }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#f59e0b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Star size={16} fill="#f59e0b" />
            <span>{editingId ? 'Chỉnh Sửa Nhóm Chung' : 'Thêm Nhóm Mới Vào Kho Chung'}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label" style={{ fontSize: '12px', margin: 0 }}>
                  Tên Nhóm:
                </label>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Chỉ đọc (Đồng bộ từ Telegram)</span>
              </div>
              <input
                type="text"
                readOnly
                placeholder="Tên nhóm Telegram"
                className="form-input"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  cursor: 'not-allowed',
                  opacity: 0.85,
                  borderColor: 'var(--border-subtle)'
                }}
                value={formData.group_title}
                onChange={() => {}}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label" style={{ fontSize: '12px', margin: 0 }}>
                  Link Mời hoặc Username Telegram:
                </label>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tùy chọn (Không bắt buộc)</span>
              </div>
              <input
                type="text"
                placeholder="VD: https://t.me/raovat hoặc https://t.me/+xxxx hoặc @raovat"
                className="form-input"
                value={formData.invite_link}
                onChange={(e) => setFormData({ ...formData, invite_link: e.target.value })}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Nếu chưa có link, bạn có thể lưu nhóm trước và bổ sung sau khi cần auto-join.
              </div>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>
                Ghi chú / Phân loại danh mục (Tùy chọn):
              </label>
              <input
                type="text"
                placeholder="VD: Nhóm Bất Động Sản, Crypto, Rao Vặt..."
                className="form-input"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
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
          </div>
        </form>
      )}

      {/* List of Master Groups */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <Loader2 size={24} className="spin" style={{ margin: '0 auto 8px' }} color="var(--primary-light)" />
          <div>Đang tải kho nhóm chung...</div>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--border-subtle)',
          margin: 'auto 0'
        }}>
          <Star size={32} color="#f59e0b" style={{ margin: '0 auto 10px', opacity: 0.6 }} />
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>
            {searchQuery ? 'Không tìm thấy nhóm phù hợp' : 'Kho nhóm chung chưa có dữ liệu'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Bấm "Thêm Nhóm" hoặc bấm biểu tượng ⭐ ở danh sách nhóm để lưu vào kho.
          </div>
          {!searchQuery && (
            <button onClick={handleOpenAdd} className="btn btn-secondary btn-sm">
              + Thêm nhóm đầu tiên
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredGroups.map((grp) => {
            const lType = getLinkType(grp.invite_link);
            const isDetecting = detectingMap[grp.id];

            return (
              <div
                key={grp.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid',
                  borderColor: lType === 'none' ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ overflow: 'hidden', flex: 1 }}>
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

                    {/* Badge số lượng thành viên */}
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

                    {/* Badge phân loại link */}
                    {lType === 'none' ? (
                      <span style={{ fontSize: '10px', padding: '1px 6px', background: 'rgba(245, 158, 11, 0.16)', color: '#f59e0b', borderRadius: '4px', fontWeight: '600' }}>
                        ⚠️ Chưa có link
                      </span>
                    ) : lType === 'public' ? (
                      <span style={{ fontSize: '10px', padding: '1px 6px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary-light)', borderRadius: '4px', fontWeight: '500' }}>
                        🌐 Công khai
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', padding: '1px 6px', background: 'rgba(168, 85, 247, 0.12)', color: '#c084fc', borderRadius: '4px', fontWeight: '500' }}>
                        🔒 Riêng tư
                      </span>
                    )}

                    {grp.notes && (
                      <span style={{ fontSize: '11px', padding: '1px 6px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', borderRadius: '4px' }}>
                        {grp.notes}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {grp.invite_link ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <LinkIcon size={12} color="var(--text-muted)" />
                        <a
                          href={grp.invite_link}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: '12px', color: 'var(--primary-light)', textDecoration: 'none', fontFamily: 'monospace' }}
                        >
                          {grp.invite_link}
                        </a>
                        {(() => {
                          const isCopied = copiedKey === grp.id || copiedKey === grp.invite_link;
                          return (
                            <button
                              onClick={() => copyToClipboard(grp.invite_link, grp.id)}
                              className={`btn-icon-subtle ${isCopied ? 'copied' : ''}`}
                              style={{ padding: '2px', transition: 'all 0.2s ease' }}
                              title={isCopied ? "Đã sao chép link mời!" : "Sao chép link mời"}
                            >
                              {isCopied ? (
                                <Check size={11} color="var(--success)" strokeWidth={2.5} />
                              ) : (
                                <Copy size={11} />
                              )}
                            </button>
                          );
                        })()}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: '#f59e0b', fontStyle: 'italic' }}>
                          Cần bổ sung link để auto-join
                        </span>

                        {/* Nút Dò link tự động nếu có nick và chat_id */}
                        {selectedAccount && grp.chat_id && (
                          <button
                            onClick={() => handleDetectLink(grp)}
                            disabled={isDetecting}
                            className="btn btn-secondary btn-sm"
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              height: '24px',
                              borderColor: 'rgba(99, 102, 241, 0.3)',
                              color: 'var(--primary-light)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title={`Dò link qua nick ${selectedAccount.account_name || selectedAccount.phone_number}`}
                          >
                            {isDetecting ? <Loader2 size={11} className="spin" /> : <Zap size={11} />}
                            <span>{isDetecting ? 'Đang dò...' : 'Dò link'}</span>
                          </button>
                        )}

                        {/* Nút Bổ sung thủ công */}
                        <button
                          onClick={() => handleOpenEdit(grp)}
                          className="btn btn-secondary btn-sm"
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            height: '24px',
                            borderColor: 'rgba(245, 158, 11, 0.4)',
                            color: '#f59e0b',
                            background: 'rgba(245, 158, 11, 0.08)'
                          }}
                        >
                          + Bổ sung
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
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
            );
          })}
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA NHÓM CHUNG TRONG MÀN HÌNH */}
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
    </RightDrawer>
  );
}
