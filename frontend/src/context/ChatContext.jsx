import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';

const ChatContext = createContext({});

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const { showToast, addNotification, playNotificationSound } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [activeChatConvId, setActiveChatConvId] = useState(null);

  // Refs để truy cập state mới nhất trong event listeners & realtime callbacks
  const activeChatConvIdRef = useRef(activeChatConvId);
  activeChatConvIdRef.current = activeChatConvId;

  const locationRef = useRef(location);
  locationRef.current = location;

  // 1. Tải tổng số tin nhắn chưa đọc từ Supabase
  const fetchUnreadChatCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadChatCount(0);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customer_conversations')
        .select('unread_count')
        .eq('user_id', user.id);

      if (error) {
        console.warn('Lỗi lấy unread_count chat:', error);
        return;
      }

      if (data) {
        const total = data.reduce((sum, item) => sum + (Number(item.unread_count) || 0), 0);
        setUnreadChatCount(total);
      }
    } catch (e) {
      console.warn('Lỗi truy vấn unread_count:', e);
    }
  }, [user?.id]);

  // Yêu cầu quyền thông báo đẩy trên trình duyệt Desktop (sau 3 giây người dùng online)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      const timer = setTimeout(() => {
        Notification.requestPermission().catch(() => {});
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, []);

  // 2. Lắng nghe Realtime tin nhắn mới & cập nhật hội thoại
  useEffect(() => {
    if (!user?.id) return;

    fetchUnreadChatCount();

    // Kênh Realtime cho toàn ứng dụng
    const globalChatChannel = supabase.channel(`global_chat_notif_${user.id}`)
      // Tin nhắn mới đến
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const newMsg = payload.new;
          if (!newMsg) return;

          // Chỉ xử lý tin nhắn do KHÁCH HÀNG gửi đến
          if (newMsg.sender_type === 'customer') {
            fetchUnreadChatCount();

            // Lấy thông tin người gửi để hiển thị thông báo chi tiết
            let senderName = 'Khách hàng';
            try {
              const { data: convData } = await supabase
                .from('customer_conversations')
                .select('sender_name, sender_username')
                .eq('id', newMsg.conversation_id)
                .single();

              if (convData?.sender_name) {
                senderName = convData.sender_name;
              } else if (convData?.sender_username) {
                senderName = `@${convData.sender_username}`;
              }
            } catch {}

            // Trích xuất nội dung tin nhắn sạch
            let cleanText = newMsg.content || '';
            const quoteMatch = cleanText.match(/^<<<REPLY:(.*?)\|\|([\s\S]*?)>>>\n?([\s\S]*)$/);
            if (quoteMatch) {
              cleanText = quoteMatch[3]?.trim() || '[Trả lời tin nhắn]';
            }
            const preview = cleanText.length > 70 ? cleanText.slice(0, 67) + '...' : cleanText;

            // Kiểm tra xem người dùng có đang xem cuộc hội thoại này tại trang /chat không
            const isCurrentlyViewing =
              locationRef.current.pathname === '/chat' &&
              activeChatConvIdRef.current === newMsg.conversation_id;

            // Luôn phát âm thanh chuông "Tinh" vui tai
            playNotificationSound();

            // Nếu người dùng KHÔNG đang xem trực tiếp cuộc chat này: hiện Toast & Native Notification
            if (!isCurrentlyViewing) {
              // Toast nổi góc trên
              showToast({
                title: `💬 Tin nhắn từ ${senderName}`,
                message: preview || 'Đã gửi một tin nhắn mới cho bot của bạn.',
                type: 'info',
                duration: 5500,
                onClick: () => {
                  navigate('/chat');
                }
              });

              // Lưu vào lịch sử Chuông Thông Báo
              addNotification({
                id: `chat-${newMsg.id || Date.now()}`,
                title: `💬 Tin nhắn từ ${senderName}`,
                message: preview || 'Đã gửi một tin nhắn cho bạn',
                type: 'info',
                created_at: newMsg.created_at || new Date().toISOString()
              });

              // Thông báo hệ điều hành / Trình duyệt Desktop
              if (
                typeof window !== 'undefined' &&
                'Notification' in window &&
                Notification.permission === 'granted'
              ) {
                try {
                  const nativeNotif = new Notification(`💬 ${senderName} vừa nhắn tin:`, {
                    body: preview || 'Bạn có tin nhắn mới trên TelePulse',
                    icon: '/favicon.ico'
                  });
                  nativeNotif.onclick = () => {
                    window.focus();
                    navigate('/chat');
                  };
                } catch (err) {
                  console.warn('Native notification error:', err);
                }
              }
            }
          }
        }
      )
      // Cập nhật trạng thái hội thoại (đánh dấu đã đọc, unread_count thay đổi)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customer_conversations',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchUnreadChatCount();
        }
      )
      .subscribe();

    // Dự phòng Polling 6 giây
    const pollInterval = setInterval(() => {
      fetchUnreadChatCount();
    }, 6000);

    return () => {
      supabase.removeChannel(globalChatChannel);
      clearInterval(pollInterval);
    };
  }, [user?.id, fetchUnreadChatCount, showToast, addNotification, playNotificationSound, navigate]);

  return (
    <ChatContext.Provider
      value={{
        unreadChatCount,
        fetchUnreadChatCount,
        activeChatConvId,
        setActiveChatConvId
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
