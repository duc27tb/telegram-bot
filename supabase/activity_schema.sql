-- ==============================================================================
-- SCHEMA BỔ SUNG: BẢNG LƯU LỊCH SỬ HOẠT ĐỘNG CỦA NGƯỜI DÙNG (USER ACTIVITIES)
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

-- Index tra cứu nhanh
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON public.user_activities(created_at DESC);

-- Bảo mật Row Level Security (RLS)
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities" 
ON public.user_activities
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities" 
ON public.user_activities
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Kích hoạt Supabase Realtime
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activities;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;
