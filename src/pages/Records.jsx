import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  RefreshCw, 
  Eye, 
  Edit3, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Calendar,
  History,
  FileText
} from '../components/icons';
import Layout from '../components/Layout';
import { motion } from 'motion/react';
import { applications } from '../data/applications';

export default function Records() {
  const navigate = useNavigate();
  const records = applications;

  const getStatusStyles = (status) => {
    switch (status) {
      case '審核中': return 'bg-blue-50 text-blue-700 border-blue-100';
      case '已核准': return 'bg-primary/10 text-primary border-primary/20';
      case '待補件': return 'bg-tertiary-fixed text-on-tertiary-fixed-variant border-tertiary/20';
      case '已駁回': return 'bg-error-container text-on-error-container border-error/10';
      default: return 'bg-surface-container text-secondary border-outline-variant';
    }
  };

  return (
    <Layout title="我的申請紀錄">
      <div className="space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-end">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-on-surface">我的申請紀錄</h2>
            <p className="text-on-surface-variant mt-1 text-sm">管理並查看您的所有假單及加班申請狀態</p>
          </div>
          {/*<button */}
          {/*  onClick={() => navigate('/apply-leave')}*/}
          {/*  className="bg-primary text-white px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 shadow-md hover:opacity-90 transition-opacity"*/}
          {/*>*/}
          {/*  <Plus size={18} />*/}
          {/*  新增申請*/}
          {/*</button>*/}
        </div>

        {/* Summary Bento */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          <motion.div 
            whileHover={{ y: -3 }}
            className="bg-white border-t-4 border-primary p-6 rounded-xl border border-outline-variant flex justify-between items-center relative overflow-hidden group shadow-sm"
          >
            <div className="relative z-10">
              <p className="text-secondary text-xs font-bold uppercase tracking-wider">審核中</p>
              <p className="text-5xl font-black text-primary mt-2">12</p>
            </div>

            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <History size={120} />
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -3 }}
            className="bg-white border-t-4 border-tertiary p-6 rounded-xl border border-outline-variant flex justify-between items-center relative overflow-hidden group shadow-sm"
          >
            <div className="relative z-10">
              <p className="CCCC text-xs font-bold uppercase tracking-wider">待補件</p>
              <p className="text-5xl font-black text-tertiary mt-2">1</p>
            </div>

            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <FileText size={120} />
            </div>
          </motion.div>

        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-xl border border-outline-variant flex flex-wrap gap-6 items-end shadow-sm">
          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">篩選狀態</label>
            <div className="flex flex-wrap gap-2">
              <button className="bg-primary text-white px-4 py-2 rounded-full text-xs font-bold">全部</button>
              <button className="bg-surface-container border border-outline-variant text-secondary px-4 py-2 rounded-full text-xs font-bold hover:bg-surface-container-high transition-colors">審核中</button>
              <button className="bg-surface-container border border-outline-variant text-secondary px-4 py-2 rounded-full text-xs font-bold hover:bg-surface-container-high transition-colors">待補件</button>
            </div>
          </div>
          <div className="space-y-2 flex-grow max-w-[200px]">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">類型</label>
            <select className="w-full h-10 border border-outline rounded-lg bg-white text-on-surface px-3 text-sm focus:ring-1 focus:ring-primary outline-none">
              <option>所有類型</option>
              <option>事假</option>
              <option>加班</option>
              <option>病假</option>
            </select>
          </div>
          <div className="space-y-2 flex-grow max-w-[400px]">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">日期範圍</label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <input type="date" className="w-full h-10 border border-outline rounded-lg bg-white text-on-surface px-3 text-sm focus:ring-1 focus:ring-primary outline-none" />
              <span className="text-outline">-</span>
              <input type="date" className="w-full h-10 border border-outline rounded-lg bg-white text-on-surface px-3 text-sm focus:ring-1 focus:ring-primary outline-none" />
            </div>
          </div>
          <button className="bg-surface-container border border-outline text-on-surface-variant p-2.5 rounded-lg hover:bg-surface-container-high transition-colors">
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="px-6 py-4 text-[11px] font-black text-on-surface-variant uppercase tracking-widest">申請日期時間</th>
                <th className="px-6 py-4 text-[11px] font-black text-on-surface-variant uppercase tracking-widest">申請類型</th>
                <th className="px-6 py-4 text-[11px] font-black text-on-surface-variant uppercase tracking-widest">日期時間</th>
                <th className="px-6 py-4 text-[11px] font-black text-on-surface-variant uppercase tracking-widest">狀態</th>
                <th className="px-6 py-4 text-[11px] font-black text-on-surface-variant text-right tracking-widest">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {records.map((record) => (
                <tr 
                  key={record.id} 
                  className="hover:bg-surface-container-low transition-colors group cursor-pointer"
                  onClick={() => navigate(`/view-application/${record.id}`)}
                >
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold text-on-surface">{record.date}</p>
                    <p className="text-[11px] text-secondary mt-0.5">{record.time}</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${record.dotColor}`}></span>
                      <span className="text-sm font-medium">{record.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm text-on-surface leading-snug">{record.period.split(' - ')[0]} -</p>
                    <p className="text-sm text-on-surface leading-snug">{record.period.split(' - ')[1]}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyles(record.status)}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    {record.supplementRequired ? (
                      <button className="text-tertiary hover:scale-110 transition-transform">
                        <Edit3 size={18} />
                      </button>
                    ) : (
                      <button className="text-secondary hover:text-primary hover:scale-110 transition-transform">
                        <Eye size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-on-surface-variant text-xs font-medium uppercase tracking-wider">顯示第 1 到 5 筆，共 24 筆申請</p>
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
        </div>
      </div>
    </Layout>
  );
}
