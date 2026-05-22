import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, User, Lock, ArrowRight, AlertCircle } from '../components/icons';
import { motion } from 'motion/react';

const ROLE_STORAGE_KEY = 'userRole';

const ROLE_CONFIG = {
  員工: { key: 'employee', path: '/dashboard' },
  主管: { key: 'manager', path: '/managerDashboard' },
  人資: { key: 'hr', path: '/managerDashboard' },
};

export default function Login() {
  const navigate = useNavigate();
  const [error] = useState(true);

  const handleLogin = (roleLabel) => {
    const roleConfig = ROLE_CONFIG[roleLabel];
    if (!roleConfig) {
      return;
    }

    localStorage.setItem(ROLE_STORAGE_KEY, roleConfig.key);
    navigate(roleConfig.path);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-primary/3 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

      {/* Logo Section */}
      <div className="mb-8 sm:mb-10 text-center relative z-10">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-xl mb-4 shadow-sm text-white"
        >
          <Shield size={28} />
        </motion.div>
        <h1 className="text-2xl sm:text-3xl font-bold text-on-surface mb-1">China Foods</h1>
        <p className="text-sm font-medium text-secondary">請假/加班管理系統</p>
      </div>

      {/* Login Card */}
      <motion.main 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-[520px] bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg overflow-hidden relative z-10"
      >
        <div className="p-6 sm:p-10">
          <header className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-on-surface mb-2">帳號登入</h2>
            <p className="text-sm text-on-surface-variant">請輸入您的企業憑據以訪問後台</p>
          </header>

          {error && (
            <div className="bg-error-container border border-error/20 p-4 rounded-lg flex gap-3 mb-8">
              <AlertCircle className="text-error shrink-0" size={20} />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-error">登入失敗</span>
                <p className="text-xs text-on-error-container">使用者名稱或密碼不正確，請重新輸入。</p>
              </div>
            </div>
          )}

          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-on-surface-variant block" htmlFor="username">使用者名稱</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                <input 
                  id="username"
                  type="text"
                  placeholder="請輸入您的帳號"
                  className="w-full h-11 pl-10 pr-4 bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-on-surface-variant block" htmlFor="password">密碼</label>
                <a href="#" className="text-xs font-semibold text-primary hover:underline">忘記密碼？</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                <input 
                  id="password"
                  type="password"
                  placeholder="請輸入您的密碼"
                  className="w-full h-11 pl-10 pr-4 bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input 
                id="remember"
                type="checkbox"
                className="w-4 h-4 text-primary border-outline rounded focus:ring-primary"
              />
              <label htmlFor="remember" className="text-xs font-medium text-on-surface-variant">記住登入狀態</label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              {['員工', '主管', '人資'].map((role) => (
                <button 
                  key={role}
                  type="button"
                  onClick={() => handleLogin(role)}
                  className="flex items-center justify-center gap-1.5 bg-primary text-white font-semibold h-11 px-4 rounded-lg hover:bg-primary-container transition-colors shadow-sm text-sm"
                >
                  {role}登入 <ArrowRight size={14} />
                </button>
              ))}
            </div>
          </form>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant"></div>
            </div>
            <div className="relative flex justify-center text-[13px]">
              <span className="px-4 bg-surface-container-lowest text-on-surface-variant font-medium">正在嘗試加入您的團隊？</span>
            </div>
          </div>

          <button 
            type="button"
            className="w-full h-11 border border-outline text-on-surface font-semibold rounded-lg hover:bg-surface-container-low transition-colors text-sm"
          >
            申請系統帳號
          </button>
        </div>
      </motion.main>
    </div>
  );
}
