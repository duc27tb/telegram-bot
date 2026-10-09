import os
import json
import time
import re
from typing import Dict, Any, List, Optional
from app.database import get_supabase

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data"))
MASTER_GROUPS_FILE = os.path.join(DATA_DIR, "master_groups.json")

def _load_local_master_groups() -> List[Dict[str, Any]]:
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(MASTER_GROUPS_FILE):
        return []
    try:
        with open(MASTER_GROUPS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def _save_local_master_groups(groups: List[Dict[str, Any]]):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(MASTER_GROUPS_FILE, "w", encoding="utf-8") as f:
        json.dump(groups, f, ensure_ascii=False, indent=2)

def clean_telegram_link(link: str) -> str:
    """Chuẩn hóa link hoặc username Telegram về dạng chuẩn để Pyrogram join_chat dễ dàng"""
    if not link:
        return ""
    link = link.strip()
    # Nếu là username bắt đầu bằng @
    if link.startswith("@"):
        return f"https://t.me/{link[1:]}"
    # Nếu chỉ là tên username trần (không có t.me)
    if not link.startswith("http://") and not link.startswith("https://") and not link.startswith("t.me/"):
        if not "+" in link:
            return f"https://t.me/{link}"
        else:
            return f"https://t.me/{link}"
    if link.startswith("t.me/"):
        return f"https://{link}"
    return link

class MasterGroupService:
    @classmethod
    def get_groups(cls, user_id: str) -> List[Dict[str, Any]]:
        """Lấy danh sách nhóm chung của người dùng (ưu tiên Supabase, fallback JSON)"""
        sb = get_supabase()
        if sb:
            try:
                res = sb.table("master_groups").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                # Table might not exist yet, fallback to JSON
                pass

        all_groups = _load_local_master_groups()
        return [g for g in all_groups if g.get("user_id") == user_id]

    @classmethod
    def add_group(cls, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Thêm một nhóm chung mới vào kho"""
        group_id = f"mg-{int(time.time() * 1000)}"
        raw_link = data.get("invite_link") or ""
        invite_link = clean_telegram_link(raw_link)
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        # Trích xuất username nếu link là dạng t.me/username
        username = None
        if invite_link:
            match = re.search(r"t\.me/(?!joinchat|\+)([a-zA-Z0-9_]{4,})", invite_link)
            if match:
                username = match.group(1)

        raw_title = data.get("group_title") or "Nhóm Telegram"
        group_title = str(raw_title).strip()
        raw_notes = data.get("notes") or ""
        notes = str(raw_notes).strip()

        item = {
            "id": group_id,
            "user_id": user_id,
            "group_title": group_title,
            "invite_link": invite_link,
            "chat_id": data.get("chat_id"),
            "username": username,
            "notes": notes,
            "is_active": data.get("is_active", True),
            "created_at": timestamp,
            "updated_at": timestamp
        }

        # Lưu vào Supabase nếu có
        sb = get_supabase()
        if sb:
            try:
                res = sb.table("master_groups").insert(item).execute()
                if res.data:
                    item = res.data[0]
            except Exception:
                pass

        # Lưu vào JSON local
        all_groups = _load_local_master_groups()
        all_groups.insert(0, item)
        _save_local_master_groups(all_groups)

        return item

    @classmethod
    def update_group(cls, user_id: str, group_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Cập nhật thông tin nhóm chung"""
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        update_dict = {**update_data, "updated_at": timestamp}
        if "invite_link" in update_dict and update_dict["invite_link"] is not None:
            update_dict["invite_link"] = clean_telegram_link(str(update_dict["invite_link"]))
        if "group_title" in update_dict and update_dict["group_title"] is not None:
            update_dict["group_title"] = str(update_dict["group_title"]).strip()
        if "notes" in update_dict:
            update_dict["notes"] = str(update_dict["notes"] or "").strip()

        # Update Supabase
        sb = get_supabase()
        if sb:
            try:
                sb.table("master_groups").update(update_dict).eq("id", group_id).eq("user_id", user_id).execute()
            except Exception:
                pass

        # Update local JSON
        all_groups = _load_local_master_groups()
        target = None
        for g in all_groups:
            if g.get("id") == group_id and g.get("user_id") == user_id:
                g.update(update_dict)
                target = g
                break
        _save_local_master_groups(all_groups)
        return target

    @classmethod
    def delete_group(cls, user_id: str, group_id: str) -> bool:
        """Xóa nhóm chung khỏi kho"""
        sb = get_supabase()
        if sb:
            try:
                sb.table("master_groups").delete().eq("id", group_id).eq("user_id", user_id).execute()
            except Exception:
                pass

        all_groups = _load_local_master_groups()
        filtered = [g for g in all_groups if not (g.get("id") == group_id and g.get("user_id") == user_id)]
        _save_local_master_groups(filtered)
        return True
