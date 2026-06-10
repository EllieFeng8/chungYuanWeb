import {
    Download,
    Clock,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Layout from '../components/Layout';
import { getDepartmentList, getDeptApprovalList, getHrApplicationList } from '../lib/cfctApi';
import {
    formatDateTime,
    getCurrentEmployeeContext,
    getApplicationDotColor,
    getApplicationPeriod,
    getApplicationStatusLabel,
    getApplicationStatusStyles,
    getApplicationTypeName,
} from '../lib/applicationUtils';

const STATUS_ALL = 'all';

const STATUS_QUERY_MAP = {
    [STATUS_ALL]: '',
    '審核中': 'pending',
    '已核准': 'approved',
    '已駁回': 'rejected',
};

function getAgentStatusLabel(status, hasAgent) {
    switch (status) {
        case 'confirmed':
        case 'approved':
        case '已確認':
            return '已確認';
        case 'rejected':
        case '已拒絕':
            return '已拒絕';
        case 'pending':
        case '待確認':
            return '待確認';
        case 'unassigned':
        case 'none':
            return hasAgent ? '未回覆' : '未指派';
        case '未指派':
            return '未指派';
        case '未回覆':
            return '未回覆';
        default:
            return status || (hasAgent ? '-' : '未指派');
    }
}

function getAgentStatusStyles(status) {
    switch (status) {
        case '已確認':
            return 'bg-primary/10 text-primary border-primary/20';
        case '已拒絕':
            return 'bg-error-container text-on-error-container border-error/10';
        case '待確認':
            return 'bg-blue-50 text-blue-700 border-blue-100';
        case '未回覆':
            return 'bg-amber-50 text-amber-700 border-amber-100';
        case '未指派':
            return 'bg-surface-container text-secondary border-outline-variant';
        default:
            return 'bg-surface-container text-secondary border-outline-variant';
    }
}

function getTypeColor(application) {
    const dotColor = getApplicationDotColor(application?.category);
    if (dotColor !== 'bg-outline') {
        return dotColor;
    }

    const typeName = getApplicationTypeName(application);
    if (typeName === '加班') {
        return 'bg-tertiary';
    }
    if (typeName.includes('病')) {
        return 'bg-red-500';
    }
    if (typeName.includes('休')) {
        return 'bg-green-500';
    }
    return 'bg-blue-500';
}

function getDurationText(application) {
    const periodText = String(application?.period || application?.duration || '').trim();
    if (periodText) {
        return periodText;
    }

    const period = getApplicationPeriod(application);
    if (period.startDate === '-' || period.endDate === '-') {
        return '-';
    }

    return `${period.startDate} ${period.startTime} - ${period.endDate} ${period.endTime}`;
}

function isOvertimeApplication(typeName) {
    return String(typeName || '').includes('加班');
}

function getApprovalRequestDate(item) {
    const rawDate = item?.submittedAt || item?.createdAt || item?.createTime || item?.applyTime || item?.requestTime;
    if (!rawDate) {
        return null;
    }

    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

function normalizeApprovalItem(item) {
    const statusLabel = getApplicationStatusLabel(item?.status);
    const agentName = item?.agentName || item?.agentEmpName || item?.agentEmpNo || item?.proxyName || '-';
    const hasAgent = agentName !== '-';
    return {
        seqNo: item?.seqNo || item?.applicationSeqNo || item?.id || '',
        department: item?.departmentName || item?.deptName || item?.department || '-',
        applicant: item?.applicantName || item?.employeeName || item?.applicantEmpName || item?.applicantEmpNo || '-',
        requestTime: formatDateTime(item?.submittedAt || item?.createdAt || item?.createTime || item?.applyTime || item?.requestTime) || '-',
        type: getApplicationTypeName(item),
        typeColor: getTypeColor(item),
        duration: getDurationText(item),
        agentName,
        agentStatus: getAgentStatusLabel(item?.agentConfirmState || item?.agentStatus, hasAgent),
        status: statusLabel,
        detail: item?.reason || item?.remark || item?.comment || item?.description || '-',
        raw: item,
    };
}

export default function ApprovalList() {
    const navigate = useNavigate();
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState(STATUS_ALL);
    const [requestTypeFilter, setRequestTypeFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [approvalList, setApprovalList] = useState([]);
    const [departmentOptions, setDepartmentOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function loadApprovalList() {
            setLoading(true);
            try {
                const { currentEmployee, accountDetail } = await getCurrentEmployeeContext();
                const isAdmin = accountDetail?.role === 'admin';
                setIsAdmin(isAdmin);

                if (isAdmin) {
                    console.log('[ApprovalList] GET /app-api/hr/applications');
                } else {
                    console.log('[ApprovalList] GET /app-api/approval/dept-list', {
                        employeeNo: currentEmployee.employeeNo,
                        status: '',
                    });
                }
                console.log('[ApprovalList] GET /app-api/departments');
                const [approvalResponse, departmentResponse] = await Promise.all([
                    isAdmin
                        ? getHrApplicationList()
                        : getDeptApprovalList(currentEmployee.employeeNo, ''),
                    getDepartmentList(),
                ]);

                if (!approvalResponse?.success) {
                    throw new Error(approvalResponse?.error || (isAdmin ? '審批清單讀取失敗' : '部門簽核清單讀取失敗'));
                }
                if (!departmentResponse?.success) {
                    throw new Error(departmentResponse?.error || '部門列表讀取失敗');
                }

                if (!isMounted) {
                    return;
                }

                const records = Array.isArray(approvalResponse.data) ? approvalResponse.data : [];
                const departments = Array.isArray(departmentResponse.data) ? departmentResponse.data : [];
                setApprovalList(records.map(normalizeApprovalItem));
                setDepartmentOptions(
                    departments
                        .map((department) => department?.departmentName || department?.deptName || department?.name || '')
                        .filter(Boolean)
                );
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setApprovalList([]);
                setDepartmentOptions([]);
                void Swal.fire({
                    icon: 'error',
                    title: '讀取失敗',
                    text: error instanceof Error ? error.message : '無法讀取待審批清單',
                });
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        void loadApprovalList();

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredApprovalList = useMemo(() => (
        approvalList.filter((item) => {
            if (departmentFilter !== 'all' && item.department !== departmentFilter) {
                return false;
            }

            const requestDate = getApprovalRequestDate(item.raw);
            if (dateFrom) {
                const startDate = new Date(`${dateFrom}T00:00:00`);
                if (!requestDate || requestDate < startDate) {
                    return false;
                }
            }

            if (dateTo) {
                const endDate = new Date(`${dateTo}T23:59:59.999`);
                if (!requestDate || requestDate > endDate) {
                    return false;
                }
            }

            const normalizedStatus = STATUS_QUERY_MAP[statusFilter];
            if (normalizedStatus && item.raw?.status !== normalizedStatus) {
                return false;
            }

            if (requestTypeFilter === 'overtime' && !isOvertimeApplication(item.type)) {
                return false;
            }

            if (requestTypeFilter === 'leave' && isOvertimeApplication(item.type)) {
                return false;
            }

            return true;
        })
    ), [approvalList, dateFrom, dateTo, departmentFilter, requestTypeFilter, statusFilter]);

    const departmentSelectWidth = useMemo(() => {
        const longestDepartmentLength = departmentOptions.reduce(
            (maxLength, department) => Math.max(maxLength, String(department || '').length),
            '所有部門'.length
        );

        return `${Math.max(12, longestDepartmentLength + 3)}ch`;
    }, [departmentOptions]);

    useEffect(() => {
        setCurrentPage(1);
    }, [departmentFilter, statusFilter, requestTypeFilter, dateFrom, dateTo, pageSize]);

    const statsOverview = useMemo(() => ([
        {
            label: '審核總數',
            count: approvalList.length,
            unit: '項申請',
            color: 'primary',
            icon: Clock,
            value: 'all',
        },
        {
            label: '加班申請',
            count: approvalList.filter((item) => isOvertimeApplication(item.type)).length,
            unit: '項申請',
            color: 'tertiary',
            icon: Clock,
            value: 'overtime',
        },
        {
            label: '請假申請',
            count: approvalList.filter((item) => !isOvertimeApplication(item.type)).length,
            unit: '項申請',
            color: 'blue-500',
            icon: CalendarDays,
            value: 'leave',
        },
    ]), [approvalList]);

    const totalPages = Math.max(1, Math.ceil(filteredApprovalList.length / pageSize));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const startIndex = (safeCurrentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedApprovalList = filteredApprovalList.slice(startIndex, endIndex);
    const visiblePageNumbers = useMemo(() => {
        const pages = [];
        for (let page = 1; page <= totalPages; page += 1) {
            pages.push(page);
        }
        return pages;
    }, [totalPages]);

    const handleDownload = () => {
        const headers = ['部門', '員工資訊', '申請日期時間', '申請類型', '日期時間', '代理人名稱', '代理人狀態', '狀態', '詳情'];
        const rows = filteredApprovalList.map((item) => [
            item.department,
            item.applicant,
            item.requestTime,
            item.type,
            item.duration,
            item.agentName,
            item.agentStatus,
            item.status,
            item.detail,
        ]);

        const csvContent = [headers, ...rows]
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'approval-list.csv';
        link.click();
        window.URL.revokeObjectURL(url);
    };

    const handleRowClick = (item) => {
        navigate(`/approvals/detail?seqNo=${encodeURIComponent(item.seqNo)}`, {
            state: { seqNo: item.seqNo, application: item.raw },
        });
    };

    return (
        <Layout title="">
        <div className="page-container">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-on-surface">待審批清單</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statsOverview.map((stat, idx) => (
                    <motion.button
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        type="button"
                        onClick={() => setRequestTypeFilter(stat.value)}
                        className={`w-full rounded-xl border overflow-hidden shadow-sm p-6 flex items-center gap-6 border-t-4 text-left transition-all ${
                            stat.color === 'primary' ? 'border-primary' :
                                stat.color === 'tertiary' ? 'border-tertiary-container' : 'border-blue-500'
                        } ${
                            requestTypeFilter === stat.value
                                ? stat.color === 'primary'
                                    ? 'bg-[#e9f6ee] ring-2 ring-[#cfe9d8] border-[#7bc69a]'
                                    : stat.color === 'tertiary'
                                        ? 'bg-[#fff4e8] ring-2 ring-[#ffe2bf] border-[#f4b266]'
                                        : 'bg-[#dbeafe] ring-2 ring-[#bfdbfe] border-[#60a5fa]'
                                : 'bg-surface-container-lowest hover:bg-surface-container-low'
                        }`}
                    >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            requestTypeFilter === stat.value
                                ? stat.color === 'primary'
                                    ? 'bg-[#7bc69a]/15 text-[#2f7d4a]'
                                    : stat.color === 'tertiary'
                                        ? 'bg-[#f4b266]/15 text-[#c77719]'
                                        : 'bg-[#60a5fa]/15 text-[#2563eb]'
                                : stat.color === 'primary'
                                    ? 'bg-primary/10 text-primary'
                                    : stat.color === 'tertiary'
                                        ? 'bg-tertiary-container/10 text-tertiary-container'
                                        : 'bg-blue-100 text-blue-600'
                        }`}>
                            <stat.icon size={28} />
                        </div>
                        <div>
                            <p className={`text-xs font-medium ${
                                requestTypeFilter === stat.value ? 'text-on-surface-variant' : 'text-secondary'
                            }`}>
                                {stat.label}
                            </p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-on-surface">{stat.count}</span>
                                <span className={`text-xs ${
                                    requestTypeFilter === stat.value ? 'text-on-surface-variant' : 'text-secondary'
                                }`}>
                                    {stat.unit}
                                </span>
                            </div>
                        </div>
                    </motion.button>
                ))}
            </div>

            <section className="card bg-surface-container-lowest">
                <div className="p-6 border-b border-outline-variant">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setStatusFilter(STATUS_ALL)}
                                className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${
                                    statusFilter === STATUS_ALL
                                        ? 'bg-primary text-white'
                                        : 'bg-surface-container border border-outline-variant text-secondary hover:bg-surface-container-high'
                                }`}
                            >
                                全部
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('審核中')}
                                className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${
                                    statusFilter === '審核中'
                                        ? 'bg-primary text-white'
                                        : 'bg-surface-container border border-outline-variant text-secondary hover:bg-surface-container-high'
                                }`}
                            >
                                審核中
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('已核准')}
                                className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${
                                    statusFilter === '已核准'
                                        ? 'bg-primary text-white'
                                        : 'bg-surface-container border border-outline-variant text-secondary hover:bg-surface-container-high'
                                }`}
                            >
                                已核准
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('已駁回')}
                                className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${
                                    statusFilter === '已駁回'
                                        ? 'bg-primary text-white'
                                        : 'bg-surface-container border border-outline-variant text-secondary hover:bg-surface-container-high'
                                }`}
                            >
                                已駁回
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <label className="text-xs text-secondary whitespace-nowrap">部門:</label>
                                <select
                                    value={departmentFilter}
                                    onChange={(event) => setDepartmentFilter(event.target.value)}
                                    style={{ width: departmentSelectWidth }}
                                    className="h-10 max-w-full border border-outline-variant rounded-lg px-3 text-sm bg-surface-container-lowest focus:ring-1 focus:ring-primary outline-none"
                                >
                                    <option value="all">所有部門</option>
                                    {departmentOptions.map((department) => (
                                        <option key={department} value={department}>{department}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <label className="text-xs text-secondary whitespace-nowrap">申請起迄日期:</label>
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={dateFrom}
                                            onChange={(event) => setDateFrom(event.target.value)}
                                            className="h-10 w-[148px] border border-outline rounded-lg bg-white text-on-surface px-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                                        />

                                    </div>
                                    <span className="text-secondary">-</span>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={dateTo}
                                            onChange={(event) => setDateTo(event.target.value)}
                                            className="h-10 w-[148px] border border-outline rounded-lg bg-white text-on-surface px-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                                        />

                                    </div>
                                </div>
                            </div>
                            {isAdmin && (
                                <button
                                    type="button"
                                    onClick={handleDownload}
                                    className="flex w-[72px] flex-none items-center justify-center gap-1 text-sm font-medium text-slate-400 transition-colors hover:text-brand"
                                >
                                    <Download className="w-4 h-4" />
                                    匯出
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto overflow-y-hidden xl:hidden">
                    <table className="min-w-[980px] w-full table-fixed text-left border-collapse">
                        <thead>
                        <tr className="bg-surface-container-low border-b border-outline-variant">
                            <th className="sticky left-0 z-20 w-[110px] bg-surface-container-low px-4 py-4 text-xs font-bold text-secondary tracking-wider">部門</th>
                            <th className="sticky left-[110px] z-20 w-[140px] bg-surface-container-low px-4 py-4 text-xs font-bold text-secondary tracking-wider">員工資訊</th>
                            <th className="w-[12%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">申請日期時間</th>
                            <th className="w-[10%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">申請類型</th>
                            <th className="w-[16%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">日期時間</th>
                            <th className="w-[10%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">代理人名稱</th>
                            <th className="w-[10%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">代理人狀態</th>
                            <th className="w-[9%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">狀態</th>
                            <th className="w-[13%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">詳情</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant">
                        {loading ? (
                            <tr>
                                <td colSpan={9} className="px-4 py-10 text-center text-sm text-secondary">資料讀取中...</td>
                            </tr>
                        ) : paginatedApprovalList.length ? (
                            paginatedApprovalList.map((item, idx) => (
                                <tr
                                    key={item.seqNo || idx}
                                    className="hover:bg-surface-container-low transition-colors group cursor-pointer"
                                    onClick={() => handleRowClick(item)}
                                >
                                    <td className="sticky left-0 z-10 bg-surface-container-lowest px-4 py-4 text-sm break-words group-hover:bg-surface-container-low">{item.department}</td>
                                    <td className="sticky left-[110px] z-10 bg-surface-container-lowest px-4 py-4 group-hover:bg-surface-container-low">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium">{item.applicant}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-xs text-on-surface-variant leading-relaxed">
                                        {String(item.requestTime || '-').split(' ').map((part, i) => (
                                            <div key={i}>{part}</div>
                                        ))}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${item.typeColor}`}></span>
                                            <span className="text-sm">{item.type}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-xs text-on-surface-variant leading-relaxed">
                                        {String(item.duration || '-').split(' - ').map((part, i) => (
                                            <div key={i}>{part}</div>
                                        ))}
                                    </td>
                                    <td className="px-4 py-4 text-sm break-words">{item.agentName}</td>
                                    <td className="px-4 py-4">
                                        <span className={`inline-flex whitespace-nowrap items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getAgentStatusStyles(item.agentStatus)}`}>
                                            {item.agentStatus}
                                        </span>
                                    </td>

                                    <td className="px-4 py-4">
                    <span className={`inline-flex whitespace-nowrap items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getApplicationStatusStyles(STATUS_QUERY_MAP[item.status] || item.raw?.status)}`}>
                      {item.status}
                    </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <p className="overflow-hidden text-ellipsis whitespace-nowrap text-sm text-secondary" title={item.detail}>
                                            {item.detail}
                                        </p>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={9} className="px-4 py-10 text-center text-sm text-secondary">查無待審批資料</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>

                <div className="hidden xl:block">
                    <table className="w-full table-fixed text-left border-collapse">
                        <thead>
                        <tr className="bg-surface-container-low border-b border-outline-variant">
                            <th className="w-[11%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">部門</th>
                            <th className="w-[12%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">員工資訊</th>
                            <th className="w-[13%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">申請日期時間</th>
                            <th className="w-[10%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">申請類型</th>
                            <th className="w-[15%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">日期時間</th>
                            <th className="w-[10%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">代理人名稱</th>
                            <th className="w-[11%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">代理人狀態</th>
                            <th className="w-[8%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">狀態</th>
                            <th className="w-[10%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">詳情</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant">
                        {loading ? (
                            <tr>
                                <td colSpan={9} className="px-4 py-10 text-center text-sm text-secondary">資料讀取中...</td>
                            </tr>
                        ) : paginatedApprovalList.length ? (
                            paginatedApprovalList.map((item, idx) => (
                                <tr
                                    key={item.seqNo || idx}
                                    className="hover:bg-surface-container-low transition-colors cursor-pointer"
                                    onClick={() => handleRowClick(item)}
                                >
                                    <td className="px-4 py-4 text-sm break-words">{item.department}</td>
                                    <td className="px-4 py-4 text-sm font-medium break-words">{item.applicant}</td>
                                    <td className="px-4 py-4 text-xs text-on-surface-variant leading-relaxed">
                                        {String(item.requestTime || '-').split(' ').map((part, i) => (
                                            <div key={i}>{part}</div>
                                        ))}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${item.typeColor}`}></span>
                                            <span className="text-sm break-words">{item.type}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-xs text-on-surface-variant leading-relaxed">
                                        {String(item.duration || '-').split(' - ').map((part, i) => (
                                            <div key={i}>{part}</div>
                                        ))}
                                    </td>
                                    <td className="px-4 py-4 text-sm break-words">{item.agentName}</td>
                                    <td className="px-4 py-4">
                                        <span className={`inline-flex whitespace-nowrap items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getAgentStatusStyles(item.agentStatus)}`}>
                                            {item.agentStatus}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className={`inline-flex whitespace-nowrap items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getApplicationStatusStyles(STATUS_QUERY_MAP[item.status] || item.raw?.status)}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <p className="overflow-hidden text-ellipsis whitespace-nowrap text-sm text-secondary" title={item.detail}>
                                            {item.detail}
                                        </p>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={9} className="px-4 py-10 text-center text-sm text-secondary">查無待審批資料</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-secondary whitespace-nowrap">每頁顯示:</label>
                            <select
                                className="h-9 border border-outline-variant rounded-lg px-3 text-sm bg-surface-container-lowest min-w-[88px] focus:ring-1 focus:ring-primary outline-none"
                                value={pageSize}
                                onChange={(event) => setPageSize(Number(event.target.value))}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                        <p className="text-on-surface-variant text-xs font-medium tracking-wider">
                            顯示 {filteredApprovalList.length ? startIndex + 1 : 0} 至 {Math.min(endIndex, filteredApprovalList.length)} 項，共 {filteredApprovalList.length} 項申請
                        </p>
                    </div>
                    <div className="flex gap-1.5">
                        <button
                            type="button"
                            disabled={safeCurrentPage === 1}
                            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                            className="w-9 h-9 border border-outline-variant rounded-lg flex items-center justify-center text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-30"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        {visiblePageNumbers.map((page) => (
                            <button
                                key={page}
                                type="button"
                                onClick={() => setCurrentPage(page)}
                                className={page === safeCurrentPage
                                    ? 'w-9 h-9 bg-primary text-white rounded-lg font-bold text-sm flex items-center justify-center shadow-sm'
                                    : 'w-9 h-9 border border-outline-variant rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors text-sm font-bold'}
                            >
                                {page}
                            </button>
                        ))}
                        <button
                            type="button"
                            disabled={safeCurrentPage === totalPages}
                            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                            className="w-9 h-9 border border-outline-variant rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-30"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </section>
        </div>
        </Layout>
    );
}
