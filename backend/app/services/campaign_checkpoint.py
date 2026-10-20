import os
import json
import time
from typing import Dict, Any, List, Optional, Set

CHECKPOINT_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data",
    "campaign_checkpoints.json"
)

class CampaignCheckpointService:
    """
    Quản lý điểm dừng chân (Checkpoint) cho chiến dịch rải tin:
    - Ghi nhớ các nhóm đã gửi thành công trong chu kỳ hiện tại.
    - Cho phép 'Resume' tiếp tục từ nhóm dở dang khi người dùng bấm Tạm Dừng rồi Bật lại.
    - Tự động Reset về nhóm 1 nếu thời gian từ lần gửi nhóm 1 đã vượt quá thời gian chu kỳ (Cycle TTL).
    """

    @classmethod
    def _load_all(cls) -> Dict[str, Any]:
        if not os.path.exists(CHECKPOINT_FILE):
            return {}
        try:
            with open(CHECKPOINT_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️ [CampaignCheckpoint] Lỗi đọc checkpoint: {e}")
            return {}

    @classmethod
    def _save_all(cls, data: Dict[str, Any]):
        os.makedirs(os.path.dirname(CHECKPOINT_FILE), exist_ok=True)
        try:
            with open(CHECKPOINT_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"⚠️ [CampaignCheckpoint] Lỗi ghi checkpoint: {e}")

    @classmethod
    def get_checkpoint(cls, user_id: str) -> Optional[Dict[str, Any]]:
        all_data = cls._load_all()
        return all_data.get(user_id)

    @classmethod
    def mark_group_sent(cls, user_id: str, chat_id: int, cycle_start_time: float, cycle_delay: int):
        all_data = cls._load_all()
        user_cp = all_data.get(user_id) or {
            "cycle_start_time": cycle_start_time,
            "sent_chat_ids": [],
            "cycle_delay": cycle_delay
        }
        sent_list = user_cp.get("sent_chat_ids", [])
        if chat_id not in sent_list:
            sent_list.append(chat_id)
        user_cp["sent_chat_ids"] = sent_list
        user_cp["cycle_start_time"] = cycle_start_time
        user_cp["cycle_delay"] = cycle_delay
        user_cp["updated_at"] = time.time()
        all_data[user_id] = user_cp
        cls._save_all(all_data)

    @classmethod
    def clear_checkpoint(cls, user_id: str):
        all_data = cls._load_all()
        if user_id in all_data:
            del all_data[user_id]
            cls._save_all(all_data)
            print(f"🔄 [CampaignCheckpoint] Đã xóa checkpoint chu kỳ cho User: {user_id}")
