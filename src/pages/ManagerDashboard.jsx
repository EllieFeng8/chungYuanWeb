import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { CalendarDays, ClipboardCheck, Clock, FileClock, FileWarning } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { getDeptApprovalList, getHrApplicationList, getMyApplications } from '../lib/cfctApi';
import { getApplicationTypeName, getCurrentEmployeeContext } from '../lib/applicationUtils';

function isOvertimeApplication(application) {
    return String(getApplicationTypeName(application) || '').includes('加班');
}

export default function ManagerDashboard() {
    const navigate = useNavigate();
    const [accountRole, setAccountRole] = useState('');
    const [agentAssignments, setAgentAssignments] = useState([]);
    const [counts, setCounts] = useState({
        pendingApprovals: 0,
        overtimeApplications: 0,
        leaveApplications: 0,
        pendingMyApplications: 0,
        needSupplementMyApplications: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        async function loadDashboardCounts() {
            setLoading(true);
            try {
                const { currentEmployee, accountDetail } = await getCurrentEmployeeContext();
                const isAdmin = accountDetail?.role === 'admin';
                setAccountRole(accountDetail?.role || '');

                const requests = [];
                if (isAdmin) {
                    console.log('[ManagerDashboard] GET /app-api/hr/applications');
                    requests.push(getHrApplicationList());
                } else {
                    console.log('[ManagerDashboard] GET /app-api/approval/dept-list', {
                        employeeNo: currentEmployee.employeeNo,
                        status: '',
                    });
                    console.log('[ManagerDashboard] GET /app-api/applications/mine', {
                        employeeNo: currentEmployee.employeeNo,
                    });
                    requests.push(
                        getDeptApprovalList(currentEmployee.employeeNo, ''),
                        getMyApplications(currentEmployee.employeeNo)
                    );
                }

                const responses = await Promise.all(requests);

                if (!isMounted) {
                    return;
                }

                if (isAdmin) {
                    const approvalResponse = responses[0];
                    if (!approvalResponse?.success) {
                        throw new Error(approvalResponse?.error || '待審核資料讀取失敗');
                    }

                    const approvalItems = Array.isArray(approvalResponse.data) ? approvalResponse.data : [];
                    setAgentAssignments(
                        approvalItems.filter((item) => String(item?.agentEmpNo || '').trim() === currentEmployee.employeeNo)
                    );
                    setCounts({
                        pendingApprovals: approvalItems.filter((item) => item?.status === 'pending').length,
                        overtimeApplications: approvalItems.filter((item) => isOvertimeApplication(item)).length,
                        leaveApplications: approvalItems.filter((item) => !isOvertimeApplication(item)).length,
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
                setAgentAssignments(
                    approvalItems.filter((item) => String(item?.agentEmpNo || '').trim() === currentEmployee.employeeNo)
                );

                setCounts({
                    pendingApprovals: approvalItems.filter((item) => item?.status === 'pending').length,
                    overtimeApplications: 0,
                    leaveApplications: 0,
                    pendingMyApplications: myApplications.filter((item) => item?.status === 'pending').length,
                    needSupplementMyApplications: myApplications.filter((item) => item?.status === 'need_supplement').length,
                });
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setCounts({
                    pendingApprovals: 0,
                    overtimeApplications: 0,
                    leaveApplications: 0,
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
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        void loadDashboardCounts();

        return () => {
            isMounted = false;
        };
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
                    label: '加班申請總數',
                    count: counts.overtimeApplications,
                    path: '/approvals',
                    color: 'tertiary',
                    icon: Clock,
                    bgColor: 'bg-tertiary-container/10',
                },
                {
                    label: '請假申請總數',
                    count: counts.leaveApplications,
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
        const firstApplicantName = firstAssignment?.applicantName || firstAssignment?.applicantEmpNo || '-';
        const firstTypeName = getApplicationTypeName(firstAssignment);

        if (agentAssignments.length === 1) {
            return `${firstApplicantName} 的 ${firstTypeName} 申請指定您為代理人，僅知會不需確認。`;
        }

        return `${firstApplicantName} 等 ${agentAssignments.length} 筆申請指定您為代理人，僅知會不需確認。`;
    }, [agentAssignments]);

    return (
        <Layout title="首頁">
        <div className="page-container">
            {!loading && agentAssignments.length ? (
                <div className="mb-6 rounded-xl border border-tertiary-container/30 bg-tertiary-fixed px-5 py-4 text-on-tertiary-container">
                    <p className="text-base font-medium">{agentAlertText}</p>
                </div>
            ) : null}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {stats.map((stat, idx) => (
                    <motion.div
                        key={stat.label}
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
                                    <p className={`text-5xl font-extrabold text-${stat.color} mt-2`}>
                                        {loading ? '-' : stat.count}
                                    </p>
                                </div>
                            </div>
                            <div className="hidden md:block opacity-5 group-hover:opacity-10 transition-opacity absolute right-8">
                                <stat.icon size={120} />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
        </Layout>
    );
}
