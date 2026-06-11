import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import Records from './Records';
import { getAccountByLineUserId } from '../lib/cfctApi';

const ROLE_STORAGE_KEY = 'userRole';
const ACCOUNT_NAME_STORAGE_KEY = 'loginAccountName';
const DISPLAY_NAME_STORAGE_KEY = 'loginDisplayName';
const ACCOUNT_SEQNO_STORAGE_KEY = 'loginAccountSeqNo';
const LINE_USER_ID_STORAGE_KEY = 'loginLineUserId';

function normalizeAppRole(apiRole) {
  switch (apiRole) {
    case 'admin':
      return 'hr';
    case 'manager':
      return 'manager';
    case 'member':
      return 'employee';
    default:
      return '';
  }
}

function persistLineLoginSession(account, lineUserId) {
  const appRole = normalizeAppRole(account?.role);
  if (!appRole) {
    throw new Error(`不支援的角色：${account?.role || ''}`);
  }

  localStorage.setItem(LINE_USER_ID_STORAGE_KEY, lineUserId);
  localStorage.setItem(ROLE_STORAGE_KEY, appRole);
  localStorage.setItem(ACCOUNT_NAME_STORAGE_KEY, account.accountName || '');
  localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, account.displayName || account.accountName || '');
  localStorage.setItem(ACCOUNT_SEQNO_STORAGE_KEY, String(account.seqNo || ''));

  sessionStorage.removeItem(LINE_USER_ID_STORAGE_KEY);
  sessionStorage.removeItem(ROLE_STORAGE_KEY);
  sessionStorage.removeItem(ACCOUNT_NAME_STORAGE_KEY);
  sessionStorage.removeItem(DISPLAY_NAME_STORAGE_KEY);
  sessionStorage.removeItem(ACCOUNT_SEQNO_STORAGE_KEY);
}

export default function RecordsByLine() {
  const { lineUserId = '' } = useParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapRecords() {
      setLoading(true);
      try {
        const normalizedLineUserId = String(lineUserId || '').trim();
        if (!normalizedLineUserId) {
          throw new Error('缺少 lineUserId，無法載入帳號資料。');
        }

        localStorage.setItem(LINE_USER_ID_STORAGE_KEY, normalizedLineUserId);
        sessionStorage.removeItem(LINE_USER_ID_STORAGE_KEY);

        console.log('[Records_id] GET /api/account/by-line/{lineUserId}', {
          lineUserId: normalizedLineUserId,
        });
        const response = await getAccountByLineUserId(normalizedLineUserId);

        if (!response?.success || !response?.data) {
          throw new Error(response?.error || 'LINE 綁定帳號讀取失敗');
        }

        if (!isMounted) {
          return;
        }

        persistLineLoginSession(response.data, normalizedLineUserId);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        void Swal.fire({
          icon: 'error',
          title: '載入失敗',
          text: error instanceof Error ? error.message : '無法讀取帳號資料',
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void bootstrapRecords();

    return () => {
      isMounted = false;
    };
  }, [lineUserId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-primary/20 bg-surface-container-lowest p-6 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <div className="space-y-1">
              <div className="text-base font-bold text-primary">正在識別 LINE 登入者</div>
              <p className="text-sm text-on-surface-variant">
                正在根據 `lineUserId` 載入帳號資料並建立登入狀態。
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <Records />;
}
