from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
from app.services.pyrogram_engine import bot_engine, check_schedule_window
from app.services.cloud_kv import CloudKV
from app.database import get_supabase

router = APIRouter(prefix="/api/campaign", tags=["Campaign"])

class UserCampaignAction(BaseModel):
    user_id: str

class UpdateCampaignSettings(BaseModel):
    user_id: str
    group_delay_seconds: Optional[int] = None
    cycle_delay_seconds: Optional[int] = None
    forward_to_telegram: Optional[bool] = None
    schedule_enabled: Optional[bool] = None
    time_slots: Optional[List[Dict[str, str]]] = None
    active_days: Optional[List[int]] = None
    timezone: Optional[str] = None

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

    # Hợp nhất cấu hình hẹn giờ từ CloudKV (tự động hoạt động không cần chạy SQL thủ công)
    c_set = dict(camp.data[0]) if camp.data else {"user_id": user_id}
    cloud_sched = CloudKV.get_user_schedule(user_id)
    for k in ("schedule_enabled", "time_slots", "active_days", "timezone"):
        if k not in c_set or c_set.get(k) is None:
            if k in cloud_sched:
                c_set[k] = cloud_sched[k]
        elif k in cloud_sched:
            c_set[k] = cloud_sched[k]

    is_in_win, wait_sec, sched_msg, next_time = check_schedule_window(c_set)
    schedule_info = {
        "enabled": bool(c_set.get("schedule_enabled", False)),
        "is_in_window": is_in_win,
        "wait_seconds": wait_sec,
        "status_message": sched_msg,
        "next_run_at": next_time,
        "time_slots": c_set.get("time_slots") or [
            {"start": "08:00", "end": "11:30"},
            {"start": "13:30", "end": "18:00"}
        ],
        "active_days": c_set.get("active_days") or [1, 2, 3, 4, 5, 6, 7]
    }

    return {
        "settings": c_set if camp.data else None,
        "is_task_running": is_active,
        "checkpoint": checkpoint_info,
        "schedule": schedule_info
    }

@router.put("/settings")
async def update_settings(body: UpdateCampaignSettings):
    sb = get_supabase()
    if not sb:
        raise HTTPException(status_code=500, detail="Chưa kết nối Supabase")

    base_update = {}
    if body.group_delay_seconds is not None:
        base_update["group_delay_seconds"] = body.group_delay_seconds
        bot_engine.custom_user_delays[body.user_id] = body.group_delay_seconds
    if body.cycle_delay_seconds is not None:
        base_update["cycle_delay_seconds"] = body.cycle_delay_seconds
    if body.forward_to_telegram is not None:
        from app.services.wallet_store import LocalWalletStore
        is_vip = LocalWalletStore.get_subscription_tier(body.user_id) == "VIP"
        if body.forward_to_telegram and not is_vip:
            raise HTTPException(
                status_code=403, 
                detail="Tính năng tự động chuyển tiếp tin nhắn về Telegram cá nhân chỉ dành riêng cho gói VIP Pro!"
            )
        base_update["forward_to_telegram"] = body.forward_to_telegram if is_vip else False

    sched_update = {}
    if body.schedule_enabled is not None:
        sched_update["schedule_enabled"] = body.schedule_enabled
    if body.time_slots is not None:
        sched_update["time_slots"] = body.time_slots
    if body.active_days is not None:
        sched_update["active_days"] = body.active_days
    if body.timezone is not None:
        sched_update["timezone"] = body.timezone

    # 1. Tự động lưu cấu hình hẹn giờ lên Supabase Cloud Storage (CloudKV)
    saved_sched = CloudKV.save_user_schedule(body.user_id, sched_update) if sched_update else CloudKV.get_user_schedule(body.user_id)

    # 2. Cập nhật bảng campaign_settings (tự động fallback nếu chưa chạy SQL thêm cột schedule)
    base_update["updated_at"] = "now()"
    full_update = {**base_update, **sched_update}
    res_data = None
    try:
        res = sb.table("campaign_settings").update(full_update).eq("user_id", body.user_id).execute()
        res_data = res.data[0] if res.data else None
    except Exception:
        res = sb.table("campaign_settings").update(base_update).eq("user_id", body.user_id).execute()
        res_data = res.data[0] if res.data else None

    if res_data is not None:
        res_data.update(saved_sched)

    return {"success": True, "settings": res_data or saved_sched}

@router.get("/logs/{user_id}")
async def get_campaign_logs(user_id: str, limit: int = 50):
    """Lấy danh sách nhật ký bot_logs của người dùng (Bỏ qua rào cản RLS, đảm bảo UI nhận 100% log)"""
    sb = get_supabase()
    if not sb:
        raise HTTPException(status_code=500, detail="Chưa kết nối Supabase")
    try:
        try:
            one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
            sb.table("bot_logs").delete().eq("user_id", user_id).lt("created_at", one_hour_ago).execute()
        except Exception:
            pass

        res = sb.table("bot_logs").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
        return {"success": True, "data": res.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
