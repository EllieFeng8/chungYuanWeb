import {
    ArrowLeft,
    Menu,
    Bell,
    ClipboardList,
    Lock,
    CalendarDays,
    FolderOpen,
    FileText,
    ExternalLink,
    TrendingUp,
    Verified,
    CheckCircle2,
    AlertCircle,
    Clock,
    Check,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Swal from 'sweetalert2';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

export default function ApprovalDetail() {
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();

    const handleApproveApplication = () => {
        void Swal.fire({
            icon: 'success',
            title: '核准成功',
            showConfirmButton: false,
            timer: 1000,
        });
    };

    const handleRejectApplication = async () => {
        const result = await Swal.fire({
            icon: 'warning',
            title: '是否駁回申請？',
            text: '送出後將無法直接復原。',
            showCancelButton: true,
            confirmButtonText: '確認駁回',
            cancelButtonText: '取消',
            confirmButtonColor: '#dc2626',
        });

        if (result.isConfirmed) {
            void Swal.fire({
                icon: 'success',
                title: '已駁回申請',
                showConfirmButton: false,
                timer: 1000,
            });
        }
    };

    const handleReturnApplication = () => {
        setShowModal(false);
        void Swal.fire({
            icon: 'success',
            title: '已退回補件',
            showConfirmButton: false,
            timer: 1000,
        });
    };

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
                    <button className="btn-tertiary" onClick={() => setShowModal(true)}>退回補件</button>
                    <button className="btn-error" onClick={handleRejectApplication}>駁回申請</button>
                    <button className="btn-primary" onClick={handleApproveApplication}>核准申請</button>
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
                            <span className="text-sm">年假</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-on-surface-variant">員工姓名</label>
                        <div className="h-12 px-4 flex items-center gap-3 bg-surface-container-low border border-outline-variant rounded-lg text-secondary">
                            <Lock size={16} />
                            <span className="text-sm">張小明</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-on-surface-variant">開始日期</label>
                        <div className="h-12 px-4 flex items-center gap-3 bg-surface-container-lowest border border-outline-variant rounded-lg">
                            <CalendarDays size={16} className="text-outline-variant" />
                            <span className="text-sm">2026/04/27 9:00</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-on-surface-variant">結束日期</label>
                        <div className="h-12 px-4 flex items-center gap-3 bg-surface-container-lowest border border-outline-variant rounded-lg">
                            <CalendarDays size={16} className="text-outline-variant" />
                            <span className="text-sm">2026/04/27 18:00</span>
                        </div>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-medium text-on-surface-variant">請假原因</label>
                        <div className="min-h-[120px] p-4 bg-surface-container-lowest border border-outline-variant rounded-lg">
                            <p className="text-sm leading-relaxed">特休假</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="card">
                <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex items-center gap-3">
                    <FolderOpen size={20} className="text-secondary" />
                    <h3 className="text-lg font-semibold text-on-surface">證明文件</h3>
                </div>
                <div className="p-8">
                    <div className="border-2 border-dashed border-outline-variant rounded-xl p-8 flex items-center justify-between bg-surface-container-lowest hover:bg-surface-container-low transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-surface-container-highest flex items-center justify-center group-hover:bg-outline-variant transition-colors">
                                <FileText size={24} className="text-secondary" />
                            </div>
                            <span className="text-sm text-secondary">無附加檔案</span>
                        </div>
                        <ExternalLink size={20} className="text-outline-variant group-hover:text-primary transition-colors" />
                    </div>
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
                                    <select className="w-full h-12 px-4 border border-outline rounded-lg bg-surface-container-lowest text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                                        <option value="none">請選擇退回原因</option>
                                        <option value="proxy" selected>無代理人</option>
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
                                <button className="btn-primary" onClick={handleReturnApplication}>確認退回</button>
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
