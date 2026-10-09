-- ==============================================================================
-- SQL MIGRATION: KHỞI TẠO BẢNG KHO NHÓM CHUNG (MASTER GROUPS) CHO TELEPULSE
-- Chạy đoạn code này trong Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.master_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    group_title TEXT NOT NULL,
    invite_link TEXT,
    chat_id BIGINT,
    username TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index tối ưu truy vấn
CREATE INDEX IF NOT EXISTS idx_master_groups_user_id ON public.master_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_master_groups_is_active ON public.master_groups(is_active);

-- Bật bảo mật Row Level Security
ALTER TABLE public.master_groups ENABLE ROW LEVEL SECURITY;

-- Policy cho phép người dùng tự quản lý danh sách nhóm chung của mình
DROP POLICY IF EXISTS "Users can manage own master groups" ON public.master_groups;
CREATE POLICY "Users can manage own master groups" 
ON public.master_groups
FOR ALL TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
