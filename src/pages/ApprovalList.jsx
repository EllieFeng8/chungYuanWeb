import {
    Download,
    Clock,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Search,
} from 'lucide-react';
import JSZip from 'jszip';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import ApprovalRequestList from '../components/ApprovalRequestList';
import Layout from '../components/Layout';
import {
    getAttachmentDownloadUrl,
    getAttachmentList,
    getApplicationDetail,
    getDepartmentList,
    getDeptApprovalList,
    getHrApplicationExportUrl,
    getHrApplicationList,
} from '../lib/cfctApi';
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
    const normalizedTypeName = String(typeName || '').trim();
    return normalizedTypeName.includes('加班') || normalizedTypeName.includes('車趟津貼');
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

function resolveCurrentApproverStepState(applicationDetail, currentEmployee, accountDetail) {
    const steps = Array.isArray(applicationDetail?.steps) ? applicationDetail.steps : [];
    if (!steps.length) {
        return '';
    }

    const currentApproverName = String(currentEmployee?.employeeName || '').trim().toLowerCase();
    const fallbackApproverNames = [
        accountDetail?.displayName,
        accountDetail?.accountName,
    ]
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean);

    const matchedStep = steps.find((step) => {
        const approverName = String(step?.approverName || '').trim().toLowerCase();
        if (currentApproverName && approverName === currentApproverName) {
            return true;
        }

        return fallbackApproverNames.includes(approverName);
    });

    return String(matchedStep?.stepState || '').trim();
}

function normalizeApprovalItem(item, statusOverride = '') {
    const normalizedStatus = String(statusOverride || item?.status || '').trim();
    const statusLabel = getApplicationStatusLabel(normalizedStatus);
    const agentNames = [
        item?.agentName || item?.agentEmpName || item?.agentEmpNo || item?.proxyName || '',
        item?.agent2Name || item?.agent2EmpName || item?.agent2EmpNo || '',
    ]
        .map((value) => String(value || '').trim())
        .filter(Boolean);
    const hasAgent = agentNames.length > 0;
    const attachmentCount = Number(item?.attachmentCount ?? item?.AttachmentCount ?? 0);
    return {
        seqNo: item?.seqNo || item?.applicationSeqNo || item?.id || '',
        department: item?.departmentName || item?.deptName || item?.department || '-',
        applicant: item?.applicantName || item?.employeeName || item?.applicantEmpName || item?.applicantEmpNo || '-',
        requestTime: formatDateTime(item?.submittedAt || item?.createdAt || item?.createTime || item?.applyTime || item?.requestTime) || '-',
        type: getApplicationTypeName(item),
        typeColor: getTypeColor(item),
        duration: getDurationText(item),
        agentNames,
        agentName: agentNames.length ? agentNames.join(' / ') : '-',
        agentStatus: getAgentStatusLabel(item?.agentConfirmState || item?.agentStatus, hasAgent),
        attachmentStatus: attachmentCount >= 1 ? '有' : '無',
        status: statusLabel,
        currentApprovalStatus: normalizedStatus,
        detail: item?.reason || item?.remark || item?.comment || item?.description || '-',
        raw: item,
    };
}

function getAttachmentCount(item) {
    return Number(item?.raw?.attachmentCount ?? item?.raw?.AttachmentCount ?? 0);
}

function sanitizeFileName(value, fallback = 'file') {
    const normalized = String(value || '').trim();
    if (!normalized) {
        return fallback;
    }

    return normalized.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_');
}

function parseContentDispositionFileName(contentDisposition) {
    const utf8Match = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
        try {
            return decodeURIComponent(utf8Match[1]);
        } catch {
            return utf8Match[1];
        }
    }

    const plainMatch = contentDisposition?.match(/filename="?([^"]+)"?/i);
    return plainMatch?.[1] || '';
}

async function fetchBlobWithFileName(url, fallbackFileName) {
    const response = await fetch(url);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `檔案下載失敗 (${response.status})`);
    }

    const blob = await response.blob();
    const headerFileName = parseContentDispositionFileName(response.headers.get('content-disposition'));
    return {
        blob,
        fileName: sanitizeFileName(headerFileName || fallbackFileName, fallbackFileName),
    };
}

export default function ApprovalList({ forceShowAttachmentColumn = false }) {
    const navigate = useNavigate();
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState(STATUS_ALL);
    const [requestTypeFilter, setRequestTypeFilter] = useState('all');
    const [searchInput, setSearchInput] = useState('');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [approvalList, setApprovalList] = useState([]);
    const [departmentOptions, setDepartmentOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isManager, setIsManager] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function loadApprovalList() {
            setLoading(true);
            try {
                const { currentEmployee, accountDetail } = await getCurrentEmployeeContext();
                const isAdmin = accountDetail?.role === 'admin';
                const isManager = accountDetail?.role === 'manager';
                setIsAdmin(isAdmin);
                setIsManager(isManager);

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
                const normalizedRecords = isAdmin
                    ? records.map((record) => normalizeApprovalItem(record))
                    : await Promise.all(
                        records.map(async (record) => {
                            const seqNo = record?.seqNo || record?.applicationSeqNo || record?.id;
                            if (!seqNo) {
                                return normalizeApprovalItem(record);
                            }

                            try {
                                const detailResponse = await getApplicationDetail(seqNo);
                                if (!detailResponse?.success) {
                                    return normalizeApprovalItem(record);
                                }

                                const currentStepState = resolveCurrentApproverStepState(
                                    detailResponse.data,
                                    currentEmployee,
                                    accountDetail
                                );

                                return normalizeApprovalItem(record, currentStepState);
                            } catch (detailError) {
                                console.error('[ApprovalList] application detail read failed', {
                                    seqNo,
                                    error: detailError instanceof Error ? detailError.message : detailError,
                                });
                                return normalizeApprovalItem(record);
                            }
                        })
                    );

                setApprovalList(normalizedRecords);
                setDepartmentOptions(
                    departments
                        .map((department) => {
                            const name = department?.departmentName || department?.deptName || department?.name || '';
                            const deptNo = department?.departmentNo || department?.deptNo || department?.id || '';
                            if (!name) {
                                return null;
                            }

                            return {
                                name,
                                deptNo: String(deptNo || '').trim(),
                            };
                        })
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
            const normalizedKeyword = searchKeyword.trim().toLowerCase();
            if (normalizedKeyword) {
                const searchableText = [
                    item.seqNo,
                    item.department,
                    item.applicant,
                    item.requestTime,
                    item.type,
                    item.duration,
                    item.agentName,
                    item.agentStatus,
                    item.attachmentStatus,
                    item.status,
                    item.detail,
                ]
                    .map((value) => String(value || '').toLowerCase())
                    .join(' ');

                if (!searchableText.includes(normalizedKeyword)) {
                    return false;
                }
            }

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
            const statusValue = isAdmin ? item.raw?.status : item.currentApprovalStatus;
            if (normalizedStatus && statusValue !== normalizedStatus) {
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
    ), [approvalList, dateFrom, dateTo, departmentFilter, requestTypeFilter, searchKeyword, statusFilter]);

    const selectedDepartmentOption = useMemo(() => (
        departmentOptions.find((department) => department.name === departmentFilter) || null
    ), [departmentFilter, departmentOptions]);

    useEffect(() => {
        setCurrentPage(1);
    }, [departmentFilter, statusFilter, requestTypeFilter, searchKeyword, dateFrom, dateTo, pageSize]);

    const handleSearch = () => {
        setSearchKeyword(searchInput.trim());
    };

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
    const showAttachmentColumn = isAdmin || forceShowAttachmentColumn;
    const visiblePageNumbers = useMemo(() => {
        const pages = [];
        for (let page = 1; page <= totalPages; page += 1) {
            pages.push(page);
        }
        return pages;
    }, [totalPages]);

    const handleDownload = async () => {
        const category = requestTypeFilter === 'all' ? '' : requestTypeFilter;
        const exportUrl = getHrApplicationExportUrl({
            status: STATUS_QUERY_MAP[statusFilter],
            deptNo: selectedDepartmentOption?.deptNo || '',
            category,
            from: dateFrom,
            to: dateTo,
        });

        try {
            const zip = new JSZip();
            const exportFile = await fetchBlobWithFileName(exportUrl, 'applications.csv');
            zip.file(exportFile.fileName, exportFile.blob);

            const itemsWithAttachments = filteredApprovalList.filter((item) => getAttachmentCount(item) >= 1);
            const attachmentRoot = zip.folder('attachments');
            const failedAttachments = [];

            for (const item of itemsWithAttachments) {
                const response = await getAttachmentList(item.seqNo);
                if (!response?.success) {
                    throw new Error(response?.error || `附件列表讀取失敗：${item.applicant}`);
                }

                const attachments = Array.isArray(response.data) ? response.data : [];
                const itemFolder = attachmentRoot?.folder(
                    sanitizeFileName(`${item.seqNo}_${item.applicant}_${item.type}`, String(item.seqNo))
                );

                for (const attachment of attachments) {
                    const attachmentSeqNo = attachment?.seqNo || attachment?.attachmentSeqNo || attachment?.id;
                    if (!attachmentSeqNo) {
                        continue;
                    }

                    const attachmentName = sanitizeFileName(
                        attachment?.fileName || attachment?.FileName || `attachment-${attachmentSeqNo}`,
                        `attachment-${attachmentSeqNo}`
                    );
                    try {
                        const attachmentFile = await fetchBlobWithFileName(
                            getAttachmentDownloadUrl(attachmentSeqNo),
                            attachmentName
                        );
                        itemFolder?.file(attachmentFile.fileName, attachmentFile.blob);
                    } catch (error) {
                        failedAttachments.push(`${item.applicant} / ${attachmentName}`);
                        console.error('[ApprovalList] attachment download failed', {
                            appSeqNo: item.seqNo,
                            attachmentSeqNo,
                            attachmentName,
                            error: error instanceof Error ? error.message : error,
                        });
                    }
                }
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const zipUrl = window.URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = zipUrl;
            link.download = `approval-export-${new Date().toISOString().slice(0, 10)}.zip`;
            link.click();
            window.URL.revokeObjectURL(zipUrl);

            if (failedAttachments.length) {
                void Swal.fire({
                    icon: 'warning',
                    title: '部分附件未下載',
                    text: `已略過 ${failedAttachments.length} 個失敗附件`,
                    footer: failedAttachments.slice(0, 5).join('<br>'),
                });
            }
        } catch (error) {
            void Swal.fire({
                icon: 'error',
                title: '匯出失敗',
                text: error instanceof Error ? error.message : '壓縮檔產生失敗',
            });
        }
    };

    const handleRowClick = (item) => {
        navigate(`/approvals/detail?seqNo=${encodeURIComponent(item.seqNo)}`, {
            state: { seqNo: item.seqNo, application: item.raw },
        });
    };

    const getStatusClassName = (item) => {
        const statusValue = isAdmin ? item.raw?.status : (item.currentApprovalStatus || item.raw?.status);
        if (statusValue === 'approved') {
            return 'bg-green-50 text-green-700 border-green-200';
        }

        return getApplicationStatusStyles(statusValue);
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
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex flex-wrap items-center gap-2">
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
                            </div>
                            <div className="flex items-center gap-2 whitespace-nowrap">
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
                        </div>

                        <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(180px,0.8fr)_minmax(0,1.2fr)_auto] xl:grid-cols-[minmax(260px,1.25fr)_minmax(180px,0.85fr)_minmax(320px,1.35fr)_auto] xl:items-end">
                            <div className="flex min-w-0 flex-col gap-1">
                                <label className="text-xs text-secondary whitespace-nowrap">搜索</label>
                                <div className="flex min-w-0 items-center gap-2">
                                    <input
                                        type="text"
                                        value={searchInput}
                                        onChange={(event) => setSearchInput(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                                handleSearch();
                                            }
                                        }}
                                        placeholder="輸入關鍵字"
                                        className="h-10 min-w-0 flex-1 border border-outline-variant rounded-lg px-3 text-sm bg-surface-container-lowest focus:ring-1 focus:ring-primary outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSearch}
                                        className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
                                    >
                                        <Search className="w-4 h-4" />
                                        搜索
                                    </button>
                                </div>
                            </div>
                            <div className="flex min-w-0 flex-col gap-1">
                                <label className="text-xs text-secondary whitespace-nowrap">部門</label>
                                <select
                                    value={departmentFilter}
                                    onChange={(event) => setDepartmentFilter(event.target.value)}
                                    className="h-10 w-full min-w-0 border border-outline-variant rounded-lg px-3 text-sm bg-surface-container-lowest focus:ring-1 focus:ring-primary outline-none"
                                >
                                    <option value="all">所有部門</option>
                                    {departmentOptions.map((department) => (
                                        <option key={`${department.deptNo}-${department.name}`} value={department.name}>{department.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex min-w-0 flex-col gap-1">
                                <label className="text-xs text-secondary whitespace-nowrap">申請起迄日期</label>
                                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(event) => setDateFrom(event.target.value)}
                                        className="h-10 w-full border border-outline rounded-lg bg-white px-3 text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none"
                                    />
                                    <span className="text-center text-secondary whitespace-nowrap">-</span>
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={(event) => setDateTo(event.target.value)}
                                        className="h-10 w-full border border-outline rounded-lg bg-white px-3 text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none"
                                    />
                                </div>
                            </div>
                            {isAdmin && (
                                <button
                                    type="button"
                                    onClick={handleDownload}
                                    className="flex h-10 w-full items-center justify-center gap-1 rounded-lg border border-outline-variant px-3 text-sm font-medium text-slate-500 transition-colors hover:bg-surface-container-high hover:text-brand lg:w-auto lg:min-w-[88px]"
                                >
                                    <Download className="w-4 h-4" />
                                    匯出
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <ApprovalRequestList
                    items={paginatedApprovalList}
                    loading={loading}
                    showAttachmentColumn={showAttachmentColumn}
                    isManager={isManager}
                    onRowClick={handleRowClick}
                    getAgentStatusClassName={getAgentStatusStyles}
                    getApplicationStatusClassName={getStatusClassName}
                />

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
