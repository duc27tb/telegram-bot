import asyncio

# Fix Pyrogram issue on Python 3.12+ / 3.14 (RuntimeError: There is no current event loop)
try:
    asyncio.get_event_loop()
except RuntimeError:
    asyncio.set_event_loop(asyncio.new_event_loop())

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.routers import accounts, campaigns, chat, wallet, activities, groups, admin, guide
from app.services.pyrogram_engine import bot_engine
from app.services.user_auth import verify_supabase_jwt
from app.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.ENABLE_BOT_WORKER:
        # Tự động bổ sung API ID và API Hash hệ thống cho các tài khoản cũ chưa có
        async def _ensure_legacy_accounts_api():
            from app.database import get_supabase
            sb = get_supabase()
            if sb:
                try:
                    all_accs = sb.table("telegram_accounts").select("id, api_id, api_hash").execute()
                    for acc in (all_accs.data or []):
                        if not acc.get("api_id") or not acc.get("api_hash"):
                            sb.table("telegram_accounts").update({
                                "api_id": int(settings.DEFAULT_API_ID),
                                "api_hash": settings.DEFAULT_API_HASH
                            }).eq("id", acc["id"]).execute()
                            print(f"✅ [Migration] Đã bổ sung API ID/Hash hệ thống cho tài khoản {acc['id']}")
                except Exception as e:
                    print(f"⚠️ [_ensure_legacy_accounts_api] {e}")

        asyncio.create_task(_ensure_legacy_accounts_api())

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
    else:
        print("⏸️ [Lifespan] ENABLE_BOT_WORKER=false: Chạy ở chế độ Passive API (không kết nối Pyrogram client để tránh xung đột session với Deploy Render).")
    yield
    # Khi ứng dụng dừng: ngắt kết nối các client sạch sẽ
    for acc_id in list(bot_engine.active_clients.keys()):
        await bot_engine.stop_client(acc_id)

app = FastAPI(
    title="Telegram Bot SaaS Engine",
    description="Backend API điều khiển dàn bot Telegram đa người dùng với Supabase & Pyrogram",
    version="1.0.1",
    lifespan=lifespan
)

# Cấu hình CORS để Frontend (React/Vite) gọi API thoải mái
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware xác thực Supabase JWT cho các API người dùng (BƯỚC 4 - Auth Guard)
@app.middleware("http")
async def supabase_jwt_auth_guard(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)

    path = request.url.path
    # Bỏ qua các route công khai, webhook PayOS và cổng Admin riêng
    public_prefixes = (
        "/docs", "/openapi.json", "/api/wallet/webhook", "/api/wallet/plans",
        "/api/admin", "/api/guide"
    )
    if path == "/" or any(path.startswith(p) for p in public_prefixes):
        return await call_next(request)

    auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        if token:
            jwt_info = verify_supabase_jwt(token)
            if not jwt_info:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại!"}
                )
            request.state.auth_user = jwt_info

            # Chống giả mạo user_id trên URL nếu không phải Admin
            if jwt_info.get("role") != "admin":
                auth_uid = jwt_info.get("user_id")
                q_uid = request.query_params.get("user_id")
                if q_uid and auth_uid and q_uid != auth_uid:
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "Từ chối truy cập: Bạn không có quyền thao tác trên dữ liệu của tài khoản khác!"}
                    )

    return await call_next(request)

# Gắn các router API
app.include_router(accounts.router)
app.include_router(groups.router)
app.include_router(campaigns.router)
app.include_router(chat.router)
app.include_router(wallet.router)
app.include_router(activities.router)
app.include_router(admin.router)
app.include_router(guide.router)

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
