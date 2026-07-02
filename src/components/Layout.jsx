import { useEffect, useState } from 'react';
import { useNavigate, NavLink, Link } from 'react-router-dom';
import { 
  History, 
  User, 
  Settings, 
  LayoutDashboard, 
  Briefcase,
  CalendarDays,
  Bell,
  Menu,
  ArrowLeft,
  LogOut
} from './icons';
import { Building2, Users, X } from "lucide-react";
import { motion } from 'motion/react';
import { getAccountDetail } from '../lib/cfctApi';

const ROLE_STORAGE_KEY = 'userRole';
const ACCOUNT_NAME_STORAGE_KEY = 'loginAccountName';
const DISPLAY_NAME_STORAGE_KEY = 'loginDisplayName';
const ACCOUNT_SEQNO_STORAGE_KEY = 'loginAccountSeqNo';
const LINE_USER_ID_STORAGE_KEY = 'loginLineUserId';

const NAV_ITEMS = {
  employee: [
    { to: '/dashboard', label: '表單申請', icon: Menu },
    { to: '/records', label: '我的申請紀錄', icon: History },
  ],
  manager: [
    { to: '/managerDashboard', label: '首頁', icon: LayoutDashboard },
    { to: '/dashboard', label: '表單申請', icon: Menu },
    { to: '/records', label: '我的申請紀錄', icon: History },
    { to: '/approvals', label: '審核詳情', icon: User },
  ],
  hr: [
    { to: '/managerDashboard', label: '首頁', icon: LayoutDashboard },
    { to: '/approvals', label: '審核詳情', icon: User },
    // { to: '/accountManagement', label: '帳號管理', icon: Users },
    // { to: '/lineUserManagement', label: 'LINE 使用者', icon: Building2 },
    { to: '/departmentManagement', label: '部門管理', icon: Building2 },
    { to: '/employeeList', label: '員工管理', icon: Users },
  ],
};

export default function Layout({ children, title = "", showBack = false }) {
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [role, setRole] = useState('employee');
  const [displayName, setDisplayName] = useState('未登入');

  useEffect(() => {
    setRole(localStorage.getItem(ROLE_STORAGE_KEY) || sessionStorage.getItem(ROLE_STORAGE_KEY) || 'employee');

    const storedSeqNo =
      localStorage.getItem(ACCOUNT_SEQNO_STORAGE_KEY)
      || sessionStorage.getItem(ACCOUNT_SEQNO_STORAGE_KEY);

    if (!storedSeqNo) {
      return;
    }

    void (async () => {
      try {
        const response = await getAccountDetail(storedSeqNo);
        if (!response.success || !response.data) {
          return;
        }

        const latestDisplayName = response.data.displayName || '未登入';
        setDisplayName(latestDisplayName);

        if (localStorage.getItem(ACCOUNT_SEQNO_STORAGE_KEY) === storedSeqNo) {
          localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, latestDisplayName);
        }

        if (sessionStorage.getItem(ACCOUNT_SEQNO_STORAGE_KEY) === storedSeqNo) {
          sessionStorage.setItem(DISPLAY_NAME_STORAGE_KEY, latestDisplayName);
        }
      } catch {
        setDisplayName('未登入');
      }
    })();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 575) {
        setIsMobileSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileSidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileSidebarOpen]);

  const handleMobileNavClick = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    [
      ROLE_STORAGE_KEY,
      ACCOUNT_NAME_STORAGE_KEY,
      DISPLAY_NAME_STORAGE_KEY,
      ACCOUNT_SEQNO_STORAGE_KEY,
      LINE_USER_ID_STORAGE_KEY,
    ].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    setDisplayName('未登入');
    setRole('employee');
    setIsMobileSidebarOpen(false);
    navigate('/', { replace: true });
  };

  const navItems = NAV_ITEMS[role] || NAV_ITEMS.employee;

  return (
    <div className="app-shell flex min-h-screen bg-surface">
      <div
        className={`app-sidebar-backdrop ${isMobileSidebarOpen ? 'is-open' : ''}`}
        onClick={() => setIsMobileSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`app-sidebar fixed left-0 top-0 h-full w-[240px] border-r-2 border-outline-variant bg-surface-container-low flex flex-col z-50 ${isMobileSidebarOpen ? 'is-open' : ''}`}>
        <div className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div  className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
                <Briefcase size={24} />
              </div>
              <div>
                <div className="text-lg font-bold text-primary leading-tight">中原食品</div>
                <div className="text-[10px] tracking-widest text-on-surface-variant font-bold">CHINAFOODS</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="app-sidebar-close p-2 hover:bg-surface-container-high rounded-full text-primary transition-colors cursor-pointer"
              aria-label="關閉選單"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <nav className="app-nav flex-1 mt-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={handleMobileNavClick}
                    className={({ isActive }) => `flex items-center gap-3 px-4 py-3 transition-all duration-200 cursor-pointer ${isActive ? 'bg-primary-container/20 text-primary font-bold border-l-4 border-primary' : 'text-secondary hover:bg-surface-container-high'}`}
                  >
                    <Icon size={20} />
                    <span className="text-sm">{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

      </aside>

      {/* Main Content Area */}
      <div className="app-main flex-1 ml-[240px] flex flex-col">
        {/* Header */}
        <header className="app-header h-[64px] sticky top-0 bg-surface border-b border-outline-variant flex items-center justify-between px-8 z-40">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="app-menu-toggle p-2 hover:bg-surface-container-high rounded-full text-primary transition-colors cursor-pointer"
              aria-label="開啟選單"
            >
              <Menu size={20} />
            </button>
            {showBack ? (
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-surface-container-high rounded-full text-primary transition-colors cursor-pointer"
              >
                <ArrowLeft size={20} />
              </button>
            ) : (
              <div className="app-header-spacer w-10 h-10"></div>
            )}
            <h1 className="app-header-title text-xl font-semibold text-primary">{title}</h1>
          </div>

          <div className="app-header-user flex items-center gap-3">

            {/*<button className="relative p-2 text-secondary hover:bg-surface-container-high rounded-full transition-colors">*/}
            {/*  <Bell size={20} />*/}
            {/*  <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>*/}
            {/*</button>*/}
            <p className="text-m">{displayName}</p>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-secondary transition-colors hover:bg-surface-container-high"
              aria-label="登出"
            >
              <LogOut size={16} />
              <span>登出</span>
            </button>

          </div>
        </header>

        {/* Content */}
        <main className="app-content flex-1 p-8 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
