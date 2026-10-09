import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Fallback nếu người dùng chưa điền .env để app không bị crash màn hình trắng
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithOAuth: async () => ({ error: { message: "Vui lòng cấu hình VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong file .env của frontend!" } }),
        signInWithPassword: async () => ({ error: { message: "Vui lòng cấu hình VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong file .env của frontend!" } }),
        signUp: async () => ({ error: { message: "Vui lòng cấu hình VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong file .env của frontend!" } }),
        signOut: async () => {}
      },
      from: () => ({
        select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      }),
      channel: () => ({
        on: () => ({ subscribe: () => {} })
      })
    };

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
