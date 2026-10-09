from supabase import create_client, Client
from app.config import settings

supabase: Client = None

def get_supabase() -> Client:
    global supabase
    if supabase is None:
        if not settings.SUPABASE_URL or not (settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_ANON_KEY):
            print("⚠️ CẢNH BÁO: Chưa cấu hình SUPABASE_URL hoặc SUPABASE_KEY trong file .env!")
            return None
        # Ưu tiên Service Key để Backend có quyền quản lý Worker
        key = settings.SUPABASE_SERVICE_KEY if settings.SUPABASE_SERVICE_KEY else settings.SUPABASE_ANON_KEY
        supabase = create_client(settings.SUPABASE_URL, key)
    return supabase
