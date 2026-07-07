import { useEffect, useMemo, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { Clock, CalendarX, AlertCircle } from '../components/icons';
import Layout from '../components/Layout';
import { motion } from 'motion/react';
import { acceptAgentRequest, getAgentRequestInbox, rejectAgentRequest } from '../lib/cfctApi';
import { getApplicationTypeName, getCurrentEmployeeContext } from '../lib/applicationUtils';

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

export default function Dashboard() {
  const navigate = useNavigate();
  const [agentAssignments, setAgentAssignments] = useState([]);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    try {
      const employeeContext = await getCurrentEmployeeContext();
      const employee = employeeContext.currentEmployee;
      setCurrentEmployee(employee);

      console.log('[Dashboard] GET /app-api/agent-request/inbox', {
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
    } catch (error) {
      setAgentAssignments([]);
      void Swal.fire({
        icon: 'error',
        title: '讀取失敗',
        text: error instanceof Error ? error.message : '無法讀取代理知會通知',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAgentAssignments();
  }, []);

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

  return (
    <Layout title="">
      <div className="mb-8 sm:mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-on-surface">表單申請</h2>
        <div className="h-1.5 w-12 bg-primary mt-2 rounded-full"></div>
      </div>

      {!loading && agentAssignments.length ? (
        <button
          type="button"
          onClick={() => void handleOpenAgentDialog()}
          disabled={Boolean(submittingSeqNo)}
          className="mb-10 sm:mb-12 w-full p-4 bg-tertiary-fixed border border-tertiary-container/30 rounded-xl flex items-start sm:items-center gap-4 text-left transition-colors hover:bg-tertiary-fixed/80 disabled:opacity-60"
        >
          <div className="w-10 h-10 bg-tertiary/10 rounded-full flex items-center justify-center text-tertiary shrink-0">
            <AlertCircle size={24} />
          </div>
          <span className="text-on-tertiary-container font-medium text-[24px]">
            {alertText}
          </span>
        </button>
      ) : null}

      <div className="flex flex-col items-center justify-center space-y-6 sm:space-y-10 py-4 max-w-2xl mx-auto">
        <motion.div
          whileHover={{ y: -5 }}
          onClick={() => navigate('/apply-overtime')}
          className="group relative w-full bg-surface-container-lowest border-t-4 border-tertiary shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden cursor-pointer"
        >
          <div className="bg-tertiary-container flex flex-col items-center justify-center p-8 sm:p-12 text-white text-center">
            <Clock size={64} className="mb-4 text-white/80" />
            <h3 className="text-[30px] sm:text-[42px] font-black tracking-[0.12em] sm:tracking-[0.2em] leading-none mb-2">我要加班</h3>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -5 }}
          onClick={() => navigate('/apply-leave')}
          className="group relative w-full bg-surface-container-lowest border-t-4 border-primary shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden cursor-pointer"
        >
          <div className="bg-primary-container flex flex-col items-center justify-center p-8 sm:p-12 text-white text-center">
            <CalendarX size={64} className="mb-4 text-white/80" />
            <h3 className="text-[30px] sm:text-[42px] font-black tracking-[0.12em] sm:tracking-[0.2em] leading-none mb-2">我要請假</h3>
          </div>
        </motion.div>
      </div>

    </Layout>
  );
}
