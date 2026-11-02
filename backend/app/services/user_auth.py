import time
from typing import Dict, Any, Optional
from fastapi import Request, HTTPException
from app.database import get_supabase
from app.services.admin_auth import verify_admin_token

# Bộ nhớ đệm xác thực JWT (token -> {user_id, email, ts}) giúp tốc độ kiểm tra 0ms
_jwt_cache: Dict[str, Dict[str, Any]] = {}
JWT_CACHE_TTL = 120.0  # 2 phút


def verify_supabase_jwt(token: str) -> Optional[Dict[str, Any]]:
    """Xác thực Supabase Access Token của người dùng (có RAM cache 120s chống trễ mạng)"""
    if not token:
        return None

    now = time.time()
    cached = _jwt_cache.get(token)
    if cached and (now - cached["ts"] < JWT_CACHE_TTL):
        return cached

    # 1. Nếu là token Admin hệ thống (HMAC-SHA256)
    admin_payload = verify_admin_token(token)
    if admin_payload:
        info = {"user_id": "admin_root", "role": "admin", "ts": now}
        _jwt_cache[token] = info
        return info

    # 2. Xác thực qua Supabase Auth
    sb = get_supabase()
    if not sb:
        return None

    try:
        user_res = sb.auth.get_user(token)
        if user_res and getattr(user_res, "user", None):
            u = user_res.user
            info = {
                "user_id": str(u.id),
                "email": getattr(u, "email", ""),
                "role": "customer",
                "ts": now
            }
            _jwt_cache[token] = info
            return info
    except Exception:
        pass

    return None
