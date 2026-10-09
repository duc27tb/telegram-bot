-- ==============================================================================
-- SCHEMA BỔ SUNG: VÍ ĐIỆN TỬ & LỊCH SỬ NẠP TIỀN TỰ ĐỘNG QUA PAYOS
-- ==============================================================================

-- 1. Bổ sung cột số dư vào bảng profiles nếu chưa có
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS balance BIGINT DEFAULT 0;

-- 2. Tạo bảng lưu lịch sử giao dịch nạp tiền (deposit_transactions)
CREATE TABLE IF NOT EXISTS public.deposit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_code BIGINT UNIQUE NOT NULL,      -- Mã đơn hàng duy nhất của PayOS (số nguyên)
    amount BIGINT NOT NULL,                 -- Số tiền nạp (VND)
    description TEXT NOT NULL,              -- Nội dung chuyển khoản
    status TEXT DEFAULT 'PENDING',          -- 'PENDING', 'PAID', 'CANCELLED', 'EXPIRED'
    payment_link_id TEXT,                   -- ID link thanh toán của PayOS
    checkout_url TEXT,                      -- Link mở trang thanh toán PayOS
    qr_code TEXT,                           -- Chuỗi mã hóa VietQR
    bank_bin TEXT,                          -- Mã BIN ngân hàng (VD: 970422 cho MBBank)
    bank_account_number TEXT,               -- Số tài khoản nhận tiền
    bank_account_name TEXT,                 -- Tên chủ tài khoản nhận tiền
    payos_transaction_id TEXT,              -- Mã tham chiếu giao dịch trả về từ PayOS
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index tăng tốc độ truy vấn
CREATE INDEX IF NOT EXISTS idx_deposit_user_id ON public.deposit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_order_code ON public.deposit_transactions(order_code);
CREATE INDEX IF NOT EXISTS idx_deposit_status ON public.deposit_transactions(status);

-- 3. Thiết lập Row Level Security (RLS)
ALTER TABLE public.deposit_transactions ENABLE ROW LEVEL SECURITY;

-- Cho phép người dùng xem lịch sử nạp tiền của chính mình
CREATE POLICY "Users can view own deposit transactions" 
ON public.deposit_transactions
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

-- Cho phép người dùng tạo đơn nạp tiền của chính mình
CREATE POLICY "Users can insert own deposit transactions" 
ON public.deposit_transactions
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- 4. Tạo hàm cộng số dư tài khoản an toàn (chống xung đột dữ liệu race condition)
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

-- 5. Kích hoạt Realtime cho bảng deposit_transactions và profiles (nếu chưa có)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.deposit_transactions;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;
