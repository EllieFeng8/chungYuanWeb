import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, User, Lock, ArrowRight, AlertCircle } from '../components/icons';
import { motion } from 'motion/react';
import { getAccountByLineUserId, getAccounts, getHealth } from '../lib/cfctApi';
import { isBoundAccountPassword } from '../lib/accountPasswords';

const ROLE_STORAGE_KEY = 'userRole';
const ACCOUNT_NAME_STORAGE_KEY = 'loginAccountName';
const DISPLAY_NAME_STORAGE_KEY = 'loginDisplayName';
const ACCOUNT_SEQNO_STORAGE_KEY = 'loginAccountSeqNo';
const LINE_USER_ID_STORAGE_KEY = 'loginLineUserId';
const LINE_AUTO_LOGIN_ENABLED_STORAGE_KEY = 'lineAutoLoginEnabled';

function getStoredLineUserId() {
  if (typeof window === 'undefined') {
    return '';
  }

  return localStorage.getItem(LINE_USER_ID_STORAGE_KEY) || sessionStorage.getItem(LINE_USER_ID_STORAGE_KEY) || '';
}

function getQueryLineUserId() {
  if (typeof window === 'undefined') {
    return '';
  }

  return new URLSearchParams(window.location.search).get('lineUserId')?.trim() || '';
}

function isStoredAutoLoginEnabled() {
  if (typeof window === 'undefined') {
    return false;
  }

  const savedValue = localStorage.getItem(LINE_AUTO_LOGIN_ENABLED_STORAGE_KEY);
  return savedValue === 'true';
}

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

function persistLoginSession(account, roleConfig, remember) {
  const storage = remember ? localStorage : sessionStorage;
  const fallbackStorage = remember ? sessionStorage : localStorage;

  fallbackStorage.removeItem(ROLE_STORAGE_KEY);
  fallbackStorage.removeItem(ACCOUNT_NAME_STORAGE_KEY);
  fallbackStorage.removeItem(DISPLAY_NAME_STORAGE_KEY);
  fallbackStorage.removeItem(ACCOUNT_SEQNO_STORAGE_KEY);

  storage.setItem(ROLE_STORAGE_KEY, roleConfig.key);
  storage.setItem(ACCOUNT_NAME_STORAGE_KEY, account.accountName);
  storage.setItem(DISPLAY_NAME_STORAGE_KEY, account.displayName || account.accountName);
  storage.setItem(ACCOUNT_SEQNO_STORAGE_KEY, String(account.seqNo));

  const savedLineUserId = localStorage.getItem(LINE_USER_ID_STORAGE_KEY) || sessionStorage.getItem(LINE_USER_ID_STORAGE_KEY);
  if (savedLineUserId) {
    fallbackStorage.removeItem(LINE_USER_ID_STORAGE_KEY);
    storage.setItem(LINE_USER_ID_STORAGE_KEY, savedLineUserId);
  }
}

function validateLoginAccount(account) {
  if (!account) {
    throw new Error('找不到對應帳號。');
  }

  if (account.estate !== 'Active') {
    throw new Error(`此帳號目前狀態為 ${account.estate}，不可登入。`);
  }

  if (account.role === 'block') {
    throw new Error('此帳號已被封鎖。');
  }

  const roleConfig = normalizeAppRole(account.role);
  if (!roleConfig) {
    throw new Error(`不支援的角色：${account.role}`);
  }

  return roleConfig;
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
  const [accountsLoadError, setAccountsLoadError] = useState('');
  const [apiStatus, setApiStatus] = useState({ configured: false, reachable: false });
  const [isAutoLogin, setIsAutoLogin] = useState(false);
  const [autoLoginEnabled, setAutoLoginEnabled] = useState(() => isStoredAutoLoginEnabled());
  const [savedLineUserId, setSavedLineUserId] = useState(() => getStoredLineUserId());

  const accountLookup = useMemo(() => {
    return new Map(accounts.map((account) => [account.accountName.toLowerCase(), account]));
  }, [accounts]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setIsBootstrapping(true);
      setError('');
      setAccountsLoadError('');
      const queryLineUserId = getQueryLineUserId();
      const persistedLineUserId = getStoredLineUserId();
      const lineUserId = queryLineUserId || (autoLoginEnabled ? persistedLineUserId : '');
      setSavedLineUserId(persistedLineUserId);
      setIsAutoLogin(Boolean(lineUserId));
      try {
        const healthResponse = await getHealth();

        if (!active) {
          return;
        }

        setApiStatus({
          configured: Boolean(healthResponse?.data?.configured),
          reachable: true,
        });

        if (lineUserId) {
          localStorage.setItem(LINE_USER_ID_STORAGE_KEY, lineUserId);
          sessionStorage.removeItem(LINE_USER_ID_STORAGE_KEY);
          const accountResponse = await getAccountByLineUserId(lineUserId);
          if (!accountResponse?.success || !accountResponse?.data) {
            throw new Error(accountResponse?.error || 'LINE 綁定帳號讀取失敗');
          }

          if (!active) {
            return;
          }

          const matchedAccount = accountResponse.data;
          const roleConfig = validateLoginAccount(matchedAccount);
          setUsername(matchedAccount.accountName || '');
          persistLoginSession(matchedAccount, roleConfig, true);
          navigate(roleConfig.path);
          return;
        }

        try {
          const accountsResponse = await getAccounts(true);
          if (!accountsResponse.success) {
            throw new Error(accountsResponse.error || '無法讀取帳號清單');
          }

          if (!active) {
            return;
          }

          setAccounts(accountsResponse.data || []);
        } catch (accountsError) {
          if (!active) {
            return;
          }

          setAccounts([]);
          setAccountsLoadError(
            accountsError instanceof Error
              ? `${accountsError.message} 請稍後再試，或於輸入帳號後重新登入。`
              : '帳號清單載入失敗，請稍後再試。',
          );
        }
      } catch (bootstrapError) {
        if (!active) {
          return;
        }
        setApiStatus({ configured: false, reachable: false });
        setError(bootstrapError instanceof Error ? bootstrapError.message : '無法連接 API');
      } finally {
        if (active) {
          setIsAutoLogin(false);
          setIsBootstrapping(false);
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [autoLoginEnabled]);

  const handleToggleAutoLogin = () => {
    const nextValue = !autoLoginEnabled;
    setAutoLoginEnabled(nextValue);
    localStorage.setItem(LINE_AUTO_LOGIN_ENABLED_STORAGE_KEY, String(nextValue));
  };

  const resolveAccountByName = async (accountName) => {
    const cachedAccount = accountLookup.get(accountName);
    if (cachedAccount) {
      return cachedAccount;
    }

    const accountsResponse = await getAccounts(true);
    if (!accountsResponse.success) {
      throw new Error(accountsResponse.error || '無法讀取帳號清單');
    }

    const latestAccounts = accountsResponse.data || [];
    setAccounts(latestAccounts);
    return latestAccounts.find((account) => account.accountName.toLowerCase() === accountName) || null;
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');

    const accountName = username.trim().toLowerCase();
    if (!accountName) {
      setError('請輸入使用者名稱');
      return;
    }

    if (!password) {
      setError('請輸入密碼');
      return;
    }

    setIsLoading(true);
    try {
      const matchedAccount = await resolveAccountByName(accountName);
      if (!isBoundAccountPassword(matchedAccount?.accountName, password)) {
        throw new Error('帳號或密碼錯誤');
      }

      const roleConfig = validateLoginAccount(matchedAccount);
      persistLoginSession(matchedAccount, roleConfig, remember);
      navigate(roleConfig.path);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : '登入驗證失敗');
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

          {accountsLoadError ? (
            <div className="bg-surface-container-low border border-outline-variant p-4 rounded-lg flex gap-3 mb-8">
              <AlertCircle className="text-secondary shrink-0" size={20} />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-on-surface">帳號清單尚未載入</span>
                <p className="text-xs text-on-surface-variant">{accountsLoadError}</p>
              </div>
            </div>
          ) : null}

          {isAutoLogin ? (
            <div className="mb-8 rounded-lg border border-primary/20 bg-primary/5 p-4 flex gap-3">
              <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-primary">自動登入中</span>
                {/*<p className="text-xs text-on-surface-variant">正在根據 LINE 綁定帳號識別登入者並導向對應頁面。</p>*/}
              </div>
            </div>
          ) : null}

          {savedLineUserId ? (
            <div className="mb-8 rounded-lg border border-outline-variant bg-surface-container-low p-4 flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-on-surface">LINE 自動登入</span>
                <p className="text-xs text-on-surface-variant">
                  {autoLoginEnabled ? '已啟用，返回登入頁時會優先使用已保存的 LINE 身分。' : '已停用，登入頁將改用手動登入。'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleAutoLogin}
                className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                  autoLoginEnabled
                    ? 'bg-primary text-white hover:bg-primary-container'
                    : 'border border-outline bg-white text-secondary hover:bg-surface-container-high'
                }`}
              >
                {autoLoginEnabled ? '停用自動登入' : '啟用自動登入'}
              </button>
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
              disabled={isLoading || isBootstrapping || isAutoLogin || !apiStatus.reachable || !apiStatus.configured}
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
