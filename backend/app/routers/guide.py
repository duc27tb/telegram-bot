import os
import json
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.admin_auth import require_admin

router = APIRouter(prefix="/api/guide", tags=["Guide"])

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data"))
GUIDE_FILE = os.path.join(DATA_DIR, "telegram_api_guide.json")

DEFAULT_GUIDE = {
    "title": "Hướng Dẫn Lấy API ID & API Hash Telegram",
    "badge": "Chính thức từ my.telegram.org (Miễn phí 100%)",
    "intro": "Để tài khoản gửi tin an toàn, độc lập và không bị giới hạn gửi tin do dùng chung cổng, mỗi người dùng cần tự lấy API ID & API Hash riêng của mình từ trang chủ Telegram. Quy trình chỉ mất khoảng 1 phút và hoàn toàn miễn phí.",
    "steps": [
        "Mở trình duyệt và truy cập trang chính thức của Telegram tại https://my.telegram.org",
        "Nhập số điện thoại Telegram của bạn (có mã quốc gia, ví dụ: +84912345678 hoặc 0912345678) và bấm 'Next'.",
        "Kiểm tra ứng dụng Telegram trên máy để lấy mã xác nhận OTP (gửi qua tin nhắn Telegram), nhập vào ô 'Confirmation code' và bấm 'Sign In'.",
        "Tại menu quản lý tài khoản, bấm chọn mục 'API development tools'.",
        "Điền thông tin: 'App title' (ví dụ: MySpamBot) và 'Short name' (ví dụ: myspambot), chọn nền tảng 'Desktop' hoặc 'Other', sau đó bấm 'Create application'.",
        "Hệ thống sẽ hiển thị 2 thông số: App api_id (dãy số) và App api_hash (chuỗi ký tự). Sao chép 2 thông số này và dán vào phần mềm TelePulse."
    ],
    "video_url": "https://www.youtube.com/watch?v=8naXmJkW5rA",
    "video_title": "Video Hướng Dẫn Chi Tiết Từng Bước",
    "telegram_org_url": "https://my.telegram.org",
    "updated_at": datetime.now(timezone.utc).isoformat()
}

def _load_guide() -> Dict[str, Any]:
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(GUIDE_FILE):
        with open(GUIDE_FILE, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_GUIDE, f, ensure_ascii=False, indent=2)
        return DEFAULT_GUIDE
    try:
        with open(GUIDE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            for k, v in DEFAULT_GUIDE.items():
                if k not in data:
                    data[k] = v
            return data
    except Exception:
        return DEFAULT_GUIDE

def _save_guide(guide: Dict[str, Any]):
    os.makedirs(DATA_DIR, exist_ok=True)
    guide["updated_at"] = datetime.now(timezone.utc).isoformat()
    with open(GUIDE_FILE, "w", encoding="utf-8") as f:
        json.dump(guide, f, ensure_ascii=False, indent=2)

class GuideUpdateRequest(BaseModel):
    title: Optional[str] = None
    badge: Optional[str] = None
    intro: Optional[str] = None
    steps: Optional[List[str]] = None
    video_url: Optional[str] = None
    video_title: Optional[str] = None

@router.get("/telegram-api")
async def get_telegram_api_guide():
    """Lấy nội dung hướng dẫn lấy API ID & API Hash và Video hướng dẫn"""
    guide = _load_guide()
    return {"success": True, "data": guide}

@router.put("/telegram-api")
async def update_telegram_api_guide(payload: GuideUpdateRequest, admin_id: str = Depends(require_admin)):
    """Cập nhật nội dung bài hướng dẫn và đường dẫn video (Dành riêng cho Quản trị viên - Root Admin)"""
    guide = _load_guide()
    if payload.title is not None:
        guide["title"] = payload.title.strip()
    if payload.badge is not None:
        guide["badge"] = payload.badge.strip()
    if payload.intro is not None:
        guide["intro"] = payload.intro.strip()
    if payload.steps is not None:
        guide["steps"] = [s.strip() for s in payload.steps if s.strip()]
    if payload.video_url is not None:
        guide["video_url"] = payload.video_url.strip()
    if payload.video_title is not None:
        guide["video_title"] = payload.video_title.strip()

    _save_guide(guide)
    return {"success": True, "data": guide}
