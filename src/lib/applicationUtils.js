import { getAccountDetail, getEmployeeList } from './cfctApi';

export const ACCOUNT_NAME_STORAGE_KEY = 'loginAccountName';
export const ACCOUNT_SEQNO_STORAGE_KEY = 'loginAccountSeqNo';
export const DISPLAY_NAME_STORAGE_KEY = 'loginDisplayName';

export function getStoredDisplayName() {
  return (
    localStorage.getItem(DISPLAY_NAME_STORAGE_KEY)
    || sessionStorage.getItem(DISPLAY_NAME_STORAGE_KEY)
    || ''
  );
}

export function getStoredAccountName() {
  return (
    localStorage.getItem(ACCOUNT_NAME_STORAGE_KEY)
    || sessionStorage.getItem(ACCOUNT_NAME_STORAGE_KEY)
    || ''
  );
}

export function getStoredAccountSeqNo() {
  return (
    localStorage.getItem(ACCOUNT_SEQNO_STORAGE_KEY)
    || sessionStorage.getItem(ACCOUNT_SEQNO_STORAGE_KEY)
    || ''
  );
}

export function resolveCurrentEmployee(employees, accountName, accountDetail) {
  if (!Array.isArray(employees) || !employees.length) {
    return null;
  }

  const normalizedAccountName = accountName.trim().toLowerCase();
  const detailEmployeeNo = String(accountDetail?.employeeNo || '').trim().toLowerCase();

  if (detailEmployeeNo) {
    const matchedByDetailEmployeeNo = employees.find(
      (employee) => String(employee.employeeNo || '').trim().toLowerCase() === detailEmployeeNo
    );
    if (matchedByDetailEmployeeNo) {
      return matchedByDetailEmployeeNo;
    }
  }

  if (!normalizedAccountName) {
    return null;
  }

  return employees.find((employee) => {
    const candidateValues = [
      employee.employeeNo,
      employee.accountName,
      employee.loginAccount,
      employee.username,
      employee.userName,
    ];

    return candidateValues.some(
      (value) => String(value || '').trim().toLowerCase() === normalizedAccountName
    );
  }) ?? null;
}

export async function getCurrentEmployeeContext() {
  const storedAccountSeqNo = getStoredAccountSeqNo();
  const storedAccountName = getStoredAccountName();

  if (!storedAccountSeqNo) {
    throw new Error('缺少登入帳號資訊，請重新登入。');
  }

  const [accountDetailResponse, employeeResponse] = await Promise.all([
    getAccountDetail(storedAccountSeqNo),
    getEmployeeList(),
  ]);

  if (!accountDetailResponse?.success) {
    throw new Error(accountDetailResponse?.error || '帳號資料讀取失敗');
  }
  if (!employeeResponse?.success) {
    throw new Error(employeeResponse?.error || '員工資料讀取失敗');
  }

  const employees = Array.isArray(employeeResponse.data) ? employeeResponse.data : [];
  const accountDetail = accountDetailResponse.data || null;
  const currentEmployee = resolveCurrentEmployee(
    employees,
    storedAccountName,
    accountDetail
  );

  if (!currentEmployee?.employeeNo) {
    throw new Error('找不到目前登入者對應的員工編號。');
  }

  return {
    storedAccountName,
    storedAccountSeqNo,
    accountDetail,
    employees,
    currentEmployee,
  };
}

export function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

export function formatDateOnly(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

export function formatTimeOnly(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function getApplicationStatusLabel(status) {
  switch (status) {
    case 'pending':
      return '審核中';
    case 'approved':
      return '已核准';
    case 'need_supplement':
      return '待補件';
    case 'rejected':
      return '已駁回';
    case 'cancelled':
      return '已撤銷';
    default:
      return status || '-';
  }
}

export function getApplicationStatusStyles(status) {
  switch (status) {
    case 'pending':
      return 'bg-blue-50 text-blue-700 border-blue-100';
    case 'approved':
      return 'bg-primary/10 text-primary border-primary/20';
    case 'need_supplement':
      return 'bg-tertiary-fixed text-on-tertiary-fixed-variant border-tertiary/20';
    case 'rejected':
      return 'bg-error-container text-on-error-container border-error/10';
    case 'cancelled':
      return 'bg-surface-container text-secondary border-outline-variant';
    default:
      return 'bg-surface-container text-secondary border-outline-variant';
  }
}

export function getApplicationDotColor(category) {
  switch (category) {
    case 'overtime':
      return 'bg-tertiary';
    case 'leave':
      return 'bg-primary';
    default:
      return 'bg-outline';
  }
}

export function getApplicationTypeName(application) {
  return (
    application?.leaveTypeName
    || application?.typeName
    || application?.leaveTypeCode
    || '-'
  );
}

export function getApplicationPeriod(application) {
  const start = application?.startTime;
  const end = application?.endTime;
  return {
    startDate: formatDateOnly(start),
    startTime: formatTimeOnly(start),
    endDate: formatDateOnly(end),
    endTime: formatTimeOnly(end),
  };
}
