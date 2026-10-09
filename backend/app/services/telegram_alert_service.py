import os
import json
import httpx
from datetime import datetime
from typing import Optional, Dict, Any
from app.database import get_supabase

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data"))
SETTINGS_FILE = os.path.join(DATA_DIR, "platform_settings.json")

def _get_bot_config() -> Dict[str, str]:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    admin_handle = os.getenv("ADMIN_ALERT_TELEGRAM", "vhoang25").strip()
    
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if not token and data.get("telegram_bot_token"):
                    token = data.get("telegram_bot_token").strip()
                if data.get("admin_alert_telegram"):
                    admin_handle = data.get("admin_alert_telegram").strip()
        except Exception:
            pass

    return {
        "bot_token": token,
        "admin_handle": admin_handle
    }

class TelegramAlertService:
    """
    Dịch vụ phát thông báo tự động qua Telegram Bot (UC-07).
    Gửi thông báo biến động số dư VietQR, kích hoạt gói VIP Pro,
    tiến độ chiến dịch và các sự kiện bảo mật.
    """

    @classmethod
    async def send_message(
        cls, 
        target: str, 
        text: str, 
        parse_mode: str = "HTML"
    ) -> Dict[str, Any]:
        """Gửi tin nhắn Telegram qua HTTP Bot API"""
        if not target or not text:
            return {"success": False, "error": "Target hoặc nội dung tin nhắn không hợp lệ"}

        cfg = _get_bot_config()
        token = cfg["bot_token"]

        # Nếu bot token chưa cấu hình, ghi log mô phỏng an toàn
        if not token:
            print(f"ℹ️ [TelegramAlert (Demo/Simulation)] Gửi tới @{target}:\n{text}")
            return {
                "success": True,
                "simulated": True,
                "detail": f"Đã ghi nhận gửi thông báo tới {target} (Chưa cấu hình TELEGRAM_BOT_TOKEN)"
            }

        chat_id = target.strip()
        if not chat_id.startswith("@") and not chat_id.lstrip("-").isdigit():
            chat_id = f"@{chat_id}"

        api_url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode,
            "disable_web_page_preview": True
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(api_url, json=payload)
                data = resp.json()
                if resp.status_code == 200 and data.get("ok"):
                    return {"success": True, "result": data.get("result")}
                else:
                    err_msg = data.get("description", resp.text)
                    print(f"⚠️ [TelegramAlert] Lỗi Bot API ({resp.status_code}): {err_msg}")
                    return {"success": False, "error": err_msg}
        except Exception as e:
            print(f"❌ [TelegramAlert] Lỗi kết nối HTTP tới Telegram: {e}")
            return {"success": False, "error": str(e)}

    @classmethod
    def get_user_telegram_handle(cls, user_id: str) -> Optional[str]:
        """Lấy Telegram username nhận báo cáo của người dùng từ Supabase"""
        sb = get_supabase()
        if sb:
            try:
                res = sb.table("profiles").select("telegram_admin_username").eq("id", user_id).single().execute()
                if res.data and res.data.get("telegram_admin_username"):
                    return res.data["telegram_admin_username"].strip()
            except Exception:
                pass
        return None

    @classmethod
    async def notify_deposit_success(
        cls, 
        user_id: str, 
        amount: int, 
        order_code: int, 
        new_balance: int
    ):
        """Thông báo nạp tiền thành công qua VietQR PayOS"""
        now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        msg = (
            f"💰 <b>NẠP TIỀN THÀNH CÔNG - TELEPULSE</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"• <b>Mã đơn hàng:</b> <code>#{order_code}</code>\n"
            f"• <b>Số tiền nạp:</b> <code>+{amount:,} ₫</code>\n"
            f"• <b>Số dư ví mới:</b> <b>{new_balance:,} ₫</b>\n"
            f"• <b>Thời gian:</b> {now_str}\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"✨ <i>Cảm ơn quý khách đã tin dùng hệ thống TelePulse!</i>"
        )

        user_handle = cls.get_user_telegram_handle(user_id)
        if user_handle:
            await cls.send_message(user_handle, msg)

        # Gửi thêm cho Admin hệ thống
        cfg = _get_bot_config()
        if cfg.get("admin_handle") and cfg["admin_handle"] != user_handle:
            admin_msg = (
                f"🔔 <b>[ADMIN ALERT] KHÁCH HÀNG NẠP TIỀN</b>\n"
                f"• User ID: <code>{user_id[:8]}...</code>\n"
                f"• Đơn #{order_code}: <b>+{amount:,} ₫</b>\n"
                f"• Thời gian: {now_str}"
            )
            await cls.send_message(cfg["admin_handle"], admin_msg)

    @classmethod
    async def notify_vip_activated(
        cls, 
        user_id: str, 
        plan_name: str, 
        expires_at: str, 
        cost: int
    ):
        """Thông báo kích hoạt/gia hạn gói cước VIP Pro"""
        now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        msg = (
            f"👑 <b>KÍCH HOẠT VIP PRO THÀNH CÔNG</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"• <b>Gói dịch vụ:</b> <b>{plan_name}</b>\n"
            f"• <b>Hạn sử dụng đến:</b> <code>{expires_at}</code>\n"
            f"• <b>Chi phí:</b> <code>{cost:,} ₫</code>\n"
            f"• <b>Thời gian:</b> {now_str}\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"🚀 <i>Đặc quyền VIP Pro: 10 tài khoản Telegram, Live Chat 2 chiều, Spintax không giới hạn!</i>"
        )

        user_handle = cls.get_user_telegram_handle(user_id)
        if user_handle:
            await cls.send_message(user_handle, msg)

    @classmethod
    async def notify_campaign_summary(
        cls, 
        user_id: str, 
        sent_count: int, 
        error_count: int,
        status: str = "Hoàn tất chu kỳ"
    ):
        """Báo cáo kết quả gửi tin chiến dịch Telegram"""
        now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        msg = (
            f"📊 <b>BÁO CÁO CHIẾN DỊCH RẢI TIN TELEGRAM</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"• <b>Trạng thái:</b> <b>{status}</b>\n"
            f"• <b>Đã gửi thành công:</b> <code>{sent_count} nhóm</code>\n"
            f"• <b>Gửi lỗi/Bỏ qua:</b> <code>{error_count} nhóm</code>\n"
            f"• <b>Thời gian:</b> {now_str}\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"⚡ <i>Hệ thống TelePulse đang vận hành tự động theo lịch hẹn.</i>"
        )

        user_handle = cls.get_user_telegram_handle(user_id)
        if user_handle:
            await cls.send_message(user_handle, msg)
