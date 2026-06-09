import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Edit2,
  UserPlus,
  Users as UsersIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '../components/Button';
import { cn } from '../data/utils';
import {
  createAccount,
  getAccounts,
  getActiveLineUsers,
} from '../lib/cfctApi';

const ROLE_LABELS = {
  admin: '系統管理員',
  manager: '部門主管',
  member: '一般員工',
  block: '封鎖',
};

const EMPTY_FORM = {
  accountName: '',
  password: '',
  displayName: '',
  email: '',
  role: 'member',
  lineUserId: '',
  remark: '',
};

function roleBadge(role) {
  switch (role) {
    case 'admin':
      return 'bg-brand/10 text-brand';
    case 'manager':
      return 'bg-slate-100 text-slate-600';
    case 'block':
      return 'bg-red-50 text-red-500';
    default:
      return 'bg-slate-50 text-slate-400';
  }
}

export default function AccountManagement() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [lineUsers, setLineUsers] = useState([]);
  const [includeAll, setIncludeAll] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      if (roleFilter !== 'all' && account.role !== roleFilter) {
        return false;
      }
      return true;
    });
  }, [accounts, roleFilter]);

  async function loadAccounts(nextIncludeAll = includeAll) {
    setLoading(true);
    try {
      const [accountsResponse, lineUsersResponse] = await Promise.all([
        getAccounts(nextIncludeAll),
        getActiveLineUsers(),
      ]);

      if (!accountsResponse.success) {
        throw new Error(accountsResponse.error || '帳號列表讀取失敗');
      }
      if (!lineUsersResponse.success) {
        throw new Error(lineUsersResponse.error || 'LINE 使用者列表讀取失敗');
      }

      const nextAccounts = accountsResponse.data || [];
      setAccounts(nextAccounts);
      setLineUsers(lineUsersResponse.data || []);
    } catch (error) {
      void Swal.fire({
        icon: 'error',
        title: '載入失敗',
        text: error instanceof Error ? error.message : '無法讀取帳號資料',
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(seqNo) {
    if (!seqNo) {
      setSelectedAccount(null);
      return;
    }

    setDetailLoading(true);
    try {
      const response = await getAccountDetail(seqNo);
      if (!response.success) {
        throw new Error(response.error || '帳號明細讀取失敗');
      }
      setSelectedAccount(response.data);
    } catch (error) {
      void Swal.fire({
        icon: 'error',
        title: '讀取失敗',
        text: error instanceof Error ? error.message : '無法讀取帳號明細',
      });
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    void loadAccounts(includeAll);
  }, [includeAll]);

  async function handleCreateAccount(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await createAccount({
        ...createForm,
        displayName: createForm.displayName || null,
        email: createForm.email || null,
        lineUserId: createForm.lineUserId || null,
        remark: createForm.remark || null,
      });

      if (!response.success) {
        throw new Error(response.error || '建立帳號失敗');
      }

      setCreateForm(EMPTY_FORM);
      setIsCreateOpen(false);
      await loadAccounts(includeAll);
      void Swal.fire({ icon: 'success', title: '帳號已建立', timer: 1200, showConfirmButton: false });
    } catch (error) {
      void Swal.fire({
        icon: 'error',
        title: '建立失敗',
        text: error instanceof Error ? error.message : '建立帳號失敗',
      });
    } finally {
      setSaving(false);
    }
  }

  function handleEditAccount(account) {
    navigate('/employeeForm', {
      state: {
        mode: 'account-edit',
        account: {
          seqNo: account.seqNo,
          accountName: account.accountName,
          displayName: account.displayName,
          email: account.email,
          role: account.role,
          lineUserId: account.lineUserId,
          estate: account.estate,
        },
      },
    });
  }

  return (
    <Layout title="帳號管理">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-slate-800">帳號管理</h2>
            <p className="text-sm text-slate-500 mt-1">管理企業登入帳號、權限角色與 LINE 綁定設定</p>
          </div>
          <Button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="w-full justify-center gap-2 bg-primary text-white hover:bg-primary-container sm:w-auto"
          >
            <UserPlus className="w-5 h-5" />
            新增帳號
          </Button>
        </div>

        <div className="bg-white rounded-sm border border-slate-200 p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="w-fit p-3 bg-brand/10 rounded-sm text-brand">
            <UsersIcon className="w-6 h-6" />
            </div>
            <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-x-10 sm:gap-y-2">
              <Stat label="總帳號數" value={accounts.length} />
              <Stat label="管理員" value={accounts.filter((item) => item.role === 'admin').length} />
              <Stat label="主管" value={accounts.filter((item) => item.role === 'manager').length} />
              <Stat label="已綁 LINE" value={accounts.filter((item) => item.lineUserId).length} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-sm border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="w-full bg-white border border-slate-200 rounded-sm text-sm py-2 px-3 focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all text-slate-600 sm:w-auto"
              >
                <option value="all">所有權限角色</option>
                <option value="admin">管理員</option>
                <option value="manager">主管</option>
                <option value="member">一般員工</option>
                <option value="block">封鎖</option>
              </select>
              <label className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-sm text-sm py-2 px-3 text-slate-600">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={includeAll}
                  onChange={(event) => setIncludeAll(event.target.checked)}
                />
                顯示停用/鎖定帳號
              </label>
            </div>
            <button
              type="button"
              onClick={() => void loadAccounts(includeAll)}
              className="flex items-center gap-1 text-sm font-medium text-slate-400 transition-colors hover:text-brand sm:self-auto"
            >
              <Download className="w-4 h-4" />
              重新整理
            </button>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-50/50">

                  <th className="px-6 py-4 border-b border-slate-100">姓名</th>
                  <th className="px-6 py-4 border-b border-slate-100">帳號名稱</th>
                  <th className="px-6 py-4 border-b border-slate-100">權限角色</th>
                  <th className="px-6 py-4 border-b border-slate-100">狀態</th>
                  <th className="px-6 py-4 border-b border-slate-100 text-center">編輯</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-600 divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td className="px-6 py-10 text-center text-slate-400" colSpan={6}>載入中...</td>
                  </tr>
                ) : filteredAccounts.length ? (
                  filteredAccounts.map((account) => (
                    <tr
                      key={account.seqNo}
                      onClick={() => handleEditAccount(account)}
                      className="transition-colors group cursor-pointer hover:bg-slate-50/50"
                    >
                      <td className="px-6 py-4 text-slate-500">{account.displayName || '-'}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{account.accountName}</td>

                      <td className="px-6 py-4">
                        <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide inline-block', roleBadge(account.role))}>
                          {ROLE_LABELS[account.role] || account.role}
                        </span>
                      </td>

                      <td className="px-6 py-4">{account.estate}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEditAccount(account);
                          }}
                          className="text-slate-300 hover:text-brand transition-colors p-1"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-6 py-10 text-center text-slate-400" colSpan={6}>查無帳號資料</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-100 md:hidden">
            {loading ? (
              <div className="px-4 py-10 text-center text-sm text-slate-400">載入中...</div>
            ) : filteredAccounts.length ? (
              filteredAccounts.map((account) => (
                <button
                  key={account.seqNo}
                  type="button"
                  onClick={() => handleEditAccount(account)}
                  className="block w-full space-y-3 px-4 py-4 text-left transition-colors hover:bg-slate-50/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-800">{account.accountName}</div>
                      <div className="mt-1 text-sm text-slate-500">{account.displayName || '-'}</div>
                    </div>
                    <span className={cn('shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide inline-block', roleBadge(account.role))}>
                      {ROLE_LABELS[account.role] || account.role}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="text-slate-500">
                      <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-slate-400">狀態</span>
                      {account.estate}
                    </div>
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Edit2 className="w-4 h-4" />
                      編輯
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-10 text-center text-sm text-slate-400">查無帳號資料</div>
            )}
          </div>

          <div className="flex flex-col gap-4 border-t border-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-center text-xs text-slate-400 sm:text-left">
              顯示 1 到 {filteredAccounts.length} 筆，共 {filteredAccounts.length} 筆資料
            </p>
            <div className="flex items-center space-x-1">
              <button className="w-8 h-8 flex items-center justify-center text-slate-300 hover:bg-slate-50 rounded-sm">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 flex items-center justify-center bg-brand text-white text-xs font-semibold rounded-sm">1</button>
              <button className="w-8 h-8 flex items-center justify-center text-slate-300 hover:bg-slate-50 rounded-sm">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-4 py-5 sm:px-6">
              <h3 className="text-xl font-bold text-slate-800">新增帳號</h3>
              <p className="text-sm text-slate-400 mt-0.5">建立 SYS_Account，建立後會立即同步到帳號列表。</p>
            </div>

            <form onSubmit={(event) => void handleCreateAccount(event)} className="grid max-h-[calc(100vh-7rem)] grid-cols-1 gap-5 overflow-y-auto p-4 sm:p-6 md:grid-cols-2">
              <FormInput label="姓名" value={createForm.displayName} onChange={(value) => setCreateForm((current) => ({ ...current, displayName: value }))} />

              <FormInput label="初始密碼" type="password" value={createForm.password} required onChange={(value) => setCreateForm((current) => ({ ...current, password: value }))} />
              <FormInput label="帳號名稱" value={createForm.accountName} required onChange={(value) => setCreateForm((current) => ({ ...current, accountName: value }))} />
              <FormInput label="電子郵件" type="email" value={createForm.email} onChange={(value) => setCreateForm((current) => ({ ...current, email: value }))} />

              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">系統角色</label>
                <select
                  value={createForm.role}
                  onChange={(event) => setCreateForm((current) => ({ ...current, role: event.target.value }))}
                  className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm"
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">LINE 綁定</label>
                <select
                  value={createForm.lineUserId}
                  onChange={(event) => setCreateForm((current) => ({ ...current, lineUserId: event.target.value }))}
                  className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm"
                >
                  <option value="">不綁定</option>
                  {lineUsers.map((lineUser) => (
                    <option key={lineUser.lineUserId} value={lineUser.lineUserId}>
                      {(lineUser.displayName || '(未命名)')} - {lineUser.lineUserId}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">備註</label>
                <textarea
                  className="min-h-[120px] w-full rounded-lg border border-outline bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={createForm.remark}
                  onChange={(event) => setCreateForm((current) => ({ ...current, remark: event.target.value }))}
                />
              </div>

              <div className="flex flex-col-reverse gap-3 md:col-span-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="w-full sm:w-auto">取消</Button>
                <Button type="submit" className="w-full bg-primary text-white hover:bg-primary/90 sm:w-auto" disabled={saving}>建立帳號</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}

function Stat({ label, value }) {
  return (
    <div className="min-w-0">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      <div className="text-2xl font-bold text-slate-800 sm:text-3xl">{value}</div>
    </div>
  );
}

function FormInput({ label, onChange, ...props }) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">{label}</label>
      <input
        {...props}
        className="w-full h-11 px-4 bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
