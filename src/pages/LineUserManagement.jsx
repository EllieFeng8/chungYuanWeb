import { useEffect, useMemo, useState } from 'react';
import { BadgeInfo, Link2, RefreshCw, Shield } from 'lucide-react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '../components/Button';
import { cn } from '../data/utils';
import { getAccounts, getActiveLineUsers } from '../lib/cfctApi';

const ROLE_LABELS = {
  admin: '管理員',
  manager: '主管',
  member: '一般員工',
  block: '封鎖',
};

function roleBadge(role) {
  switch (role) {
    case 'admin':
      return 'bg-primary/10 text-primary border-primary/20';
    case 'manager':
      return 'bg-tertiary/10 text-tertiary border-tertiary/20';
    case 'block':
      return 'bg-error/10 text-error border-error/20';
    default:
      return 'bg-surface-container text-secondary border-outline-variant';
  }
}

export default function LineUserManagement() {
  const navigate = useNavigate();
  const [lineUsers, setLineUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const bindings = useMemo(() => {
    return new Map(
      accounts
        .filter((account) => account.lineUserId)
        .map((account) => [account.lineUserId, account]),
    );
  }, [accounts]);

  async function loadData() {
    setLoading(true);
    try {
      const [lineUsersResponse, accountsResponse] = await Promise.all([
        getActiveLineUsers(),
        getAccounts(true),
      ]);

      if (!lineUsersResponse.success) {
        throw new Error(lineUsersResponse.error || 'LINE 使用者列表讀取失敗');
      }
      if (!accountsResponse.success) {
        throw new Error(accountsResponse.error || '帳號列表讀取失敗');
      }

      console.log('LineUserManagement.loadData', {
        lineUsers: lineUsersResponse.data || [],
        accounts: accountsResponse.data || [],
      });

      setLineUsers(lineUsersResponse.data || []);
      setAccounts(accountsResponse.data || []);
    } catch (error) {
      void Swal.fire({
        icon: 'error',
        title: '載入失敗',
        text: error instanceof Error ? error.message : '無法讀取 LINE 使用者',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function handleOpenEmployeeForm(binding) {
    if (!binding?.seqNo) {
      return;
    }

    navigate('/employeeForm', {
      state: {
        mode: 'account-edit',
        account: {
          seqNo: binding.seqNo,
          accountName: binding.accountName,
          displayName: binding.displayName,
          email: binding.email,
          role: binding.role,
          lineUserId: binding.lineUserId,
          estate: binding.estate,
        },
      },
    });
  }

  return (
    <Layout title="LINE 使用者管理">
      <div className="page-container">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-on-surface">LINE 使用者管理</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              對接 `/api/line-user/all-active`，目前後端僅提供有效使用者清單查詢。
            </p>
          </div>
          <Button type="button" variant="outline" className="gap-2" onClick={() => void loadData()}>
            <RefreshCw className="h-4 w-4" />
            重新整理
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatCard label="有效 LINE 使用者" value={lineUsers.length} />
          <StatCard label="已綁定帳號" value={[...bindings.keys()].length} />
          <StatCard label="未綁定使用者" value={lineUsers.filter((item) => !bindings.has(item.lineUserId)).length} />
        </div>

        <section className="card">
          <div className="border-b border-outline-variant px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface">有效使用者清單</h3>
                <p className="text-sm text-on-surface-variant">綁定狀態來自帳號模組的 `lineUserId` 軟連結。</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low text-xs uppercase text-on-surface-variant">
                <tr>
                  <th className="px-6 py-4">姓名</th>
                  <th className="px-6 py-4">LINE User ID</th>
                  <th className="px-6 py-4">LINE 角色</th>
                  <th className="px-6 py-4">綁定帳號</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant text-sm">
                {loading ? (
                  <tr><td className="px-6 py-12 text-center text-on-surface-variant" colSpan={4}>載入中...</td></tr>
                ) : lineUsers.length ? (
                  lineUsers.map((lineUser) => {
                    const binding = bindings.get(lineUser.lineUserId);
                    return (
                      <tr
                        key={lineUser.lineUserId}
                        onClick={() => handleOpenEmployeeForm(binding)}
                        className={cn(
                          'hover:bg-surface-container-low',
                          binding?.seqNo ? 'cursor-pointer' : 'cursor-default',
                        )}
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-on-surface">{lineUser.displayName || '(未命名)'}</div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-on-surface-variant">{lineUser.lineUserId}</td>
                        <td className="px-6 py-4">
                          <span className={cn('inline-flex rounded-full border px-3 py-1 text-[11px] font-bold', roleBadge(lineUser.role))}>
                            {ROLE_LABELS[lineUser.role] || lineUser.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {binding ? (
                            <div className="space-y-1">
                              <div className="inline-flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-sm text-on-surface">
                                <Link2 className="h-4 w-4 text-primary" />
                                <span className="font-semibold">{binding.accountName}</span>
                              </div>
                              <div className="text-xs text-on-surface-variant">
                                {binding.displayName || '-'} / {ROLE_LABELS[binding.role] || binding.role}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-lg bg-surface-container px-3 py-2 text-xs text-on-surface-variant">
                              <BadgeInfo className="h-4 w-4" />
                              尚未綁定
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td className="px-6 py-12 text-center text-on-surface-variant" colSpan={4}>查無有效 LINE 使用者</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card p-6">
      <p className="text-xs font-semibold uppercase text-on-surface-variant">{label}</p>
      <p className="mt-3 text-3xl font-bold text-on-surface">{value}</p>
    </div>
  );
}
