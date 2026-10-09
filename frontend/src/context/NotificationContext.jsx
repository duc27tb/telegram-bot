import React, { createContext, useContext, useState, useEffect } from 'react';

const NotificationContext = createContext({});

// Hàm phát âm thanh "Tinh" bằng Web Audio API thuần (Không cần tải file mp3 ngoài)
export const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Nốt 1 (Chime tone A5 = 880Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    gain1.gain.setValueAtTime(0.2, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    // Nốt 2 cao hơn (Chime tone E6 = 1320Hz) tạo hiệu ứng ngân vang trong trẻo
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
    gain2.gain.setValueAtTime(0.18, ctx.currentTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.08);
    osc2.stop(ctx.currentTime + 0.55);
  } catch (e) {
    console.warn('Không thể phát âm thanh thông báo:', e);
  }
};

/**
 * BỘ LỌC CHUẨN: Phân biệt rõ giữa Toast tạm thời và Thông báo chuông hệ thống (Notification)
 * - Toast: Phản hồi hành động tức thì (lỗi nhập form, số dư thiếu khi bấm mua, thông báo đã copy STK,...).
 * - Notification: Sự kiện hệ thống có giá trị lưu trữ (nạp tiền thành công, lên VIP, bot bị FloodWait, hoàn tất chiến dịch,...).
 */
export const isLegitimateNotification = (item) => {
  if (!item || !item.message) return false;
  const text = `${item.title || ''} ${item.message}`.toLowerCase();
  
  // Danh sách các mẫu tin nhắn CHỈ LÀ TOAST tạm thời, TUYỆT ĐỐI KHÔNG LƯU VÀO CHUÔNG:
  const junkPatterns = [
    'số dư không đủ',
    'số dư chưa đủ',
    'chưa đủ 199.000',
    'vui lòng nhập',
    'vui lòng chọn',
    'không được để trống',
    'không thể xóa',
    'không thể thay đổi',
    'đã sao chép',
    'đã copy',
    'hãy nhập',
    'mã qr đã hết hạn'
  ];

  for (const p of junkPatterns) {
    if (text.includes(p)) {
      return false;
    }
  }
  return true;
};

const DEFAULT_WELCOME = {
  id: 'notif-welcome',
  title: 'Chào mừng bạn đến với TelePulse',
  message: 'Hệ thống tự động hóa tiếp thị Telegram và nạp tiền VietQR đã sẵn sàng phục vụ bạn.',
  type: 'info',
  created_at: new Date().toISOString(),
  read: false
};

export function NotificationProvider({ children }) {
  const [toast, setToast] = useState(null);

  // Lấy danh sách thông báo thực thụ, tự động làm sạch các tin nhắn rác cũ nếu có
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('telepulse_notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleanList = parsed.filter(isLegitimateNotification);
          return cleanList.length > 0 ? cleanList : [DEFAULT_WELCOME];
        }
      }
    } catch {}
    return [DEFAULT_WELCOME];
  });

  // Số lượng hiển thị trên badge đỏ (chỉ đếm thông báo mới chưa mở xem)
  const [unseenBadgeCount, setUnseenBadgeCount] = useState(() => {
    try {
      const savedBadge = localStorage.getItem('telepulse_unseen_badge');
      if (savedBadge !== null) {
        const val = parseInt(savedBadge, 10);
        return isNaN(val) ? 0 : Math.max(0, val);
      }
      return 1;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('telepulse_notifications', JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem('telepulse_unseen_badge', unseenBadgeCount.toString());
    } catch {}
  }, [unseenBadgeCount]);

  /**
   * 1. TOAST (Phản hồi tức thì):
   * - Chỉ hiện pop-up góc trên bên phải màn hình trong 3-4 giây rồi biến mất.
   * - MẶC ĐỊNH: KHÔNG lưu vào chuông thông báo (tránh làm rác hộp thư).
   */
  const showToast = (toastData, options = {}) => {
    let newToast = {};
    if (typeof toastData === 'string') {
      newToast = {
        id: Date.now(),
        title: 'Thông báo',
        message: toastData,
        type: 'success',
        duration: 4000
      };
    } else {
      newToast = {
        id: Date.now(),
        title: toastData.title || 'Thông báo',
        message: toastData.message || '',
        type: toastData.type || 'success',
        duration: toastData.duration || 4000,
        onClick: toastData.onClick || null
      };
    }

    setToast(newToast);

    // Chỉ khi có cờ isNotification: true VÀ nội dung đạt chuẩn thì mới lưu vào chuông
    const shouldPersist = options.isNotification || toastData?.isNotification || false;
    if (shouldPersist && isLegitimateNotification(newToast)) {
      pushToNotificationStore(newToast);
    }

    setTimeout(() => {
      setToast(current => (current?.id === newToast.id ? null : current));
    }, newToast.duration);
  };

  /**
   * 2. NOTIFICATION (Sự kiện hệ thống quan trọng):
   * - Lưu vào Chuông Thông Báo để người dùng xem lại.
   * - Phát âm thanh "Tinh", tăng số đỏ trên chuông.
   * - Đồng thời hiện Toast trên màn hình nếu người dùng đang mở tab web.
   */
  const pushToNotificationStore = (notif) => {
    playNotificationSound();

    setUnseenBadgeCount(prev => {
      const next = prev + 1;
      try {
        localStorage.setItem('telepulse_unseen_badge', next.toString());
      } catch {}
      return next;
    });

    setNotifications(prev => [
      {
        id: notif.id || `notif-${Date.now()}`,
        title: notif.title || 'Thông báo hệ thống',
        message: notif.message || '',
        type: notif.type || 'info',
        created_at: notif.created_at || new Date().toISOString(),
        read: false
      },
      ...prev.slice(0, 49) // Lưu tối đa 50 thông báo quan trọng gần nhất
    ]);
  };

  const addNotification = (notifData) => {
    if (!isLegitimateNotification(notifData)) return;

    pushToNotificationStore(notifData);

    // Hiện toast trực quan trên màn hình
    showToast({
      title: notifData.title,
      message: notifData.message,
      type: notifData.type || 'success',
      duration: 4500
    });
  };

  const closeToast = () => {
    setToast(null);
  };

  // Khi click vào icon chuông: Xóa số màu đỏ ngay lập tức
  const clearBadge = () => {
    setUnseenBadgeCount(0);
    try {
      localStorage.setItem('telepulse_unseen_badge', '0');
    } catch {}
  };

  // Đánh dấu một thông báo cụ thể là đã đọc
  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnseenBadgeCount(0);
    try {
      localStorage.setItem('telepulse_unseen_badge', '0');
    } catch {}
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setUnseenBadgeCount(0);
  };

  return (
    <NotificationContext.Provider
      value={{
        toast,
        showToast,
        addNotification,
        closeToast,
        notifications,
        unreadCount: unseenBadgeCount,
        clearBadge,
        markAsRead,
        markAllAsRead,
        clearAllNotifications,
        playNotificationSound
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotification = () => useContext(NotificationContext);
