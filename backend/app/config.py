import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    DEFAULT_API_ID: str = os.getenv("DEFAULT_API_ID", "36228083")
    DEFAULT_API_HASH: str = os.getenv("DEFAULT_API_HASH", "948150d078ea7cfb7c60aadf9987e5aa")
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))
    PAYOS_CLIENT_ID: str = os.getenv("PAYOS_CLIENT_ID", "")
    PAYOS_API_KEY: str = os.getenv("PAYOS_API_KEY", "")
    PAYOS_CHECKSUM_KEY: str = os.getenv("PAYOS_CHECKSUM_KEY", "")
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin@telepulse.io")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "admin123")

settings = Settings()
