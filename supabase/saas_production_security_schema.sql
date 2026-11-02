-- ==============================================================================
-- TELEPULSE SAAS - MIGRATION BẢO MẬT DÒNG TIỀN & CHUẨN HÓA CLOUD STATELESS
-- Chạy đoạn SQL này trong Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. Bổ sung các trường quản trị và gói cước vào bảng profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS balance BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'FREE',
ADD COLUMN IF NOT EXISTS tier_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer';

-- Đảm bảo chỉ số tìm kiếm nhanh cho phân quyền và kiểm tra hạn mức
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON public.profiles(subscription_tier);

-- 2. Tạo bảng lưu trữ bảng giá gói cước tập trung (subscription_plans)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price BIGINT NOT NULL DEFAULT 0,
    duration_days INTEGER NOT NULL DEFAULT 30,
    max_accounts INTEGER NOT NULL DEFAULT 1,
    daily_broadcast_limit INTEGER NOT NULL DEFAULT 50,
    features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Nạp 2 gói cước chuẩn vào hệ thống
INSERT INTO public.subscription_plans (id, name, price, duration_days, max_accounts, daily_broadcast_limit, features)
VALUES 
    (
        'plan_free', 
        'Gói Miễn Phí (Free)', 
        0, 
        3650, 
        1, 
        50, 
        '["1 Tài khoản Telegram", "Quét nhóm cơ bản", "50 tin/ngày", "Hỗ trợ cộng đồng"]'::jsonb
    ),
    (
        'plan_vip_pro', 
        'VIP Pro (Doanh Nghiệp / Marketer)', 
        199000, 
        30, 
        10, 
        999999, 
        '["10 Tài khoản Telegram", "Live Chat 2 chiều thời gian thực", "Spintax đệ quy không giới hạn", "Tự động chống khóa FloodWait \u0026 Circuit Breaker", "Chuyển tiếp tin nhắn về Telegram Admin"]'::jsonb
    )
ON CONFLICT (id) DO UPDATE 
SET 
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    duration_days = EXCLUDED.duration_days,
    max_accounts = EXCLUDED.max_accounts,
    daily_broadcast_limit = EXCLUDED.daily_broadcast_limit,
    features = EXCLUDED.features,
    updated_at = TIMEZONE('utc'::text, NOW());

-- 3. Tạo bảng lưu lịch sử giao dịch nạp tiền VietQR (deposit_transactions) nếu chưa có
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

CREATE INDEX IF NOT EXISTS idx_deposit_user_id ON public.deposit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_order_code ON public.deposit_transactions(order_code);
CREATE INDEX IF NOT EXISTS idx_deposit_status ON public.deposit_transactions(status);

-- 4. Bổ sung hàm RPC cộng số dư an toàn (Atomic Increment)
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

-- 5. Bổ sung hàm RPC trừ tiền an toàn khi nâng cấp gói (Atomic Deduct với Row-Lock chống Race Condition)
CREATE OR REPLACE FUNCTION public.deduct_user_balance(p_user_id UUID, p_amount BIGINT)
RETURNS BIGINT AS $$
DECLARE
    curr_balance BIGINT;
    new_balance BIGINT;
BEGIN
    -- Khóa hàng profile này trong suốt transaction
    SELECT balance INTO curr_balance 
    FROM public.profiles 
    WHERE id = p_user_id 
    FOR UPDATE;

    IF curr_balance IS NULL OR curr_balance < p_amount THEN
        RAISE EXCEPTION 'Số dư không đủ để thực hiện giao dịch (Số dư hiện tại: %, Cần: %)', COALESCE(curr_balance, 0), p_amount;
    END IF;

    new_balance := curr_balance - p_amount;

    UPDATE public.profiles
    SET balance = new_balance,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = p_user_id;

    RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Phân quyền bảo mật Row Level Security (RLS)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_transactions ENABLE ROW LEVEL SECURITY;

-- Ai cũng có thể xem bảng giá dịch vụ
DROP POLICY IF EXISTS "Public can view subscription plans" ON public.subscription_plans;
CREATE POLICY "Public can view subscription plans"
ON public.subscription_plans
FOR SELECT
TO public
USING (true);

-- Người dùng chỉ xem được lịch sử giao dịch của chính mình
DROP POLICY IF EXISTS "Users can view own deposit transactions" ON public.deposit_transactions;
CREATE POLICY "Users can view own deposit transactions" 
ON public.deposit_transactions
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

-- Người dùng chỉ được tạo đơn nạp mang user_id của chính mình
DROP POLICY IF EXISTS "Users can insert own deposit transactions" ON public.deposit_transactions;
CREATE POLICY "Users can insert own deposit transactions" 
ON public.deposit_transactions
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- 7. Kích hoạt Supabase Realtime cho các bảng quan trọng
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.deposit_transactions;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_plans;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;
