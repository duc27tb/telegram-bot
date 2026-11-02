import os
import json
import time
import hmac
import hashlib
import secrets
from typing import Dict, Any, Optional
from fastapi import Header, HTTPException
from app.config import settings
from app.database import get_supabase

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data"))
ROLES_FILE = os.path.join(DATA_DIR, "user_roles.json")

# Danh sách email mặc định có quyền Quản trị viên
DEFAULT_ADMIN_EMAILS = [
    "admin@telepulse.io",
    "admin"
]

def _get_admin_emails() -> list:
    env_admins = os.getenv("ADMIN_EMAILS", "")
    if env_admins:
        return [e.strip().lower() for e in env_admins.split(",") if e.strip()]
    return [e.lower() for e in DEFAULT_ADMIN_EMAILS]

get_admin_emails = _get_admin_emails

# -------------------------------------------------------------
# QUẢN LÝ DYNAMIC SIGNED ADMIN TOKEN (HMAC-SHA256)
# -------------------------------------------------------------
def _get_admin_secret_key() -> bytes:
    key = os.getenv("ADMIN_SECRET_KEY") or os.getenv("SUPABASE_SERVICE_KEY") or "telepulse_admin_secret_guard_key_2026"
    return key.encode("utf-8")

def generate_admin_token(username: str, role: str = "admin") -> str:
    """Tạo token ký số HMAC-SHA256 có thời hạn (7 ngày), an toàn chống giả mạo"""
    ts = int(time.time())
    nonce = secrets.token_hex(8)
    payload = f"{username}:{role}:{ts}:{nonce}"
    sig = hmac.new(_get_admin_secret_key(), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"tpadmin_{payload}_{sig}"

def verify_admin_token(token: Optional[str], max_age_seconds: int = 86400 * 7) -> Optional[Dict[str, Any]]:
    """Kiểm tra tính hợp lệ và thời hạn của admin token"""
    if not token or not token.startswith("tpadmin_"):
        return None
    raw = token[len("tpadmin_"):]
    parts = raw.split("_")
    if len(parts) != 2:
        return None
    payload, sig = parts[0], parts[1]
    payload_parts = payload.split(":")
    if len(payload_parts) != 4:
        return None
    username, role, ts_str, nonce = payload_parts
    try:
        ts = int(ts_str)
    except ValueError:
        return None
    
    if time.time() - ts > max_age_seconds:
        return None
    
    expected_sig = hmac.new(_get_admin_secret_key(), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected_sig):
        return None
    
    return {"username": username, "role": role, "timestamp": ts}


# -------------------------------------------------------------
# CACHE & ĐỒNG BỘ VAI TRÒ NGƯỜI DÙNG (SUPABASE-FIRST)
# -------------------------------------------------------------
_roles_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL = 60 # 60 giây

def _load_local_roles_fallback() -> Dict[str, str]:
    if not os.path.exists(ROLES_FILE):
        return {}
    try:
        with open(ROLES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def _save_local_roles_fallback(roles: Dict[str, str]):
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(ROLES_FILE, "w", encoding="utf-8") as f:
            json.dump(roles, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

def get_user_role(user_id: str) -> str:
    """Xác định role của người dùng: 'admin' hoặc 'customer' (Ưu tiên Supabase profiles)"""
    if not user_id:
        return "guest"

    now = time.time()
    if user_id in _roles_cache and now - _roles_cache[user_id]["ts"] < CACHE_TTL:
        return _roles_cache[user_id]["role"]

    admin_emails = _get_admin_emails()
    if "@" in user_id and user_id.lower() in admin_emails:
        _roles_cache[user_id] = {"role": "admin", "ts": now}
        return "admin"

    # Kiểm tra Supabase profiles
    sb = get_supabase()
    if sb:
        try:
            res = sb.table("profiles").select("email, role").eq("id", user_id).single().execute()
            if res.data:
                user_email = (res.data.get("email") or "").lower()
                user_role_col = (res.data.get("role") or "").lower()
                final_role = "admin" if (user_email in admin_emails or user_role_col == "admin") else (user_role_col or "customer")
                _roles_cache[user_id] = {"role": final_role, "ts": now}
                return final_role
        except Exception:
            pass

    # Fallback kiểm tra file local nếu Supabase chưa có bảng/cột
    local_roles = _load_local_roles_fallback()
    role = local_roles.get(user_id, "customer")
    _roles_cache[user_id] = {"role": role, "ts": now}
    return role

def set_user_role(user_id: str, role: str):
    """Cập nhật role của người dùng vào Supabase và cache"""
    now = time.time()
    clean_role = role.lower().strip()
    _roles_cache[user_id] = {"role": clean_role, "ts": now}

    # 1. Cập nhật Supabase
    sb = get_supabase()
    if sb:
        try:
            sb.table("profiles").update({"role": clean_role}).eq("id", user_id).execute()
        except Exception:
            pass

    # 2. Cập nhật file local fallback
    local_roles = _load_local_roles_fallback()
    local_roles[user_id] = clean_role
    _save_local_roles_fallback(local_roles)


# -------------------------------------------------------------
# XÁC THỰC TÀI KHOẢN ADMIN ROOT
# -------------------------------------------------------------
ADMIN_ROOT_USER = os.getenv("ADMIN_USERNAME", "admin@telepulse.io")
ADMIN_ROOT_PASS = os.getenv("ADMIN_PASSWORD", "admin123")

def verify_admin_login(username: str, password: str) -> bool:
    """Xác thực đăng nhập admin: kiểm tra tài khoản root cấu hình từ .env hoặc Supabase admin user"""
    clean_u = (username or "").strip().lower()
    clean_p = (password or "").strip()
    if not clean_u or not clean_p:
        return False

    valid_root_usernames = ["admin", "admin@telepulse.io", ADMIN_ROOT_USER.lower()]
    # 1. So khớp mật khẩu từ biến môi trường ADMIN_PASSWORD
    if clean_u in valid_root_usernames and clean_p == ADMIN_ROOT_PASS:
        return True

    # 2. Kiểm tra tài khoản trong Supabase profiles có role='admin'
    sb = get_supabase()
    if sb and "@" in clean_u:
        try:
            p_res = sb.table("profiles").select("id, role, email").eq("email", clean_u).execute()
            if p_res.data and p_res.data[0].get("role") == "admin":
                # Thử sign-in qua Supabase Auth để xác thực password
                auth_res = sb.auth.sign_in_with_password({"email": clean_u, "password": clean_p})
                if auth_res and auth_res.user:
                    return True
        except Exception:
            pass

    return False

def is_admin_user(user_id: str) -> bool:
    """Kiểm tra định danh có quyền Admin hay không"""
    if user_id in ["admin_root", "admin", ADMIN_ROOT_USER.lower()]:
        return True
    return get_user_role(user_id) == "admin"

def require_admin(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token"),
    authorization: Optional[str] = Header(None, alias="Authorization")
):
    """FastAPI Dependency: Bắt buộc request phải từ tài khoản có role ADMIN hoặc mang Token Admin hợp lệ"""
    token = None
    if x_admin_token:
        token = x_admin_token.strip()
    elif authorization:
        token = authorization.replace("Bearer ", "").strip()

    if token:
        payload = verify_admin_token(token)
        if payload:
            return payload.get("username", "admin_root")

    # Kiểm tra X-User-Id từ Supabase nếu đã xác thực
    if x_user_id and is_admin_user(x_user_id):
        return x_user_id

    raise HTTPException(
        status_code=403,
        detail="Forbidden: Quyền truy cập bị từ chối! Yêu cầu phiên làm việc của Quản trị viên (ADMIN)."
    )
