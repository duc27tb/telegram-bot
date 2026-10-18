import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Layers, 
  SendHorizontal, 
  MessageSquare, 
  Wallet,
  Crown
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';

export default function MobileBottomNav({ onNavigateTab }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadChatCount } = useChat();
  const { profile } = useAuth();

  const currentTab = location.pathname.replace('/', '') || 'dashboard';

  const navItems = [
    { id: 'dashboard', label: 'Tổng Quan', icon: LayoutDashboard },
    { id: 'accounts', label: 'Tài Khoản', icon: Users },
    { id: 'groups', label: 'Nhóm', icon: Layers },
    { id: 'campaign', label: 'Rải Tin', icon: SendHorizontal },
    { id: 'chat', label: 'Live Chat', icon: MessageSquare, badge: unreadChatCount },
    { id: 'wallet', label: 'Ví Tiền', icon: Wallet },
  ];

  const handleSelect = (id) => {
    navigate(`/${id}`);
    if (onNavigateTab) {
      onNavigateTab(id);
    }
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <div className="mobile-bottom-nav-inner">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const hasBadge = item.badge && item.badge > 0;

          return (
            <button
              key={item.id}
              type="button"
              className={`mobile-nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => handleSelect(item.id)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="mobile-nav-icon-wrap">
                <Icon size={20} />
                {hasBadge && (
                  <span className="mobile-nav-badge">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="mobile-nav-label">{item.label}</span>
              {isActive && <span className="mobile-nav-active-pill" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
