import { useState } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { Clock, CalendarX, History, BookOpen, Headset, ArrowRight, AlertCircle } from '../components/icons';
import Layout from '../components/Layout';
import { motion } from 'motion/react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [isAgentRequestOpen, setIsAgentRequestOpen] = useState(false);

  const handleApproveAgentRequest = () => {
    setIsAgentRequestOpen(false);
    void Swal.fire({
      icon: 'success',
      title: '已同意代理請求',
      showConfirmButton: false,
      timer: 1000,
    });
  };

  const handleRejectAgentRequest = async () => {
    const result = await Swal.fire({
      icon: 'warning',
      title: '是否確認拒絕？',
      text: '送出後將通知申請人。',
      showCancelButton: true,
      confirmButtonText: '確認拒絕',
      cancelButtonText: '取消',
      confirmButtonColor: '#dc2626',
    });

    if (result.isConfirmed) {
      setIsAgentRequestOpen(false);
    }
  };

  return (
    <Layout title="">
      {/* Breadcrumb Section */}
      <div className="mb-8 sm:mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-on-surface">表單申請</h2>
        <div className="h-1.5 w-12 bg-primary mt-2 rounded-full"></div>
      </div>

      {/* Alert Notification */}
      <button
        type="button"
        onClick={() => setIsAgentRequestOpen(true)}
        className="mb-10 sm:mb-12 w-full cursor-pointer p-4 bg-tertiary-fixed border border-tertiary-container/30 rounded-xl flex items-start sm:items-center gap-4 text-left transition-colors hover:bg-tertiary-fixed/80 focus:outline-none focus:ring-2 focus:ring-tertiary-container/60"
      >
        <div className="w-10 h-10 bg-tertiary/10 rounded-full flex items-center justify-center text-tertiary shrink-0">
          <AlertCircle size={24} />
        </div>
        <span className="text-on-tertiary-container font-medium text-sm">
          A先生代理請求通知：您有一項待審核的代理申請。
        </span>
      </button>

      {/* Action Cards */}
      <div className="flex flex-col items-center justify-center space-y-6 sm:space-y-10 py-4 max-w-2xl mx-auto">
        {/* Overtime Card */}
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

        {/* Leave Card */}
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

      {isAgentRequestOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setIsAgentRequestOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-surface-container-lowest p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-lg font-semibold text-on-surface mb-6">
              A先生請求您擔任代理人
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsAgentRequestOpen(false)}
                className="rounded-lg border border-primary/20 px-4 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container"
              >
                等一下決定
              </button>
              <button
                type="button"
                onClick={handleRejectAgentRequest}
                className="rounded-lg border border-error/20 px-4 py-2 text-sm font-medium text-error transition-colors hover:bg-error/10"
              >
                拒絕
              </button>
              <button
                type="button"
                onClick={handleApproveAgentRequest}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
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
