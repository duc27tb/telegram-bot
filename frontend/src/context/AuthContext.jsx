import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getWalletInfo, checkUserRole } from '../lib/api';

const ADMIN_EMAILS = [
  'admin@telepulse.io',
  'admin'
];

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState('guest'); // 'admin' | 'customer' | 'guest'
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const getCachedProfile = (userId) => {
    try {
      const cached = localStorage.getItem(`telepulse_profile_${userId}`);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return null;
  };

  const setCachedProfile = (userId, prof) => {
    try {
      localStorage.setItem(`telepulse_profile_${userId}`, JSON.stringify(prof));
    } catch (e) {}
  };

  // Lấy profile từ Supabase kết hợp đồng bộ số dư và phân quyền RBAC
  const fetchProfile = async (userId, userEmail = '') => {
    if (!isSupabaseConfigured) return;
    const cached = getCachedProfile(userId);
    if (cached) {
      setProfile(prev => prev || cached);
      if (cached.role === 'admin') {
        setRole('admin');
        setIsAdmin(true);
      }
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      let userBalance = data?.balance ?? (cached?.balance ?? 0);
      let subscriptionTier = data?.subscription_tier || (cached?.subscription_tier || 'FREE');
      let tierExpiresAt = data?.tier_expires_at || (cached?.tier_expires_at || null);

      try {
        const walletRes = await getWalletInfo(userId);
        if (walletRes && walletRes.success && walletRes.data) {
          userBalance = walletRes.data.balance;
          if (walletRes.data.subscription) {
            subscriptionTier = walletRes.data.subscription.tier || 'FREE';
            tierExpiresAt = walletRes.data.subscription.expires_at || null;
          }
        }
      } catch (wErr) {
        console.warn('Không thể đồng bộ số dư từ API ví:', wErr);
      }

      // Xác định quyền: email nằm trong whitelist Admin hoặc role trong DB là admin
      const email = (userEmail || data?.email || cached?.email || '').toLowerCase();
      const isEmailAdmin = ADMIN_EMAILS.includes(email);
      let userRole = isEmailAdmin || data?.role === 'admin' ? 'admin' : 'customer';

      // Kiểm tra chéo với backend role registry
      try {
        const roleRes = await checkUserRole(userId);
        if (roleRes && roleRes.role) {
          userRole = roleRes.role;
        }
      } catch (rErr) {}

      setRole(userRole);
      setIsAdmin(userRole === 'admin');

      const finalProfile = {
        ...(cached || {}),
        ...(data || {}),
        id: userId,
        email,
        balance: userBalance,
        subscription_tier: subscriptionTier,
        tier_expires_at: tierExpiresAt,
        role: userRole
      };
      setProfile(finalProfile);
      setCachedProfile(userId, finalProfile);
      return finalProfile;
    } catch (err) {
      console.error('Lỗi lấy profile:', err);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // 1. Kiểm tra session hiện tại
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const isEmailAdmin = (currentUser.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase()));
        if (isEmailAdmin) {
          setRole('admin');
          setIsAdmin(true);
        }
        fetchProfile(currentUser.id, currentUser.email);
      } else {
        setRole('guest');
        setIsAdmin(false);
      }
      setLoading(false);
    });

    // 2. Lắng nghe thay đổi auth (Đăng nhập, Đăng xuất, Refresh Token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          const isEmailAdmin = (currentUser.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase()));
          if (isEmailAdmin) {
            setRole('admin');
            setIsAdmin(true);
          }
          await fetchProfile(currentUser.id, currentUser.email);
        } else {
          setProfile(null);
          setRole('guest');
          setIsAdmin(false);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Đăng nhập bằng Google OAuth
  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      alert("Vui lòng cấu hình biến môi trường Supabase trước!");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  };

  // Đăng nhập bằng Email & Password
  const signInWithEmail = async (email, password) => {
    if (!isSupabaseConfigured) {
      alert("Vui lòng cấu hình biến môi trường Supabase trước!");
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  };

  // Đăng ký bằng Email & Password
  const signUpWithEmail = async (email, password) => {
    if (!isSupabaseConfigured) {
      alert("Vui lòng cấu hình biến môi trường Supabase trước!");
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });
    if (error) throw error;
    return data;
  };

  // Đăng xuất
  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setRole('guest');
    setIsAdmin(false);
  };

  // Quên mật khẩu - gửi email liên kết đặt lại mật khẩu
  const resetPassword = async (email) => {
    if (!isSupabaseConfigured) {
      throw new Error("Vui lòng cấu hình biến môi trường Supabase trước!");
    }
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    if (error) throw error;
    return data;
  };

  // Cập nhật mật khẩu mới (dành cho luồng reset mật khẩu hoặc đổi mật khẩu)
  const updatePassword = async (newPassword) => {
    if (!isSupabaseConfigured) {
      throw new Error("Vui lòng cấu hình biến môi trường Supabase trước!");
    }
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
    return data;
  };

  const updateProfileLocally = (partial) => {
    setProfile(prev => (prev ? { ...prev, ...partial } : partial));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isAdmin,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        updatePassword,
        signOut,
        refreshProfile: async () => {
          if (user) return await fetchProfile(user.id, user.email);
          return null;
        },
        updateProfileLocally,
        isConfigured: isSupabaseConfigured
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
