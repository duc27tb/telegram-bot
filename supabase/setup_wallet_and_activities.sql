-- ==============================================================================
-- SQL MIGRATION: KHỞI TẠO BẢNG VÍ TIỀN & LỊCH SỬ HOẠT ĐỘNG TRÊN SUPABASE
-- Chạy toàn bộ đoạn code này trong Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. Bổ sung cột số dư vào bảng profiles (nếu chưa có)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS balance BIGINT DEFAULT 0;

-- 2. Tạo bảng lưu lịch sử giao dịch nạp tiền VietQR (deposit_transactions)
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
    bank_bin TEXT,                          -- Mã BIN ngân hàng (MBBank: 970422)
    bank_account_number TEXT,               -- Số tài khoản nhận tiền
    bank_account_name TEXT,                 -- Tên chủ tài khoản nhận tiền
    payos_transaction_id TEXT,              -- Mã tham chiếu giao dịch PayOS
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index cho bảng deposit_transactions
CREATE INDEX IF NOT EXISTS idx_deposit_user_id ON public.deposit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_order_code ON public.deposit_transactions(order_code);
CREATE INDEX IF NOT EXISTS idx_deposit_status ON public.deposit_transactions(status);

-- 3. Tạo bảng lưu nhật ký hành động người dùng (user_activities)
CREATE TABLE IF NOT EXISTS public.user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,          -- 'DEPOSIT', 'AUTH', 'TELEGRAM', 'CAMPAIGN', 'SYSTEM'
    action_title TEXT NOT NULL,         -- Tiêu đề ngắn gọn hành động
    description TEXT,                   -- Chi tiết mô tả
    metadata JSONB DEFAULT '{}'::jsonb, -- Dữ liệu đính kèm (JSON)
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index cho bảng user_activities
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON public.user_activities(created_at DESC);

-- 4. Phân quyền bảo mật Row Level Security (RLS)
ALTER TABLE public.deposit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- Policy xem giao dịch nạp tiền
CREATE POLICY "Users can view own deposit transactions" 
ON public.deposit_transactions
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deposit transactions" 
ON public.deposit_transactions
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Policy xem lịch sử hoạt động
CREATE POLICY "Users can view own activities" 
ON public.user_activities
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities" 
ON public.user_activities
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- 5. Hàm cộng số dư tài khoản an toàn (chống xung đột dữ liệu)
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

-- 6. Kích hoạt Supabase Realtime (Tự động đẩy biến động lên Web)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.deposit_transactions;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activities;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;
