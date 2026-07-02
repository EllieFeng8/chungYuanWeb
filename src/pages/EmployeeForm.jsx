import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { User, ShieldCheck, ChevronDown, KeyRound, Link2, LockKeyhole, Trash2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from '../components/Layout';
import {
  createAccount,
  deleteAccount,
  getAccountDetail,
  getActiveLineUsers,
  getDepartmentList,
  getEmployeeDetail,
  getEmployeeList,
  resetAccountPassword,
  unlockAccount,
  updateAccountLineBinding,
  updateAccountOrg,
  updateAccountProfile,
  updateAccountRole,
} from '../lib/cfctApi';

const ACCOUNT_ROLE_LABELS = {
    admin: '系統管理員',
    manager: '部門主管',
    member: '一般員工',
    block: '封鎖',
};

const DISPLAY_NAME_STORAGE_KEY = 'loginDisplayName';
const ACCOUNT_SEQNO_STORAGE_KEY = 'loginAccountSeqNo';
const EMPLOYEE_ROLE_LABELS = {
    admin: '系統管理員',
    manager: '部門主管',
    member: '一般員工',
    block: '封鎖',
};
const EMPTY_EMPLOYEE_FORM = {
    employeeNo: '',
    employeeName: '',
    departmentNo: '',
    managerEmpNo: '',
    agent1EmpNo: '',
    agent2EmpNo: '',
    lineUserId: '',
    role: '',
    workStatus: 'active',
};

export default function EmployeeForm({ mode = "add" }) {
    const location = useLocation();
    const navigate = useNavigate();
    const employee = location.state?.employee;
    const accountSeed = location.state?.account;
    const routeMode = location.state?.mode;
    const isAccountMode = routeMode === 'account-edit';
    const isEmployeeEditMode = routeMode === 'edit' || mode === 'edit';
    const isEditMode = isEmployeeEditMode || isAccountMode;
    const [accountDetail, setAccountDetail] = useState(accountSeed ?? null);
    const [accountLoading, setAccountLoading] = useState(isAccountMode);
    const [lineUsers, setLineUsers] = useState([]);
    const [accountRole, setAccountRole] = useState(accountSeed?.role ?? 'member');
    const [accountDisplayName, setAccountDisplayName] = useState(accountSeed?.displayName ?? '');
    const [accountLineUserId, setAccountLineUserId] = useState(accountSeed?.lineUserId ?? '');
    const [accountSaving, setAccountSaving] = useState(false);
    const [employeeDirectory, setEmployeeDirectory] = useState([]);
    const [departmentDirectory, setDepartmentDirectory] = useState([]);
    const [employeeDetail, setEmployeeDetail] = useState(employee ?? null);
    const [employeeFormLoading, setEmployeeFormLoading] = useState(!isAccountMode);
    const [employeeSaving, setEmployeeSaving] = useState(false);
    const [employeeForm, setEmployeeForm] = useState(() => ({
        ...EMPTY_EMPLOYEE_FORM,
        employeeNo: employee?.employeeNo ?? '',
        employeeName: employee?.employeeName ?? employee?.name ?? '',
        departmentNo: employee?.departmentNo ?? '',
        managerEmpNo: employee?.managerEmpNo ?? '',
        agent1EmpNo: employee?.agent1EmpNo ?? '',
        agent2EmpNo: employee?.agent2EmpNo ?? '',
        lineUserId: employee?.lineUserId ?? '',
        role: employee?.role ?? '',
        workStatus: employee?.workStatus ?? 'active',
    }));
    const employeeSeqNo = employee?.employeeSeqNo ?? employee?.seqNo ?? null;
    const employeeAccountSeqNo = employee?.accountSeqNo ?? null;

    function syncStoredDisplayName(seqNo, displayName) {
        const normalizedSeqNo = String(seqNo);

        if (localStorage.getItem(ACCOUNT_SEQNO_STORAGE_KEY) === normalizedSeqNo) {
            localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, displayName || '');
        }

        if (sessionStorage.getItem(ACCOUNT_SEQNO_STORAGE_KEY) === normalizedSeqNo) {
            sessionStorage.setItem(DISPLAY_NAME_STORAGE_KEY, displayName || '');
        }
    }

    useEffect(() => {
        if (!isAccountMode || !accountSeed?.seqNo) {
            return;
        }

        let active = true;
        setAccountLoading(true);

        void (async () => {
            try {
                console.log('[EmployeeForm] GET /app-api/accounts/:seqNo', { seqNo: accountSeed.seqNo });
                console.log('[EmployeeForm] GET /app-api/line-users/active');
                const [detailResponse, lineUsersResponse] = await Promise.all([
                    getAccountDetail(accountSeed.seqNo),
                    getActiveLineUsers(),
                ]);
                console.log('[EmployeeForm] account detail response', detailResponse);
                console.log('[EmployeeForm] line users response', lineUsersResponse);

                if (!active) {
                    return;
                }

                if (!detailResponse.success) {
                    throw new Error(detailResponse.error || '帳號明細讀取失敗');
                }
                if (!lineUsersResponse.success) {
                    throw new Error(lineUsersResponse.error || 'LINE 使用者列表讀取失敗');
                }

                setAccountDetail(detailResponse.data);
                setAccountDisplayName(detailResponse.data?.displayName || '');
                setAccountRole(detailResponse.data?.role || accountSeed.role || 'member');
                setAccountLineUserId(detailResponse.data?.lineUserId || '');
                setLineUsers(lineUsersResponse.data || []);
                syncStoredDisplayName(detailResponse.data?.seqNo, detailResponse.data?.displayName || '');
            } catch (error) {
                void Swal.fire({
                    icon: 'error',
                    title: '讀取失敗',
                    text: error instanceof Error ? error.message : '無法讀取帳號資料',
                });
            } finally {
                if (active) {
                    setAccountLoading(false);
                }
            }
        })();

        return () => {
            active = false;
        };
    }, [accountSeed?.seqNo, accountSeed?.role, isAccountMode]);

    const accountLineOptions = useMemo(() => {
        return lineUsers.map((lineUser) => ({
            value: lineUser.lineUserId,
            label: `${lineUser.displayName || '(未命名)'} - ${lineUser.lineUserId}`,
        }));
    }, [lineUsers]);

    const departmentOptions = useMemo(() => {
        return departmentDirectory
            .filter((item) => item?.departmentNo && item?.departmentName)
            .map((item) => ({
                value: item.departmentNo,
                label: item.departmentName,
            }));
    }, [departmentDirectory]);

    const selectedDepartment = useMemo(() => {
        return departmentDirectory.find(
            (item) => String(item?.departmentNo || '').trim() === String(employeeForm.departmentNo || '').trim()
        ) || null;
    }, [departmentDirectory, employeeForm.departmentNo]);

    const managerDisplayName = useMemo(() => {
        const matchedManager = employeeDirectory.find(
            (item) => String(item.employeeNo || '').trim() === String(employeeForm.managerEmpNo || '').trim()
        );

        return (
            matchedManager?.employeeName
            || employeeDetail?.managerEmpName
            || employeeForm.managerEmpNo
            || '-'
        );
    }, [employeeDetail?.managerEmpName, employeeDirectory, employeeForm.managerEmpNo]);

    useEffect(() => {
        const nextManagerEmpNo = String(selectedDepartment?.managerEmpNo || '').trim();
        const currentManagerEmpNo = String(employeeForm.managerEmpNo || '').trim();

        if (currentManagerEmpNo === nextManagerEmpNo) {
            return;
        }

        setEmployeeForm((current) => ({
            ...current,
            managerEmpNo: nextManagerEmpNo,
        }));
    }, [employeeForm.managerEmpNo, selectedDepartment?.managerEmpNo]);

    const agentOptions = useMemo(() => {
        return employeeDirectory
            .filter((item) => ['member', 'manager'].includes(item.role) && item.employeeNo && item.employeeName)
            .map((item) => ({
                value: item.employeeNo,
                label: item.employeeName,
            }));
    }, [employeeDirectory]);

    useEffect(() => {
        if (isAccountMode) {
            return;
        }

        let active = true;
        setEmployeeFormLoading(true);

        void (async () => {
            try {
                console.log('[EmployeeForm] GET /app-api/employees');
                console.log('[EmployeeForm] GET /app-api/departments');
                console.log('[EmployeeForm] GET /app-api/line-users/active');
                const [employeesResponse, departmentsResponse, lineUsersResponse] = await Promise.all([
                    getEmployeeList(),
                    getDepartmentList(),
                    getActiveLineUsers(),
                ]);
                console.log('[EmployeeForm] employee list response', employeesResponse);
                console.log('[EmployeeForm] department list response', departmentsResponse);
                console.log('[EmployeeForm] line users response', lineUsersResponse);

                if (!active) {
                    return;
                }

                if (employeesResponse?.success === false) {
                    throw new Error(employeesResponse.error || '員工列表讀取失敗');
                }
                if (departmentsResponse?.success === false) {
                    throw new Error(departmentsResponse.error || '部門列表讀取失敗');
                }
                if (!lineUsersResponse.success) {
                    throw new Error(lineUsersResponse.error || 'LINE 使用者列表讀取失敗');
                }

                setEmployeeDirectory(Array.isArray(employeesResponse?.data) ? employeesResponse.data : []);
                setDepartmentDirectory(Array.isArray(departmentsResponse?.data) ? departmentsResponse.data : []);
                setLineUsers(lineUsersResponse.data || []);
            } catch (error) {
                void Swal.fire({
                    icon: 'error',
                    title: '讀取失敗',
                    text: error instanceof Error ? error.message : '無法讀取員工基礎資料',
                });
            } finally {
                if (active) {
                    setEmployeeFormLoading(false);
                }
            }
        })();

        return () => {
            active = false;
        };
    }, [isAccountMode]);

    useEffect(() => {
        if (!isEmployeeEditMode || !employeeSeqNo) {
            return;
        }

        let active = true;
        setEmployeeFormLoading(true);

        void (async () => {
            try {
                console.log('[EmployeeForm] GET /app-api/employees/:seqNo', { seqNo: employeeSeqNo });
                const response = await getEmployeeDetail(employeeSeqNo);
                console.log('[EmployeeForm] employee detail response', response);

                if (!active) {
                    return;
                }

                if (!response?.success || !response.data) {
                    throw new Error(response?.error || '員工明細讀取失敗');
                }

                setEmployeeDetail(response.data);
                setEmployeeForm({
                    ...EMPTY_EMPLOYEE_FORM,
                    employeeNo: response.data.employeeNo ?? '',
                    employeeName: response.data.employeeName ?? '',
                    departmentNo: response.data.departmentNo ?? '',
                    managerEmpNo: response.data.managerEmpNo ?? '',
                    agent1EmpNo: response.data.agent1EmpNo ?? '',
                    agent2EmpNo: response.data.agent2EmpNo ?? '',
                    lineUserId: response.data.lineUserId ?? '',
                    role: response.data.role ?? '',
                    workStatus: response.data.workStatus ?? 'active',
                });
            } catch (error) {
                void Swal.fire({
                    icon: 'error',
                    title: '讀取失敗',
                    text: error instanceof Error ? error.message : '無法讀取員工明細',
                });
            } finally {
                if (active) {
                    setEmployeeFormLoading(false);
                }
            }
        })();

        return () => {
            active = false;
        };
    }, [employeeSeqNo, isEmployeeEditMode]);

    function handleEmployeeFormChange(field, value) {
        console.log('[EmployeeForm] change employee form field', { field, value });
        setEmployeeForm((current) => ({
            ...current,
            [field]: value,
        }));
    }

    function normalizeOptional(value) {
        const normalized = String(value ?? '').trim();
        return normalized ? normalized : null;
    }

    function resolveEmployeeAccountSeqNo() {
        return employeeDetail?.accountSeqNo ?? employeeAccountSeqNo ?? null;
    }

    async function handleSaveEmployee() {
        if (!employeeForm.employeeName.trim()) {
            void Swal.fire({
                icon: 'warning',
                title: '請填寫姓名',
                text: '姓名為必填欄位。',
            });
            return;
        }

        if (!employeeForm.employeeNo.trim()) {
            void Swal.fire({
                icon: 'warning',
                title: '請填寫員編',
                text: '員編為必填欄位。',
            });
            return;
        }

        if (!employeeForm.role) {
            void Swal.fire({
                icon: 'warning',
                title: '請選擇系統角色',
                text: '系統角色為必填欄位。',
            });
            return;
        }

        setEmployeeSaving(true);
        try {
            const normalizedEmployeeNo = employeeForm.employeeNo.trim();
            const normalizedEmployeeName = employeeForm.employeeName.trim();
            const normalizedDepartmentNo = normalizeOptional(employeeForm.departmentNo);
            const normalizedManagerEmpNo = normalizeOptional(employeeForm.managerEmpNo);
            const normalizedAgent1EmpNo = normalizeOptional(employeeForm.agent1EmpNo);
            const normalizedAgent2EmpNo = normalizeOptional(employeeForm.agent2EmpNo);
            const normalizedLineUserId = normalizeOptional(employeeForm.lineUserId);
            const normalizedWorkStatus = employeeForm.workStatus || 'active';

            console.log('[EmployeeForm] save employee form state', employeeForm);

            if (isEditMode) {
                const accountSeqNo = resolveEmployeeAccountSeqNo();
                if (!accountSeqNo) {
                    throw new Error('缺少帳號 seqNo，無法更新');
                }

                console.log('[EmployeeForm] GET /app-api/accounts/:seqNo', { seqNo: accountSeqNo });
                const detailResponse = await getAccountDetail(accountSeqNo);
                console.log('[EmployeeForm] account detail for employee edit', detailResponse);
                if (!detailResponse.success || !detailResponse.data) {
                    throw new Error(detailResponse.error || '帳號明細讀取失敗');
                }

                let latestDetail = detailResponse.data;

                if (normalizedEmployeeName !== (latestDetail.displayName || '')) {
                    const payload = {
                        displayName: normalizedEmployeeName,
                        email: latestDetail.email || null,
                        remark: latestDetail.remark || null,
                        rowVer: latestDetail.rowVer,
                    };
                    console.log('[EmployeeForm] PATCH /app-api/accounts/:seqNo/profile', {
                        seqNo: latestDetail.seqNo,
                        body: payload,
                    });
                    const response = await updateAccountProfile(latestDetail.seqNo, payload);
                    console.log('[EmployeeForm] update employee profile response', response);
                    if (!response?.success) {
                        throw new Error(response?.error || '更新員工姓名失敗');
                    }
                    latestDetail = await refreshAccountDetail(latestDetail.seqNo);
                }

                if (employeeForm.role !== latestDetail.role) {
                    const payload = {
                        role: employeeForm.role,
                        rowVer: latestDetail.rowVer,
                    };
                    console.log('[EmployeeForm] PATCH /app-api/accounts/:seqNo/role', {
                        seqNo: latestDetail.seqNo,
                        body: payload,
                    });
                    const response = await updateAccountRole(latestDetail.seqNo, payload);
                    console.log('[EmployeeForm] update employee role response', response);
                    if (!response?.success) {
                        throw new Error(response?.error || '更新員工角色失敗');
                    }
                    latestDetail = await refreshAccountDetail(latestDetail.seqNo);
                }

                if (normalizedLineUserId !== (latestDetail.lineUserId || null)) {
                    const payload = {
                        lineUserId: normalizedLineUserId,
                        rowVer: latestDetail.rowVer,
                    };
                    console.log('[EmployeeForm] PATCH /app-api/accounts/:seqNo/line-binding', {
                        seqNo: latestDetail.seqNo,
                        body: payload,
                    });
                    const response = await updateAccountLineBinding(latestDetail.seqNo, payload);
                    console.log('[EmployeeForm] update employee line binding response', response);
                    if (!response?.success) {
                        throw new Error(response?.error || '更新員工 LINE 綁定失敗');
                    }
                    latestDetail = await refreshAccountDetail(latestDetail.seqNo);
                }

                const orgPayload = {
                    employeeNo: normalizedEmployeeNo,
                    departmentNo: normalizedDepartmentNo,
                    managerEmpNo: normalizedManagerEmpNo,
                    agent1EmpNo: normalizedAgent1EmpNo,
                    agent2EmpNo: normalizedAgent2EmpNo,
                    workStatus: normalizedWorkStatus,
                    rowVer: latestDetail.rowVer,
                };
                console.log('[EmployeeForm] PATCH /app-api/accounts/:seqNo/org', {
                    seqNo: latestDetail.seqNo,
                    body: orgPayload,
                });
                const response = await updateAccountOrg(latestDetail.seqNo, orgPayload);
                console.log('[EmployeeForm] update employee org response', response);
                if (!response?.success) {
                    throw new Error(response?.error || '更新員工組織資料失敗');
                }
            } else {
                const payload = {
                    accountName: normalizedEmployeeNo,
                    displayName: normalizedEmployeeName,
                    role: employeeForm.role,
                    lineUserId: normalizedLineUserId,
                    employeeNo: normalizedEmployeeNo,
                    departmentNo: normalizedDepartmentNo,
                    managerEmpNo: normalizedManagerEmpNo,
                    agent1EmpNo: normalizedAgent1EmpNo,
                    agent2EmpNo: normalizedAgent2EmpNo,
                    workStatus: normalizedWorkStatus,
                };
                console.log('[EmployeeForm] POST /app-api/accounts', { body: payload });
                const response = await createAccount(payload);
                console.log('[EmployeeForm] create employee account response', response);
                if (!response?.success) {
                    throw new Error(response?.error || '建立員工失敗');
                }
            }

            void Swal.fire({
                icon: 'success',
                title: isEditMode ? '員工已更新' : '員工已建立',
                timer: 1200,
                showConfirmButton: false,
            });
            navigate('/employeeList');
        } catch (error) {
            void Swal.fire({
                icon: 'error',
                title: isEditMode ? '更新失敗' : '建立失敗',
                text: error instanceof Error ? error.message : (isEditMode ? '無法更新員工' : '無法建立員工'),
            });
        } finally {
            setEmployeeSaving(false);
        }
    }

    async function handleDeleteEmployee() {
        if (!isEditMode) {
            return;
        }

        const result = await Swal.fire({
            icon: 'warning',
            title: `刪除員工 ${employeeDetail.employeeName || employee?.employeeName || employee?.name || ''}`,
            text: '這會做軟刪除，之後員工列表不再顯示。',
            showCancelButton: true,
            confirmButtonText: '確認刪除',
            cancelButtonText: '取消',
            confirmButtonColor: '#ba1a1a',
        });

        if (!result.isConfirmed) {
            return;
        }

        setEmployeeSaving(true);
        try {
            const accountSeqNo = resolveEmployeeAccountSeqNo();
            if (!accountSeqNo) {
                throw new Error('缺少帳號 seqNo，無法刪除');
            }

            console.log('[EmployeeForm] GET /app-api/accounts/:seqNo', { seqNo: accountSeqNo });
            const detailResponse = await getAccountDetail(accountSeqNo);
            console.log('[EmployeeForm] account detail for employee delete', detailResponse);
            if (!detailResponse.success || !detailResponse.data) {
                throw new Error(detailResponse.error || '帳號明細讀取失敗');
            }

            const payload = { rowVer: detailResponse.data.rowVer };
            console.log('[EmployeeForm] DELETE /app-api/accounts/:seqNo', {
                seqNo: detailResponse.data.seqNo,
                body: payload,
            });
            const response = await deleteAccount(detailResponse.data.seqNo, payload);
            console.log('[EmployeeForm] delete employee account response', response);

            if (!response?.success) {
                throw new Error(response?.error || '刪除員工失敗');
            }

            void Swal.fire({
                icon: 'success',
                title: '員工已刪除',
                timer: 1200,
                showConfirmButton: false,
            });
            navigate('/employeeList');
        } catch (error) {
            void Swal.fire({
                icon: 'error',
                title: '刪除失敗',
                text: error instanceof Error ? error.message : '無法刪除員工',
            });
        } finally {
            setEmployeeSaving(false);
        }
    }

    async function refreshAccountDetail(seqNo) {
        console.log('[EmployeeForm] GET /app-api/accounts/:seqNo', { seqNo });
        const response = await getAccountDetail(seqNo);
        console.log('[EmployeeForm] refreshed account detail', response);
        if (!response.success || !response.data) {
            throw new Error(response.error || '重新讀取帳號失敗');
        }

        setAccountDetail(response.data);
        setAccountDisplayName(response.data.displayName || '');
        setAccountRole(response.data.role || 'member');
        setAccountLineUserId(response.data.lineUserId || '');
        syncStoredDisplayName(response.data.seqNo, response.data.displayName || '');

        return response.data;
    }

    async function handleSaveAccount() {
        if (!accountDetail) {
            return;
        }

        const normalizedDisplayName = accountDisplayName.trim();
        const profileChanged = normalizedDisplayName !== (accountDetail.displayName || '');
        const roleChanged = accountRole !== accountDetail.role;
        setAccountSaving(true);
        try {
            let latestDetail = accountDetail;

            if (profileChanged) {
                console.log('[EmployeeForm] PATCH /app-api/accounts/:seqNo/profile', {
                    seqNo: latestDetail.seqNo,
                    body: {
                        displayName: normalizedDisplayName || null,
                        email: latestDetail.email || '',
                        remark: latestDetail.remark || '',
                        rowVer: latestDetail.rowVer,
                    },
                });
                const profileResponse = await updateAccountProfile(latestDetail.seqNo, {
                    displayName: normalizedDisplayName || null,
                    email: latestDetail.email || '',
                    remark: latestDetail.remark || '',
                    rowVer: latestDetail.rowVer,
                });
                console.log('[EmployeeForm] update profile response', profileResponse);
                if (!profileResponse.success) {
                    throw new Error(profileResponse.error || '更新帳號失敗');
                }
                latestDetail = await refreshAccountDetail(latestDetail.seqNo);
            }

            if (roleChanged) {
                console.log('[EmployeeForm] PATCH /app-api/accounts/:seqNo/role', {
                    seqNo: latestDetail.seqNo,
                    body: {
                        role: accountRole,
                        rowVer: latestDetail.rowVer,
                    },
                });
                const roleResponse = await updateAccountRole(latestDetail.seqNo, {
                    role: accountRole,
                    rowVer: latestDetail.rowVer,
                });
                console.log('[EmployeeForm] update role response', roleResponse);
                if (!roleResponse.success) {
                    throw new Error(roleResponse.error || '更新角色失敗');
                }
                latestDetail = await refreshAccountDetail(latestDetail.seqNo);
            }

            if ((accountLineUserId || null) !== (latestDetail?.lineUserId || null)) {
                console.log('[EmployeeForm] PATCH /app-api/accounts/:seqNo/line-binding', {
                    seqNo: latestDetail.seqNo,
                    body: { lineUserId: accountLineUserId || null, rowVer: latestDetail.rowVer },
                });
                const lineResponse = await updateAccountLineBinding(latestDetail.seqNo, {
                    lineUserId: accountLineUserId || null,
                    rowVer: latestDetail.rowVer,
                });
                console.log('[EmployeeForm] update line binding response', lineResponse);
                if (!lineResponse.success) {
                    throw new Error(lineResponse.error || '更新 LINE 綁定失敗');
                }
                latestDetail = await refreshAccountDetail(latestDetail.seqNo);
            }

            void Swal.fire({
                icon: 'success',
                title: '帳號已更新',
                timer: 1200,
                showConfirmButton: false,
            });
            navigate('/accountManagement');
        } catch (error) {
            void Swal.fire({
                icon: 'error',
                title: '更新失敗',
                text: error instanceof Error ? error.message : '無法更新帳號',
            });
        } finally {
            setAccountSaving(false);
        }
    }

    async function handleResetPassword() {
        if (!accountDetail) {
            return;
        }
        const result = await Swal.fire({
            title: '重設密碼',
            input: 'password',
            inputLabel: '請輸入新密碼',
            inputPlaceholder: '至少 8 碼',
            showCancelButton: true,
            confirmButtonText: '送出',
            cancelButtonText: '取消',
            inputValidator: (value) => (!value || value.length < 8 ? '密碼至少 8 碼' : undefined),
        });

        if (!result.isConfirmed) {
            return;
        }

        setAccountSaving(true);
        try {
            console.log('[EmployeeForm] PATCH /app-api/accounts/:seqNo/password-reset', {
                seqNo: accountDetail.seqNo,
                body: { newPassword: '********', rowVer: accountDetail.rowVer },
            });
            const response = await resetAccountPassword(accountDetail.seqNo, {
                newPassword: result.value,
                rowVer: accountDetail.rowVer,
            });
            console.log('[EmployeeForm] reset password response', response);
            if (!response.success) {
                throw new Error(response.error || '重設密碼失敗');
            }
            console.log('[EmployeeForm] GET /app-api/accounts/:seqNo', { seqNo: accountDetail.seqNo });
            const refreshed = await getAccountDetail(accountDetail.seqNo);
            console.log('[EmployeeForm] refreshed account detail after password reset', refreshed);
            if (refreshed.success) {
                setAccountDetail(refreshed.data);
                setAccountDisplayName(refreshed.data?.displayName || '');
                syncStoredDisplayName(refreshed.data?.seqNo, refreshed.data?.displayName || '');
            }
            void Swal.fire({ icon: 'success', title: '密碼已重設', timer: 1200, showConfirmButton: false });
        } catch (error) {
            void Swal.fire({
                icon: 'error',
                title: '重設失敗',
                text: error instanceof Error ? error.message : '無法重設密碼',
            });
        } finally {
            setAccountSaving(false);
        }
    }

    async function handleUnlock() {
        if (!accountDetail) {
            return;
        }
        setAccountSaving(true);
        try {
            console.log('[EmployeeForm] PATCH /app-api/accounts/:seqNo/unlock', {
                seqNo: accountDetail.seqNo,
                body: { rowVer: accountDetail.rowVer },
            });
            const response = await unlockAccount(accountDetail.seqNo, { rowVer: accountDetail.rowVer });
            console.log('[EmployeeForm] unlock response', response);
            if (!response.success) {
                throw new Error(response.error || '解鎖失敗');
            }
            console.log('[EmployeeForm] GET /app-api/accounts/:seqNo', { seqNo: accountDetail.seqNo });
            const refreshed = await getAccountDetail(accountDetail.seqNo);
            console.log('[EmployeeForm] refreshed account detail after unlock', refreshed);
            if (refreshed.success) {
                setAccountDetail(refreshed.data);
                setAccountDisplayName(refreshed.data?.displayName || '');
                syncStoredDisplayName(refreshed.data?.seqNo, refreshed.data?.displayName || '');
            }
            void Swal.fire({ icon: 'success', title: '帳號已解鎖', timer: 1200, showConfirmButton: false });
        } catch (error) {
            void Swal.fire({
                icon: 'error',
                title: '解鎖失敗',
                text: error instanceof Error ? error.message : '無法解鎖帳號',
            });
        } finally {
            setAccountSaving(false);
        }
    }

    async function handleDeleteAccount() {
        if (!accountDetail) {
            return;
        }
        const result = await Swal.fire({
            icon: 'warning',
            title: `刪除帳號 ${accountDetail.accountName}`,
            text: '這會做軟刪除，之後查詢列表不再顯示。',
            showCancelButton: true,
            confirmButtonText: '確認刪除',
            cancelButtonText: '取消',
            confirmButtonColor: '#ba1a1a',
        });

        if (!result.isConfirmed) {
            return;
        }

        setAccountSaving(true);
        try {
            console.log('[EmployeeForm] DELETE /app-api/accounts/:seqNo', {
                seqNo: accountDetail.seqNo,
                body: { rowVer: accountDetail.rowVer },
            });
            const response = await deleteAccount(accountDetail.seqNo, { rowVer: accountDetail.rowVer });
            console.log('[EmployeeForm] delete account response', response);
            if (!response.success) {
                throw new Error(response.error || '刪除失敗');
            }
            void Swal.fire({ icon: 'success', title: '帳號已刪除', timer: 1200, showConfirmButton: false });
            navigate('/accountManagement');
        } catch (error) {
            void Swal.fire({
                icon: 'error',
                title: '刪除失敗',
                text: error instanceof Error ? error.message : '無法刪除帳號',
            });
        } finally {
            setAccountSaving(false);
        }
    }

    if (isAccountMode) {
        return (
            <Layout title="編輯帳號" showBack>
                <div className="max-w-4xl mx-auto space-y-8">
                    <section className="bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm">
                        <div className="h-1.5 bg-primary w-full"></div>
                        <div className="p-8">
                            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 border-b border-outline-variant pb-4">
                                <div className="flex items-center gap-2">
                                    <User className="text-primary" size={20} />
                                    <h2 className="text-lg font-bold text-primary">帳號資料編輯</h2>
                                </div>
                                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/accountManagement')}
                                        className="px-5 py-2 border border-outline rounded-lg text-secondary hover:bg-surface-container transition-colors text-sm font-bold"
                                    >
                                        取消
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleSaveAccount()}
                                        disabled={accountSaving || accountLoading}
                                        className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container transition-colors text-sm font-bold disabled:opacity-50"
                                    >
                                        儲存變更
                                    </button>
                                </div>
                            </div>

                            {accountLoading || !accountDetail ? (
                                <div className="text-sm text-slate-400">讀取帳號資料中...</div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                        <FormInput
                                            label="姓名"
                                            value={accountDisplayName}
                                            placeholder="請輸入姓名"
                                            onChange={setAccountDisplayName}
                                        />
                                        <ReadonlyField label="帳號名稱" value={accountDetail.accountName} />

                                        <ReadonlyField label="電子郵件" value={accountDetail.email || '-'} />
                                        <ReadonlyField label="狀態" value={accountDetail.estate} />

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest" htmlFor="account-manager">
                                                部門主管
                                            </label>
                                            <div className="relative">
                                                <select
                                                    id="account-manager"
                                                    defaultValue=""
                                                    className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm"
                                                >
                                                    <option value="">請選擇部門主管</option>
                                                    <option value="林曉明">林曉明</option>
                                                    <option value="陳淑芬">陳淑芬</option>
                                                    <option value="王大維">王大維</option>
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                                            </div>
                                        </div>


                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest" htmlFor="account-proxy1">
                                                代理人 1
                                            </label>
                                            <div className="relative">
                                                <select
                                                    id="account-proxy1"
                                                    defaultValue=""
                                                    className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm"
                                                >
                                                    <option value="">請選擇代理人 1</option>
                                                    <option value="林曉明">林曉明</option>
                                                    <option value="陳淑芬">陳淑芬</option>
                                                    <option value="王大維">王大維</option>
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest" htmlFor="account-proxy2">
                                                代理人 2
                                            </label>
                                            <div className="relative">
                                                <select
                                                    id="account-proxy2"
                                                    defaultValue=""
                                                    className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm"
                                                >
                                                    <option value="">請選擇代理人 2</option>
                                                    <option value="林曉明">林曉明</option>
                                                    <option value="陳淑芬">陳淑芬</option>
                                                    <option value="王大維">王大維</option>
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest" htmlFor="account-role">
                                                系統角色
                                            </label>
                                            <div className="relative">
                                                <select
                                                    id="account-role"
                                                    value={accountRole}
                                                    onChange={(event) => setAccountRole(event.target.value)}
                                                    className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm"
                                                >
                                                    {Object.entries(ACCOUNT_ROLE_LABELS).map(([value, label]) => (
                                                        <option key={value} value={value}>{label}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest" htmlFor="account-line-binding">
                                                LINE 綁定
                                            </label>
                                            <div className="relative">
                                                <select
                                                    id="account-line-binding"
                                                    value={accountLineUserId}
                                                    onChange={(event) => setAccountLineUserId(event.target.value)}
                                                    className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm"
                                                >
                                                    <option value="">不綁定</option>
                                                    {accountLineUserId && !accountLineOptions.some((option) => option.value === accountLineUserId) ? (
                                                        <option value={accountLineUserId}>{accountLineUserId}</option>
                                                    ) : null}
                                                    {accountLineOptions.map((option) => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                                            </div>
                                        </div>

                                    </div>

                                    <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                        <ToolbarButton icon={KeyRound} label="重設密碼" onClick={() => void handleResetPassword()} />
                                        <ToolbarButton icon={LockKeyhole} label="解鎖帳號" onClick={() => void handleUnlock()} />
                                        <ToolbarButton icon={Link2} label="刷新資料" onClick={() => navigate(0)} />
                                        <ToolbarButton danger icon={Trash2} label="刪除帳號" onClick={() => void handleDeleteAccount()} />
                                    </div>

                                    <div className="mt-10 bg-surface-container-low rounded-xl p-5 flex items-start gap-4 border border-outline-variant/30">
                                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                                            <ShieldCheck size={22} />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-sm font-bold text-on-surface">帳號權限設定</div>
                                            <div className="text-[13px] text-on-surface-variant">
                                                帳號名稱、顯示名稱與信箱來自 Chinafood Account API；此頁支援角色調整、LINE 綁定、解鎖與密碼重設。
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </section>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title={isEditMode ? "編輯員工" : "新增員工"} showBack>
            <div className="max-w-4xl mx-auto space-y-8">
                <section className="bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm">
                    <div className="h-1.5 bg-primary w-full"></div>
                    <form
                        className="p-8"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void handleSaveEmployee();
                        }}
                    >
                        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 border-b border-outline-variant pb-4">
                            <div className="flex items-center gap-2">
                                <User className="text-primary" size={20} />
                                <h2 className="text-lg font-bold text-primary">
                                    {isEditMode ? "員工資料編輯" : "員工資料新增"}
                                </h2>
                            </div>
                            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                                <button
                                    type="button"
                                    onClick={() => navigate("/employeeList")}
                                    className="px-5 py-2 border border-outline rounded-lg text-secondary hover:bg-surface-container transition-colors text-sm font-bold"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    disabled={employeeSaving || employeeFormLoading}
                                    className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container transition-colors text-sm font-bold disabled:opacity-50"
                                >
                                    儲存變更
                                </button>
                            </div>
                        </div>

                        {employeeFormLoading ? (
                            <div className="text-sm text-slate-400">讀取員工基礎資料中...</div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                    {isEditMode ? (
                                        <ReadonlyField label="員編" value={employeeForm.employeeNo || '-'} />
                                    ) : (
                                        <FormInput
                                            label="員編 *"
                                            value={employeeForm.employeeNo}
                                            placeholder="請輸入員編，例如 E0001"
                                            onChange={(value) => handleEmployeeFormChange('employeeNo', value)}
                                        />
                                    )}

                                    <FormInput
                                        label="姓名 *"
                                        value={employeeForm.employeeName}
                                        placeholder="請輸入姓名"
                                        onChange={(value) => handleEmployeeFormChange('employeeName', value)}
                                    />

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest" htmlFor="dept">
                                            部門
                                        </label>
                                        <div className="relative">
                                            <select
                                                id="dept"
                                                value={employeeForm.departmentNo}
                                                onChange={(event) => handleEmployeeFormChange('departmentNo', event.target.value)}
                                                className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm"
                                            >
                                                <option value="">請選擇部門</option>
                                                {departmentOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest" htmlFor="manager">
                                            部門主管
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="manager"
                                                readOnly
                                                value={managerDisplayName}
                                                placeholder="選擇部門後自動帶入"
                                                className="w-full h-11 px-4 bg-surface-container-low border border-outline rounded-lg text-on-surface-variant cursor-not-allowed focus:ring-0"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest" htmlFor="role">
                                            系統角色 *
                                        </label>
                                        <div className="relative">
                                            <select
                                                id="role"
                                                value={employeeForm.role}
                                                onChange={(event) => handleEmployeeFormChange('role', event.target.value)}
                                                className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm"
                                            >
                                                <option value="">請選擇系統角色</option>
                                                {Object.entries(EMPLOYEE_ROLE_LABELS).map(([value, label]) => (
                                                    <option key={value} value={value}>{label}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest" htmlFor="proxy1">
                                                代理人 1
                                            </label>
                                            <div className="relative">
                                                <select
                                                    id="proxy1"
                                                    value={employeeForm.agent1EmpNo}
                                                    onChange={(event) => handleEmployeeFormChange('agent1EmpNo', event.target.value)}
                                                    className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm"
                                                >
                                                    <option value="">請選擇代理人 1</option>
                                                    {agentOptions.map((option) => (
                                                        <option key={option.value} value={option.value}>{option.label}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest" htmlFor="proxy2">
                                                代理人 2
                                            </label>
                                            <div className="relative">
                                                <select
                                                    id="proxy2"
                                                    value={employeeForm.agent2EmpNo}
                                                    onChange={(event) => handleEmployeeFormChange('agent2EmpNo', event.target.value)}
                                                    className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm"
                                                >
                                                    <option value="">請選擇代理人 2</option>
                                                    {agentOptions.map((option) => (
                                                        <option key={option.value} value={option.value}>{option.label}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest" htmlFor="line">
                                            LINE 綁定
                                        </label>
                                        <div className="relative">
                                            <select
                                                id="line"
                                                value={employeeForm.lineUserId}
                                                onChange={(event) => handleEmployeeFormChange('lineUserId', event.target.value)}
                                                className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm"
                                            >
                                                <option value="">請選擇 LINE 名稱</option>
                                                {accountLineOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest" htmlFor="work-status">
                                            在職狀態
                                        </label>
                                        <div className="relative">
                                            <select
                                                id="work-status"
                                                value={employeeForm.workStatus}
                                                onChange={(event) => handleEmployeeFormChange('workStatus', event.target.value)}
                                                className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm"
                                            >
                                                <option value="active">在職</option>
                                                <option value="resigned">離職</option>
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                                        </div>
                                    </div>
                                </div>
                                {isEditMode ? (
                                    <div className="mt-6 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => void handleDeleteEmployee()}
                                            disabled={employeeSaving || employeeFormLoading}
                                            className="px-5 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors text-sm font-bold disabled:opacity-50"
                                        >
                                            刪除員工
                                        </button>
                                    </div>
                                ) : null}
                            </>
                        )}
                    </form>
                </section>
            </div>
        </Layout>
    );
}

function ReadonlyField({ label, value }) {
    return (
        <div className="space-y-2">
            <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest">
                {label}
            </label>
            <div className="w-full h-11 px-4 bg-surface-container-low border border-outline rounded-lg flex items-center text-sm text-on-surface">
                {value}
            </div>
        </div>
    );
}

function FormInput({ label, onChange, ...props }) {
    return (
        <div className="space-y-2">
            <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest">
                {label}
            </label>
            <input
                {...props}
                className="w-full h-11 px-4 bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                onChange={(event) => onChange(event.target.value)}
            />
        </div>
    );
}

function ToolbarButton({ icon: Icon, label, onClick, danger = false }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
                danger
                    ? 'border-red-200 text-red-500 hover:bg-red-50'
                    : 'border-outline text-secondary hover:bg-surface-container'
            }`}
        >
            <Icon size={16} />
            {label}
        </button>
    );
}
