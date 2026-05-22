import { useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FileText, 
  Lock, 
  Info, 
  Plus, 
  Paperclip,
  AlertCircle,
  ChevronRight,
  ChevronDown,
} from '../components/icons';
import Layout from '../components/Layout';
import { applications } from '../data/applications';

function parseDateTimeParts(value) {
  const parts = value.split('/').map((item) => item.trim()).filter(Boolean);
  const datePart = parts.slice(0, 3).join('-');
  const timePart = parts.slice(3).join(':').replace(/\s+/g, '');
  return {
    date: datePart,
    time: timePart,
  };
}

function formatDateTime(date, time) {
  if (!date && !time) {
    return '-';
  }

  const formattedDate = date ? date.replaceAll('-', ' / ') : '';
  const formattedTime = time ? time.slice(0, 2) + ' : ' + time.slice(3, 5) : '';

  return [formattedDate, formattedTime].filter(Boolean).join(' / ');
}

export default function ViewApplication() {
  const navigate = useNavigate();
  const { id } = useParams();
  const application = applications.find((item) => item.id === Number(id));

  if (!application) {
    return (
      <Layout title="查看申請" showBack>
        <div className="max-w-4xl mx-auto">
          <section className="bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm p-8 space-y-4">
            <h2 className="text-xl font-bold text-on-surface">找不到申請資料</h2>
            <p className="text-sm text-on-surface-variant">此申請可能已不存在，或連結資料有誤。</p>
            <div>
              <button
                type="button"
                onClick={() => navigate('/records')}
                className="bg-primary text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
              >
                返回申請紀錄
              </button>
            </div>
          </section>
        </div>
      </Layout>
    );
  }

  const initialStart = parseDateTimeParts(application.startAt);
  const initialEnd = parseDateTimeParts(application.endAt);
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState(() => ({
    type: application.type,
    agent: application.agent,
    startDate: initialStart.date,
    startTime: initialStart.time,
    endDate: initialEnd.date,
    endTime: initialEnd.time,
    reason: application.reason,
  }));

  const displayApplication = useMemo(
    () => ({
      ...application,
      type: formValues.type,
      agent: formValues.agent,
      startAt: formatDateTime(formValues.startDate, formValues.startTime),
      endAt: formatDateTime(formValues.endDate, formValues.endTime),
      reason: formValues.reason,
    }),
    [application, formValues]
  );

  function handleFieldChange(field) {
    return (event) => {
      setFormValues((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };
  }

  function handleCancelEdit() {
    setFormValues({
      type: application.type,
      agent: application.agent,
      startDate: initialStart.date,
      startTime: initialStart.time,
      endDate: initialEnd.date,
      endTime: initialEnd.time,
      reason: application.reason,
    });
    setIsEditing(false);
  }

  function handleSave(event) {
    event.preventDefault();
    setIsEditing(false);
  }

  async function handleCancelApplication() {
    const result = await Swal.fire({
      icon: 'warning',
      title: '是否確認撤銷？',
      text: '撤銷後將返回申請紀錄。',
      showCancelButton: true,
      confirmButtonText: '確認撤銷',
      cancelButtonText: '取消',
      confirmButtonColor: '#dc2626',
    });

    if (result.isConfirmed) {
      navigate('/records');
    }
  }

  return (
    <Layout title="查看申請" showBack>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Application Details */}
        <section className="bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm">
          <div className="h-1.5 bg-primary w-full"></div>
          <form className="p-8" onSubmit={handleSave}>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 border-b border-outline-variant pb-4">
              <div className="flex items-center gap-2">
                <FileText className="text-primary" size={20} />
                <h2 className="text-lg font-bold text-primary">申請詳情</h2>
              </div>
              {isEditing ? (
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-5 py-2 border border-outline rounded-lg text-secondary hover:bg-surface-container transition-colors text-sm font-bold"
                  >
                    取消修改
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container transition-colors text-sm font-bold"
                  >
                    儲存修改
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCancelApplication}
                  className="px-5 py-2 bg-error text-white rounded-lg hover:opacity-90 transition-colors text-sm font-bold"
                >
                  撤銷申請
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest">員工姓名</label>
                <div className="relative">
                  <input 
                    className="w-full h-11 px-4 bg-surface-container-low border border-outline-variant rounded-lg text-on-surface-variant cursor-not-allowed focus:ring-0" 
                    readOnly 
                    value="張小明" 
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest">類型</label>
                {isEditing ? (
                  <div className="relative">
                    <select
                      value={formValues.type}
                      onChange={handleFieldChange('type')}
                      className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm"
                    >
                      <option>事假</option>
                      <option>病假</option>
                      <option>特休 (年假)</option>
                      <option>公出</option>
                      <option>加班</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                  </div>
                ) : (
                  <div className="h-11 border-b border-outline-variant flex items-center px-1">
                    <span className="text-sm font-semibold">{displayApplication.type}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest">代理人</label>
                {isEditing ? (
                  <div className="relative">
                    <select
                      value={formValues.agent}
                      onChange={handleFieldChange('agent')}
                      className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm"
                    >
                      <option>AAA</option>
                      <option>BBB</option>
                      <option>CCC</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                  </div>
                ) : (
                  <div className="h-11 border-b border-outline-variant flex items-center px-1">
                    <span className="text-sm font-semibold">{displayApplication.agent}</span>
                  </div>
                )}
              </div>

              <div className="hidden md:block"></div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest">開始日期</label>
                {isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={formValues.startDate}
                      onChange={handleFieldChange('startDate')}
                      className="w-full h-11 border border-outline rounded-lg bg-white text-on-surface px-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                    />
                    <input
                      type="time"
                      value={formValues.startTime}
                      onChange={handleFieldChange('startTime')}
                      className="w-full h-11 border border-outline rounded-lg bg-white text-on-surface px-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                ) : (
                  <div className="h-11 border-b border-outline-variant flex items-center px-1">
                    <span className="text-sm font-semibold">{displayApplication.startAt}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest">結束日期</label>
                {isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={formValues.endDate}
                      onChange={handleFieldChange('endDate')}
                      className="w-full h-11 border border-outline rounded-lg bg-white text-on-surface px-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                    />
                    <input
                      type="time"
                      value={formValues.endTime}
                      onChange={handleFieldChange('endTime')}
                      className="w-full h-11 border border-outline rounded-lg bg-white text-on-surface px-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                ) : (
                  <div className="h-11 border-b border-outline-variant flex items-center px-1">
                    <span className="text-sm font-semibold">{displayApplication.endAt}</span>
                  </div>
                )}
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest">申請原因</label>
                {isEditing ? (
                  <textarea
                    value={formValues.reason}
                    onChange={handleFieldChange('reason')}
                    className="w-full min-h-[120px] p-4 bg-white border border-outline rounded-xl text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                  />
                ) : (
                  <div className="min-h-11 border-b border-outline-variant flex items-center py-2 px-1">
                    <span className="text-sm font-semibold">{displayApplication.reason}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Review Flow */}
            <div className="mt-10 bg-surface-container-low rounded-xl p-5 flex items-start gap-4 border border-outline-variant/30">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                <Info size={22} />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-on-surface">審核流程</div>
                <div className="text-[13px] text-on-surface-variant flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-primary">已申請</span>
                  <ChevronRight size={16} />
                  <span className="font-semibold">{displayApplication.workflowLabel}</span>
                  <span className="px-2 py-0.5 bg-error-container text-error text-[10px] font-black uppercase rounded">{displayApplication.workflowStatus}</span>
                </div>
              </div>
            </div>
          </form>
        </section>

        {displayApplication.supplementRequired ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-end">
              <h2 className="text-2xl font-bold text-on-surface">上傳補件</h2>
              <button className="bg-primary hover:bg-primary-container text-white font-bold text-sm px-8 py-2.5 rounded-lg transition-all shadow-md">上傳</button>
            </div>

            <section className="bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm p-8 space-y-8">
              <div className="bg-error-container/30 border border-error/20 rounded-xl p-5 flex items-center gap-5">
                <div className="bg-error text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-error/20 shrink-0">
                  <AlertCircle size={24} />
                </div>
                <div className="flex-1">
                  <div className="text-error font-black text-base">{displayApplication.supplementTitle}</div>
                  <div className="text-error/80 text-sm font-medium">{displayApplication.supplementDescription}</div>
                </div>
              </div>

              <div className="border border-outline-variant rounded-xl p-6 bg-surface-container-lowest shadow-inner/5">
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4">
                  <div className="flex items-center gap-2 text-secondary">
                    <Paperclip size={18} />
                    <span className="text-sm font-bold uppercase tracking-wider">附件</span>
                  </div>
                  <button className="text-primary hover:underline text-xs font-bold flex items-center gap-1 group">
                    <Plus size={14} className="group-hover:scale-125 transition-transform" />
                    <span>新增附件</span>
                  </button>
                </div>
                <div className="relative">
                  <textarea
                    className="w-full min-h-[140px] p-5 bg-surface-container-low/30 border border-outline rounded-xl font-medium text-sm placeholder:text-outline focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-all"
                    placeholder="請簡述您的情況..."
                  ></textarea>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </Layout>
  );
}
