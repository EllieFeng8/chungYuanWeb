import { Info, X, ClipboardCheck, FileClock, FileWarning, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const stats = [
    {
        label: '待審核',
        count: 12,
        path: '/approvals',
        color: 'primary',
        icon: ClipboardCheck,
        bgColor: 'bg-primary/10',
        borderColor: 'border-primary',
    },
    {
        label: '審核中',
        count: 12,
        path: '/records',
        color: 'tertiary',
        icon: FileClock,
        bgColor: 'bg-tertiary-container/10',
        borderColor: 'border-tertiary',
    },
    {
        label: '待補件',
        count: 1,
        color: 'secondary',
        icon: FileWarning,
        bgColor: 'bg-secondary-container/20',
        borderColor: 'border-secondary',
    },
];

const recentApplications = [
    { id: '#REQ-2023-089', applicant: '張曉明', type: '採購申請', date: '2023/10/24', status: '待審核', statusColor: 'primary' },
    { id: '#REQ-2023-088', applicant: '李小華', type: '加班申請', date: '2023/10/23', status: '審核中', statusColor: 'tertiary' },
];

export default function ManagerDashboard() {
    const navigate = useNavigate();

    return (
        <Layout title="首頁">
        <div className="page-container">


            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-error-container border border-error/20 rounded-lg p-4 flex items-center justify-between shadow-sm"
            >
                <div className="flex items-center gap-3">
                    <Info className="text-error" size={20} />
                    <p className="text-sm font-medium text-on-error-container">A先生代理請求通知</p>
                </div>
                <button className="text-on-error-container hover:bg-black/5 p-1 rounded transition-colors">
                    <X size={18} />
                </button>
            </motion.div>

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
                                    <p className={`text-5xl font-extrabold text-${stat.color} mt-2`}>{stat.count}</p>
                                </div>
                            </div>
                            <div className="hidden md:block opacity-5 group-hover:opacity-10 transition-opacity absolute right-8">
                                <stat.icon size={120} />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/*<section className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden shadow-sm">*/}
            {/*    <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center">*/}
            {/*        <h3 className="text-lg font-semibold text-on-surface">最近申請</h3>*/}
            {/*        <Link to="/approvals" className="text-primary font-bold hover:underline inline-flex items-center gap-1 group">*/}
            {/*            查看全部*/}
            {/*            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />*/}
            {/*        </Link>*/}
            {/*    </div>*/}
            {/*    <div className="overflow-x-auto">*/}
            {/*        <table className="w-full text-left border-collapse">*/}
            {/*            <thead className="bg-surface-container-low">*/}
            {/*            <tr>*/}
            {/*                <th className="px-6 py-3 text-xs font-bold text-secondary uppercase tracking-wider">申請編號</th>*/}
            {/*                <th className="px-6 py-3 text-xs font-bold text-secondary uppercase tracking-wider">申請人</th>*/}
            {/*                <th className="px-6 py-3 text-xs font-bold text-secondary uppercase tracking-wider">類別</th>*/}
            {/*                <th className="px-6 py-3 text-xs font-bold text-secondary uppercase tracking-wider">日期</th>*/}
            {/*                <th className="px-6 py-3 text-xs font-bold text-secondary uppercase tracking-wider">狀態</th>*/}
            {/*            </tr>*/}
            {/*            </thead>*/}
            {/*            <tbody className="divide-y divide-outline-variant">*/}
            {/*            {recentApplications.map((app) => (*/}
            {/*                <tr key={app.id} className="hover:bg-surface-container-lowest transition-colors group cursor-pointer">*/}
            {/*                    <td className="px-6 py-4 text-sm font-medium group-hover:text-primary transition-colors">{app.id}</td>*/}
            {/*                    <td className="px-6 py-4 text-sm">{app.applicant}</td>*/}
            {/*                    <td className="px-6 py-4 text-sm">{app.type}</td>*/}
            {/*                    <td className="px-6 py-4 text-sm">{app.date}</td>*/}
            {/*                    <td className="px-6 py-4">*/}
            {/*        <span className={`px-3 py-1 bg-${app.statusColor}/10 text-${app.statusColor} text-xs font-bold rounded-full border border-${app.statusColor}/20`}>*/}
            {/*          {app.status}*/}
            {/*        </span>*/}
            {/*                    </td>*/}
            {/*                </tr>*/}
            {/*            ))}*/}
            {/*            </tbody>*/}
            {/*        </table>*/}
            {/*    </div>*/}
            {/*</section>*/}
        </div>
        </Layout>
    );
}
