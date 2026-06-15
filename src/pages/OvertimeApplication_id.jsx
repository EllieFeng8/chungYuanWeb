import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, Lock, ChevronDown, Plus } from '../components/icons';
import Layout from '../components/Layout';
import TimeSelect24 from '../components/TimeSelect24';
import {
  createApplication,
  getAccountByLineUserId,
  getEmployeeList,
  getLeaveTypeList,
  uploadAttachment,
} from '../lib/cfctApi';
import { getStoredDisplayName } from '../lib/applicationUtils';

const ACCENT_COLOR = '#dd771a';
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

function getTypeCode(option) {
  return option?.typeCode ?? option?.TypeCode ?? '';
}

function getTypeName(option) {
  return option?.typeName ?? option?.TypeName ?? '';
}

function getAdvanceHours(option) {
  return option?.advanceHours ?? option?.AdvanceHours ?? null;
}

function isTravelAllowanceType(option) {
  return getTypeName(option).includes('車趟津貼');
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

    console.log('[OvertimeApplication_id] POST /app-api/attachment', {
      appSeqNo: String(appSeqNo),
      kind: 'proof',
      uploaderEmpNo,
      fileName: file.name,
      fileSize: file.size,
    });
    const uploadResponse = await uploadAttachment(formData);
    console.log('[OvertimeApplication_id] upload attachment response', uploadResponse);
    if (!uploadResponse?.success) {
      throw new Error(uploadResponse?.error || `附件上傳失敗：${file.name}`);
    }
  }
}

export default function OvertimeApplicationByLine() {
  const navigate = useNavigate();
  const { lineUserId = '' } = useParams();
  const fileInputRef = useRef(null);
  const [overtimeTypes, setOvertimeTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [selectedOvertimeTypeCode, setSelectedOvertimeTypeCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [remark, setRemark] = useState('');
  const [amount, setAmount] = useState('');
  const [isReminderOpen, setIsReminderOpen] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);

  const selectedOvertimeType = useMemo(
    () => overtimeTypes.find((item) => getTypeCode(item) === selectedOvertimeTypeCode) ?? null,
    [overtimeTypes, selectedOvertimeTypeCode]
  );
  const isTravelAllowance = useMemo(
    () => isTravelAllowanceType(selectedOvertimeType),
    [selectedOvertimeType]
  );

  const currentDepartmentName = useMemo(
    () => currentEmployee?.departmentName || '-',
    [currentEmployee?.departmentName]
  );

  const currentManagerName = useMemo(() => {
    if (currentEmployee?.managerEmpName) {
      return currentEmployee.managerEmpName;
    }

    const matchedManager = employees.find(
      (employee) => employee.employeeNo && employee.employeeNo === currentEmployee?.managerEmpNo
    );

    return matchedManager?.employeeName || currentEmployee?.managerEmpNo || '-';
  }, [currentEmployee?.managerEmpName, currentEmployee?.managerEmpNo, employees]);

  const totalOvertimeHours = useMemo(() => {
    if (!startDate || !startTime || !endTime) {
      return '';
    }

    const startAt = new Date(toDateTimeString(startDate, startTime));
    const endAt = new Date(toDateTimeString(startDate, endTime));

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      return '';
    }

    return calculateHours(startAt, endAt);
  }, [startDate, startTime, endTime]);

  useEffect(() => {
    let isMounted = true;

    async function loadFormOptions() {
      setLoading(true);
      setIsSessionReady(false);
      try {
        if (!lineUserId.trim()) {
          throw new Error('缺少 lineUserId，無法載入加班申請資料。');
        }

        localStorage.setItem(LINE_USER_ID_STORAGE_KEY, lineUserId.trim());
        sessionStorage.removeItem(LINE_USER_ID_STORAGE_KEY);

        console.log('[OvertimeApplication_id] GET /app-api/leave-types?category=overtime');
        const [overtimeTypeResponse, employeeResponse, accountResponse] = await Promise.all([
          getLeaveTypeList('overtime'),
          getEmployeeList(),
          getAccountByLineUserId(lineUserId),
        ]);
        console.log('[OvertimeApplication_id] overtime type response', overtimeTypeResponse);
        console.log('[OvertimeApplication_id] employee list response', employeeResponse);
        console.log('[OvertimeApplication_id] account by line response', accountResponse);

        if (!overtimeTypeResponse?.success) {
          throw new Error(overtimeTypeResponse?.error || '加班類型讀取失敗');
        }
        if (!employeeResponse?.success) {
          throw new Error(employeeResponse?.error || '員工資料讀取失敗');
        }
        if (!accountResponse?.success || !accountResponse?.data) {
          throw new Error(accountResponse?.error || 'LINE 綁定帳號讀取失敗');
        }

        if (!isMounted) {
          return;
        }

        persistLineLoginSession(accountResponse.data, lineUserId.trim());

        const nextOvertimeTypes = Array.isArray(overtimeTypeResponse.data) ? overtimeTypeResponse.data : [];
        const nextEmployees = Array.isArray(employeeResponse.data) ? employeeResponse.data : [];
        const matchedEmployee = nextEmployees.find(
          (employee) => String(employee.employeeNo || '').trim() === String(accountResponse.data.employeeNo || accountResponse.data.accountName || '').trim()
        );
        const matchedManager = nextEmployees.find(
          (employee) => String(employee.employeeNo || '').trim() === String(matchedEmployee?.managerEmpNo || '').trim()
        );
        const nextCurrentEmployee = {
          employeeNo: accountResponse.data.employeeNo || accountResponse.data.accountName || '',
          employeeName: accountResponse.data.displayName || '',
          departmentName: matchedEmployee?.departmentName || '',
          managerEmpNo: matchedEmployee?.managerEmpNo || '',
          managerEmpName: matchedEmployee?.managerEmpName || matchedManager?.employeeName || '',
          lineUserId: lineUserId.trim(),
        };

        setOvertimeTypes(nextOvertimeTypes);
        setEmployees(nextEmployees);
        setCurrentEmployee(nextCurrentEmployee);
        setSelectedOvertimeTypeCode(getTypeCode(nextOvertimeTypes[0]) || '');
        setIsSessionReady(true);
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
  }, [lineUserId]);

  if (!isSessionReady && loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-[#dd771a]/20 bg-surface-container-lowest p-6 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-[#dd771a]/30 border-t-[#dd771a] animate-spin" />
            <div className="space-y-1">
              <div className="text-base font-bold" style={{ color: ACCENT_COLOR }}>正在識別 LINE 登入者</div>
              <p className="text-sm text-on-surface-variant">
                正在根據 `lineUserId` 載入帳號資料並建立登入狀態。
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

    if (!reason.trim()) {
      void Swal.fire({
        icon: 'warning',
        title: '請填寫加班事由',
      });
      return;
    }

    if (isTravelAllowance) {
      const parsedAmount = Number(amount);
      if (!amount.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        void Swal.fire({
          icon: 'warning',
          title: '請填寫金額',
          text: '車趟津貼請輸入大於 0 的金額。',
        });
        return;
      }
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
        hours: isTravelAllowance ? 0 : calculateHours(startAt, endAt),
        allowance: isTravelAllowance ? Number(amount) : null,
        reason: reason.trim() || null,
        remark: remark.trim() || null,
      };

      console.log('[OvertimeApplication_id] POST /app-api/applications', { body: payload });
      const response = await createApplication(payload);
      console.log('[OvertimeApplication_id] create application response', response);
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
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">部門</label>
                  <div className="relative">
                    <input
                      className="w-full h-11 px-4 bg-surface-container-low border border-outline-variant rounded-lg text-on-surface-variant cursor-not-allowed focus:ring-0"
                      readOnly
                      value={currentDepartmentName}
                    />
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">部門主管</label>
                  <div className="relative">
                    <input
                      className="w-full h-11 px-4 bg-surface-container-low border border-outline-variant rounded-lg text-on-surface-variant cursor-not-allowed focus:ring-0"
                      readOnly
                      value={currentManagerName}
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
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    加班日期 <span className="text-error">*</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    required
                    disabled={saving}
                    className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-[#dd771a]/20 focus:border-[#dd771a] outline-none text-on-surface text-sm disabled:bg-surface-container-low disabled:text-on-surface-variant"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        開始時間 <span className="text-error">*</span>
                      </label>
                      <TimeSelect24
                        value={startTime}
                        onChange={setStartTime}
                        disabled={saving}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        結束時間 <span className="text-error">*</span>
                      </label>
                      <TimeSelect24
                        value={endTime}
                        onChange={setEndTime}
                        disabled={saving}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    {isTravelAllowance ? '金額' : '總加班時數'}
                  </label>
                  {isTravelAllowance ? (
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        disabled={saving}
                        placeholder="請輸入金額"
                        className="w-full h-11 rounded-lg border border-outline bg-white px-4 pr-12 text-sm text-on-surface outline-none focus:border-[#dd771a] focus:ring-2 focus:ring-[#dd771a]/20 disabled:bg-surface-container-low"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">元</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        readOnly
                        value={totalOvertimeHours === '' ? '' : `${totalOvertimeHours} 小時`}
                        placeholder="請先選擇開始與結束時間"
                        className="w-full h-11 px-4 bg-surface-container-low border border-outline-variant rounded-lg text-on-surface-variant cursor-not-allowed focus:ring-0"
                      />
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    加班事由 <span className="text-error">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    rows={4}
                    required
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

              <div className="mt-8 flex flex-nowrap justify-end gap-4 border-t border-outline-variant pt-10">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 px-4 py-2.5 text-center border border-outline rounded-lg text-secondary hover:bg-surface-container transition-colors font-bold text-sm sm:flex-none sm:px-10"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="flex-1 px-4 py-2.5 text-center text-white rounded-lg shadow-md transition-all font-bold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed sm:flex-none sm:px-10"
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
            <p className="text-sm leading-7 text-on-surface">請依加班及請假規範，於建議時限內完成申請。</p>
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
