import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { FileText, Lock, ChevronDown, Plus } from '../components/icons';
import Layout from '../components/Layout';
import {
  createApplication,
  getLeaveTypeList,
  uploadAttachment,
} from '../lib/cfctApi';
import {
  getCurrentEmployeeContext,
  getStoredDisplayName,
} from '../lib/applicationUtils';

const ACCENT_COLOR = '#dd771a';

function getTypeCode(option) {
  return option?.typeCode ?? option?.TypeCode ?? '';
}

function getTypeName(option) {
  return option?.typeName ?? option?.TypeName ?? '';
}

function getAdvanceHours(option) {
  return option?.advanceHours ?? option?.AdvanceHours ?? null;
}

function toDateTimeString(date, time) {
  return `${date}T${time}:00`;
}

function calculateHours(startAt, endAt) {
  const milliseconds = endAt.getTime() - startAt.getTime();
  return Number((milliseconds / (1000 * 60 * 60)).toFixed(2));
}

async function uploadApplicationAttachments(applicationData, files) {
  if (!files.length) {
    return;
  }

  const appSeqNo = applicationData?.seqNo;
  if (appSeqNo === undefined || appSeqNo === null || appSeqNo === '') {
    throw new Error('缺少申請編號，無法上傳附件。');
  }

  const uploaderEmpNo = applicationData?.applicantEmpNo || null;

  for (const file of files) {
    const formData = new FormData();
    formData.append('appSeqNo', String(appSeqNo));
    formData.append('kind', 'proof');
    if (uploaderEmpNo) {
      formData.append('uploaderEmpNo', String(uploaderEmpNo));
    }
    formData.append('file', file, file.name);

    console.log('[OvertimeApplication] POST /app-api/attachment', {
      appSeqNo: String(appSeqNo),
      kind: 'proof',
      uploaderEmpNo,
      fileName: file.name,
      fileSize: file.size,
    });
    const uploadResponse = await uploadAttachment(formData);
    console.log('[OvertimeApplication] upload attachment response', uploadResponse);
    if (!uploadResponse?.success) {
      throw new Error(uploadResponse?.error || `附件上傳失敗：${file.name}`);
    }
  }
}

export default function OvertimeApplication() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [overtimeTypes, setOvertimeTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [selectedOvertimeTypeCode, setSelectedOvertimeTypeCode] = useState('');
  const [selectedAgentEmpNo, setSelectedAgentEmpNo] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [remark, setRemark] = useState('');
  const [isReminderOpen, setIsReminderOpen] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedOvertimeType = useMemo(
    () => overtimeTypes.find((item) => getTypeCode(item) === selectedOvertimeTypeCode) ?? null,
    [overtimeTypes, selectedOvertimeTypeCode]
  );

  const agentOptions = useMemo(() => {
    return employees.filter((employee) => employee.employeeNo && employee.employeeNo !== currentEmployee?.employeeNo);
  }, [currentEmployee?.employeeNo, employees]);

  useEffect(() => {
    let isMounted = true;

    async function loadFormOptions() {
      setLoading(true);
      try {
        console.log('[OvertimeApplication] GET /app-api/leave-types?category=overtime');
        const [overtimeTypeResponse, employeeContext] = await Promise.all([
          getLeaveTypeList('overtime'),
          getCurrentEmployeeContext(),
        ]);
        console.log('[OvertimeApplication] overtime type response', overtimeTypeResponse);
        console.log('[OvertimeApplication] employee context response', employeeContext);

        if (!overtimeTypeResponse?.success) {
          throw new Error(overtimeTypeResponse?.error || '加班類型讀取失敗');
        }

        if (!isMounted) {
          return;
        }

        const nextOvertimeTypes = Array.isArray(overtimeTypeResponse.data) ? overtimeTypeResponse.data : [];

        setOvertimeTypes(nextOvertimeTypes);
        setEmployees(employeeContext.employees);
        setCurrentEmployee(employeeContext.currentEmployee);
        setSelectedOvertimeTypeCode(getTypeCode(nextOvertimeTypes[0]) || '');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        void Swal.fire({
          icon: 'error',
          title: '載入失敗',
          text: error instanceof Error ? error.message : '無法讀取申請表資料',
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadFormOptions();

    return () => {
      isMounted = false;
    };
  }, []);

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
            currentFile.name === file.name &&
            currentFile.size === file.size &&
            currentFile.lastModified === file.lastModified
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
    setAttachments((current) =>
      current.filter(
        (file) =>
          !(
            file.name === fileToRemove.name &&
            file.size === fileToRemove.size &&
            file.lastModified === fileToRemove.lastModified
          )
      )
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!currentEmployee?.employeeNo) {
      void Swal.fire({
        icon: 'error',
        title: '送出失敗',
        text: '找不到目前登入者對應的員工編號，請先確認員工資料與登入名稱一致。',
      });
      return;
    }

    if (!selectedOvertimeTypeCode) {
      void Swal.fire({
        icon: 'warning',
        title: '請選擇加班類型',
      });
      return;
    }

    if (!startDate || !startTime || !endTime) {
      void Swal.fire({
        icon: 'warning',
        title: '請完整填寫加班日期時間',
      });
      return;
    }

    const startAt = new Date(toDateTimeString(startDate, startTime));
    const endAt = new Date(toDateTimeString(startDate, endTime));

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      void Swal.fire({
        icon: 'warning',
        title: '日期時間錯誤',
        text: '結束時間必須晚於開始時間。',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        applicantEmpNo: currentEmployee.employeeNo,
        category: 'overtime',
        leaveTypeCode: selectedOvertimeTypeCode,
        startTime: toDateTimeString(startDate, startTime),
        endTime: toDateTimeString(startDate, endTime),
        hours: calculateHours(startAt, endAt),
        reason: reason.trim() || null,
        agentEmpNo: selectedAgentEmpNo || null,
        remark: remark.trim() || null,
      };

      console.log('[OvertimeApplication] POST /app-api/applications', { body: payload });
      const response = await createApplication(payload);
      console.log('[OvertimeApplication] create application response', response);
      if (!response?.success) {
        throw new Error(response?.error || '加班申請送出失敗');
      }

      await uploadApplicationAttachments(
        {
          ...response?.data,
          applicantEmpNo: currentEmployee.employeeNo,
        },
        attachments
      );

      let successText = `申請單號：${response?.data?.appNo || '-'}`;
      if (attachments.length) {
        successText += `。已上傳 ${attachments.length} 份附件。`;
      }

      await Swal.fire({
        icon: 'success',
        title: '提交成功',
        text: successText,
      });

      navigate('/records');
    } catch (error) {
      void Swal.fire({
        icon: 'error',
        title: '送出失敗',
        text: error instanceof Error ? error.message : '無法送出加班申請',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title="加班申請" showBack>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-3xl font-bold text-on-surface">
            <span>新增</span>
            <span className="mx-2" style={{ color: ACCENT_COLOR }}>
              加班
            </span>
            <span>申請</span>
          </h2>
        </div>

        <section className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden mb-8">
          <div className="h-1.5 w-full" style={{ backgroundColor: ACCENT_COLOR }}></div>
          <div className="p-8">
            <div className="flex items-center gap-2 mb-8 border-b border-outline-variant pb-4">
              <FileText size={20} style={{ color: ACCENT_COLOR }} />
              <h3 className="text-lg font-semibold text-on-surface">申請詳情</h3>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">員編</label>
                  <div className="relative">
                    <input
                      className="w-full h-11 px-4 bg-surface-container-low border border-outline-variant rounded-lg text-on-surface-variant cursor-not-allowed focus:ring-0"
                      readOnly
                      value={currentEmployee?.employeeNo || (loading ? '載入中...' : '找不到員編')}
                    />
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">員工姓名</label>
                  <div className="relative">
                    <input
                      className="w-full h-11 px-4 bg-surface-container-low border border-outline-variant rounded-lg text-on-surface-variant cursor-not-allowed focus:ring-0"
                      readOnly
                      value={currentEmployee?.employeeName || getStoredDisplayName() || (loading ? '載入中...' : '找不到員工資料')}
                    />
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">加班類型</label>
                  <div className="relative">
                    <select
                      value={selectedOvertimeTypeCode}
                      onChange={(event) => setSelectedOvertimeTypeCode(event.target.value)}
                      disabled={loading || saving || !overtimeTypes.length}
                      className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-[#dd771a]/20 focus:border-[#dd771a] outline-none text-on-surface text-sm disabled:bg-surface-container-low disabled:text-on-surface-variant"
                    >
                      {overtimeTypes.length ? (
                        overtimeTypes.map((option) => (
                          <option key={getTypeCode(option)} value={getTypeCode(option)}>
                            {getTypeName(option)}
                          </option>
                        ))
                      ) : (
                        <option value="">{loading ? '載入中...' : '無可用加班類型'}</option>
                      )}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                  </div>
                  {selectedOvertimeType ? (
                    <p className="text-xs" style={{ color: ACCENT_COLOR }}>
                      建議至少提前 {getAdvanceHours(selectedOvertimeType) ?? 0} 小時申請
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">代理人姓名</label>
                  <div className="relative">
                    <select
                      value={selectedAgentEmpNo}
                      onChange={(event) => setSelectedAgentEmpNo(event.target.value)}
                      disabled={loading || saving}
                      className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-[#dd771a]/20 focus:border-[#dd771a] outline-none text-on-surface text-sm disabled:bg-surface-container-low disabled:text-on-surface-variant"
                    >
                      <option value="">不指定代理人</option>
                      {agentOptions.map((employee) => (
                        <option key={employee.employeeNo} value={employee.employeeNo}>
                          {employee.employeeName}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">加班日期</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    disabled={saving}
                    className="w-full h-10 border border-outline rounded-lg bg-white text-on-surface px-3 text-sm focus:ring-1 focus:ring-[#dd771a] focus:border-[#dd771a] outline-none disabled:bg-surface-container-low"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">開始時間</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(event) => setStartTime(event.target.value)}
                        disabled={saving}
                        className="w-full h-10 border border-outline rounded-lg bg-white text-on-surface px-3 text-sm focus:ring-1 focus:ring-[#dd771a] focus:border-[#dd771a] outline-none disabled:bg-surface-container-low"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">結束時間</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(event) => setEndTime(event.target.value)}
                        disabled={saving}
                        className="w-full h-10 border border-outline rounded-lg bg-white text-on-surface px-3 text-sm focus:ring-1 focus:ring-[#dd771a] focus:border-[#dd771a] outline-none disabled:bg-surface-container-low"
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">加班事由</label>
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    rows={4}
                    disabled={saving}
                    placeholder="請輸入加班事由"
                    className="w-full border border-outline rounded-lg bg-white text-on-surface px-4 py-3 text-sm focus:ring-2 focus:ring-[#dd771a]/20 focus:border-[#dd771a] outline-none disabled:bg-surface-container-low"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">備註</label>
                  <textarea
                    value={remark}
                    onChange={(event) => setRemark(event.target.value)}
                    rows={3}
                    disabled={saving}
                    placeholder="請輸入補充說明"
                    className="w-full border border-outline rounded-lg bg-white text-on-surface px-4 py-3 text-sm focus:ring-2 focus:ring-[#dd771a]/20 focus:border-[#dd771a] outline-none disabled:bg-surface-container-low"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleOpenFilePicker}
                  className="flex items-center gap-1.5 transition-colors font-semibold text-sm"
                  style={{ color: ACCENT_COLOR }}
                >
                  <Plus size={18} />
                  <span>新增附件</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                {attachments.length ? (
                  <div className="mt-4 space-y-2">
                    {attachments.map((file) => (
                      <div
                        key={`${file.name}-${file.lastModified}-${file.size}`}
                        className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm"
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
                ) : null}
              </div>

              <div className="pt-10 flex justify-end gap-4 border-t border-outline-variant mt-8">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-10 py-2.5 border border-outline rounded-lg text-secondary hover:bg-surface-container transition-colors font-bold text-sm"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="px-10 py-2.5 text-white rounded-lg shadow-md transition-all font-bold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: ACCENT_COLOR }}
                >
                  {saving ? '提交中...' : '提交申請'}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>

      {isReminderOpen ? createPortal(
        <div
          className="fixed left-0 top-0 z-[9999] flex h-screen w-screen items-center justify-center bg-black/40 px-4"
          onClick={() => setIsReminderOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-surface-container-lowest p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-5 text-lg font-semibold text-on-surface">加班提醒</h3>
            <p className="text-sm leading-7 text-on-surface">請依加班類型規定提早送出申請，系統會依類型提供建議提前申請時數。</p>
            <p className="text-sm leading-7 text-error">※ 未依規定提出，可能導致申請失敗，請特別注意。</p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsReminderOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: ACCENT_COLOR }}
              >
                我知道了
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </Layout>
  );
}
