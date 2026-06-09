import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { Clock, CalendarX, AlertCircle } from '../components/icons';
import Layout from '../components/Layout';
import { motion } from 'motion/react';
import {
  acceptAgentRequest,
  getHrApplicationList,
  rejectAgentRequest,
} from '../lib/cfctApi';
import {
  getApplicationTypeName,
  getCurrentEmployeeContext,
} from '../lib/applicationUtils';

function mapAgentRequest(item) {
  return {
    seqNo: item?.seqNo || '',
    applicantName: item?.applicantName || item?.applicantEmpNo || '-',
    agentEmpNo: item?.agentEmpNo || '',
    typeName: getApplicationTypeName(item),
    reason: item?.reason || '-',
    startTime: item?.startTime || '',
    endTime: item?.endTime || '',
    raw: item,
  };
}

function formatDateRange(startTime, endTime) {
  const start = startTime ? new Date(startTime) : null;
  const end = endTime ? new Date(endTime) : null;

  if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) {
    return '-';
  }

  const formatPart = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  return `${formatPart(start)} - ${formatPart(end)}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [agentRequests, setAgentRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actorEmpNo, setActorEmpNo] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function loadAgentRequests() {
    setLoading(true);
    try {
      const { currentEmployee } = await getCurrentEmployeeContext();

      setActorEmpNo(currentEmployee.employeeNo);

      console.log('[Dashboard] GET /app-api/hr/applications', {
        status: 'agent_pending',
        agentEmpNo: currentEmployee.employeeNo,
      });
      const requestResponse = await getHrApplicationList({
        status: 'agent_pending',
        agentEmpNo: currentEmployee.employeeNo,
      });

      if (!requestResponse?.success) {
        throw new Error(requestResponse?.error || '代理請求讀取失敗');
      }

      const requests = Array.isArray(requestResponse.data)
        ? requestResponse.data
          .filter((item) => String(item?.agentEmpNo || '').trim() === currentEmployee.employeeNo)
          .map(mapAgentRequest)
        : [];

      setAgentRequests(requests);
      setSelectedRequest((current) => {
        if (!current) {
          return requests[0] || null;
        }
        return requests.find((item) => item.seqNo === current.seqNo) || requests[0] || null;
      });
    } catch (error) {
      setAgentRequests([]);
      setSelectedRequest(null);
      void Swal.fire({
        icon: 'error',
        title: '讀取失敗',
        text: error instanceof Error ? error.message : '無法讀取代理請求通知',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAgentRequests();
  }, []);

  const alertText = useMemo(() => {
    if (!agentRequests.length) {
      return '';
    }

    const firstRequest = agentRequests[0];
    if (agentRequests.length === 1) {
      return `${firstRequest.applicantName} 代理請求通知：您有一項待確認的代理申請。`;
    }

    return `${firstRequest.applicantName} 等 ${agentRequests.length} 筆代理請求通知：您有待確認的代理申請。`;
  }, [agentRequests]);

  async function handleAgentRequestAction(action) {
    if (!selectedRequest?.seqNo || !actorEmpNo) {
      return;
    }

    const isReject = action === 'reject';
    if (isReject) {
      const result = await Swal.fire({
        icon: 'warning',
        title: '是否確認拒絕？',
        text: '送出後將通知申請人。',
        showCancelButton: true,
        confirmButtonText: '確認拒絕',
        cancelButtonText: '取消',
        confirmButtonColor: '#dc2626',
      });

      if (!result.isConfirmed) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = { actorEmpNo };
      if (isReject) {
        await rejectAgentRequest(selectedRequest.seqNo, payload);
      } else {
        await acceptAgentRequest(selectedRequest.seqNo, payload);
      }

      await loadAgentRequests();
      void Swal.fire({
        icon: 'success',
        title: isReject ? '已拒絕代理請求' : '已同意代理請求',
        showConfirmButton: false,
        timer: 1000,
      });
    } catch (error) {
      void Swal.fire({
        icon: 'error',
        title: isReject ? '拒絕失敗' : '同意失敗',
        text: error instanceof Error ? error.message : '代理請求處理失敗',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout title="">
      <div className="mb-8 sm:mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-on-surface">表單申請</h2>
        <div className="h-1.5 w-12 bg-primary mt-2 rounded-full"></div>
      </div>

      {!loading && agentRequests.length ? (
        <button
          type="button"
          onClick={() => setSelectedRequest(selectedRequest || agentRequests[0])}
          className="mb-10 sm:mb-12 w-full cursor-pointer p-4 bg-tertiary-fixed border border-tertiary-container/30 rounded-xl flex items-start sm:items-center gap-4 text-left transition-colors hover:bg-tertiary-fixed/80 focus:outline-none focus:ring-2 focus:ring-tertiary-container/60"
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

      {selectedRequest ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setSelectedRequest(null)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-surface-container-lowest p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-lg font-semibold text-on-surface mb-4">
              {selectedRequest.applicantName} 請求您擔任代理人
            </p>
            <div className="space-y-2 text-sm text-on-surface-variant mb-6">
              <p>申請類型：{selectedRequest.typeName}</p>
              <p>申請期間：{formatDateRange(selectedRequest.startTime, selectedRequest.endTime)}</p>
              <p>申請原因：{selectedRequest.reason}</p>
            </div>
            {agentRequests.length > 1 ? (
              <div className="mb-6 space-y-2">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">其他待確認請求</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {agentRequests.map((request) => (
                    <button
                      key={request.seqNo}
                      type="button"
                      onClick={() => setSelectedRequest(request)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        request.seqNo === selectedRequest.seqNo
                          ? 'border-primary bg-primary/10 text-on-surface'
                          : 'border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      {request.applicantName} / {request.typeName}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-lg border border-primary/20 px-4 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container"
              >
                等一下決定
              </button>
              <button
                type="button"
                onClick={() => void handleAgentRequestAction('reject')}
                disabled={submitting}
                className="rounded-lg border border-error/20 px-4 py-2 text-sm font-medium text-error transition-colors hover:bg-error/10 disabled:opacity-50"
              >
                拒絕
              </button>
              <button
                type="button"
                onClick={() => void handleAgentRequestAction('accept')}
                disabled={submitting}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                同意
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
