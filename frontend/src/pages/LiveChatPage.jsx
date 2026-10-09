import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, 
  MessageSquare, 
  Loader2, 
  ArrowLeft, 
  Lock, 
  Crown, 
  Check, 
  RefreshCw, 
  Search, 
  CornerUpLeft, 
  X, 
  Smile, 
  Clock,
  Sparkles,
  Bot
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { supabase } from '../lib/supabase';
import { replyCustomerMessage } from '../lib/api';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😊', '🙏', '🤝', '🚀', '💯'];

export default function LiveChatPage() {
  const { user, profile } = useAuth();
  const { fetchUnreadChatCount, setActiveChatConvId } = useChat();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // { id, sender_name, text }
  const [accountsMap, setAccountsMap] = useState({}); // { [account_id]: { phone_number, account_name } }

  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  const isVip = profile?.subscription_tier === 'VIP';

  // Trợ giúp hiển thị preview văn bản ở danh sách hội thoại
  const getPreviewText = (text) => {
    if (!text) return 'Chưa có nội dung';
    const match = text.match(/^<<<REPLY:(.*?)\|\|([\s\S]*?)>>>\n?([\s\S]*)$/);
    if (match) {
      const main = match[3]?.trim();
      return main ? `↳ ${main}` : '↳ [Trả lời tin nhắn]';
    }
    return text;
  };

  // Trợ giúp trích xuất nội dung tin nhắn thuần túy
  const getCleanMessageText = (content) => {
    if (!content) return '';
    const match = content.match(/^<<<REPLY:(.*?)\|\|([\s\S]*?)>>>\n?([\s\S]*)$/);
    return match ? match[3]?.trim() : content;
  };

  // Trợ giúp render nội dung bubble tin nhắn kèm trích dẫn Reply như Telegram / Messenger
  const renderMessageContent = (content, isCustomer) => {
    if (!content) return null;
    const match = content.match(/^<<<REPLY:(.*?)\|\|([\s\S]*?)>>>\n?([\s\S]*)$/);
    if (match) {
      const replySender = match[1];
      const replyText = match[2];
      const mainText = match[3];
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Khung trích dẫn tin nhắn cũ y chang Telegram */}
          <div style={{
            background: isCustomer ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.2)',
            borderLeft: isCustomer ? '3px solid #f59e0b' : '3px solid #818cf8',
            borderRadius: '4px 8px 8px 4px',
            padding: '5px 10px',
            marginBottom: '8px',
            fontSize: '12px'
          }}>
            <div style={{
              fontWeight: '700',
              color: isCustomer ? '#fbbf24' : '#c7d2fe',
              fontSize: '11px',
              marginBottom: '2px'
            }}>
              ↳ {replySender}
            </div>
            <div style={{
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: '12px',
              lineHeight: '1.4',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '60px',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {replyText}
            </div>
          </div>

          {/* Nội dung tin nhắn chính */}
          <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
            {mainText}
          </div>
        </div>
      );
    }
    return <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{content}</div>;
  };

  // Cuộn mượt mà trực tiếp trong container tin nhắn mà KHÔNG làm xô lệch trang cha
  const scrollToBottom = (smooth = true) => {
    if (messagesContainerRef.current) {
      const el = messagesContainerRef.current;
      el.scrollTo({
        top: el.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  };

  // Nếu là tài khoản Free: Khóa và hiển thị màn hình mở khóa VIP
  if (!isVip) {
    return (
      <div className="page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 120px)', padding: '20px' }}>
        <div style={{
          maxWidth: '560px',
          width: '100%',
          background: 'var(--bg-card, #1e293b)',
          border: '2px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '20px',
          padding: '40px 32px',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(245, 158, 11, 0.15)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.35) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.5)',
            color: '#fbbf24',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <Lock size={32} />
          </div>

          <div style={{
            display: 'inline-block',
            padding: '3px 12px',
            borderRadius: '999px',
            background: 'rgba(245, 158, 11, 0.2)',
            color: '#fbbf24',
            fontSize: '11px',
            fontWeight: '800',
            marginBottom: '12px',
            letterSpacing: '0.5px'
          }}>
            ĐẶC QUYỀN VIP PRO ENTERPRISE
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 10px 0' }}>
            Hộp Thư Trực Tiếp (Live Chat 2 Chiều)
          </h2>

          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '28px' }}>
            Tài khoản hiện tại của bạn đang sử dụng <strong>Gói Miễn Phí (Free)</strong>. Tính năng nhận tin nhắn phản hồi của khách hàng và chat 2 chiều trực tiếp chỉ khả dụng trên <strong>Gói VIP Pro</strong>.
          </p>

          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '12px',
            padding: '16px 20px',
            border: '1px solid var(--border-subtle)',
            textAlign: 'left',
            marginBottom: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-main)' }}>
              <Check size={16} color="#fbbf24" />
              <span>Tiếp nhận tin nhắn phản hồi từ khách hàng qua 10 bot Telegram</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-main)' }}>
              <Check size={16} color="#fbbf24" />
              <span>Nhắn tin trả lời trực tiếp ngay trên trình duyệt web tức thì</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-main)' }}>
              <Check size={16} color="#fbbf24" />
              <span>Tự động chuyển tiếp lead nóng về Telegram quản trị viên</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/pricing')}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              border: 'none',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.4)',
              transition: 'transform 0.15s'
            }}
          >
            <Crown size={18} />
            <span>Nâng Cấp Gói VIP Ngay (199.000 ₫)</span>
          </button>
        </div>
      </div>
    );
  }

  // 1. Tải danh sách tài khoản bot để map tên bot cho từng hội thoại
  const fetchAccounts = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('telegram_accounts')
        .select('id, phone_number, account_name')
        .eq('user_id', user.id);
      if (data) {
        const map = {};
        data.forEach(acc => {
          map[acc.id] = acc;
        });
        setAccountsMap(map);
      }
    } catch (e) {
      console.warn('Lỗi lấy tài khoản bot:', e);
    }
  };

  // 2. Chọn một cuộc hội thoại và đánh dấu đã đọc
  const handleSelectConv = (conv) => {
    setActiveConv(conv);
    if (conv.unread_count > 0) {
      // Bỏ in đậm và xóa chấm tròn unread ngay trên giao diện
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
      // Cập nhật ngầm vào Supabase
      supabase
        .from('customer_conversations')
        .update({ unread_count: 0 })
        .eq('id', conv.id)
        .then(() => {
          if (fetchUnreadChatCount) fetchUnreadChatCount();
        });
    }
  };

  // 3. Tải danh sách hội thoại
  const fetchConversations = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('customer_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (data) {
        // Nếu đang mở một hội thoại thì giữ unread_count = 0 cho hội thoại đó
        const normalized = data.map(c => {
          if (activeConv && c.id === activeConv.id) {
            return { ...c, unread_count: 0 };
          }
          return c;
        });
        setConversations(normalized);
        if (!activeConv && normalized.length > 0 && window.innerWidth > 768) {
          handleSelectConv(normalized[0]);
        }
      }
    } catch (e) {
      console.error('Lỗi lấy danh sách chat:', e);
    } finally {
      setLoading(false);
    }
  };

  // 4. Tải tin nhắn của hội thoại đang chọn
  const fetchMessages = async (convId, isAuto = false) => {
    try {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });
      if (data) {
        setMessages(data);
        setTimeout(() => scrollToBottom(!isAuto), 50);
      }
    } catch (e) {
      console.error('Lỗi lấy tin nhắn:', e);
    }
  };

  // Làm mới thủ công có hiệu ứng xoay .spin mượt mà
  const handleManualRefresh = async () => {
    setRefreshing(true);
    const minSpin = new Promise(r => setTimeout(r, 600));
    try {
      await Promise.all([
        fetchAccounts(),
        fetchConversations(),
        activeConv ? fetchMessages(activeConv.id) : Promise.resolve(),
        minSpin
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchConversations();

    // Lắng nghe realtime từ Supabase
    const msgChannel = supabase.channel('realtime_chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `user_id=eq.${user?.id}` }, (payload) => {
        if (activeConv && payload.new.conversation_id === activeConv.id) {
          setMessages(prev => [...prev, payload.new]);
          setTimeout(() => scrollToBottom(true), 50);
        }
        fetchConversations();
      })
      .subscribe();

    // Dự phòng Polling 4s
    const pollTimer = setInterval(() => {
      fetchConversations();
      if (activeConv) {
        fetchMessages(activeConv.id, true);
      }
    }, 4000);

    return () => {
      supabase.removeChannel(msgChannel);
      clearInterval(pollTimer);
    };
  }, [user, activeConv?.id]);

  useEffect(() => {
    if (setActiveChatConvId) {
      setActiveChatConvId(activeConv?.id || null);
    }
    if (activeConv) {
      fetchMessages(activeConv.id);
      setReplyingTo(null);
    }
  }, [activeConv, setActiveChatConvId]);

  useEffect(() => {
    return () => {
      if (setActiveChatConvId) {
        setActiveChatConvId(null);
      }
    };
  }, [setActiveChatConvId]);

  // Gửi phản hồi cho khách
  const handleSendReply = async (e) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || !activeConv || sending) return;

    let textToSend = replyText.trim();
    setReplyText('');
    setSending(true);

    // Nếu đang reply một tin nhắn: gói thẻ trích dẫn
    if (replyingTo) {
      const cleanQuote = getCleanMessageText(replyingTo.content);
      const shortQuote = cleanQuote.length > 120 ? cleanQuote.slice(0, 117) + '...' : cleanQuote;
      textToSend = `<<<REPLY:${replyingTo.sender_name}||${shortQuote}>>>\n${textToSend}`;
      setReplyingTo(null);
    }

    try {
      const res = await replyCustomerMessage(
        user.id,
        activeConv.account_id,
        activeConv.sender_id,
        textToSend
      );

      if (!res.success) {
        alert(res.error || 'Lỗi gửi tin nhắn phản hồi');
      } else {
        fetchMessages(activeConv.id);
      }
    } catch (err) {
      alert('Không thể kết nối với Backend!');
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // Xử lý nhấn phím Enter (Enter gửi tin, Shift+Enter xuống dòng)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  // Chọn emoji nhanh
  const handleInsertEmoji = (emoji) => {
    setReplyText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  // Kích hoạt reply một tin nhắn cụ thể
  const handleTriggerReply = (msg, isCustomer) => {
    const senderName = isCustomer ? (activeConv.sender_name || 'Khách hàng') : 'Bạn';
    setReplyingTo({
      id: msg.id,
      sender_name: senderName,
      content: msg.content
    });
    inputRef.current?.focus();
  };

  // Lọc danh sách hội thoại theo ô tìm kiếm
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(c => 
      (c.sender_name && c.sender_name.toLowerCase().includes(q)) ||
      (c.sender_username && c.sender_username.toLowerCase().includes(q)) ||
      (c.last_message && c.last_message.toLowerCase().includes(q))
    );
  }, [conversations, searchQuery]);

  return (
    <div className="chat-page-wrapper">
      <div className={`chat-container ${activeConv ? 'has-active-conv' : ''}`}>
        
        {/* ================= CỘT TRÁI: SIDEBAR HỘI THOẠI ================= */}
        <div className="chat-sidebar">
          {/* 1. Header Sidebar */}
          <div className="chat-sidebar-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} color="var(--primary-light)" />
              <span style={{ fontWeight: '700', fontSize: '15px' }}>Hộp Thư</span>
              <span style={{
                fontSize: '11px',
                padding: '1px 7px',
                borderRadius: '999px',
                background: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--primary-light)',
                fontWeight: '700'
              }}>
                {conversations.length}
              </span>
            </div>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.15s'
              }}
              title="Làm mới danh sách tin nhắn"
            >
              <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            </button>
          </div>

          {/* 2. Ô tìm kiếm hội thoại nhanh */}
          <div className="chat-sidebar-search">
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Tìm khách hàng hoặc tin nhắn..."
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
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '8px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* 3. Danh sách hội thoại cuộn độc lập */}
          <div className="chat-sidebar-list">
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <Loader2 className="spin" size={24} style={{ margin: '0 auto', color: 'var(--primary)' }} />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                {searchQuery ? 'Không tìm thấy cuộc trò chuyện nào' : 'Chưa có tin nhắn nào từ khách hàng'}
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = activeConv?.id === conv.id;
                return (
                  <div
                    key={conv.id}
                    className={`chat-conv-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectConv(conv)}
                  >
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#a5b4fc',
                      fontWeight: '800',
                      fontSize: '15px',
                      flexShrink: 0
                    }}>
                      {conv.sender_name?.charAt(0)?.toUpperCase() || 'K'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <div style={{
                          fontWeight: conv.unread_count > 0 ? '800' : '600',
                          fontSize: '13.5px',
                          color: conv.unread_count > 0 ? 'var(--text-main)' : 'rgba(248, 250, 252, 0.85)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {conv.sender_name || 'Khách hàng'}
                        </div>
                        {conv.updated_at && (
                          <div style={{ fontSize: '10px', color: 'var(--text-dim)', flexShrink: 0, marginLeft: '6px' }}>
                            {new Date(conv.updated_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>

                      {/* Tag hiển thị nhắn tới bot nào */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                        <span style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: 'rgba(99, 102, 241, 0.12)',
                          color: '#a5b4fc',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          maxWidth: '180px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          <Bot size={10} color="#818cf8" />
                          <span>{accountsMap[conv.account_id]?.account_name || 'Bot'}</span>
                        </span>
                      </div>

                      {/* Tin nhắn xem trước (Chỉ in đậm khi có tin nhắn mới chưa đọc) */}
                      <div style={{
                        fontSize: '12px',
                        color: conv.unread_count > 0 ? 'var(--text-main)' : 'var(--text-muted)',
                        fontWeight: conv.unread_count > 0 ? '700' : '400',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {getPreviewText(conv.last_message)}
                      </div>
                    </div>

                    {conv.unread_count > 0 && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        flexShrink: 0,
                        boxShadow: '0 0 8px var(--primary-glow)'
                      }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= CỘT PHẢI: KHUNG CHAT CHÍNH ================= */}
        <div className="chat-main">
          {activeConv ? (
            <>
              {/* 1. Header Khách Hàng */}
              <div className="chat-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setActiveConv(null)}
                    className="btn btn-secondary btn-sm mobile-chat-back-btn"
                    title="Quay lại danh sách"
                  >
                    <ArrowLeft size={16} />
                  </button>

                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    flexShrink: 0
                  }}>
                    {activeConv.sender_name?.charAt(0)?.toUpperCase() || 'K'}
                  </div>

                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14.5px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{activeConv.sender_name}</span>
                      {activeConv.sender_username && (
                        <span style={{ fontSize: '12px', color: 'var(--primary-light)', fontWeight: 'normal' }}>
                          (@{activeConv.sender_username})
                        </span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        Telegram ID: {activeConv.sender_id}
                      </span>

                      {/* Badge hiển thị rõ tài khoản bot nhận tin nhắn */}
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: '#c7d2fe',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        <Bot size={12} color="#818cf8" />
                        <span>Nhắn tới Bot: <strong>{accountsMap[activeConv.account_id]?.account_name || 'Bot Telegram'}</strong> {accountsMap[activeConv.account_id]?.phone_number ? `(${accountsMap[activeConv.account_id].phone_number})` : ''}</span>
                      </div>

                      {/* Badge trạng thái gói cước */}
                      {isVip ? (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(245, 158, 11, 0.15)',
                          border: '1px solid rgba(245, 158, 11, 0.35)',
                          color: '#fbbf24',
                          fontSize: '11px',
                          fontWeight: '700',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Crown size={12} /> 2 Chiều Trực Tiếp
                        </span>
                      ) : (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(148, 163, 184, 0.12)',
                          border: '1px solid rgba(148, 163, 184, 0.25)',
                          color: '#94a3b8',
                          fontSize: '11px',
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Lock size={12} /> Chế Độ Chỉ Đọc (Free)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Vùng Lịch Sử Tin Nhắn Cuộn Độc Lập */}
              <div className="chat-messages-area" ref={messagesContainerRef}>
                {messages.length === 0 ? (
                  <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Chưa có tin nhắn trong cuộc trò chuyện này.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isCustomer = msg.sender_type === 'customer';
                    return (
                      <div
                        key={msg.id}
                        className={`chat-bubble-wrapper ${isCustomer ? 'customer' : 'admin'}`}
                      >
                        {/* Nút Reply khi hover (kiểu Messenger/Telegram) */}
                        <button
                          type="button"
                          className="chat-reply-btn"
                          onClick={() => handleTriggerReply(msg, isCustomer)}
                          title="Trả lời tin nhắn này"
                        >
                          <CornerUpLeft size={14} />
                        </button>

                        <div className={`chat-bubble ${isCustomer ? 'chat-bubble-customer' : 'chat-bubble-admin'}`}>
                          {renderMessageContent(msg.content, isCustomer)}
                          <div style={{
                            fontSize: '10px',
                            marginTop: '4px',
                            opacity: 0.75,
                            textAlign: isCustomer ? 'left' : 'right'
                          }}>
                            {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* 3. Khung Nhập Liệu & Phản Hồi Cố Định Ở Đáy */}
              <div className="chat-input-bar">
                {/* Thanh Trích Dẫn Reply nếu đang trả lời */}
                {replyingTo && (
                  <div style={{
                    padding: '8px 16px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      overflow: 'hidden',
                      borderLeft: '3px solid var(--primary)',
                      paddingLeft: '10px'
                    }}>
                      <CornerUpLeft size={14} color="var(--primary-light)" style={{ flexShrink: 0 }} />
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary-light)' }}>
                          Đang trả lời {replyingTo.sender_name}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {getCleanMessageText(replyingTo.content)}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Hủy trả lời"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                {isVip ? (
                  <>
                    {/* Thanh Emoji nhanh */}
                    <div style={{
                      padding: '6px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.03)'
                    }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginRight: '4px' }}>Nhanh:</span>
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleInsertEmoji(emoji)}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '15px',
                            cursor: 'pointer',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            transition: 'transform 0.1s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.25)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    {/* Form soạn tin nhắn */}
                    <form
                      onSubmit={handleSendReply}
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                    >
                      <input
                        ref={inputRef}
                        type="text"
                        placeholder="Nhập nội dung phản hồi... (Nhấn Enter để gửi)"
                        className="form-input"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={sending}
                        style={{ flex: 1, height: '42px', fontSize: '13.5px' }}
                      />

                      <button
                        type="submit"
                        disabled={sending || !replyText.trim()}
                        className="btn btn-primary"
                        style={{
                          height: '42px',
                          padding: '0 18px',
                          fontWeight: '700',
                          gap: '8px'
                        }}
                      >
                        {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                        <span>Gửi</span>
                      </button>
                    </form>
                  </>
                ) : (
                  /* Khung Khóa Tính Năng VIP Lock Barrier Dành Cho Gói Miễn Phí */
                  <div style={{
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.04) 100%)',
                    borderTop: '1px solid rgba(245, 158, 11, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '260px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fbbf24',
                        flexShrink: 0
                      }}>
                        <Lock size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>Tính Năng Phản Hồi Dành Riêng Cho Gói VIP Pro</span>
                          <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.25)', color: '#fef3c7' }}>PRO ONLY</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Gói Miễn Phí (Free) chỉ hỗ trợ đọc tin nhắn. Nâng cấp VIP Pro để gửi phản hồi 2 chiều tức thì và chuyển tiếp tin tự động.
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate('/pricing')}
                      className="btn btn-primary"
                      style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        border: 'none',
                        color: '#fff',
                        fontWeight: '700',
                        fontSize: '13px',
                        padding: '10px 18px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                      }}
                    >
                      <Crown size={15} />
                      <span>Nâng Cấp VIP (199K/Tháng)</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '30px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                marginBottom: '16px'
              }}>
                <MessageSquare size={32} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                Hộp Thư Trực Tiếp TelePulse
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '340px', lineHeight: '1.5', margin: 0 }}>
                Chọn một cuộc trò chuyện từ danh sách bên trái để xem nội dung và gửi phản hồi 2 chiều tức thì.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
