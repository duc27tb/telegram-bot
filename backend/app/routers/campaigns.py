from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta, timezone
from app.services.pyrogram_engine import bot_engine
from app.database import get_supabase

router = APIRouter(prefix="/api/campaign", tags=["Campaign"])

class UserCampaignAction(BaseModel):
    user_id: str

class UpdateCampaignSettings(BaseModel):
    user_id: str
    group_delay_seconds: Optional[int] = None
    cycle_delay_seconds: Optional[int] = None
    forward_to_telegram: Optional[bool] = None

@router.post("/start")
async def start_campaign(body: UserCampaignAction):
    sb = get_supabase()
    if sb:
        # 1. Kiểm tra tài khoản Telegram đang online
        accs = sb.table("telegram_accounts").select("id").eq("user_id", body.user_id).eq("status", "online").execute()
        if not accs.data:
            raise HTTPException(
                status_code=400,
                detail="Không thể khởi động chiến dịch: Bạn chưa có tài khoản Telegram nào đang Online! Vui lòng vào trang 'Tài Khoản' để Bật nick trước."
            )

        # 2. Kiểm tra có ít nhất 1 mẫu tin đang bật
        tmpls = sb.table("message_templates").select("id").eq("user_id", body.user_id).eq("is_active", True).execute()
        if not tmpls.data:
            raise HTTPException(
                status_code=400,
                detail="Không thể khởi động chiến dịch: Bạn chưa có mẫu tin nhắn nào đang bật. Vui lòng vào trang 'Chiến Dịch' để tạo hoặc bật mẫu tin!"
            )

        # 3. Kiểm tra có ít nhất 1 nhóm mục tiêu đang bật
        grps = sb.table("target_groups").select("id").eq("user_id", body.user_id).eq("is_active", True).execute()
        if not grps.data:
            raise HTTPException(
                status_code=400,
                detail="Không thể khởi động chiến dịch: Chưa có nhóm Telegram mục tiêu nào đang bật. Vui lòng quét hoặc thêm nhóm!"
            )

    result = await bot_engine.start_campaign_for_user(body.user_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Lỗi khởi động chiến dịch"))
    return result

@router.post("/stop")
async def stop_campaign(body: UserCampaignAction):
    result = await bot_engine.stop_campaign_for_user(body.user_id)
    return result

@router.post("/reset-cycle")
async def reset_campaign_cycle(body: UserCampaignAction):
    from app.services.campaign_checkpoint import CampaignCheckpointService
    CampaignCheckpointService.clear_checkpoint(body.user_id)
    return {"success": True, "message": "Đã reset chu kỳ về nhóm đầu tiên thành công!"}

@router.get("/status/{user_id}")
async def get_campaign_status(user_id: str):
    sb = get_supabase()
    if not sb:
        raise HTTPException(status_code=500, detail="Chưa kết nối Supabase")
    camp = sb.table("campaign_settings").select("*").eq("user_id", user_id).execute()
    is_active = user_id in bot_engine.campaign_tasks and not bot_engine.campaign_tasks[user_id].done()
    
    # Tự động hồi phục background task nếu DB đang bật nhưng server vừa khởi động lại
    if not is_active and camp.data and camp.data[0].get("is_running", False):
        try:
            await bot_engine.start_campaign_for_user(user_id)
            is_active = True
        except Exception as e:
            print(f"[get_campaign_status] Error auto-resuming campaign: {e}")

    import time
    from app.services.campaign_checkpoint import CampaignCheckpointService
    cp = CampaignCheckpointService.get_checkpoint(user_id)
    checkpoint_info = None
    if cp:
        now_ts = time.time()
        start_t = cp.get("cycle_start_time", now_ts)
        sent_ids = cp.get("sent_chat_ids", [])
        c_delay = cp.get("cycle_delay", 1200)
        passed = now_ts - start_t
        checkpoint_info = {
            "cycle_start_time": start_t,
            "sent_count": len(sent_ids),
            "sent_chat_ids": sent_ids,
            "time_passed_seconds": int(passed),
            "cycle_delay_seconds": c_delay,
            "is_expired": passed >= c_delay
        }

    return {
        "settings": camp.data[0] if camp.data else None,
        "is_task_running": is_active,
        "checkpoint": checkpoint_info
    }

@router.put("/settings")
async def update_settings(body: UpdateCampaignSettings):
    sb = get_supabase()
    if not sb:
        raise HTTPException(status_code=500, detail="Chưa kết nối Supabase")

    update_data = {}
    if body.group_delay_seconds is not None:
        update_data["group_delay_seconds"] = body.group_delay_seconds
        bot_engine.custom_user_delays[body.user_id] = body.group_delay_seconds
    if body.cycle_delay_seconds is not None:
        update_data["cycle_delay_seconds"] = body.cycle_delay_seconds
    if body.forward_to_telegram is not None:
        # Kiểm tra gói cước người dùng
        from app.services.wallet_store import LocalWalletStore
        is_vip = LocalWalletStore.get_subscription_tier(body.user_id) == "VIP"
        if body.forward_to_telegram and not is_vip:
            raise HTTPException(
                status_code=403, 
                detail="Tính năng tự động chuyển tiếp tin nhắn về Telegram cá nhân chỉ dành riêng cho gói VIP Pro!"
            )
        update_data["forward_to_telegram"] = body.forward_to_telegram if is_vip else False

    update_data["updated_at"] = "now()"

    res = sb.table("campaign_settings").update(update_data).eq("user_id", body.user_id).execute()
    return {"success": True, "settings": res.data[0] if res.data else None}

@router.get("/logs/{user_id}")
async def get_campaign_logs(user_id: str, limit: int = 50):
    """Lấy danh sách nhật ký bot_logs của người dùng (Bỏ qua rào cản RLS, đảm bảo UI nhận 100% log)"""
    sb = get_supabase()
    if not sb:
        raise HTTPException(status_code=500, detail="Chưa kết nối Supabase")
    try:
        # Tự động dọn dẹp các log cũ hơn 1 tiếng để bảng luôn nhẹ và query siêu tốc (< 5ms)
        try:
            one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
            sb.table("bot_logs").delete().eq("user_id", user_id).lt("created_at", one_hour_ago).execute()
        except Exception:
            pass

        res = sb.table("bot_logs").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
        return {"success": True, "data": res.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

