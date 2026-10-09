import os
import json
from typing import Dict, Optional, Any

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data"))
LINKS_FILE = os.path.join(DATA_DIR, "cached_group_links.json")

class GroupLinkCache:
    _cache: Dict[str, Dict[str, Any]] = {}
    _loaded: bool = False

    @classmethod
    def _load(cls):
        if cls._loaded:
            return
        os.makedirs(DATA_DIR, exist_ok=True)
        if os.path.exists(LINKS_FILE):
            try:
                with open(LINKS_FILE, "r", encoding="utf-8") as f:
                    cls._cache = json.load(f)
            except Exception:
                cls._cache = {}
        cls._loaded = True

    @classmethod
    def _save(cls):
        os.makedirs(DATA_DIR, exist_ok=True)
        try:
            with open(LINKS_FILE, "w", encoding="utf-8") as f:
                json.dump(cls._cache, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[GroupLinkCache] Error saving cached_group_links.json: {e}")

    @classmethod
    def set_link(cls, chat_id: Any, link: Optional[str] = None, username: Optional[str] = None, members_count: Optional[int] = None):
        cls._load()
        if not chat_id:
            return
        cid_str = str(chat_id)
        existing = cls._cache.get(cid_str, {})
        cls._cache[cid_str] = {
            "link": link if link is not None else existing.get("link", ""),
            "username": username if username is not None else existing.get("username", ""),
            "members_count": members_count if members_count is not None else existing.get("members_count", 0)
        }
        cls._save()

    @classmethod
    def get_link(cls, chat_id: Any) -> Optional[Dict[str, Any]]:
        cls._load()
        return cls._cache.get(str(chat_id))

    @classmethod
    def batch_set_links(cls, links_map: Dict[Any, Dict[str, Any]]):
        cls._load()
        for cid, val in links_map.items():
            if not cid:
                continue
            cid_str = str(cid)
            existing = cls._cache.get(cid_str, {})
            cls._cache[cid_str] = {
                "link": val.get("link") if val.get("link") is not None else existing.get("link", ""),
                "username": val.get("username") if val.get("username") is not None else existing.get("username", ""),
                "members_count": val.get("members_count") if val.get("members_count") is not None else existing.get("members_count", 0)
            }
        cls._save()

    @classmethod
    def get_all(cls) -> Dict[str, Dict[str, Any]]:
        cls._load()
        return cls._cache
