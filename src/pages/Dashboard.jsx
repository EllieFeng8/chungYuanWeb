import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { Clock, CalendarX, AlertCircle } from '../components/icons';
import Layout from '../components/Layout';
import { motion } from 'motion/react';
import { getHrApplicationList } from '../lib/cfctApi';
import {
  getApplicationTypeName,
  getCurrentEmployeeContext,
} from '../lib/applicationUtils';

function mapAgentAssignment(item) {
  return {
    seqNo: item?.seqNo || '',
    applicantName: item?.applicantName || item?.applicantEmpNo || '-',
    agentEmpNo: item?.agentEmpNo || '',
    typeName: getApplicationTypeName(item),
    raw: item,
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [agentAssignments, setAgentAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadAgentAssignments() {
    setLoading(true);
    try {
      const { currentEmployee } = await getCurrentEmployeeContext();
      console.log('[Dashboard] GET /app-api/hr/applications', {
        agentEmpNo: currentEmployee.employeeNo,
      });
      const requestResponse = await getHrApplicationList({
        agentEmpNo: currentEmployee.employeeNo,
      });

      if (!requestResponse?.success) {
        throw new Error(requestResponse?.error || '代理知會讀取失敗');
      }

      const assignments = Array.isArray(requestResponse.data)
        ? requestResponse.data
          .filter((item) => String(item?.agentEmpNo || '').trim() === currentEmployee.employeeNo)
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
      return `${firstAssignment.applicantName} 的 ${firstAssignment.typeName} 申請指定您為代理人，僅知會不需確認。`;
    }

    return `${firstAssignment.applicantName} 等 ${agentAssignments.length} 筆申請指定您為代理人，僅知會不需確認。`;
  }, [agentAssignments]);

  return (
    <Layout title="">
      <div className="mb-8 sm:mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-on-surface">表單申請</h2>
        <div className="h-1.5 w-12 bg-primary mt-2 rounded-full"></div>
      </div>

      {!loading && agentAssignments.length ? (
        <div className="mb-10 sm:mb-12 w-full p-4 bg-tertiary-fixed border border-tertiary-container/30 rounded-xl flex items-start sm:items-center gap-4 text-left">
          <div className="w-10 h-10 bg-tertiary/10 rounded-full flex items-center justify-center text-tertiary shrink-0">
            <AlertCircle size={24} />
          </div>
          <span className="text-on-tertiary-container font-medium text-[24px]">
            {alertText}
          </span>
        </div>
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
