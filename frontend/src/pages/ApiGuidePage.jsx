import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ExternalLink, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Save, 
  X, 
  ShieldCheck, 
  Sparkles, 
  Video, 
  FileText, 
  Plus, 
  Trash2,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { getApiGuide, updateApiGuide } from '../lib/api';

function getEmbedUrl(url) {
  if (!url) return '';
  try {
    // YouTube link formats:
    // https://www.youtube.com/watch?v=VIDEO_ID
    // https://youtu.be/VIDEO_ID
    // https://www.youtube.com/embed/VIDEO_ID
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : url;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : url;
    }
    if (url.includes('youtube.com/embed/')) {
      return url;
    }
  } catch (e) {}
  return url;
}

export default function ApiGuidePage() {
  const navigate = useNavigate();
  const { user, role, isAdmin: authIsAdmin } = useAuth();
  const { showToast } = useNotification();

  const [guideData, setGuideData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form edit của Admin
  const [editForm, setEditForm] = useState({
    title: '',
    badge: '',
    intro: '',
    video_url: '',
    video_title: '',
    steps: []
  });

  const isAdmin = authIsAdmin || 
                  role === 'admin' || 
                  user?.email?.toLowerCase() === 'admin@telepulse.io' ||
                  Boolean(localStorage.getItem('telepulse_admin_token'));

  useEffect(() => {
    fetchGuide();
  }, []);

  const fetchGuide = async () => {
    setLoading(true);
    try {
      const data = await getApiGuide();
      if (data) {
        setGuideData(data);
        setEditForm({
          title: data.title || '',
          badge: data.badge || '',
          intro: data.intro || '',
          video_url: data.video_url || '',
          video_title: data.video_title || '',
          steps: data.steps || []
        });
      }
    } catch (err) {
      console.error('Lỗi tải hướng dẫn:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGuide = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateApiGuide(editForm, user?.id || 'admin_root');
      setGuideData({ ...guideData, ...editForm });
      setIsEditModalOpen(false);
      showToast({
        title: 'Thành công',
        message: 'Đã cập nhật nội dung bài hướng dẫn và video thành công!',
        type: 'success'
      });
    } catch (err) {
      showToast({
        title: 'Lỗi cập nhật',
        message: err.message || 'Không thể lưu hướng dẫn',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStepChange = (index, value) => {
    const updated = [...editForm.steps];
    updated[index] = value;
    setEditForm({ ...editForm, steps: updated });
  };

  const handleAddStep = () => {
    setEditForm({ ...editForm, steps: [...editForm.steps, ''] });
  };

  const handleRemoveStep = (index) => {
    const updated = editForm.steps.filter((_, i) => i !== index);
    setEditForm({ ...editForm, steps: updated });
  };

  const videoUrl = guideData?.video_url || '';
  const embedUrl = getEmbedUrl(videoUrl);
  const isDirectVideo = videoUrl.endsWith('.mp4') || videoUrl.endsWith('.webm') || videoUrl.endsWith('.mov');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.12) 0%, rgba(15, 23, 42, 0) 50%), var(--bg-main)',
      color: 'var(--text-main)',
      padding: '24px 16px 80px 16px',
      fontFamily: 'inherit'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Navigation Top Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px'
        }}>
          <button
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/accounts');
              }
            }}
            className="btn btn-secondary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            <ArrowLeft size={16} />
            <span>Quay lại ứng dụng</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="btn btn-primary btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
              }}
            >
              <Edit3 size={15} />
              <span>Chỉnh Sửa Trang (Admin)</span>
            </button>
          )}
        </div>

        {/* Hero Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '36px'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '999px',
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.28)',
            color: '#38bdf8',
            fontSize: '12px',
            fontWeight: '600',
            marginBottom: '16px',
            letterSpacing: '0.3px'
          }}>
            <ShieldCheck size={15} />
            <span>{guideData?.badge || 'Chính thức từ my.telegram.org (Miễn phí 100%)'}</span>
          </div>

          <h1 style={{
            fontSize: '28px',
            fontWeight: '800',
            letterSpacing: '-0.5px',
            margin: '0 0 12px 0',
            background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {guideData?.title || 'Hướng Dẫn Lấy API ID & API Hash Telegram (Bắt Buộc)'}
          </h1>

          <p style={{
            fontSize: '14px',
            lineHeight: '1.6',
            color: 'var(--text-secondary)',
            maxWidth: '680px',
            margin: '0 auto'
          }}>
            {guideData?.intro || 'Để tài khoản gửi tin an toàn, độc lập và tránh bị Telegram quét spam hàng loạt, mỗi người dùng cần tự lấy API ID & API Hash riêng của mình từ trang chủ Telegram. Quy trình chỉ mất khoảng 1 phút và hoàn toàn miễn phí.'}
          </p>
        </div>

        {/* Video Tutorial Container */}
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          marginBottom: '36px'
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Video size={18} color="var(--primary)" />
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                {guideData?.video_title || 'Video Hướng Dẫn Thực Hành Nhanh (Trực Quan)'}
              </span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Khoảng 1 phút thực hiện
            </span>
          </div>

          <div style={{
            position: 'relative',
            width: '100%',
            paddingTop: '56.25%', // 16:9 Aspect Ratio
            background: '#090d16'
          }}>
            {videoUrl ? (
              isDirectVideo ? (
                <video
                  src={videoUrl}
                  controls
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none'
                  }}
                />
              ) : (
                <iframe
                  src={embedUrl}
                  title="Telegram API ID Guide Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none'
                  }}
                />
              )
            ) : (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                color: 'var(--text-muted)'
              }}>
                <Play size={48} strokeWidth={1.5} color="var(--primary)" />
                <span style={{ fontSize: '14px' }}>Video hướng dẫn đang được cập nhật bởi Quản trị viên.</span>
              </div>
            )}
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '28px 24px',
          marginBottom: '32px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '700',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <FileText size={20} color="var(--primary)" />
              <span>Các Bước Thực Hiện Cụ Thể</span>
            </h2>

            <a
              href="https://my.telegram.org"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none',
                fontWeight: '600'
              }}
            >
              <span>Mở my.telegram.org ngay</span>
              <ExternalLink size={14} />
            </a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(guideData?.steps || []).map((stepText, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  transition: 'background 0.2s ease'
                }}
              >
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '13px',
                  flexShrink: 0
                }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1, fontSize: '14px', lineHeight: '1.6', color: 'var(--text-main)' }}>
                  {stepText}
                </div>
              </div>
            ))}
          </div>

          {/* Important Security Notice */}
          <div style={{
            marginTop: '24px',
            padding: '14px 18px',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <AlertCircle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#fcd34d' }}>
              <strong>Lưu ý quan trọng:</strong> <code>App api_id</code> và <code>App api_hash</code> là thông số cố định của tài khoản bạn. Bạn chỉ cần thực hiện 1 lần duy nhất và có thể dùng mãi mãi cho tài khoản Telegram đó. Tuyệt đối không chia sẻ API Hash cho bên không rõ nguồn gốc.
            </div>
          </div>
        </div>

        {/* Back to App Bottom Button */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/accounts');
              }
            }}
            className="btn btn-primary"
            style={{
              padding: '12px 28px',
              fontSize: '15px',
              fontWeight: '600',
              borderRadius: '10px'
            }}
          >
            Đã Lấy Được Mã, Quay Lại Nhập Vào TelePulse
          </button>
        </div>

      </div>

      {/* Admin Edit Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '17px', margin: 0 }}>Chỉnh Sửa Trang Hướng Dẫn (Admin)</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveGuide}>
              <div className="form-group">
                <label className="form-label">Tiêu đề bài hướng dẫn</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Badge nhãn nhỏ</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.badge}
                  onChange={(e) => setEditForm({ ...editForm, badge: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Đoạn giới thiệu ngắn</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={editForm.intro}
                  onChange={(e) => setEditForm({ ...editForm, intro: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Đường dẫn Video Hướng Dẫn (YouTube hoặc MP4 trực tiếp)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: https://www.youtube.com/watch?v=... hoặc https://.../video.mp4"
                  className="form-input"
                  value={editForm.video_url}
                  onChange={(e) => setEditForm({ ...editForm, video_url: e.target.value })}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Hỗ trợ dán link YouTube (hệ thống tự động chuyển đổi thành embed) hoặc link video MP4/WebM trực tiếp.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Tiêu đề thanh video</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.video_title}
                  onChange={(e) => setEditForm({ ...editForm, video_title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Các bước hướng dẫn cụ thể</label>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '12px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={14} />
                    <span>Thêm bước</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {editForm.steps.map((st, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', minWidth: '24px', paddingTop: '8px', color: 'var(--primary)' }}>
                        {idx + 1}.
                      </span>
                      <textarea
                        rows={2}
                        className="form-input"
                        value={st}
                        onChange={(e) => handleStepChange(idx, e.target.value)}
                        placeholder={`Nội dung bước ${idx + 1}...`}
                        required
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '6px',
                          marginTop: '4px'
                        }}
                        title="Xóa bước này"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">
                  Hủy
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                  <span>{saving ? 'Đang lưu...' : 'Lưu Cập Nhật'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
