-- ==============================================================================
-- MIGRATION: KHUNG GIỜ HẸN GIỜ THÔNG MINH CHO CHIẾN DỊCH (SMART SCHEDULER)
-- Chạy đoạn SQL này trong Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

ALTER TABLE public.campaign_settings
ADD COLUMN IF NOT EXISTS schedule_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS time_slots JSONB DEFAULT '[{"start": "08:00", "end": "11:30"}, {"start": "13:30", "end": "18:00"}]'::jsonb,
ADD COLUMN IF NOT EXISTS active_days JSONB DEFAULT '[1, 2, 3, 4, 5, 6, 7]'::jsonb,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Ho_Chi_Minh';
