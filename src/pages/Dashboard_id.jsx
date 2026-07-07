import { useEffect, useMemo, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, CalendarX, AlertCircle } from '../components/icons';
import Layout from '../components/Layout';
import { motion } from 'motion/react';
import {
  acceptAgentRequest,
  getAccountByLineUserId,
  getAgentRequestInbox,
  rejectAgentRequest,
} from '../lib/cfctApi';
import { getApplicationTypeName, getCurrentEmployeeContext } from '../lib/applicationUtils';

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

function mapAgentAssignment(item) {
  return {
    seqNo: item?.seqNo || item?.applicationSeqNo || item?.id || '',
    applicantName: item?.applicantName || item?.applicantEmpName || item?.applicantEmpNo || '-',
    applicantEmpNo: item?.applicantEmpNo || '',
    agentEmpNo: item?.agentEmpNo || '',
    agent2EmpNo: item?.agent2EmpNo || '',
    typeName: getApplicationTypeName(item),
    rowVer: item?.rowVer,
    raw: item,
  };
}

function normalizeEmployeeNo(value) {
  return String(value || '').trim().toLowerCase();
}

export default function DashboardByLine() {
  const navigate = useNavigate();
  const { lineUserId = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [agentAssignments, setAgentAssignments] = useState([]);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [submittingSeqNo, setSubmittingSeqNo] = useState('');
  const promptedAssignmentKeyRef = useRef('');

  async function fetchAgentInbox(employeeNo) {
    const normalizedEmployeeNo = normalizeEmployeeNo(employeeNo);
    const primaryResponse = await getAgentRequestInbox(employeeNo);

    if (!primaryResponse?.success) {
      throw new Error(primaryResponse?.error || '代理知會讀取失敗');
    }

    const primaryItems = Array.isArray(primaryResponse.data) ? primaryResponse.data : [];
    if (primaryItems.length || !normalizedEmployeeNo || normalizedEmployeeNo === String(employeeNo || '').trim()) {
      return primaryResponse;
    }

    const fallbackResponse = await getAgentRequestInbox(normalizedEmployeeNo);
    if (!fallbackResponse?.success) {
      throw new Error(fallbackResponse?.error || '代理知會讀取失敗');
    }

    return fallbackResponse;
  }

  async function loadAgentAssignments() {
    const employeeContext = await getCurrentEmployeeContext();
    const employee = employeeContext.currentEmployee;
    setCurrentEmployee(employee);

    console.log('[Dashboard_id] GET /app-api/agent-request/inbox', {
      employeeNo: employee.employeeNo,
    });
    const requestResponse = await fetchAgentInbox(employee.employeeNo);

    const assignments = Array.isArray(requestResponse.data)
      ? requestResponse.data
        .filter((item) => {
          const matchesCurrentEmployee = (
            normalizeEmployeeNo(item?.agentEmpNo) === normalizeEmployeeNo(employee.employeeNo)
            || normalizeEmployeeNo(item?.agent2EmpNo) === normalizeEmployeeNo(employee.employeeNo)
          );
          const confirmState = String(item?.agentConfirmState || 'pending').trim().toLowerCase();
          return matchesCurrentEmployee && confirmState === 'pending';
        })
        .map(mapAgentAssignment)
      : [];

    setAgentAssignments(assignments);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setLoading(true);
      try {
        const normalizedLineUserId = String(lineUserId || '').trim();
        if (!normalizedLineUserId) {
          throw new Error('缺少 lineUserId，無法載入帳號資料。');
        }

        localStorage.setItem(LINE_USER_ID_STORAGE_KEY, normalizedLineUserId);
        sessionStorage.removeItem(LINE_USER_ID_STORAGE_KEY);

        console.log('[Dashboard_id] GET /app-api/accounts/by-line/:lineUserId', {
          lineUserId: normalizedLineUserId,
        });
        const response = await getAccountByLineUserId(normalizedLineUserId);
        console.log('[Dashboard_id] account by line response', response);

        if (!response?.success || !response?.data) {
          throw new Error(response?.error || 'LINE 綁定帳號讀取失敗');
        }

        if (!isMounted) {
          return;
        }

        persistLineLoginSession(response.data, normalizedLineUserId);
        setAccount(response.data);
        await loadAgentAssignments();
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setAccount(null);
        setAgentAssignments([]);
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

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [lineUserId]);

  const alertText = useMemo(() => {
    if (!agentAssignments.length) {
      return '';
    }

    const firstAssignment = agentAssignments[0];
    if (agentAssignments.length === 1) {
      return `${firstAssignment.applicantName} 指定您代理 ${firstAssignment.typeName} 申請。`;
    }

    return `${firstAssignment.applicantName} 等 ${agentAssignments.length} 筆申請指定您代理。`;
  }, [agentAssignments]);

  async function handleAgentAction(item, action) {
    if (!currentEmployee?.employeeNo || !item?.seqNo) {
      return;
    }

    setSubmittingSeqNo(String(item.seqNo));
    try {
      const payload = {
        actorEmpNo: currentEmployee.employeeNo,
        ...(typeof item?.rowVer === 'number' ? { rowVer: item.rowVer } : {}),
      };

      const response = action === 'accept'
        ? await acceptAgentRequest(item.seqNo, payload)
        : await rejectAgentRequest(item.seqNo, payload);

      if (!response?.success) {
        throw new Error(response?.error || (action === 'accept' ? '接受代理失敗' : '拒絕代理失敗'));
      }

      await loadAgentAssignments();
      void Swal.fire({
        icon: 'success',
        title: action === 'accept' ? '已接受代理' : '已拒絕代理',
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      void Swal.fire({
        icon: 'error',
        title: action === 'accept' ? '接受失敗' : '拒絕失敗',
        text: error instanceof Error ? error.message : '操作失敗',
      });
    } finally {
      setSubmittingSeqNo('');
    }
  }

  async function handleOpenAgentDialog() {
    if (!agentAssignments.length) {
      return;
    }

    const firstAssignment = agentAssignments[0];
    const result = await Swal.fire({
      icon: 'question',
      title: '代理確認',
      html: `
        <div style="text-align:left">
          <div>單號：${firstAssignment.seqNo}</div>
          <div>申請人：${firstAssignment.applicantName}</div>
          <div>類型：${firstAssignment.typeName}</div>
          <div>待處理筆數：${agentAssignments.length}</div>
        </div>
      `,
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: '接受代理',
      denyButtonText: '拒絕代理',
      cancelButtonText: '取消',
    });

    if (result.isConfirmed) {
      await handleAgentAction(firstAssignment, 'accept');
    } else if (result.isDenied) {
      await handleAgentAction(firstAssignment, 'reject');
    }
  }

  useEffect(() => {
    if (loading || submittingSeqNo || !agentAssignments.length) {
      return;
    }

    const promptKey = agentAssignments.map((item) => String(item.seqNo)).join(',');
    if (!promptKey || promptedAssignmentKeyRef.current === promptKey) {
      return;
    }

    promptedAssignmentKeyRef.current = promptKey;
    void handleOpenAgentDialog();
  }, [agentAssignments, loading, submittingSeqNo]);

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

  return (
    <Layout title="">
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-on-surface">表單申請</h2>
          <div className="mt-2 h-1.5 w-12 rounded-full bg-primary" />
        </div>

        {!loading && agentAssignments.length ? (
          <button
            type="button"
            onClick={() => void handleOpenAgentDialog()}
            disabled={Boolean(submittingSeqNo)}
            className="w-full rounded-xl border border-tertiary-container/30 bg-tertiary-fixed p-4 text-left transition-colors hover:bg-tertiary-fixed/80 disabled:opacity-60"
          >
            <div className="flex items-start gap-4 sm:items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tertiary/10 text-tertiary">
                <AlertCircle size={24} />
              </div>
              <span className="text-[24px] font-medium text-on-tertiary-container">
                {alertText}
              </span>
            </div>
          </button>
        ) : null}

        <div className="flex flex-col items-center justify-center space-y-6 py-2 max-w-2xl mx-auto">
          <motion.div
            whileHover={{ y: -5 }}
            onClick={() => navigate(`/apply-overtime-id/${encodeURIComponent(lineUserId)}`)}
            className="group relative w-full cursor-pointer overflow-hidden rounded-xl border-t-4 border-tertiary bg-surface-container-lowest shadow-sm transition-all duration-300 hover:shadow-md"
          >
            <div className="flex flex-col items-center justify-center bg-tertiary-container p-8 text-center text-white sm:p-12">
              <Clock size={64} className="mb-4 text-white/80" />
              <h3 className="mb-2 text-[30px] font-black leading-none tracking-[0.12em] sm:text-[42px] sm:tracking-[0.2em]">我要加班</h3>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            onClick={() => navigate(`/apply-leave-id/${encodeURIComponent(lineUserId)}`)}
            className="group relative w-full cursor-pointer overflow-hidden rounded-xl border-t-4 border-primary bg-surface-container-lowest shadow-sm transition-all duration-300 hover:shadow-md"
          >
            <div className="flex flex-col items-center justify-center bg-primary-container p-8 text-center text-white sm:p-12">
              <CalendarX size={64} className="mb-4 text-white/80" />
              <h3 className="mb-2 text-[30px] font-black leading-none tracking-[0.12em] sm:text-[42px] sm:tracking-[0.2em]">我要請假</h3>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
