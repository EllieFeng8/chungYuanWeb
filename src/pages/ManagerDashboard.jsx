import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { AlertCircle, CalendarDays, ClipboardCheck, Clock, FileClock, FileWarning } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import {
    acceptAgentRequest,
    getDeptApprovalList,
    getAgentRequestInbox,
    getHrApplicationList,
    getMyApplications,
    rejectAgentRequest,
} from '../lib/cfctApi';
import {
    enrichApplicationPeriod,
    getApplicationPeriodText,
    getApplicationTypeName,
    getCurrentEmployeeContext,
} from '../lib/applicationUtils';

function mapAgentAssignment(item) {
    return {
        seqNo: item?.seqNo || item?.applicationSeqNo || item?.id || '',
        applicantName: item?.applicantName || item?.applicantEmpName || item?.applicantEmpNo || '-',
        applicantEmpNo: item?.applicantEmpNo || '',
        agentEmpNo: item?.agentEmpNo || '',
        agent2EmpNo: item?.agent2EmpNo || '',
        typeName: getApplicationTypeName(item),
        periodText: getApplicationPeriodText(item),
        rowVer: item?.rowVer,
        raw: item,
    };
}

function normalizeEmployeeNo(value) {
    return String(value || '').trim().toLowerCase();
}

export default function ManagerDashboard() {
    const navigate = useNavigate();
    const [accountRole, setAccountRole] = useState('');
    const [currentEmployee, setCurrentEmployee] = useState(null);
    const [agentAssignments, setAgentAssignments] = useState([]);
    const [submittingSeqNo, setSubmittingSeqNo] = useState('');
    const promptedAssignmentKeyRef = useRef('');
    const [counts, setCounts] = useState({
        pendingApprovals: 0,
        pendingMyApplications: 0,
        needSupplementMyApplications: 0,
    });
    const [loading, setLoading] = useState(true);

    async function fetchAgentInbox(employeeNo) {
        const normalizedEmployeeNo = normalizeEmployeeNo(employeeNo);
        const primaryResponse = await getAgentRequestInbox(employeeNo);

        if (!primaryResponse?.success) {
            throw new Error(primaryResponse?.error || '代理知會讀取失敗');
        }

        const primaryItems = Array.isArray(primaryResponse.data) ? primaryResponse.data : [];
        if (primaryItems.length || !normalizedEmployeeNo || normalizedEmployeeNo === String(employeeNo || '').trim()) {
            return primaryResponse;
        }

        const fallbackResponse = await getAgentRequestInbox(normalizedEmployeeNo);
        if (!fallbackResponse?.success) {
            throw new Error(fallbackResponse?.error || '代理知會讀取失敗');
        }

        return fallbackResponse;
    }

    async function loadDashboardCounts({ showLoading = true } = {}) {
        if (showLoading) {
            setLoading(true);
        }

        try {
            const employeeContext = await getCurrentEmployeeContext();
            const employee = employeeContext.currentEmployee;
            const accountDetail = employeeContext.accountDetail;
            const isAdmin = accountDetail?.role === 'admin';
            setCurrentEmployee(employee);
            setAccountRole(accountDetail?.role || '');

            const requests = [];
            if (isAdmin) {
                console.log('[ManagerDashboard] GET /app-api/hr/applications');
                requests.push(getHrApplicationList());
            } else {
                console.log('[ManagerDashboard] GET /app-api/approval/dept-list', {
                    employeeNo: employee.employeeNo,
                    status: '',
                });
                console.log('[ManagerDashboard] GET /app-api/applications/mine', {
                    employeeNo: employee.employeeNo,
                });
                requests.push(
                    getDeptApprovalList(employee.employeeNo, ''),
                    getMyApplications(employee.employeeNo)
                );
            }

            console.log('[ManagerDashboard] GET /app-api/agent-request/inbox', {
                employeeNo: employee.employeeNo,
            });
            requests.push(fetchAgentInbox(employee.employeeNo));

            const responses = await Promise.all(requests);
            const agentResponse = responses[responses.length - 1];
            const pendingItems = Array.isArray(agentResponse.data)
                ? agentResponse.data.filter((item) => {
                        const matchesCurrentEmployee = (
                            normalizeEmployeeNo(item?.agentEmpNo) === normalizeEmployeeNo(employee.employeeNo)
                            || normalizeEmployeeNo(item?.agent2EmpNo) === normalizeEmployeeNo(employee.employeeNo)
                        );
                        const confirmState = String(item?.agentConfirmState || 'pending').trim().toLowerCase();
                        return matchesCurrentEmployee && confirmState === 'pending';
                    })
                : [];
            const detailedItems = await Promise.all(pendingItems.map(enrichApplicationPeriod));
            const assignments = detailedItems.map(mapAgentAssignment);
            setAgentAssignments(assignments);

            if (isAdmin) {
                const approvalResponse = responses[0];
                if (!approvalResponse?.success) {
                    throw new Error(approvalResponse?.error || '待審核資料讀取失敗');
                }

                const approvalItems = Array.isArray(approvalResponse.data) ? approvalResponse.data : [];
                setCounts({
                    pendingApprovals: approvalItems.filter((item) => item?.status === 'pending').length,
                    pendingMyApplications: 0,
                    needSupplementMyApplications: 0,
                });
                return;
            }

            const [approvalResponse, myApplicationsResponse] = responses;
            if (!approvalResponse?.success) {
                throw new Error(approvalResponse?.error || '待審核資料讀取失敗');
            }
            if (!myApplicationsResponse?.success) {
                throw new Error(myApplicationsResponse?.error || '申請紀錄讀取失敗');
            }

            const approvalItems = Array.isArray(approvalResponse.data) ? approvalResponse.data : [];
            const myApplications = Array.isArray(myApplicationsResponse.data) ? myApplicationsResponse.data : [];

            setCounts({
                pendingApprovals: approvalItems.filter((item) => item?.status === 'pending').length,
                pendingMyApplications: myApplications.filter((item) => item?.status === 'pending').length,
                needSupplementMyApplications: myApplications.filter((item) => item?.status === 'need_supplement').length,
            });
        } catch (error) {
            setCounts({
                pendingApprovals: 0,
                pendingMyApplications: 0,
                needSupplementMyApplications: 0,
            });
            setAgentAssignments([]);
            void Swal.fire({
                icon: 'error',
                title: '讀取失敗',
                text: error instanceof Error ? error.message : '無法讀取首頁統計資料',
            });
        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    }

    useEffect(() => {
        void loadDashboardCounts();
    }, []);

    const stats = useMemo(() => {
        const pendingCard = {
            label: '待審核',
            count: counts.pendingApprovals,
            path: '/approvals',
            color: 'primary',
            icon: ClipboardCheck,
            bgColor: 'bg-primary/10',
        };

        if (accountRole === 'admin') {
            return [
                pendingCard,
                {
                    label: '加班申請',
                    path: '/approvals',
                    color: 'tertiary',
                    icon: Clock,
                    bgColor: 'bg-tertiary-container/10',
                },
                {
                    label: '請假申請',
                    path: '/approvals',
                    color: 'blue-500',
                    icon: CalendarDays,
                    bgColor: 'bg-blue-100',
                },
            ];
        }

        return [
            pendingCard,
            {
                label: '審核中',
                count: counts.pendingMyApplications,
                path: '/records',
                color: 'tertiary',
                icon: FileClock,
                bgColor: 'bg-tertiary-container/10',
            },
            {
                label: '待補件',
                count: counts.needSupplementMyApplications,
                path: '/records',
                color: 'secondary',
                icon: FileWarning,
                bgColor: 'bg-secondary-container/20',
            },
        ];
    }, [accountRole, counts]);

    const agentAlertText = useMemo(() => {
        if (!agentAssignments.length) {
            return '';
        }

        const firstAssignment = agentAssignments[0];
        if (agentAssignments.length === 1) {
            const periodSuffix = firstAssignment.periodText === '-' ? '' : `（${firstAssignment.periodText}）`;
            return `${firstAssignment.applicantName} 指定您代理 ${firstAssignment.typeName} 申請${periodSuffix}。`;
        }

        return `${firstAssignment.applicantName} 等 ${agentAssignments.length} 筆申請指定您代理。`;
    }, [agentAssignments]);

    async function handleAgentAction(item, action) {
        if (!currentEmployee?.employeeNo || !item?.seqNo) {
            return;
        }

        setSubmittingSeqNo(String(item.seqNo));
        try {
            const payload = {
                actorEmpNo: currentEmployee.employeeNo,
                ...(typeof item?.rowVer === 'number' ? { rowVer: item.rowVer } : {}),
            };

            const response = action === 'accept'
                ? await acceptAgentRequest(item.seqNo, payload)
                : await rejectAgentRequest(item.seqNo, payload);

            if (!response?.success) {
                throw new Error(response?.error || (action === 'accept' ? '接受代理失敗' : '拒絕代理失敗'));
            }

            await loadDashboardCounts({ showLoading: false });
            void Swal.fire({
                icon: 'success',
                title: action === 'accept' ? '已接受代理' : '已拒絕代理',
                timer: 1200,
                showConfirmButton: false,
            });
        } catch (error) {
            void Swal.fire({
                icon: 'error',
                title: action === 'accept' ? '接受失敗' : '拒絕失敗',
                text: error instanceof Error ? error.message : '操作失敗',
            });
        } finally {
            setSubmittingSeqNo('');
        }
    }

    async function handleOpenAgentDialog() {
        if (!agentAssignments.length) {
            return;
        }

        const firstAssignment = agentAssignments[0];
        const result = await Swal.fire({
            icon: 'question',
            title: '代理確認',
            html: `
                <div style="text-align:left">
                    <div>單號：${firstAssignment.seqNo}</div>
                    <div>申請人：${firstAssignment.applicantName}</div>
                    <div>類型：${firstAssignment.typeName}</div>
                    <div>請假時間：${firstAssignment.periodText}</div>
                    <div>待處理筆數：${agentAssignments.length}</div>
                </div>
            `,
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: '接受代理',
            denyButtonText: '拒絕代理',
            cancelButtonText: '取消',
        });

        if (result.isConfirmed) {
            await handleAgentAction(firstAssignment, 'accept');
        } else if (result.isDenied) {
            await handleAgentAction(firstAssignment, 'reject');
        }
    }

    useEffect(() => {
        if (loading || submittingSeqNo || !agentAssignments.length) {
            return;
        }

        const promptKey = agentAssignments.map((item) => String(item.seqNo)).join(',');
        if (!promptKey || promptedAssignmentKeyRef.current === promptKey) {
            return;
        }

        promptedAssignmentKeyRef.current = promptKey;
        void handleOpenAgentDialog();
    }, [agentAssignments, loading, submittingSeqNo]);

    return (
        <Layout title="首頁">
        <div className="page-container">
            {!loading && agentAssignments.length ? (
                <button
                    type="button"
                    onClick={() => void handleOpenAgentDialog()}
                    disabled={Boolean(submittingSeqNo)}
                    className="mb-10 sm:mb-12 w-full p-4 bg-tertiary-fixed border border-tertiary-container/30 rounded-xl flex items-start sm:items-center gap-4 text-left transition-colors hover:bg-tertiary-fixed/80 disabled:opacity-60"
                >
                    <div className="w-10 h-10 bg-tertiary/10 rounded-full flex items-center justify-center text-tertiary shrink-0">
                        <AlertCircle size={24} />
                    </div>
                    <span className="text-on-tertiary-container font-medium text-[24px]">
                        {agentAlertText}
                    </span>
                </button>
            ) : null}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {stats.map((stat, idx) => (
                    <Fragment key={stat.label}>
                        {accountRole === 'manager' && idx === 0 ? (
                            <h2 className="md:col-span-12 text-xl font-semibold text-on-surface">審核詳情</h2>
                        ) : null}
                        {accountRole === 'manager' && idx === 1 ? (
                            <h2 className="md:col-span-12 text-xl font-semibold text-on-surface">我的申請紀錄</h2>
                        ) : null}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            onClick={() => stat.path && navigate(stat.path)}
                            className={`cursor-pointer ${idx === 0 ? 'md:col-span-12' : 'md:col-span-6'}`}
                        >
                            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-8 flex justify-between items-center transition-all hover:shadow-md hover:-translate-y-1 relative overflow-hidden group">
                                <div className={`absolute top-0 left-0 w-1 h-full bg-${stat.color}`} />
                                <div className="space-y-4">
                                    <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center text-${stat.color}`}>
                                        <stat.icon size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-secondary font-medium">{stat.label}</h3>
                                        {stat.count !== undefined ? (
                                            <p className={`text-5xl font-extrabold text-${stat.color} mt-2`}>
                                                {loading ? '-' : stat.count}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="hidden md:block opacity-5 group-hover:opacity-10 transition-opacity absolute right-8">
                                    <stat.icon size={120} />
                                </div>
                            </div>
                        </motion.div>
                    </Fragment>
                ))}
            </div>
        </div>
        </Layout>
    );
}
