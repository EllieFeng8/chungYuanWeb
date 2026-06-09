import { useEffect, useMemo, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  FileText,
  Lock,
  Info,
  AlertCircle,
  ChevronRight,
  Plus,
  Paperclip,
  ExternalLink,
} from '../components/icons';
import Layout from '../components/Layout';
import {
  cancelApplication,
  getAttachmentDownloadUrl,
  getAttachmentList,
  getApplicationDetail,
  getEmployeeList,
  supplementApplication,
  uploadAttachment,
} from '../lib/cfctApi';
import {
  formatDateTime,
  getApplicationPeriod,
  getApplicationStatusLabel,
  getApplicationStatusStyles,
  getApplicationTypeName,
  getStoredDisplayName,
} from '../lib/applicationUtils';

function buildStepLabel(steps) {
  const currentStep = Array.isArray(steps)
    ? steps.find((step) => step.stepState === 'pending')
    : null;

  if (!currentStep) {
    return '流程已完成';
  }

  return `承辦人: ${currentStep.approverName || currentStep.approverEmpNo || '-'}`;
}

export default function ViewApplication() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const fileInputRef = useRef(null);
  const [application, setApplication] = useState(location.state?.application ?? null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(!location.state?.application);
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');

  async function loadAttachments(appSeqNo) {
    if (!appSeqNo) {
      setExistingAttachments([]);
      return;
    }

    setAttachmentLoading(true);
    setAttachmentError('');
    try {
      const attachmentResponse = await getAttachmentList(appSeqNo);
      if (!attachmentResponse?.success) {
        throw new Error(attachmentResponse?.error || '附件列表讀取失敗');
      }

      setExistingAttachments(Array.isArray(attachmentResponse.data) ? attachmentResponse.data : []);
    } catch (error) {
      setExistingAttachments([]);
      setAttachmentError(error instanceof Error ? error.message : '無法讀取附件列表');
    } finally {
      setAttachmentLoading(false);
    }
  }

  async function loadApplicationDetail() {
    setLoading(true);
    try {
      const [detailResponse, employeeResponse] = await Promise.all([
        getApplicationDetail(id),
        getEmployeeList(),
      ]);

      if (!detailResponse?.success) {
        throw new Error(detailResponse?.error || '申請明細讀取失敗');
      }
      if (!employeeResponse?.success) {
        throw new Error(employeeResponse?.error || '員工資料讀取失敗');
      }

      const nextApplication = detailResponse.data || null;
      setApplication(nextApplication);
      setEmployees(Array.isArray(employeeResponse.data) ? employeeResponse.data : []);
      await loadAttachments(nextApplication?.seqNo || id);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const [detailResponse, employeeResponse] = await Promise.all([
          getApplicationDetail(id),
          getEmployeeList(),
        ]);

        if (!detailResponse?.success) {
          throw new Error(detailResponse?.error || '申請明細讀取失敗');
        }
        if (!employeeResponse?.success) {
          throw new Error(employeeResponse?.error || '員工資料讀取失敗');
        }

        if (!isMounted) {
          return;
        }

        const nextApplication = detailResponse.data || null;
        setApplication(nextApplication);
        setEmployees(Array.isArray(employeeResponse.data) ? employeeResponse.data : []);
        void loadAttachments(nextApplication?.seqNo || id);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        void Swal.fire({
          icon: 'error',
          title: '讀取失敗',
          text: error instanceof Error ? error.message : '無法讀取申請明細',
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const applicantName = useMemo(() => {
    if (!application?.applicantEmpNo) {
      return getStoredDisplayName() || '-';
    }

    const matchedEmployee = employees.find(
      (employee) => employee.employeeNo === application.applicantEmpNo
    );

    return matchedEmployee?.employeeName || getStoredDisplayName() || application.applicantEmpNo;
  }, [application?.applicantEmpNo, employees]);

  if (loading) {
    return (
      <Layout title="查看申請" showBack>
        <div className="max-w-4xl mx-auto">
          <section className="bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm p-8">
            <p className="text-sm text-on-surface-variant">申請明細載入中...</p>
          </section>
        </div>
      </Layout>
    );
  }

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

  const period = getApplicationPeriod(application);
  const statusLabel = getApplicationStatusLabel(application.status);
  const workflowLabel = buildStepLabel(application.steps);
  const agentName = employees.find((employee) => employee.employeeNo === application.agentEmpNo)?.employeeName
    || application.agentEmpNo
    || '未指定';
  const applicantEmpNo = application.applicantEmpNo || location.state?.employeeNo || '';
  const canCancel = application.status === 'pending' || application.status === 'agent_pending';
  const canSupplement = application.status === 'need_supplement';

  function handleOpenFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event) {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (!selectedFiles.length) {
      return;
    }

    setAttachments((current) => {
      const nextFiles = [...current];

      selectedFiles.forEach((file) => {
        const exists = nextFiles.some(
          (currentFile) =>
            currentFile.name === file.name
            && currentFile.size === file.size
            && currentFile.lastModified === file.lastModified
        );

        if (!exists) {
          nextFiles.push(file);
        }
      });

      return nextFiles;
    });

    event.target.value = '';
  }

  function handleRemoveAttachment(fileToRemove) {
    setAttachments((current) => current.filter(
      (file) => !(
        file.name === fileToRemove.name
        && file.size === fileToRemove.size
        && file.lastModified === fileToRemove.lastModified
      )
    ));
  }

  async function handleApplicationAction(action) {
    if (!id) {
      return;
    }

    if (!applicantEmpNo) {
      void Swal.fire({
        icon: 'error',
        title: '操作失敗',
        text: '找不到申請人員工編號。',
      });
      return;
    }

    const isCancel = action === 'cancel';
    if (!isCancel && !attachments.length) {
      void Swal.fire({
        icon: 'warning',
        title: '請先選擇補件附件',
        text: '補件需先上傳至少一個附件。',
      });
      return;
    }

    const result = await Swal.fire({
      icon: 'question',
      title: isCancel ? '確認撤銷申請？' : '確認送出補件？',
      text: isCancel
        ? '撤銷後此申請會改為已撤銷。'
        : '送出後會將申請重新送回簽核流程。',
      showCancelButton: true,
      confirmButtonText: isCancel ? '確認撤銷' : '確認補件',
      cancelButtonText: '取消',
      confirmButtonColor: isCancel ? '#dc2626' : '#0f766e',
    });

    if (!result.isConfirmed) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        applicantEmpNo,
        ...(typeof application?.rowVer === 'number' ? { rowVer: application.rowVer } : {}),
      };

      if (isCancel) {
        await cancelApplication(id, payload);
      } else {
        for (const file of attachments) {
          const formData = new FormData();
          formData.append('appSeqNo', String(application?.seqNo || id));
          formData.append('kind', 'supplement');
          formData.append('uploaderEmpNo', applicantEmpNo);
          formData.append('file', file, file.name);

          const uploadResponse = await uploadAttachment(formData);
          if (!uploadResponse?.success) {
            throw new Error(uploadResponse?.error || `附件上傳失敗：${file.name}`);
          }
        }

        await supplementApplication(id, payload);
      }

      await loadApplicationDetail();
      if (!isCancel) {
        setAttachments([]);
      }
      void Swal.fire({
        icon: 'success',
        title: isCancel ? '撤銷成功' : '補件成功',
        text: isCancel ? undefined : `已上傳 ${attachments.length} 份附件。`,
        showConfirmButton: false,
        timer: 1200,
      });
    } catch (error) {
      void Swal.fire({
        icon: 'error',
        title: isCancel ? '撤銷失敗' : '補件失敗',
        text: error instanceof Error ? error.message : '操作失敗',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout title="查看申請" showBack>
      <div className="max-w-4xl mx-auto space-y-8">
        <section className="bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm">
          <div className="h-1.5 bg-primary w-full"></div>
          <div className="p-8">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 border-b border-outline-variant pb-4">
              <div className="flex items-center gap-2">
                <FileText className="text-primary" size={20} />
                <h2 className="text-lg font-bold text-primary">申請詳情</h2>
              </div>
              {canCancel || canSupplement ? (
                <div className="flex flex-wrap gap-3">
                  {canCancel ? (
                    <button
                      type="button"
                      onClick={() => void handleApplicationAction('cancel')}
                      disabled={submitting}
                      className="rounded-lg bg-error px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      撤銷
                    </button>
                  ) : null}
                  {canSupplement ? (
                    <>
                      <button
                        type="button"
                        onClick={handleOpenFilePicker}
                        disabled={submitting}
                        className="inline-flex items-center gap-1 rounded-lg border border-tertiary px-4 py-2 text-sm font-bold text-tertiary transition-colors hover:bg-tertiary/10 disabled:opacity-50"
                      >
                        <Plus size={16} />
                        新增補件附件
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleApplicationAction('supplement')}
                        disabled={submitting}
                        className="rounded-lg bg-tertiary px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        補件
                      </button>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
            {canSupplement ? (
              <div className="mb-8 space-y-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="text-sm font-semibold text-on-surface">補件附件</div>
                <p className="text-xs text-on-surface-variant">
                  先上傳附件，送出補件後會以 `kind=supplement` 關聯到此申請。
                </p>
                {attachments.length ? (
                  <div className="space-y-2">
                    {attachments.map((file) => (
                      <div
                        key={`${file.name}-${file.lastModified}-${file.size}`}
                        className="flex items-center justify-between rounded-lg border border-outline-variant bg-white px-4 py-3 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium text-on-surface">{file.name}</div>
                          <div className="text-xs text-on-surface-variant">
                            {(file.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(file)}
                          className="text-xs font-bold text-secondary transition-colors hover:text-error"
                        >
                          移除
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-on-surface-variant">尚未選擇補件附件</div>
                )}
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest">員工姓名</label>
                <div className="relative">
                  <input
                    className="w-full h-11 px-4 bg-surface-container-low border border-outline-variant rounded-lg text-on-surface-variant cursor-not-allowed focus:ring-0"
                    readOnly
                    value={applicantName}
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest">類型</label>
                <div className="h-11 border-b border-outline-variant flex items-center px-1">
                  <span className="text-sm font-semibold">{getApplicationTypeName(application)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest">代理人</label>
                <div className="h-11 border-b border-outline-variant flex items-center px-1">
                  <span className="text-sm font-semibold">{agentName}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest">申請時間</label>
                <div className="h-11 border-b border-outline-variant flex items-center px-1">
                  <span className="text-sm font-semibold">{formatDateTime(application.createdAt || application.submittedAt)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest">開始日期</label>
                <div className="h-11 border-b border-outline-variant flex items-center px-1">
                  <span className="text-sm font-semibold">{period.startDate} {period.startTime}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest">結束日期</label>
                <div className="h-11 border-b border-outline-variant flex items-center px-1">
                  <span className="text-sm font-semibold">{period.endDate} {period.endTime}</span>
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest">申請原因</label>
                <div className="min-h-11 border-b border-outline-variant flex items-center py-2 px-1">
                  <span className="text-sm font-semibold">{application.reason || '-'}</span>
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest">備註</label>
                <div className="min-h-11 border-b border-outline-variant flex items-center py-2 px-1">
                  <span className="text-sm font-semibold">{application.remark || '-'}</span>
                </div>
              </div>
            </div>

            <div className="mt-10 bg-surface-container-low rounded-xl p-5 flex items-start gap-4 border border-outline-variant/30">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                <Info size={22} />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-on-surface">審核流程</div>
                <div className="text-[13px] text-on-surface-variant flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-primary">已申請</span>
                  <ChevronRight size={16} />
                  <span className="font-semibold">{workflowLabel}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded border ${getApplicationStatusStyles(application.status)}`}>
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {Array.isArray(application.steps) && application.steps.length ? (
          <section className="bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm p-8 space-y-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-primary" size={20} />
              <h2 className="text-lg font-bold text-primary">簽核時間軸</h2>
            </div>

            <div className="space-y-4">
              {application.steps.map((step) => (
                <div key={`${step.stepOrder}-${step.approverEmpNo}`} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold text-on-surface">第 {step.stepOrder} 關</div>
                      <div className="text-sm text-on-surface-variant">
                        {step.approverName || step.approverEmpNo || '-'}
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getApplicationStatusStyles(step.stepState)}`}>
                      {getApplicationStatusLabel(step.stepState)}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-on-surface-variant">
                    處理時間：{formatDateTime(step.actedAt)}
                  </div>
                  {step.comment ? (
                    <div className="mt-2 text-sm text-on-surface">{step.comment}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm p-8 space-y-6">
          <div className="flex items-center gap-2">
            <Paperclip className="text-primary" size={20} />
            <h2 className="text-lg font-bold text-primary">附件</h2>
          </div>

          {attachmentLoading ? (
            <p className="text-sm text-on-surface-variant">附件列表載入中...</p>
          ) : attachmentError ? (
            <p className="text-sm text-error">{attachmentError}</p>
          ) : existingAttachments.length ? (
            <div className="space-y-3">
              {existingAttachments.map((attachment) => {
                const attachmentSeqNo = attachment?.seqNo ?? attachment?.SeqNo;
                const fileName = attachment?.fileName || attachment?.FileName || `附件 ${attachmentSeqNo}`;
                const fileSize = attachment?.fileSize ?? attachment?.FileSize;
                const uploadedAt = attachment?.uploadedAt || attachment?.createTime || attachment?.CreatedAt;
                return (
                  <div
                    key={String(attachmentSeqNo)}
                    className="flex items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-on-surface">{fileName}</div>
                      <div className="mt-1 text-xs text-on-surface-variant">
                        {fileSize ? `${(Number(fileSize) / 1024).toFixed(1)} KB` : '大小未提供'}
                        {' · '}
                        {formatDateTime(uploadedAt)}
                      </div>
                    </div>
                    <a
                      href={getAttachmentDownloadUrl(attachmentSeqNo)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-outline px-3 py-2 text-sm font-bold text-secondary transition-colors hover:bg-surface-container"
                    >
                      <ExternalLink size={16} />
                      下載
                    </a>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">目前沒有附件。</p>
          )}
        </section>
      </div>
    </Layout>
  );
}
