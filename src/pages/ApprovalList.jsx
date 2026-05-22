import {
    CheckCircle,
    Edit3,
    Search,
    Calendar,
    Filter,
    Clock,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const statsOverview = [
    { label: '審核總數', count: 12, unit: '項申請', color: 'primary', icon: Clock },
    { label: '加班申請', count: 6, unit: '項申請', color: 'tertiary', icon: Clock },
    { label: '請假申請', count: 6, unit: '項申請', color: 'blue-500', icon: CalendarDays },
];

const approvalList = [
    {
        department: '市場部',
        applicant: '李子明',
        requestTime: '2024/11/20 15:00:00',
        type: '事假',
        typeColor: 'bg-blue-500',
        duration: '2024/10/25 13:00 - 2024/10/25 17:00',
        status: '審核中',
        statusColor: 'primary',
        detail: '因突發急性咽喉炎需...',
    },
    {
        department: '市場部',
        applicant: '王志強',
        requestTime: '2024/11/20 15:00:00',
        type: '特休 (年假)',
        typeColor: 'bg-green-500',
        duration: '2024/10/25 13:00 - 2024/10/25 17:00',
        status: '已核准',
        statusColor: 'green-700',
        statusBg: 'bg-green-50',
        detail: '家庭旅行假期',
    },
    {
        department: '市場部',
        applicant: '陳小明',
        requestTime: '2024/11/20 15:00:00',
        type: '病假',
        typeColor: 'bg-red-500',
        duration: '2024/10/25 13:00 - 2024/10/25 17:00',
        status: '已駁回',
        statusColor: 'error',
        detail: '因突發急性咽喉炎需...',
    },
    {
        department: '市場部',
        applicant: '林聰明',
        requestTime: '2024/11/20 15:00:00',
        type: '加班',
        typeColor: 'bg-tertiary-container',
        duration: '2024/10/25 13:00 - 2024/10/25 17:00',
        status: '已駁回',
        statusColor: 'error',
        detail: '加班',
    },
];

function getStatusStyles(status) {
    switch (status) {
        case '審核中':
            return 'bg-blue-50 text-blue-700 border-blue-100';
        case '已核准':
            return 'bg-primary/10 text-primary border-primary/20';
        case '待補件':
            return 'bg-tertiary-fixed text-on-tertiary-fixed-variant border-tertiary/20';
        case '已駁回':
            return 'bg-error-container text-on-error-container border-error/10';
        default:
            return 'bg-surface-container text-secondary border-outline-variant';
    }
}

export default function ApprovalList() {
    const navigate = useNavigate();

    return (
        <Layout title="">
        <div className="page-container">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-on-surface">待審批清單</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statsOverview.map((stat, idx) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`card p-6 flex items-center gap-6 border-t-4 ${
                            stat.color === 'primary' ? 'border-primary' :
                                stat.color === 'tertiary' ? 'border-tertiary-container' : 'border-blue-500'
                        }`}
                    >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            stat.color === 'primary' ? 'bg-primary/10 text-primary' :
                                stat.color === 'tertiary' ? 'bg-tertiary-container/10 text-tertiary-container' : 'bg-blue-100 text-blue-600'
                        }`}>
                            <stat.icon size={28} />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-secondary">{stat.label}</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-on-surface">{stat.count}</span>
                                <span className="text-xs text-secondary">{stat.unit}</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <section className="card bg-surface-container-lowest">
                <div className="p-6 border-b border-outline-variant">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex flex-wrap gap-2">
                            <button className="bg-primary text-white px-4 py-2 rounded-full text-xs font-bold">審核中</button>
                            <button className="bg-surface-container border border-outline-variant text-secondary px-4 py-2 rounded-full text-xs font-bold hover:bg-surface-container-high transition-colors">已核准</button>
                            <button className="bg-surface-container border border-outline-variant text-secondary px-4 py-2 rounded-full text-xs font-bold hover:bg-surface-container-high transition-colors">已駁回</button>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-secondary whitespace-nowrap">部門:</label>
                                <select className="h-10 border border-outline-variant rounded-lg px-3 text-sm bg-surface-container-lowest min-w-[120px] focus:ring-1 focus:ring-primary outline-none">
                                    <option>所有部門</option>
                                    <option>市場部</option>
                                    <option>研發部</option>
                                </select>
                            </div>
                            <div className="flex items-start sm:items-center gap-2">
                                <label className="text-xs text-secondary whitespace-nowrap">申請起迄日期:</label>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <div className="relative">
                                        <input type="date" className="w-full h-10 border border-outline rounded-lg bg-white text-on-surface px-3 text-sm focus:ring-1 focus:ring-primary outline-none" />

                                    </div>
                                    <span className="text-secondary">-</span>
                                    <div className="relative">
                                        <input type="date" className="w-full h-10 border border-outline rounded-lg bg-white text-on-surface px-3 text-sm focus:ring-1 focus:ring-primary outline-none" />

                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                        <tr className="bg-surface-container-low border-b border-outline-variant">
                            <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider">部門</th>
                            <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider">員工資訊</th>
                            <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider">申請日期時間</th>
                            <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider">申請類型</th>
                            <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider">日期時間</th>
                            <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider">狀態</th>
                            <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider">詳情</th>
                            <th className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider">操作</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant">
                        {approvalList.map((item, idx) => (
                            <tr
                                key={idx}
                                className="hover:bg-surface-container-low transition-colors group cursor-pointer"
                                onClick={() => navigate('/approvals/detail')}
                            >
                                <td className="px-6 py-5 text-sm whitespace-nowrap">{item.department}</td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-3">

                                        <span className="text-sm font-medium">{item.applicant}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-xs text-on-surface-variant leading-relaxed">
                                    {item.requestTime.split(' ').map((part, i) => (
                                        <div key={i}>{part}</div>
                                    ))}
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${item.typeColor}`}></span>
                                        <span className="text-sm">{item.type}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-xs text-on-surface-variant leading-relaxed whitespace-nowrap">
                                    {item.duration}
                                </td>
                                <td className="px-6 py-5">
                    <span className={`inline-flex whitespace-nowrap items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusStyles(item.status)}`}>
                      {item.status}
                    </span>
                                </td>
                                <td className="px-6 py-5">
                                    <p className="max-w-[150px] truncate whitespace-nowrap text-sm text-secondary" title={item.detail}>
                                        {item.detail}
                                    </p>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-3">
                                        <Link
                                            to="/approvals/detail"
                                            className="p-1 hover:text-primary transition-colors"
                                            onClick={(event) => event.stopPropagation()}
                                        >
                                            <Edit3 size={20} />
                                        </Link>

                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-on-surface-variant text-xs font-medium uppercase tracking-wider">顯示 1 至 4 項，共 12 項申請</p>
                    <div className="flex gap-1.5">
                        <button disabled className="w-9 h-9 border border-outline-variant rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-30">
                            <ChevronLeft size={18} />
                        </button>
                        <button className="w-9 h-9 bg-primary text-white rounded-lg font-bold text-sm flex items-center justify-center shadow-sm">1</button>
                        <button className="w-9 h-9 border border-outline-variant rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors text-sm font-bold">2</button>
                        <button className="w-9 h-9 border border-outline-variant rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors text-sm font-bold">3</button>
                        <button className="w-9 h-9 border border-outline-variant rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </section>
        </div>
        </Layout>
    );
}
