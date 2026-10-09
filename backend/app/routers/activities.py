from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.services.activity_service import ActivityService

router = APIRouter(prefix="/api/activities", tags=["Activities"])

class LogActivityBody(BaseModel):
    user_id: str
    action_type: str
    action_title: str
    description: Optional[str] = ""
    metadata: Optional[Dict[str, Any]] = None

@router.get("/{user_id}")
async def get_user_activities(user_id: str, limit: int = 50):
    """Lấy danh sách hoạt động gần nhất của người dùng"""
    activities = ActivityService.get_activities(user_id, limit)
    return {"success": True, "data": activities}

@router.post("/log")
async def log_activity(body: LogActivityBody, request: Request):
    """Ghi nhận một hành động mới từ phía Frontend"""
    ip_addr = request.client.host if request.client else None
    act = ActivityService.log_activity(
        user_id=body.user_id,
        action_type=body.action_type,
        title=body.action_title,
        description=body.description or "",
        metadata=body.metadata,
        ip_address=ip_addr
    )
    return {"success": True, "data": act}

class TestAlertBody(BaseModel):
    user_id: str
    target_username: str

@router.post("/test-telegram-alert")
async def test_telegram_alert(body: TestAlertBody):
    """Gửi thử nghiệm tin nhắn cảnh báo Telegram cho người dùng (UC-07)"""
    from app.services.telegram_alert_service import TelegramAlertService
    from datetime import datetime

    now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    sample_text = (
        f"🔔 <b>THỬ NGHIỆM KẾT NỐI BOT ALERT - TELEPULSE</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"• <b>Tài khoản nhận:</b> @{body.target_username.replace('@', '')}\n"
        f"• <b>Thời gian:</b> {now_str}\n"
        f"• <b>Trạng thái:</b> Kết nối thành công ✅\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"Bạn sẽ nhận được thông báo biến động nạp tiền và trạng thái chiến dịch tự động tại đây!"
    )

    res = await TelegramAlertService.send_message(body.target_username, sample_text)
    return res
