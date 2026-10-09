import os
import json
import time
from typing import Dict, Any, List, Optional
from app.database import get_supabase

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data"))
ACTIVITY_FILE = os.path.join(DATA_DIR, "activity_store.json")

def _load_activities() -> List[Dict[str, Any]]:
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(ACTIVITY_FILE):
        return []

    try:
        with open(ACTIVITY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

    try:
        with open(ACTIVITY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def _save_activities(activities: List[Dict[str, Any]]):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(ACTIVITY_FILE, "w", encoding="utf-8") as f:
        json.dump(activities[:200], f, ensure_ascii=False, indent=2)

class ActivityService:
    @classmethod
    def log_activity(
        cls, 
        user_id: str, 
        action_type: str, 
        title: str, 
        description: str = "", 
        metadata: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Ghi nhận hành động của người dùng (vào cả Local Store và Supabase)"""
        act_id = f"act-{int(time.time() * 1000)}"
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        item = {
            "id": act_id,
            "user_id": user_id,
            "action_type": action_type.upper(),
            "action_title": title,
            "description": description,
            "metadata": metadata or {},
            "ip_address": ip_address,
            "created_at": timestamp
        }

        # 1. Luôn lưu vào Local Store để không bao giờ mất log
        activities = _load_activities()
        activities.insert(0, item)
        _save_activities(activities)

        # 2. Thử lưu vào Supabase
        sb = get_supabase()
        if sb:
            try:
                sb_data = {
                    "user_id": user_id,
                    "action_type": action_type.upper(),
                    "action_title": title,
                    "description": description,
                    "metadata": metadata or {},
                    "ip_address": ip_address
                }
                sb.table("user_activities").insert(sb_data).execute()
            except Exception as e:
                pass

        return item

    @classmethod
    def get_activities(cls, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Lấy danh sách hoạt động của người dùng"""
        all_acts = _load_activities()
        user_local_acts = [a for a in all_acts if a.get("user_id") == user_id]

        sb = get_supabase()
        if sb:
            try:
                res = sb.table("user_activities")\
                        .select("*")\
                        .eq("user_id", user_id)\
                        .order("created_at", desc=True)\
                        .limit(limit)\
                        .execute()
                if res.data and len(res.data) > 0:
                    return res.data
                elif user_local_acts:
                    # Bảng đã tạo trên Supabase nhưng chưa có dữ liệu -> Tự động đồng bộ lên Supabase!
                    for act in user_local_acts:
                        try:
                            sb.table("user_activities").insert({
                                "user_id": act.get("user_id"),
                                "action_type": act.get("action_type"),
                                "action_title": act.get("action_title"),
                                "description": act.get("description"),
                                "metadata": act.get("metadata", {}),
                                "ip_address": act.get("ip_address")
                            }).execute()
                        except Exception:
                            pass
            except Exception:
                pass

        return user_local_acts[:limit]
