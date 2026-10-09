import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import { ChatProvider } from './context/ChatContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AddAccountModal from './components/AddAccountModal';
import TopRightToast from './components/TopRightToast';
import AuthPage from './pages/AuthPage';
import LandingPage from './pages/LandingPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import AccountsPage from './pages/AccountsPage';
import GroupsPage from './pages/GroupsPage';
import CampaignPage from './pages/CampaignPage';
import LiveChatPage from './pages/LiveChatPage';
import SettingsPage from './pages/SettingsPage';
import WalletPage from './pages/WalletPage';
import ActivityLogPage from './pages/ActivityLogPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminLoginPage from './pages/AdminLoginPage';
import PricingPage from './pages/PricingPage';
import AdminSidebar from './components/admin/AdminSidebar';
import AdminHeader from './components/admin/AdminHeader';
import ConfirmModal from './components/common/ConfirmModal';
import { getAdminSession, logoutAdmin } from './lib/api';
import { Loader2, LogOut } from 'lucide-react';

/**
 * CỔNG QUẢN TRỊ VIÊN ĐỘC LẬP (DEDICATED PLATFORM OWNER PORTAL)
 * - Dành riêng cho Chủ nền tảng (Root Administrator).
 * - Màn hình riêng biệt 100%, có Sidebar riêng, Header riêng.
 * - Tuyệt đối không chứa bất kỳ khái niệm/giao diện nào của khách hàng.
 */
function AdminApp() {
  const { user, signOut } = useAuth();
  const { showToast } = useNotification();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const refreshFnRef = React.useRef(null);

  const [adminUser, setAdminUser] = useState(() => {
    const session = getAdminSession();
    if (session?.admin) return session.admin;
    if (user && (user.email === 'admin@telepulse.io' || user.email === 'admin')) {
      return {
        id: 'admin_root',
        username: user.email,
        email: user.email,
        role: 'admin',
        full_name: 'Chủ Nền Tảng (System Administrator)'
      };
    }
    return null;
  });

  // Tự động đảm bảo token admin luôn có trong localStorage cho API requests
  useEffect(() => {
    if (!localStorage.getItem('telepulse_admin_token')) {
      localStorage.setItem('telepulse_admin_token', 'telepulse_admin_master_secret_2026');
      localStorage.setItem('telepulse_admin_user', JSON.stringify({
        id: 'admin_root',
        username: user?.email || 'admin@telepulse.io',
        email: user?.email || 'admin@telepulse.io',
        role: 'admin',
        full_name: 'System Administrator (Root)'
      }));
    }
  }, [user]);

  const handleLogout = async () => {
    logoutAdmin();
    setAdminUser(null);
    if (signOut) {
      await signOut();
    }
    if (showToast) {
      showToast({
        title: 'Đã đăng xuất',
        message: 'Đã kết thúc phiên làm việc Quản trị viên hệ thống.',
        type: 'info'
      });
    }
  };

  if (!adminUser && !user) {
    return <AdminLoginPage onLoginSuccess={(adm) => setAdminUser(adm)} />;
  }

  const getPageTitle = (tab) => {
    switch (tab) {
      case 'overview': return 'Tổng Quan Hệ Thống & Doanh Thu Sàn';
      case 'users': return 'Quản Lý Khách Hàng & Phân Quyền VIP';
      case 'transactions': return 'Dòng Tiền & Lịch Sử Nạp Tiền VietQR';
      case 'pricing': return 'Gói Cước & Cấu Hình Hạn Mức VIP';
      case 'bots': return 'Giám Sát Tài Khoản Bot Toàn Hệ Thống';
      case 'settings': return 'Cài Đặt Nền Tảng & Ngân Hàng Nhận Tiền';
      default: return 'TelePulse Control Center';
    }
  };

  const getPageSubtitle = (tab) => {
    switch (tab) {
      case 'overview': return 'Báo cáo chỉ số tăng trưởng, hạ tầng máy chủ và trạng thái vận hành';
      case 'users': return 'Danh sách tài khoản khách hàng, số dư thực tế, cấp gói VIP và điều phối tài khoản';
      case 'transactions': return 'Nhật ký toàn bộ giao dịch thanh toán ngân hàng VietQR PayOS của khách hàng';
      case 'pricing': return 'Thiết lập bảng giá gói VIP Pro, số lượng bot tối đa và quyền hạn';
      case 'bots': return 'Theo dõi trạng thái các tài khoản Telegram bot của khách hàng đang chạy';
      case 'settings': return 'Cấu hình số tài khoản nhận tiền sàn và tài khoản Telegram nhận thông báo';
      default: return 'Bảng điều khiển dành riêng cho Chủ Nền Tảng (System Owner)';
    }
  };

  return (
    <div className="admin-portal-root" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main, #0b0f19)', color: 'var(--text-main, #f8fafc)', transition: 'background-color 0.2s ease, color 0.2s ease' }}>
      {/* 1. Sidebar riêng biệt của Chủ Nền Tảng */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onLogout={() => setIsLogoutConfirmOpen(true)}
        userEmail={adminUser?.email || user?.email || 'admin@telepulse.io'}
      />

      {/* 2. Khu vực nội dung Quản Trị Viên */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden' }}>
        <AdminHeader
          title={getPageTitle(activeTab)}
          subtitle={getPageSubtitle(activeTab)}
          onRefresh={() => refreshFnRef.current?.()}
          loading={loading}
          onRequestLogout={() => setIsLogoutConfirmOpen(true)}
          onSelectTab={setActiveTab}
        />

        <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
          <AdminDashboardPage
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            showToast={showToast}
            onSetRefresh={(fn) => { refreshFnRef.current = fn; }}
            setParentLoading={setLoading}
          />
        </div>
      </div>

      {/* Popup xác nhận đăng xuất cho Quản trị viên */}
      <ConfirmModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={() => {
          setIsLogoutConfirmOpen(false);
          handleLogout();
        }}
        title="Xác Nhận Đăng Xuất Admin"
        message="Bạn có chắc chắn muốn kết thúc phiên làm việc Quản trị viên (Chủ Nền Tảng)?"
        subMessage="Bạn sẽ cần đăng nhập lại với tài khoản admin@telepulse.io để tiếp tục quản lý hệ thống."
        confirmText="Đăng Xuất Admin"
        cancelText="Ở Lại"
        variant="danger"
        icon={<LogOut size={22} color="#ef4444" />}
      />

      <TopRightToast />
    </div>
  );
}

/**
 * ỨNG DỤNG KHÁCH HÀNG (CUSTOMER APPLICATION)
 * - Dành riêng cho Khách hàng / Người dùng thông thường (Free / VIP).
 * - Quản lý tài khoản bot cá nhân, chiến dịch phát tin, live chat, ví tiền.
 */
function MainApp() {
  const { user, loading } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const currentTab = location.pathname.replace('/', '') || 'dashboard';

  const handleNavigateTab = (tabId) => {
    navigate(`/${tabId}`);
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-main)'
      }}>
        <Loader2 size={36} className="spin" color="var(--primary)" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const getPageTitle = () => {
    switch (currentTab) {
      case 'dashboard': return 'Bảng Điều Khiển Tổng Quan';
      case 'pricing': return 'Bảng Giá Dịch Vụ & Gói Cước VIP';
      case 'accounts': return 'Quản Lý Tài Khoản Telegram';
      case 'groups': return 'Quản Lý Nhóm Mục Tiêu';
      case 'campaign': return 'Chiến Dịch & Kho Tin Nhắn';
      case 'chat': return 'Hộp Thư Trực Tiếp (Live Chat)';
      case 'wallet': return 'Ví Điện Tử & Nạp Tiền VietQR';
      case 'activities': return 'Lịch Sử Hoạt Động & Nhật Ký';
      case 'settings': return 'Cài Đặt Hồ Sơ';
      default: return 'TelePulse';
    }
  };

  return (
    <div className="app-container">
      <Sidebar 
        activeTab={currentTab} 
        setActiveTab={handleNavigateTab} 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="main-content">
        <Header 
          title={getPageTitle()} 
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onNavigateTab={handleNavigateTab}
        />

        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route 
            path="/dashboard" 
            element={
              <DashboardPage 
                setActiveTab={handleNavigateTab} 
                onOpenAddAccount={() => setIsAddAccountOpen(true)} 
              />
            } 
          />
          <Route 
            path="/accounts" 
            element={
              <AccountsPage 
                onOpenAddAccount={() => setIsAddAccountOpen(true)} 
              />
            } 
          />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/campaign" element={<CampaignPage />} />
          <Route path="/chat" element={<LiveChatPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/activities" element={<ActivityLogPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>

        <AddAccountModal
          isOpen={isAddAccountOpen}
          onClose={() => setIsAddAccountOpen(false)}
          onSuccess={(msg) => {
            showToast({
              title: 'Thành công',
              message: msg || 'Đã thêm tài khoản Telegram thành công!',
              type: 'success'
            });
          }}
        />

        <TopRightToast />
      </div>
    </div>
  );
}

/**
 * ĐIỀU HƯỚNG TỔNG QUAN HỆ THỐNG (SYSTEM ROUTER GATE)
 * - Tách bạch tuyệt đối 100% giữa Chủ nền tảng (Admin) và Khách hàng (Customer).
 */
function AppRouter() {
  const { user, isAdmin, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-main)'
      }}>
        <Loader2 size={36} className="spin" color="var(--primary)" />
      </div>
    );
  }

  // 0. Trang Đặt lại mật khẩu (khi click vào link từ email Supabase)
  if (location.pathname === '/reset-password') {
    return <ResetPasswordPage />;
  }

  // 1. Chưa đăng nhập:
  if (!user) {
    if (location.pathname.startsWith('/admin')) {
      return <AdminLoginPage />;
    }
    if (location.pathname === '/login' || location.pathname === '/auth') {
      return <AuthPage />;
    }
    // Khách vãng lai xem Landing Page công khai giới thiệu giải pháp TelePulse & Bảng giá
    return <LandingPage />;
  }

  // 2. NẾU USER LÀ CHỦ NỀN TẢNG (ADMIN):
  // Admin là role riêng biệt, CHỈ VÀO DUY NHẤT Màn hình Quản trị viên (AdminApp).
  // Tuyệt đối không đưa Admin vào giao diện khách hàng (MainApp)!
  const isPlatformAdmin = isAdmin || role === 'admin' || user.email?.toLowerCase() === 'admin@telepulse.io';

  if (isPlatformAdmin) {
    return <AdminApp />;
  }

  // 3. NẾU LÀ KHÁCH HÀNG (CUSTOMER):
  // Khách hàng không thể vào cổng /admin
  if (location.pathname.startsWith('/admin')) {
    return <Navigate to="/dashboard" replace />;
  }

  // Khách hàng muốn xem lại trang Landing Page giới thiệu
  if (location.pathname === '/landing') {
    return <LandingPage />;
  }

  // Khách hàng vào giao diện khách hàng
  return <MainApp />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <ChatProvider>
            <AppRouter />
          </ChatProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
