# Hướng Dẫn Vận Hành Hệ Thống TelePulse SaaS

Hệ thống điều khiển & tự động hóa dàn bot Telegram đa người dùng với **Frontend React (Vite)**, **Backend Python FastAPI** và **Supabase (Auth, PostgreSQL, Realtime, RLS)**.

---

## 1. Thiết Lập Cơ Sở Dữ Liệu Supabase (Chỉ cần làm 1 lần)

1. Đăng nhập vào trang quản trị [Supabase Dashboard](https://supabase.com/dashboard).
2. Tạo một Project mới (hoặc chọn project có sẵn).
3. Vào mục **SQL Editor** ở thanh menu bên trái.
4. Mở file [supabase/schema.sql](file:///d:/telegram-bot/supabase/schema.sql), sao chép toàn bộ nội dung và dán vào SQL Editor ➡️ Bấm **Run**.
   * Script sẽ tự động tạo toàn bộ các bảng, kích hoạt bảo mật **Row Level Security (RLS)** để cách ly dữ liệu từng người dùng, tạo trigger tự tạo profile và kích hoạt Realtime.

---

## 2. Kích Hoạt Đăng Nhập Bằng Gmail (Google OAuth)

1. Trên Supabase Dashboard, vào mục **Authentication** ➡️ **Providers**.
2. Tìm **Google** và gạt công tắc sang **Enabled**.
3. Điền **Client ID** và **Client Secret** từ Google Cloud Console (hoặc dùng URL Callback được cấp trong Supabase).
4. Người dùng khi vào Web bấm nút **"Tiếp tục với Google"** là có thể đăng nhập ngay lập tức.

---

## 3. Điền File Cấu Hình `.env`

### Cho Backend (`backend/.env`):
Tạo file `backend/.env` từ file mẫu [backend/.env.example](file:///d:/telegram-bot/backend/.env.example):
```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_KEY=eyJh... (Lấy trong Settings -> API -> service_role key)
BACKEND_PORT=8000
```

### Cho Frontend (`frontend/.env`):
Tạo file `frontend/.env` từ file mẫu [frontend/.env.example](file:///d:/telegram-bot/frontend/.env.example):
```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...
VITE_BACKEND_URL=http://localhost:8000
```

---

## 4. Khởi Động Ứng Dụng

Chỉ cần nhấp đúp chuột vào file:
👉 **[start.bat](file:///d:/telegram-bot/start.bat)**

Hệ thống sẽ tự động mở 2 cửa sổ:
* **Frontend Web UI**: `http://localhost:5173`
* **Backend API Docs**: `http://localhost:8000/docs`
