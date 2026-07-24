const API_BASE = import.meta.env.VITE_APP_API_BASE || '';

async function request(path, init = {}) {
  const isFormDataBody = typeof FormData !== 'undefined' && init.body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(!isFormDataBody && init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  const rawBody = await response.text();
  let body = null;

  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = rawBody;
    }
  }

  if (!response.ok) {
    throw new Error(
      (body && typeof body === 'object' && body.error) || rawBody || '請求失敗',
    );
  }

  return body;
}

export function getHealth() {
  return request('/app-api/health');
}

export function getLeaveTypeList(category) {
  return request(`/app-api/leave-types?category=${encodeURIComponent(category)}`);
}

export function createApplication(payload) {
  return request('/app-api/applications', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function uploadAttachment(formData) {
  return request('/app-api/attachment', {
    method: 'POST',
    body: formData,
  });
}

export function getAttachmentList(appSeqNo) {
  return request(`/app-api/attachments?appSeqNo=${encodeURIComponent(appSeqNo)}`);
}

export function getAttachmentDownloadUrl(seqNo) {
  return `${API_BASE}/app-api/attachments/${encodeURIComponent(seqNo)}/download`;
}

export function getHrApplicationList(filters = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      searchParams.set(key, String(value).trim());
    }
  });

  return request(`/app-api/hr/applications?${searchParams.toString()}`);
}

export function getHrApplicationExportUrl(filters = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      searchParams.set(key, String(value).trim());
    }
  });

  const query = searchParams.toString();
  return `${API_BASE}/app-api/hr/application/export${query ? `?${query}` : ''}`;
}

export function getMyApplications(employeeNo) {
  return request(`/app-api/applications/mine?employeeNo=${encodeURIComponent(employeeNo)}`);
}

export function getApplicationDetail(seqNo) {
  return request(`/app-api/applications/${seqNo}`);
}

export function cancelApplication(seqNo, payload) {
  return request(`/app-api/applications/${seqNo}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function supplementApplication(seqNo, payload) {
  return request(`/app-api/applications/${seqNo}/supplement`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getAgentRequestInbox(employeeNo) {
  return request(`/app-api/agent-request/inbox?employeeNo=${encodeURIComponent(employeeNo)}`);
}

export function acceptAgentRequest(seqNo, payload) {
  return request(`/app-api/agent-request/${seqNo}/accept`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function rejectAgentRequest(seqNo, payload) {
  return request(`/app-api/agent-request/${seqNo}/reject`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getDeptApprovalList(employeeNo, status = '') {
  const searchParams = new URLSearchParams({
    employeeNo,
    status,
  });

  return request(`/app-api/approval/dept-list?${searchParams.toString()}`);
}

export function getApprovalInbox(employeeNo) {
  const searchParams = new URLSearchParams({
    employeeNo,
  });

  return request(`/app-api/approval/inbox?${searchParams.toString()}`);
}

export function approveApplication(seqNo, payload) {
  return request(`/app-api/approval/${seqNo}/approve`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function adminApproveApplication(seqNo, payload) {
  return request(`/app-api/approval/${seqNo}/admin-approve`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function rejectApplication(seqNo, payload) {
  return request(`/app-api/approval/${seqNo}/reject`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function adminRejectApplication(seqNo, payload) {
  return request(`/app-api/approval/${seqNo}/admin-reject`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function returnApplication(seqNo, payload) {
  return request(`/app-api/approval/${seqNo}/return`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function adminReturnApplication(seqNo, payload) {
  return request(`/app-api/approval/${seqNo}/admin-return`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function getAccounts(includeAll = true) {
  return request(`/app-api/accounts?includeAll=${includeAll ? 'true' : 'false'}`);
}

export function getAccountDetail(seqNo) {
  return request(`/app-api/accounts/${seqNo}`);
}

export function getAccountByLineUserId(lineUserId) {
  return request(`/app-api/accounts/by-line/${encodeURIComponent(lineUserId)}`);
}

export function createAccount(payload) {
  return request('/app-api/accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function revokeApiKey(seqNo, payload = {}) {
  return request(`/app-api/api-key/${seqNo}/revoke`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function updateAccountRole(seqNo, payload) {
  return request(`/app-api/accounts/${seqNo}/role`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function updateAccountProfile(seqNo, payload) {
  return request(`/app-api/accounts/${seqNo}/profile`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function updateAccountOrg(seqNo, payload) {
  return request(`/app-api/accounts/${seqNo}/org`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function resetAccountPassword(seqNo, payload) {
  return request(`/app-api/accounts/${seqNo}/password-reset`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function updateAccountLineBinding(seqNo, payload) {
  return request(`/app-api/accounts/${seqNo}/line-binding`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function unlockAccount(seqNo, payload) {
  return request(`/app-api/accounts/${seqNo}/unlock`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteAccount(seqNo, payload) {
  return request(`/app-api/accounts/${seqNo}`, {
    method: 'DELETE',
    body: JSON.stringify(payload),
  });
}

export function getActiveLineUsers() {
  return request('/app-api/line-users/active');
}

export function getEmployeeList() {
  return request('/app-api/employees');
}

export function getEmployeeDetail(seqNo) {
  return request(`/app-api/employees/${seqNo}`);
}

export function createEmployee(payload) {
  return request('/app-api/employees', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateEmployee(seqNo, payload) {
  return request(`/app-api/employees/${seqNo}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteEmployee(seqNo, payload) {
  return request(`/app-api/employees/${seqNo}`, {
    method: 'DELETE',
    body: JSON.stringify(payload),
  });
}

export function getDepartmentList() {
  return request('/app-api/departments');
}

export function getDepartmentDetail(seqNo) {
  return request(`/app-api/departments/${seqNo}`);
}

export function createDepartment(payload) {
  return request('/app-api/departments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateDepartment(seqNo, payload) {
  return request(`/app-api/departments/${seqNo}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteDepartment(seqNo, payload) {
  return request(`/app-api/departments/${seqNo}`, {
    method: 'DELETE',
    body: JSON.stringify(payload),
  });
}
