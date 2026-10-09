import asyncio

# Fix Pyrogram issue on Python 3.12+ / 3.14 (RuntimeError: There is no current event loop)
try:
    asyncio.get_event_loop()
except RuntimeError:
    asyncio.set_event_loop(asyncio.new_event_loop())

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import accounts, campaigns, chat, wallet, activities, groups, admin
from app.services.pyrogram_engine import bot_engine
from app.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi động nền toàn bộ tài khoản bot Telegram để sẵn sàng lắng nghe tin nhắn đến
    asyncio.create_task(bot_engine.start_all_clients())

    # Khôi phục các chiến dịch đang chạy nếu server restart
    async def _resume_campaigns():
        await asyncio.sleep(4)
        from app.database import get_supabase
        sb = get_supabase()
        if sb:
            try:
                running_camps = sb.table("campaign_settings").select("user_id").eq("is_running", True).execute()
                for c in (running_camps.data or []):
                    u_id = c.get("user_id")
                    if u_id:
                        print(f"🔄 [Lifespan] Khôi phục tiến trình campaign cho User: {u_id}")
                        await bot_engine.start_campaign_for_user(u_id)
            except Exception as e:
                print(f"⚠️ [Lifespan] Lỗi resume campaigns: {e}")

    asyncio.create_task(_resume_campaigns())
    yield
    # Khi ứng dụng dừng: ngắt kết nối các client sạch sẽ
    for acc_id in list(bot_engine.active_clients.keys()):
        await bot_engine.stop_client(acc_id)

app = FastAPI(
    title="Telegram Bot SaaS Engine",
    description="Backend API điều khiển dàn bot Telegram đa người dùng với Supabase & Pyrogram",
    version="1.0.0",
    lifespan=lifespan
)

# Cấu hình CORS để Frontend (React/Vite) gọi API thoải mái
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gắn các router API
app.include_router(accounts.router)
app.include_router(groups.router)
app.include_router(campaigns.router)
app.include_router(chat.router)
app.include_router(wallet.router)
app.include_router(activities.router)
app.include_router(admin.router)

@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "service": "Telegram Bot SaaS API",
        "version": "1.0.0",
        "active_bots": len(bot_engine.active_clients)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.BACKEND_PORT, reload=True)
