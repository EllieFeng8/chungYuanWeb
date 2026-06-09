import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, User, Lock, ArrowRight, AlertCircle } from '../components/icons';
import { motion } from 'motion/react';
import { getAccounts, getHealth } from '../lib/cfctApi';

const ROLE_STORAGE_KEY = 'userRole';
const ACCOUNT_NAME_STORAGE_KEY = 'loginAccountName';
const DISPLAY_NAME_STORAGE_KEY = 'loginDisplayName';
const ACCOUNT_SEQNO_STORAGE_KEY = 'loginAccountSeqNo';

function normalizeAppRole(apiRole) {
  switch (apiRole) {
    case 'admin':
      return { key: 'hr', path: '/managerDashboard' };
    case 'manager':
      return { key: 'manager', path: '/managerDashboard' };
    case 'member':
      return { key: 'employee', path: '/dashboard' };
    default:
      return null;
  }
}

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [error, setError] = useState('');
  const [apiStatus, setApiStatus] = useState({ configured: false, reachable: false });

  const accountLookup = useMemo(() => {
    return new Map(accounts.map((account) => [account.accountName.toLowerCase(), account]));
  }, [accounts]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setIsBootstrapping(true);
      setError('');
      try {
        const [healthResponse, accountsResponse] = await Promise.all([
          getHealth(),
          getAccounts(true),
        ]);

        if (!active) {
          return;
        }

        setApiStatus({
          configured: Boolean(healthResponse?.data?.configured),
          reachable: true,
        });

        if (!accountsResponse.success) {
          throw new Error(accountsResponse.error || '無法讀取帳號清單');
        }

        setAccounts(accountsResponse.data || []);
      } catch (bootstrapError) {
        if (!active) {
          return;
        }
        setApiStatus({ configured: false, reachable: false });
        setError(bootstrapError instanceof Error ? bootstrapError.message : '無法連接 API');
      } finally {
        if (active) {
          setIsBootstrapping(false);
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');

    const accountName = username.trim().toLowerCase();
    if (!accountName) {
      setError('請輸入使用者名稱');
      return;
    }

    if (!password.trim()) {
      setError('目前尚未接上密碼驗證，請至少輸入一個值再分流測試。');
      return;
    }

    const matchedAccount = accountLookup.get(accountName);
    if (!matchedAccount) {
      setError('找不到對應帳號。');
      return;
    }

    if (matchedAccount.estate !== 'Active') {
      setError(`此帳號目前狀態為 ${matchedAccount.estate}，不可登入。`);
      return;
    }

    if (matchedAccount.role === 'block') {
      setError('此帳號已被封鎖。');
      return;
    }

    const roleConfig = normalizeAppRole(matchedAccount.role);
    if (!roleConfig) {
      setError(`不支援的角色：${matchedAccount.role}`);
      return;
    }

    setIsLoading(true);
    try {
      if (remember) {
        localStorage.setItem(ROLE_STORAGE_KEY, roleConfig.key);
        localStorage.setItem(ACCOUNT_NAME_STORAGE_KEY, matchedAccount.accountName);
        localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, matchedAccount.displayName || matchedAccount.accountName);
        localStorage.setItem(ACCOUNT_SEQNO_STORAGE_KEY, String(matchedAccount.seqNo));
        sessionStorage.removeItem(ROLE_STORAGE_KEY);
        sessionStorage.removeItem(ACCOUNT_NAME_STORAGE_KEY);
        sessionStorage.removeItem(DISPLAY_NAME_STORAGE_KEY);
        sessionStorage.removeItem(ACCOUNT_SEQNO_STORAGE_KEY);
      } else {
        localStorage.removeItem(ROLE_STORAGE_KEY);
        localStorage.removeItem(ACCOUNT_NAME_STORAGE_KEY);
        localStorage.removeItem(DISPLAY_NAME_STORAGE_KEY);
        localStorage.removeItem(ACCOUNT_SEQNO_STORAGE_KEY);
        sessionStorage.setItem(ROLE_STORAGE_KEY, roleConfig.key);
        sessionStorage.setItem(ACCOUNT_NAME_STORAGE_KEY, matchedAccount.accountName);
        sessionStorage.setItem(DISPLAY_NAME_STORAGE_KEY, matchedAccount.displayName || matchedAccount.accountName);
        sessionStorage.setItem(ACCOUNT_SEQNO_STORAGE_KEY, String(matchedAccount.seqNo));
      }
      navigate(roleConfig.path);
    } finally {
      setIsLoading(false);
    }
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
            {/*<p className="text-sm text-on-surface-variant">目前以前置帳號 API 做權限分流，尚未接上正式密碼驗證。</p>*/}
          </header>

          {/*<div className={`mb-6 rounded-lg border p-4 flex gap-3 ${apiStatus.reachable && apiStatus.configured ? 'bg-primary/5 border-primary/20' : 'bg-error-container border-error/20'}`}>*/}
          {/*  <AlertCircle className={`${apiStatus.reachable && apiStatus.configured ? 'text-primary' : 'text-error'} shrink-0`} size={20} />*/}
          {/*  <div className="flex flex-col">*/}
          {/*    <span className={`text-sm font-bold ${apiStatus.reachable && apiStatus.configured ? 'text-primary' : 'text-error'}`}>*/}
          {/*      {apiStatus.reachable && apiStatus.configured ? 'API 連線正常' : 'API 尚未就緒'}*/}
          {/*    </span>*/}
          {/*    <p className={`text-xs ${apiStatus.reachable && apiStatus.configured ? 'text-on-surface-variant' : 'text-on-error-container'}`}>*/}
          {/*      {apiStatus.reachable && apiStatus.configured*/}
          {/*        ? `已載入 ${accounts.length} 筆帳號資料，可依角色分流。`*/}
          {/*        : '請先啟動 BFF，並設定 CFCT_API_KEY。'}*/}
          {/*    </p>*/}
          {/*  </div>*/}
          {/*</div>*/}

          {error ? (
            <div className="bg-error-container border border-error/20 p-4 rounded-lg flex gap-3 mb-8">
              <AlertCircle className="text-error shrink-0" size={20} />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-error">登入失敗</span>
                <p className="text-xs text-on-error-container">{error}</p>
              </div>
            </div>
          ) : null}

          <form onSubmit={(event) => void handleLogin(event)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-on-surface-variant block" htmlFor="username">使用者名稱</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                <input 
                  id="username"
                  type="text"
                  placeholder="請輸入您的帳號"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full h-11 pl-10 pr-4 bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-on-surface-variant block" htmlFor="password">密碼</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                <input 
                  id="password"
                  type="password"
                  placeholder="密碼"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full h-11 pl-10 pr-4 bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input 
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="w-4 h-4 text-primary border-outline rounded focus:ring-primary"
              />
              <label htmlFor="remember" className="text-xs font-medium text-on-surface-variant">記住登入狀態</label>
            </div>

            <button 
              type="submit"
              disabled={isLoading || isBootstrapping || !apiStatus.reachable || !apiStatus.configured}
              className="flex w-full items-center justify-center gap-1.5 bg-primary text-white font-semibold h-11 px-4 rounded-lg hover:bg-primary-container transition-colors shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '登入中...' : '登入'} <ArrowRight size={14} />
            </button>
          </form>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant"></div>
            </div>
            <div className="relative flex justify-center text-[13px]">

            </div>
          </div>

          <div className="rounded-lg bg-surface-container-low p-4 text-xs text-on-surface-variant space-y-1">
            <div>角色對應：</div>
            <div>admin → 主管首頁</div>
            <div>manager → 主管首頁</div>
            <div>member → 員工表單申請</div>
          </div>


        </div>
      </motion.main>
    </div>
  );
}
