-- ==============================================================================
-- SCHEMA KHỞI TẠO CSDL CHO HỆ THỐNG QUẢN TRỊ TELEGRAM BOT TRÊN SUPABASE
-- Hỗ trợ: Đa người dùng (Multi-tenant), Google OAuth, Row Level Security (RLS)
-- ==============================================================================

-- 1. BẬT EXTENSION UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TẠO CÁC BẢNG DỮ LIỆU
-- ==============================================================================

-- Bảng 2.1: Hồ sơ người dùng (Profiles) liên kết với auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    telegram_admin_username TEXT DEFAULT '', -- Username Telegram nhận báo cáo (VD: Lxpzalo)
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Bảng 2.2: Tài khoản Telegram của từng người dùng
CREATE TABLE IF NOT EXISTS public.telegram_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    session_string TEXT NOT NULL,           -- Chuỗi Session String của Pyrogram (Bảo mật, không cần lưu file SQLite)
    api_id TEXT NOT NULL,
    api_hash TEXT NOT NULL,
    account_name TEXT DEFAULT '',
    status TEXT DEFAULT 'offline',          -- 'online', 'offline', 'flood_wait', 'banned'
    flood_wait_until TIMESTAMPTZ,           -- Thời điểm hết hạn phạt FloodWait của Telegram
    last_active TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_phone UNIQUE (user_id, phone_number)
);

-- Bảng 2.3: Nhóm mục tiêu để gửi tin (Target Groups)
CREATE TABLE IF NOT EXISTS public.target_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.telegram_accounts(id) ON DELETE SET NULL, -- Nhóm thuộc nick nào (nếu chia nhóm riêng)
    chat_id BIGINT NOT NULL,                                                    -- ID nhóm Telegram (VD: -1001612473753)
    group_title TEXT DEFAULT 'Nhóm Telegram',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Bảng 2.4: Kho mẫu tin nhắn spam xoay vòng (Message Templates)
CREATE TABLE IF NOT EXISTS public.message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Bảng 2.5: Cấu hình chiến dịch của người dùng (Campaign Settings)
CREATE TABLE IF NOT EXISTS public.campaign_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    group_delay_seconds INTEGER DEFAULT 120,   -- Nghỉ giữa 2 nhóm (mặc định 2 phút)
    cycle_delay_seconds INTEGER DEFAULT 1200,  -- Nghỉ giữa 2 vòng lặp (mặc định 20 phút)
    is_running BOOLEAN DEFAULT FALSE,          -- Trạng thái tổng của chiến dịch
    forward_to_telegram BOOLEAN DEFAULT TRUE,  -- Có forward tin nhắn riêng về Telegram Admin không
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Bảng 2.6: Cuộc hội thoại của khách hàng nhắn tin riêng tới các bot
CREATE TABLE IF NOT EXISTS public.customer_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.telegram_accounts(id) ON DELETE CASCADE,
    sender_id BIGINT NOT NULL,                 -- Telegram ID của khách
    sender_name TEXT DEFAULT 'Ẩn danh',
    sender_username TEXT,
    last_message TEXT,
    unread_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_account_sender UNIQUE (account_id, sender_id)
);

-- Bảng 2.7: Chi tiết các tin nhắn trong cuộc hội thoại (Live Chat)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.customer_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'admin', 'bot')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Bảng 2.8: Lịch sử hoạt động và nhật ký lỗi của Bot (Bot Logs)
CREATE TABLE IF NOT EXISTS public.bot_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.telegram_accounts(id) ON DELETE CASCADE,
    log_type TEXT DEFAULT 'info',             -- 'info', 'sent', 'error', 'reply'
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- 3. THIẾT LẬP TRIGGER TỰ ĐỘNG KHỞI TẠO DỮ LIỆU KHI ĐĂNG KÝ USER MỚI
-- (Tự động kích hoạt khi người dùng đăng nhập bằng Google hoặc Email)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Tạo bản ghi Profile
    INSERT INTO public.profiles (id, email, full_name, avatar_url, telegram_admin_username)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
        'Lxpzalo' -- Giá trị mặc định ban đầu, user có thể đổi trên Web
    ) ON CONFLICT (id) DO NOTHING;

    -- 2. Tạo bản ghi Cấu hình Campaign mặc định
    INSERT INTO public.campaign_settings (user_id, group_delay_seconds, cycle_delay_seconds, is_running)
    VALUES (NEW.id, 120, 1200, FALSE)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gắn trigger vào bảng auth.users của Supabase
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 4. BẢO MẬT & PHÂN QUYỀN VỚI ROW LEVEL SECURITY (RLS)
-- Đảm bảo mỗi người chỉ thấy và sửa dữ liệu của chính mình
-- ==============================================================================

-- Bật RLS trên toàn bộ các bảng
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_logs ENABLE ROW LEVEL SECURITY;

-- 4.1 Policies cho Profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 4.2 Policies cho Telegram Accounts
CREATE POLICY "Users can manage own telegram accounts" ON public.telegram_accounts
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4.3 Policies cho Target Groups
CREATE POLICY "Users can manage own target groups" ON public.target_groups
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4.4 Policies cho Message Templates
CREATE POLICY "Users can manage own templates" ON public.message_templates
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4.5 Policies cho Campaign Settings
CREATE POLICY "Users can manage own campaign settings" ON public.campaign_settings
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4.6 Policies cho Customer Conversations
CREATE POLICY "Users can manage own customer conversations" ON public.customer_conversations
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4.7 Policies cho Chat Messages
CREATE POLICY "Users can manage own chat messages" ON public.chat_messages
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4.8 Policies cho Bot Logs
CREATE POLICY "Users can view and manage own bot logs" ON public.bot_logs
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 5. KÍCH HOẠT SUPABASE REALTIME (Tự động đẩy tin nhắn lên Web không cần F5)
-- ==============================================================================

DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_conversations;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.telegram_accounts;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bot_logs;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.deposit_transactions;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    EXCEPTION WHEN duplicate_object THEN
        -- Bỏ qua nếu bảng đã được thêm vào publication trước đó
        NULL;
    END;
END $$;

-- ==============================================================================
-- 6. HỆ THỐNG VÍ & LỊCH SỬ NẠP TIỀN PAYOS (VIETQR)
-- ==============================================================================

-- 6.1 Bổ sung cột số dư vào bảng profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS balance BIGINT DEFAULT 0;

-- 6.2 Bảng lưu lịch sử giao dịch nạp tiền
CREATE TABLE IF NOT EXISTS public.deposit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_code BIGINT UNIQUE NOT NULL,      -- Mã đơn hàng PayOS
    amount BIGINT NOT NULL,                 -- Số tiền nạp (VND)
    description TEXT NOT NULL,              -- Nội dung chuyển khoản
    status TEXT DEFAULT 'PENDING',          -- 'PENDING', 'PAID', 'CANCELLED', 'EXPIRED'
    payment_link_id TEXT,                   -- ID link thanh toán PayOS
    checkout_url TEXT,                      -- Link mở trang thanh toán PayOS
    qr_code TEXT,                           -- Chuỗi mã hóa VietQR
    bank_bin TEXT,                          -- Mã BIN ngân hàng (970422 cho MBBank)
    bank_account_number TEXT,               -- Số tài khoản nhận tiền
    bank_account_name TEXT,                 -- Tên chủ tài khoản nhận tiền
    payos_transaction_id TEXT,              -- Mã tham chiếu giao dịch PayOS
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index tra cứu
CREATE INDEX IF NOT EXISTS idx_deposit_user_id ON public.deposit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_order_code ON public.deposit_transactions(order_code);
CREATE INDEX IF NOT EXISTS idx_deposit_status ON public.deposit_transactions(status);

-- RLS
ALTER TABLE public.deposit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deposit transactions" 
ON public.deposit_transactions
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deposit transactions" 
ON public.deposit_transactions
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Hàm cộng số dư tài khoản atomic
CREATE OR REPLACE FUNCTION public.increment_user_balance(p_user_id UUID, p_amount BIGINT)
RETURNS BIGINT AS $$
DECLARE
    new_balance BIGINT;
BEGIN
    UPDATE public.profiles
    SET balance = COALESCE(balance, 0) + p_amount,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = p_user_id
    RETURNING balance INTO new_balance;
    RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 7. BẢNG GHI NHẬN HÀNH ĐỘNG NGƯỜI DÙNG (USER ACTIVITIES)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,          -- 'DEPOSIT', 'AUTH', 'TELEGRAM', 'CAMPAIGN', 'SYSTEM'
    action_title TEXT NOT NULL,         -- Tiêu đề ngắn gọn hành động
    description TEXT,                   -- Chi tiết mô tả
    metadata JSONB DEFAULT '{}'::jsonb, -- Dữ liệu đính kèm (số tiền, mã đơn, sđt,...)
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON public.user_activities(created_at DESC);

ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities" 
ON public.user_activities
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities" 
ON public.user_activities
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activities;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;

