import json
import os
import time
from typing import Any, Dict, Optional
from app.database import get_supabase

BUCKET_NAME = "telepulse-system"
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data"))


class CloudKV:
    """
    Đồng bộ tự động dữ liệu cấu hình & trạng thái SaaS lên Supabase Storage (Private Bucket)
    kèm RAM Cache + Local Disk Backup. Không cần chạy SQL thủ công vẫn bền vững 100% trên Cloud/Render.
    """
    _bucket_ready: bool = False
    _mem_cache: Dict[str, Dict[str, Any]] = {}
    _CACHE_TTL = 15.0  # seconds

    @classmethod
    def _ensure_bucket(cls, sb) -> bool:
        if cls._bucket_ready:
            return True
        try:
            buckets = sb.storage.list_buckets()
            names = [getattr(b, "name", None) or (b.get("name") if isinstance(b, dict) else None) for b in (buckets or [])]
            if BUCKET_NAME not in names:
                sb.storage.create_bucket(BUCKET_NAME, options={"public": False})
            cls._bucket_ready = True
            return True
        except Exception:
            return False

    @classmethod
    def load(cls, filename: str, default_factory=dict) -> Dict[str, Any]:
        now = time.time()
        cached = cls._mem_cache.get(filename)
        if cached and (now - cached["ts"] < cls._CACHE_TTL):
            return cached["data"]

        os.makedirs(DATA_DIR, exist_ok=True)
        local_path = os.path.join(DATA_DIR, filename)

        # 1. Ưu tiên tải từ Supabase Storage Private Bucket
        sb = get_supabase()
        if sb and cls._ensure_bucket(sb):
            try:
                raw_bytes = sb.storage.from_(BUCKET_NAME).download(filename)
                if raw_bytes:
                    data = json.loads(raw_bytes.decode("utf-8"))
                    cls._mem_cache[filename] = {"data": data, "ts": now}
                    try:
                        with open(local_path, "w", encoding="utf-8") as f:
                            json.dump(data, f, ensure_ascii=False, indent=2)
                    except Exception:
                        pass
                    return data
            except Exception:
                pass

        # 2. Nếu trên Cloud chưa có, đọc từ file Local và tự động đẩy lên Cloud lần đầu
        if os.path.exists(local_path):
            try:
                with open(local_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                cls._mem_cache[filename] = {"data": data, "ts": now}
                cls.save(filename, data)
                return data
            except Exception:
                pass

        default_val = default_factory() if callable(default_factory) else default_factory
        cls.save(filename, default_val)
        return default_val

    @classmethod
    def save(cls, filename: str, data: Dict[str, Any]) -> None:
        cls._mem_cache[filename] = {"data": data, "ts": time.time()}
        os.makedirs(DATA_DIR, exist_ok=True)
        local_path = os.path.join(DATA_DIR, filename)

        try:
            with open(local_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

        sb = get_supabase()
        if sb and cls._ensure_bucket(sb):
            try:
                payload = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
                sb.storage.from_(BUCKET_NAME).upload(
                    path=filename,
                    file=payload,
                    file_options={"content-type": "application/json", "upsert": "true"}
                )
            except Exception:
                try:
                    sb.storage.from_(BUCKET_NAME).update(
                        path=filename,
                        file=payload,
                        file_options={"content-type": "application/json", "upsert": "true"}
                    )
                except Exception:
                    pass

    @classmethod
    def get_user_schedule(cls, user_id: str) -> Dict[str, Any]:
        all_sched = cls.load("campaign_schedules.json", dict)
        return all_sched.get(user_id, {})

    @classmethod
    def save_user_schedule(cls, user_id: str, sched_updates: Dict[str, Any]) -> Dict[str, Any]:
        all_sched = cls.load("campaign_schedules.json", dict)
        curr = all_sched.get(user_id, {})
        curr.update({k: v for k, v in sched_updates.items() if v is not None})
        all_sched[user_id] = curr
        cls.save("campaign_schedules.json", all_sched)
        return curr
