import {
    ArrowLeft,
    ClipboardList,
    Lock,
    CalendarDays,
    ChevronRight,
    FolderOpen,
    FileText,
    Info,
    ExternalLink,
    CheckCircle2,
    AlertCircle,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Swal from 'sweetalert2';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import {
    approveApplication,
    getAttachmentDownloadUrl,
    getAttachmentList,
    getApplicationDetail,
    rejectApplication,
    returnApplication,
} from '../lib/cfctApi';
import {
    formatDateTime,
    getApplicationStatusLabel,
    getApplicationStatusStyles,
    getCurrentEmployeeContext,
    getApplicationPeriod,
    getApplicationTypeName,
    getStoredDisplayName,
} from '../lib/applicationUtils';

function getAgentStatusLabel(status) {
    switch (status) {
        case 'confirmed':
        case 'approved':
        case '已確認':
            return '已確認';
        case 'pending':
        case 'agent_pending':
        case '待確認':
            return '待確認';
        case 'unassigned':
        case 'none':
        case '未指派':
            return '未指派';
        default:
            return status || '-';
    }
}

function buildStepLabel(steps) {
    const currentStep = Array.isArray(steps)
        ? steps.find((step) => step.stepState === 'pending')
        : null;

    if (!currentStep) {
        return '流程已完成';
    }

    return `承辦人: ${currentStep.approverName || currentStep.approverEmpNo || '-'}`;
}

export default function ApprovalDetail() {
    const [showModal, setShowModal] = useState(false);
    const [returnReason, setReturnReason] = useState('proxy');
    const [application, setApplication] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [actorEmpNo, setActorEmpNo] = useState('');
    const [existingAttachments, setExistingAttachments] = useState([]);
    const [attachmentLoading, setAttachmentLoading] = useState(false);
    const [attachmentError, setAttachmentError] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const applicationSeqNo = useMemo(() => {
        const stateSeqNo = location.state?.seqNo
            || location.state?.application?.seqNo
            || location.state?.recordId;
        return stateSeqNo || searchParams.get('seqNo') || '';
    }, [location.state, searchParams]);

    const hasBeenReviewed = (status) => Boolean(
        status
        && status !== 'pending'
        && status !== 'agent_pending'
    );

    useEffect(() => {
        let isMounted = true;

        async function loadAttachments(appSeqNo) {
            if (!appSeqNo) {
                if (isMounted) {
                    setExistingAttachments([]);
                }
                return;
            }

            if (isMounted) {
                setAttachmentLoading(true);
                setAttachmentError('');
            }

            try {
                const attachmentResponse = await getAttachmentList(appSeqNo);
                if (!attachmentResponse?.success) {
                    throw new Error(attachmentResponse?.error || '附件列表讀取失敗');
                }

                if (!isMounted) {
                    return;
                }

                setExistingAttachments(Array.isArray(attachmentResponse.data) ? attachmentResponse.data : []);
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setExistingAttachments([]);
                setAttachmentError(error instanceof Error ? error.message : '無法讀取附件列表');
            } finally {
                if (isMounted) {
                    setAttachmentLoading(false);
                }
            }
        }

        async function loadApprovalDetail() {
            if (!applicationSeqNo) {
                setLoading(false);
                return;
            }

            setLoading(true);

            try {
                const [detailResponse, employeeContext] = await Promise.all([
                    getApplicationDetail(applicationSeqNo),
                    getCurrentEmployeeContext(),
                ]);

                if (!detailResponse?.success) {
                    throw new Error(detailResponse?.error || '申請明細讀取失敗');
                }

                if (!isMounted) {
                    return;
                }

                const nextApplication = detailResponse.data || null;
                const nextActorEmpNo = employeeContext.currentEmployee?.employeeNo || '';
                setApplication(nextApplication);
                setEmployees(employeeContext.employees);
                setActorEmpNo(nextActorEmpNo);
                void loadAttachments(nextApplication?.seqNo || applicationSeqNo);

                if (hasBeenReviewed(nextApplication?.status)) {
                    void Swal.fire({
                        icon: 'info',
                        title: '已審核過',
                        text: '此申請已審核過，請返回上一頁重新確認狀態。',
                    });
                }
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setApplication(null);
                setExistingAttachments([]);
                setAttachmentError('');
                void Swal.fire({
                    icon: 'error',
                    title: '讀取失敗',
                    text: error instanceof Error ? error.message : '無法讀取審核資料',
                });
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        void loadApprovalDetail();

        return () => {
            isMounted = false;
        };
    }, [applicationSeqNo]);

    const applicantName = useMemo(() => {
        if (!application?.applicantEmpNo) {
            return getStoredDisplayName() || '-';
        }

        const matchedEmployee = employees.find(
            (employee) => employee.employeeNo === application.applicantEmpNo
        );

        return matchedEmployee?.employeeName || application.applicantEmpNo;
    }, [application?.applicantEmpNo, employees]);

    const canReview = Boolean(
        applicationSeqNo
        && application
        && actorEmpNo
        && application.status === 'pending'
    );
    const isReviewed = hasBeenReviewed(application?.status);
    const isSelfApplication = Boolean(
        application?.applicantEmpNo
        && actorEmpNo
        && application.applicantEmpNo === actorEmpNo
    );

    const period = getApplicationPeriod(application);
    const statusLabel = getApplicationStatusLabel(application?.status);
    const workflowLabel = buildStepLabel(application?.steps);
    const agentName = useMemo(
        () => application?.agentName || application?.agentEmpName || application?.agentEmpNo || application?.proxyName || '-',
        [application]
    );
    const agentStatusLabel = useMemo(
        () => getAgentStatusLabel(application?.agentConfirmState || application?.agentStatus),
        [application?.agentConfirmState, application?.agentStatus]
    );

    function showSelfApprovalAlert() {
        void Swal.fire({
            icon: 'warning',
            title: '不可審批自己的申請',
            text: '已指派其他主管或系統管理員進行審核。',
        });
    }

    async function refreshApplicationDetail() {
        if (!applicationSeqNo) {
            return;
        }

        const response = await getApplicationDetail(applicationSeqNo);
        if (!response?.success) {
            throw new Error(response?.error || '申請明細讀取失敗');
        }

        setApplication(response.data || null);
    }

    async function submitApprovalAction(action, payload, successTitle) {
        if (!applicationSeqNo) {
            throw new Error('缺少申請編號，無法執行簽核。');
        }
        if (!actorEmpNo) {
            throw new Error('找不到目前登入者對應的員工編號。');
        }
        if (application?.applicantEmpNo === actorEmpNo) {
            throw new Error('已指派其他主管或系統管理員進行審核。');
        }

        setSubmitting(true);
        try {
            const body = {
                actorEmpNo,
                ...(payload.comment ? { comment: payload.comment } : {}),
                ...(typeof payload.rowVer === 'number' ? { rowVer: payload.rowVer } : {}),
            };

            if (action === 'approve') {
                await approveApplication(applicationSeqNo, body);
            } else if (action === 'reject') {
                await rejectApplication(applicationSeqNo, body);
            } else {
                await returnApplication(applicationSeqNo, body);
            }

            await refreshApplicationDetail();
            void Swal.fire({
                icon: 'success',
                title: successTitle,
                showConfirmButton: false,
                timer: 1000,
            });
            navigate(-1);
        } finally {
            setSubmitting(false);
        }
    }

    const handleApproveApplication = async () => {
        if (!canReview) {
            return;
        }
        if (isSelfApplication) {
            showSelfApprovalAlert();
            return;
        }

        try {
            await submitApprovalAction(
                'approve',
                { rowVer: application?.rowVer },
                '核准成功'
            );
        } catch (error) {
            void Swal.fire({
                icon: 'error',
                title: '核准失敗',
                text: error instanceof Error ? error.message : '無法核准申請',
            });
        }
    };

    const handleRejectApplication = async () => {
        if (!canReview) {
            return;
        }
        if (isSelfApplication) {
            showSelfApprovalAlert();
            return;
        }

        const result = await Swal.fire({
            icon: 'warning',
            title: '是否駁回申請？',
            text: '送出後將無法直接復原。',
            input: 'textarea',
            inputLabel: '駁回原因',
            inputPlaceholder: '可選填駁回原因',
            showCancelButton: true,
            confirmButtonText: '確認駁回',
            cancelButtonText: '取消',
            confirmButtonColor: '#dc2626',
        });

        if (result.isConfirmed) {
            try {
                await submitApprovalAction(
                    'reject',
                    { comment: result.value, rowVer: application?.rowVer },
                    '已駁回申請'
                );
            } catch (error) {
                void Swal.fire({
                    icon: 'error',
                    title: '駁回失敗',
                    text: error instanceof Error ? error.message : '無法駁回申請',
                });
            }
        }
    };

    const handleReturnApplication = async () => {
        if (!canReview) {
            return;
        }
        if (isSelfApplication) {
            showSelfApprovalAlert();
            return;
        }

        try {
            await submitApprovalAction(
                'return',
                { comment: returnReason, rowVer: application?.rowVer },
                '已退回補件'
            );
            setShowModal(false);
        } catch (error) {
            void Swal.fire({
                icon: 'error',
                title: '退回失敗',
                text: error instanceof Error ? error.message : '無法退回補件',
            });
        }
    };

    if (loading) {
        return (
            <Layout title="">
                <div className="page-container max-w-5xl">
                    <section className="card p-8">
                        <p className="text-sm text-on-surface-variant">審核資料載入中...</p>
                    </section>
                </div>
            </Layout>
        );
    }

    if (!applicationSeqNo || !application) {
        return (
            <Layout title="">
                <div className="page-container max-w-5xl">
                    <section className="card p-8 space-y-4">
                        <h2 className="text-xl font-semibold text-on-surface">找不到申請資料</h2>
                        <p className="text-sm text-on-surface-variant">請從待審批清單重新進入此頁。</p>
                        <div>
                            <button
                                type="button"
                                onClick={() => navigate('/approvals')}
                                className="btn-primary"
                            >
                                返回待審批清單
                            </button>
                        </div>
                    </section>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="">
        <div className="page-container max-w-5xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 flex items-center justify-center border border-outline-variant rounded-lg bg-surface-container-lowest hover:bg-surface-container-low transition-all active:scale-95"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-2xl font-semibold text-on-surface">審核</h2>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        className="btn-tertiary"
                        disabled={!canReview || isReviewed || submitting}
                        onClick={() => {
                            if (!canReview || isReviewed) {
                                return;
                            }
                            if (isSelfApplication) {
                                showSelfApprovalAlert();
                                return;
                            }
                            setShowModal(true);
                        }}
                    >
                        退回補件
                    </button>
                    <button className="btn-error" disabled={!canReview || isReviewed || submitting} onClick={handleRejectApplication}>駁回申請</button>
                    <button className="btn-primary" disabled={!canReview || isReviewed || submitting} onClick={handleApproveApplication}>核准申請</button>
                </div>
            </div>

            <section className="card">
                <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex items-center gap-3">
                    <ClipboardList size={20} className="text-primary fill-primary/20" />
                    <h3 className="text-lg font-semibold text-on-surface">申請詳情</h3>
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-on-surface-variant">假別類型</label>
                        <div className="h-12 px-4 flex items-center gap-3 bg-surface-container-lowest border border-outline-variant rounded-lg">
                            <CheckCircle2 size={16} className="text-primary fill-primary/10" />
                            <span className="text-sm">{getApplicationTypeName(application)}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-on-surface-variant">員工姓名</label>
                        <div className="h-12 px-4 flex items-center gap-3 bg-surface-container-low border border-outline-variant rounded-lg text-secondary">
                            <Lock size={16} />
                            <span className="text-sm">{applicantName}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-on-surface-variant">代理人姓名</label>
                        <div className="h-12 px-4 flex items-center gap-3 bg-surface-container-lowest border border-outline-variant rounded-lg">
                            <Lock size={16} className="text-outline-variant" />
                            <span className="text-sm">{agentName}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-on-surface-variant">代理狀態</label>
                        <div className="h-12 px-4 flex items-center gap-3 bg-surface-container-lowest border border-outline-variant rounded-lg">
                            <CheckCircle2 size={16} className="text-primary fill-primary/10" />
                            <span className="text-sm">{agentStatusLabel}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-on-surface-variant">開始日期</label>
                        <div className="h-12 px-4 flex items-center gap-3 bg-surface-container-lowest border border-outline-variant rounded-lg">
                            <CalendarDays size={16} className="text-outline-variant" />
                            <span className="text-sm">{period.startDate} {period.startTime}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-on-surface-variant">結束日期</label>
                        <div className="h-12 px-4 flex items-center gap-3 bg-surface-container-lowest border border-outline-variant rounded-lg">
                            <CalendarDays size={16} className="text-outline-variant" />
                            <span className="text-sm">{period.endDate} {period.endTime}</span>
                        </div>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-medium text-on-surface-variant">請假原因</label>
                        <div className="min-h-[120px] p-4 bg-surface-container-lowest border border-outline-variant rounded-lg">
                            <p className="text-sm leading-relaxed">{application.reason || '-'}</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="card p-8">
                <div className="bg-surface-container-low rounded-xl p-5 flex items-start gap-4 border border-outline-variant/30">
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
            </section>

            {Array.isArray(application.steps) && application.steps.length ? (
                <section className="card p-8 space-y-6">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="text-primary" size={20} />
                        <h2 className="text-lg font-bold text-primary">簽核時間軸</h2>
                    </div>

                    <div className="space-y-4">
                        {application.steps.map((step) => (
                            <div
                                key={`${step.stepOrder}-${step.approverEmpNo}`}
                                className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
                            >
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

            <section className="card">
                <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex items-center gap-3">
                    <FolderOpen size={20} className="text-secondary" />
                    <h3 className="text-lg font-semibold text-on-surface">證明文件</h3>
                </div>
                <div className="p-8 space-y-4">
                    {attachmentLoading ? (
                        <p className="text-sm text-on-surface-variant">附件列表載入中...</p>
                    ) : attachmentError ? (
                        <p className="text-sm text-error">{attachmentError}</p>
                    ) : existingAttachments.length ? (
                        existingAttachments.map((attachment) => {
                            const attachmentSeqNo = attachment?.seqNo ?? attachment?.SeqNo;
                            const fileName = attachment?.fileName || attachment?.FileName || `附件 ${attachmentSeqNo}`;
                            const fileSize = attachment?.fileSize ?? attachment?.FileSize;
                            const uploadedAt = attachment?.uploadedAt || attachment?.createTime || attachment?.CreatedAt;

                            return (
                                <div
                                    key={String(attachmentSeqNo)}
                                    className="border border-outline-variant rounded-xl p-4 flex items-center justify-between gap-4 bg-surface-container-lowest hover:bg-surface-container-low transition-colors"
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-12 h-12 rounded-lg bg-surface-container-highest flex items-center justify-center shrink-0">
                                            <FileText size={24} className="text-secondary" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-medium text-on-surface">{fileName}</div>
                                            <div className="mt-1 text-xs text-secondary">
                                                {fileSize ? `${(Number(fileSize) / 1024).toFixed(1)} KB` : '大小未提供'}
                                                {' · '}
                                                {formatDateTime(uploadedAt)}
                                            </div>
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
                        })
                    ) : (
                        <div className="border-2 border-dashed border-outline-variant rounded-xl p-8 flex items-center justify-between bg-surface-container-lowest">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-surface-container-highest flex items-center justify-center">
                                    <FileText size={24} className="text-secondary" />
                                </div>
                                <span className="text-sm text-secondary">無附加檔案</span>
                            </div>
                            <ExternalLink size={20} className="text-outline-variant" />
                        </div>
                    )}
                </div>
            </section>



            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-surface-container-lowest w-full max-w-[440px] rounded-xl shadow-2xl overflow-hidden border border-outline-variant flex flex-col"
                        >
                            <div className="p-6 flex justify-between items-start border-b border-outline-variant bg-surface-container-low">
                                <div>
                                    <h3 className="text-xl font-bold text-on-surface mb-1">退回補件</h3>
                                    <p className="text-xs text-secondary leading-relaxed">請輸入退回原因，這將幫助申請人了解需要補齊的資訊。</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="text-secondary hover:text-on-surface transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div>
                                    <label className="text-xs font-bold text-on-surface-variant mb-2 block">退回原因</label>
                                    <select
                                        value={returnReason}
                                        onChange={(event) => setReturnReason(event.target.value)}
                                        className="w-full h-12 px-4 border border-outline rounded-lg bg-surface-container-lowest text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    >
                                        <option value="none">請選擇退回原因</option>
                                        <option value="proxy">無代理人</option>
                                        <option value="attachment">附件不全</option>
                                        <option value="wrong_type">假別錯誤</option>
                                    </select>
                                </div>
                                <div className="p-4 bg-error-container/20 border-l-4 border-error rounded flex gap-3">
                                    <AlertCircle size={20} className="text-error shrink-0" />
                                    <p className="text-xs text-on-error-container leading-relaxed">
                                        注意：退回後，申請人將收到系統通知並需要重新提交申請表單。
                                    </p>
                                </div>
                            </div>
                            <div className="p-6 border-t border-outline-variant bg-surface-container-low flex justify-end gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-2.5 bg-surface-container-lowest border border-outline-variant text-sm font-medium rounded-lg hover:bg-surface-container-high transition-colors"
                                >
                                    取消
                                </button>
                                <button className="btn-primary" disabled={!canReview || isReviewed || submitting} onClick={handleReturnApplication}>確認退回</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <footer className="py-8 border-t border-outline-variant flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-secondary mt-8">
                <p>© 2024 中原食品 CHINA FOODS. 版權所有.</p>

            </footer>
        </div>
        </Layout>
    );
}
