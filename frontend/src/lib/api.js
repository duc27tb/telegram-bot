const getBackendUrl = () => {
  const envUrl = (import.meta.env.VITE_BACKEND_URL || '').trim();
  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0'
  );

  // Nếu đang chạy trên web deploy (Vercel, custom domain, v.v.):
  // Nếu chưa cấu hình VITE_BACKEND_URL hoặc trỏ nhầm về localhost, tự động trỏ về Render backend
  if (!isLocalhost) {
    if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
      return 'https://telepulse-backend-fcov.onrender.com';
    }
    return envUrl.replace(/\/+$/, '');
  }

  // Nếu đang chạy ở máy local:
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  return 'http://localhost:8000';
};

export const BACKEND_URL = getBackendUrl();

export async function requestOTP(phoneNumber, apiId = null, apiHash = null, userId = null) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/accounts/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phoneNumber, api_id: apiId, api_hash: apiHash, user_id: userId })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.detail || data.error || 'Lỗi gửi mã OTP' };
    }
    return data;
  } catch (err) {
    return { success: false, error: `Không thể kết nối máy chủ (${BACKEND_URL}).` };
  }
}

export async function verifyOTP(loginId, code, password, userId) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/accounts/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login_id: loginId, code, password, user_id: userId })
    });
    const data = await res.json();
    if (!res.ok) {
      return { 
        success: false, 
        error: data.detail || data.error || 'Lỗi xác thực mã OTP',
        need_2fa: data.need_2fa || false
      };
    }
    return data;
  } catch (err) {
    return { success: false, error: `Không thể kết nối máy chủ (${BACKEND_URL}).` };
  }
}

export async function getAccountErrorInfo(accountId) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/accounts/error-info/${accountId}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.detail || 'Không thể lấy thông tin lỗi' };
    }
    return await res.json();
  } catch (err) {
    return { success: false, error: `Không thể kết nối máy chủ (${BACKEND_URL}).` };
  }
}

export async function startCampaign(userId) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/campaign/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: `Không thể kết nối Backend (${BACKEND_URL}). Vui lòng kiểm tra VITE_BACKEND_URL trên Vercel.` };
  }
}

export async function stopCampaign(userId) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/campaign/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: `Không thể kết nối Backend (${BACKEND_URL}).` };
  }
}

export async function getCampaignStatus(userId) {
  const res = await fetch(`${BACKEND_URL}/api/campaign/status/${userId}`);
  return res.json();
}

export async function getCampaignLogs(userId, limit = 50) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/campaign/logs/${userId}?limit=${limit}`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function updateCampaignSettings(userId, settings) {
  const res = await fetch(`${BACKEND_URL}/api/campaign/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, ...settings })
  });
  return res.json();
}

export async function replyCustomerMessage(userId, accountId, customerSenderId, text) {
  const res = await fetch(`${BACKEND_URL}/api/chat/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      account_id: accountId,
      customer_sender_id: customerSenderId,
      text: text
    })
  });
  return res.json();
}

export async function createDeposit(userId, amount) {
  const res = await fetch(`${BACKEND_URL}/api/wallet/create-deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, amount: parseInt(amount, 10) })
  });
  return res.json();
}

export async function checkDepositStatus(orderCode) {
  const res = await fetch(`${BACKEND_URL}/api/wallet/status/${orderCode}`);
  return res.json();
}

export async function getWalletInfo(userId) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${BACKEND_URL}/api/wallet/info/${userId}`, {
      signal: controller.signal
    });
    clearTimeout(timer);
    return await res.json();
  } catch (err) {
    console.warn('getWalletInfo network error:', err);
    return { success: false, error: err.message };
  }
}

export async function getUserActivities(userId, limit = 50) {
  const res = await fetch(`${BACKEND_URL}/api/activities/${userId}?limit=${limit}`);
  return res.json();
}

export async function logUserActivity(userId, actionType, actionTitle, description = '', metadata = {}) {
  const res = await fetch(`${BACKEND_URL}/api/activities/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      action_type: actionType,
      action_title: actionTitle,
      description,
      metadata
    })
  });
  return res.json();
}

// ==========================================
// ADMIN GOVERNANCE & REVENUE API (RBAC STRICT)
// ==========================================
export function getAdminSession() {
  try {
    const token = localStorage.getItem('telepulse_admin_token');
    const userStr = localStorage.getItem('telepulse_admin_user');
    if (token && userStr) {
      return { token, admin: JSON.parse(userStr) };
    }
  } catch (e) {}
  return null;
}

export function logoutAdmin() {
  localStorage.removeItem('telepulse_admin_token');
  localStorage.removeItem('telepulse_admin_user');
}

export async function loginAdmin(username, password) {
  const res = await fetch(`${BACKEND_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (res.ok && data.token) {
    localStorage.setItem('telepulse_admin_token', data.token);
    localStorage.setItem('telepulse_admin_user', JSON.stringify(data.admin));
  }
  return data;
}

function getAdminHeaders(adminId) {
  let token = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('telepulse_admin_token');
  }
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(adminId ? { 'X-User-Id': adminId } : { 'X-User-Id': 'admin_root' })
  };
}

export async function checkUserRole(userId) {
  const res = await fetch(`${BACKEND_URL}/api/admin/check-role/${userId}`);
  return res.json();
}

export async function getAdminOverview(adminId) {
  const res = await fetch(`${BACKEND_URL}/api/admin/overview`, {
    headers: getAdminHeaders(adminId)
  });
  return res.json();
}

export async function getAdminUsers(adminId) {
  const res = await fetch(`${BACKEND_URL}/api/admin/users`, {
    headers: getAdminHeaders(adminId)
  });
  return res.json();
}

export async function updateUserStatus(userId, status, adminId) {
  const res = await fetch(`${BACKEND_URL}/api/admin/users/${userId}/status`, {
    method: 'PUT',
    headers: getAdminHeaders(adminId),
    body: JSON.stringify({ status })
  });
  return res.json();
}

export async function adjustUserBalance(userId, amount, note = 'Admin adjustment', adminId) {
  const res = await fetch(`${BACKEND_URL}/api/admin/users/${userId}/balance`, {
    method: 'PUT',
    headers: getAdminHeaders(adminId),
    body: JSON.stringify({ amount: parseInt(amount, 10), note })
  });
  return res.json();
}

export async function getAdminPricing(adminId) {
  const res = await fetch(`${BACKEND_URL}/api/admin/pricing`, {
    headers: getAdminHeaders(adminId)
  });
  return res.json();
}

export async function updateAdminPricing(pricingData, adminId) {
  const res = await fetch(`${BACKEND_URL}/api/admin/pricing`, {
    method: 'PUT',
    headers: getAdminHeaders(adminId),
    body: JSON.stringify(pricingData)
  });
  return res.json();
}

export async function getAdminTransactions(limit = 50, status = '', adminId) {
  const url = status 
    ? `${BACKEND_URL}/api/admin/transactions?limit=${limit}&status=${status}`
    : `${BACKEND_URL}/api/admin/transactions?limit=${limit}`;
  const res = await fetch(url, {
    headers: getAdminHeaders(adminId)
  });
  return res.json();
}

export async function getSubscriptionPlans() {
  const res = await fetch(`${BACKEND_URL}/api/wallet/plans`);
  return res.json();
}

export async function upgradeVipPlan(userId) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/wallet/upgrade-vip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.detail || 'Lỗi nâng cấp gói VIP' };
    }
    return data;
  } catch (err) {
    console.error('[API] upgradeVipPlan error:', err);
    return { 
      success: false, 
      error: `Không thể kết nối máy chủ (${BACKEND_URL}). Vui lòng kiểm tra VITE_BACKEND_URL trên Vercel hoặc đảm bảo server Render đang hoạt động.` 
    };
  }
}

export async function updateUserSubscription(userId, tier, durationDays = 30, adminId) {
  const res = await fetch(`${BACKEND_URL}/api/admin/users/${userId}/subscription`, {
    method: 'PUT',
    headers: getAdminHeaders(adminId),
    body: JSON.stringify({ tier, duration_days: parseInt(durationDays, 10) })
  });
  return res.json();
}

export async function getAdminBots(adminId) {
  const res = await fetch(`${BACKEND_URL}/api/admin/bots`, {
    headers: getAdminHeaders(adminId)
  });
  return res.json();
}

export async function getPlatformSettings(adminId) {
  const res = await fetch(`${BACKEND_URL}/api/admin/settings`, {
    headers: getAdminHeaders(adminId)
  });
  return res.json();
}

export async function updatePlatformSettings(settingsData, adminId) {
  const res = await fetch(`${BACKEND_URL}/api/admin/settings`, {
    method: 'PUT',
    headers: getAdminHeaders(adminId),
    body: JSON.stringify(settingsData)
  });
  return res.json();
}

export async function testTelegramAlert(userId, targetUsername) {
  const res = await fetch(`${BACKEND_URL}/api/activities/test-telegram-alert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, target_username: targetUsername })
  });
  return res.json();
}

export async function getAdminAuditLogs(adminId, limit = 50, category = 'ALL') {
  const url = new URL(`${BACKEND_URL}/api/admin/audit-logs`);
  url.searchParams.set('limit', limit);
  if (category && category !== 'ALL') url.searchParams.set('category', category);
  const res = await fetch(url.toString(), {
    headers: getAdminHeaders(adminId)
  });
  return res.json();
}

/**
 * Chuyển đổi các thông báo lỗi kỹ thuật Telegram MTProto sang tiếng Việt ngắn gọn.
 * Định dạng chuẩn: [+84...] Lỗi gửi tới nhóm '...' ---- [Lỗi tiếng Việt ngắn gọn]
 */
export function formatFriendlyLogMessage(msg) {
  if (!msg || typeof msg !== 'string') return msg;

  // Nếu thông báo chứa lỗi Telegram tiếng Anh (VD: Telegram says: [400 USER_BANNED_IN_CHANNEL]...)
  const hasTelegramError = 
    msg.includes('Telegram says:') || 
    msg.includes('USER_BANNED_IN_CHANNEL') || 
    msg.includes('CHAT_WRITE_FORBIDDEN') ||
    msg.includes('FLOOD_WAIT') ||
    msg.includes('SLOWMODE_WAIT') ||
    msg.includes('CHANNEL_PRIVATE') ||
    msg.includes('INVITE_HASH_EXPIRED') ||
    msg.includes('PEER_ID_INVALID') ||
    msg.includes('CHAT_INVALID') ||
    msg.includes('CHANNEL_INVALID') ||
    msg.includes('AUTH_KEY_DUPLICATED') ||
    msg.includes('AUTH_KEY_UNREGISTERED') ||
    msg.includes('SESSION_REVOKED') ||
    msg.includes('USER_DEACTIVATED') ||
    msg.includes('USER_RESTRICTED') ||
    msg.includes('CHAT_RESTRICTED') ||
    msg.includes('MESSAGE_TOO_LONG') ||
    msg.includes('MSG_TOO_LONG') ||
    msg.includes('caused by "');

  if (!hasTelegramError) {
    return msg;
  }

  // Tách phần tiền tố "[+84...] Lỗi gửi tới nhóm '...'" nếu có
  let prefix = '';
  let errorDetail = msg;

  const prefixMatch = msg.match(/^(\[\+?\d+\]\s*Lỗi gửi tới nhóm\s*['"][^'"]+['"])(?:\s*[:\-—]+\s*|\s*----\s*)(.*)$/s);
  if (prefixMatch) {
    prefix = prefixMatch[1].trim();
    errorDetail = prefixMatch[2].trim();
  } else {
    const fallbackMatch = msg.match(/^(\[\+?\d+\]\s*Lỗi gửi tới nhóm\s*[^:\-]+)(?::\s*|\s*----\s*)(.*)$/s);
    if (fallbackMatch) {
      prefix = fallbackMatch[1].trim();
      errorDetail = fallbackMatch[2].trim();
    }
  }

  // Dịch mã lỗi Telegram sang tiếng Việt ngắn gọn
  let viError = '';
  if (errorDetail.includes('USER_BANNED_IN_CHANNEL')) {
    viError = 'Tài khoản bị cấm chat trong nhóm này (hoặc đang bị @SpamBot chặn)';
  } else if (errorDetail.includes('CHAT_WRITE_FORBIDDEN')) {
    viError = 'Nhóm đã khóa chat (chỉ Admin mới có quyền gửi tin)';
  } else if (errorDetail.includes('FLOOD_WAIT') || errorDetail.includes('FloodWait')) {
    const secMatch = errorDetail.match(/(\d+)/);
    const sec = secMatch ? `${secMatch[1]}s` : 'một lát';
    viError = `Bị Telegram tạm giới hạn tần suất gửi tin (cần nghỉ ${sec})`;
  } else if (errorDetail.includes('SLOWMODE_WAIT')) {
    const secMatch = errorDetail.match(/(\d+)/);
    const sec = secMatch ? ` (phải đợi ${secMatch[1]}s)` : '';
    viError = `Nhóm đang bật chế độ gửi chậm Slowmode${sec}`;
  } else if (errorDetail.includes('CHANNEL_PRIVATE') || errorDetail.includes('INVITE_HASH_EXPIRED')) {
    viError = 'Nhóm kín hoặc link hết hạn, nick chưa có quyền vào nhóm';
  } else if (errorDetail.includes('PEER_ID_INVALID') || errorDetail.includes('CHAT_INVALID') || errorDetail.includes('CHANNEL_INVALID')) {
    viError = 'Nhóm không tồn tại hoặc tài khoản đã rời khỏi nhóm';
  } else if (errorDetail.includes('USER_RESTRICTED') || errorDetail.includes('CHAT_RESTRICTED')) {
    viError = 'Tài khoản đang bị Telegram hạn chế quyền gửi tin';
  } else if (errorDetail.includes('MSG_TOO_LONG') || errorDetail.includes('MESSAGE_TOO_LONG')) {
    viError = 'Nội dung tin nhắn vượt quá độ dài tối đa của Telegram';
  } else if (errorDetail.includes('USER_DEACTIVATED')) {
    viError = 'Tài khoản Telegram đã bị khóa hoặc vô hiệu hóa';
  } else if (errorDetail.includes('AUTH_KEY_DUPLICATED')) {
    viError = 'Trùng phiên đăng nhập (vui lòng bấm Đăng Nhập Lại)';
  } else if (errorDetail.includes('AUTH_KEY_UNREGISTERED') || errorDetail.includes('SESSION_REVOKED')) {
    viError = 'Phiên đăng nhập đã hết hạn trên Telegram';
  } else if (errorDetail.includes('INPUT_USER_DEACTIVATED') || errorDetail.includes('USER_IS_BLOCKED')) {
    viError = 'Người nhận hoặc nhóm đã chặn tài khoản này';
  } else if (errorDetail.includes('CHAT_SEND_PLAIN_FORBIDDEN')) {
    viError = 'Nhóm cấm gửi tin nhắn văn bản';
  } else if (errorDetail.includes('CHAT_SEND_MEDIA_FORBIDDEN')) {
    viError = 'Nhóm cấm gửi file ảnh hoặc media';
  } else {
    let clean = errorDetail
      .replace(/Telegram says:\s*\[\d+\s+[A-Z_]+\]\s*-\s*/gi, '')
      .replace(/\(caused by ".*?"\)/gi, '')
      .trim();
    viError = clean || 'Lỗi kết nối gửi tin Telegram';
  }

  if (prefix) {
    return `${prefix} ---- ${viError}`;
  }
  return viError;
}

export async function getGroupsErrorStatus(userId) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/groups/errors?user_id=${userId}`);
    const data = await res.json();
    return data && data.success ? data.data : {};
  } catch (err) {
    return {};
  }
}


