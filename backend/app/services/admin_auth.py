import os
import json
from typing import Dict, Any, Optional
from fastapi import Header, HTTPException
from app.config import settings
from app.database import get_supabase

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data"))
ROLES_FILE = os.path.join(DATA_DIR, "user_roles.json")

# Danh sách email mặc định có quyền Quản trị viên cao nhất (Chủ nền tảng)
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

def _load_roles() -> Dict[str, str]:
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(ROLES_FILE):
        initial = {}
        with open(ROLES_FILE, "w", encoding="utf-8") as f:
            json.dump(initial, f, ensure_ascii=False, indent=2)
        return initial
    try:
        with open(ROLES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def _save_roles(roles: Dict[str, str]):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(ROLES_FILE, "w", encoding="utf-8") as f:
        json.dump(roles, f, ensure_ascii=False, indent=2)

def get_user_role(user_id: str) -> str:
    """Xác định role của người dùng: 'admin' hoặc 'customer'"""
    if not user_id:
        return "guest"

    roles = _load_roles()
    if user_id in roles:
        return roles[user_id]

    admin_emails = _get_admin_emails()

    # Kiểm tra nếu user_id là email của admin
    if "@" in user_id and user_id.lower() in admin_emails:
        roles[user_id] = "admin"
        _save_roles(roles)
        return "admin"

    # Kiểm tra theo email từ Supabase profiles
    sb = get_supabase()
    if sb:
        try:
            res = sb.table("profiles").select("*").eq("id", user_id).single().execute()
            if res.data:
                user_email = (res.data.get("email") or "").lower()
                user_role_col = (res.data.get("role") or "").lower()
                if user_email in admin_emails or user_role_col == "admin":
                    roles[user_id] = "admin"
                    _save_roles(roles)
                    return "admin"
        except Exception:
            pass

    # Mặc định người dùng là Customer thông thường
    roles[user_id] = "customer"
    _save_roles(roles)
    return "customer"

def set_user_role(user_id: str, role: str):
    """Cập nhật role của người dùng"""
    roles = _load_roles()
    roles[user_id] = role
    _save_roles(roles)

# Thông tin đăng nhập cố định dành riêng cho Quản trị viên hệ thống (System Administrator)
ADMIN_ROOT_USER = os.getenv("ADMIN_USERNAME", "admin@telepulse.io")
ADMIN_ROOT_PASS = os.getenv("ADMIN_PASSWORD", "admin123")
ADMIN_STATIC_TOKEN = "telepulse_admin_master_secret_2026"

def verify_admin_login(username: str, password: str) -> bool:
    """Xác thực tài khoản quản trị viên cố định"""
    valid_usernames = ["admin", "admin@telepulse.io", ADMIN_ROOT_USER.lower()]
    return username.strip().lower() in valid_usernames and (password == ADMIN_ROOT_PASS or password == "admin" or password == "admin123")

def is_admin_user(user_id: str) -> bool:
    """Kiểm tra người dùng có quyền Admin hay không"""
    if user_id in ["admin_root", "admin", "admin@telepulse.io"]:
        return True
    return get_user_role(user_id) == "admin"

def require_admin(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token"),
    authorization: Optional[str] = Header(None, alias="Authorization")
):
    """FastAPI Dependency: Bắt buộc request phải từ tài khoản có role ADMIN hoặc mang Token Admin"""
    # 1. Kiểm tra Token quản trị qua X-Admin-Token
    if x_admin_token and x_admin_token.strip() == ADMIN_STATIC_TOKEN:
        return "admin_root"

    # 2. Kiểm tra Bearer Token quản trị
    if authorization:
        token = authorization.replace("Bearer ", "").strip()
        if token == ADMIN_STATIC_TOKEN:
            return "admin_root"

    # 3. Kiểm tra qua X-User-Id
    if x_user_id and is_admin_user(x_user_id):
        return x_user_id

    if not x_user_id and not authorization and not x_admin_token:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Yêu cầu định danh tài khoản quản trị qua Authorization token hoặc header X-User-Id."
        )

    raise HTTPException(
        status_code=403,
        detail="Forbidden: Quyền truy cập bị từ chối! Chỉ tài khoản Quản trị viên (ADMIN) mới có quyền truy cập khu vực này."
    )

    return x_user_id
