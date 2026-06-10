import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  Eye,
  Edit3,
  ChevronLeft,
  ChevronRight,
  History,
  FileText,
} from '../components/icons';
import Layout from '../components/Layout';
import { motion } from 'motion/react';
import {
  getApplicationDetail,
  getMyApplications,
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

function mapApplicationRecord(item) {
  const period = getApplicationPeriod(item);
  return {
    id: item.seqNo,
    status: item.status || '',
    statusLabel: getApplicationStatusLabel(item.status),
    typeName: getApplicationTypeName(item),
    submittedAt: formatDateTime(item.createdAt || item.submittedAt || item.startTime || ''),
    period,
    supplementRequired: item.status === 'need_supplement',
    dotColor: getApplicationDotColor(item.category),
  };
}

export default function Records() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [employeeNo, setEmployeeNo] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const statusCounts = useMemo(() => {
    return records.reduce(
      (accumulator, record) => {
        if (record.status === 'pending') {
          accumulator.pending += 1;
        }
        if (record.status === 'need_supplement') {
          accumulator.needSupplement += 1;
        }
        return accumulator;
      },
      { pending: 0, needSupplement: 0 }
    );
  }, [records]);

  const typeOptions = useMemo(() => {
    return Array.from(
      new Set(records.map((record) => record.typeName).filter(Boolean))
    );
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (statusFilter !== 'all' && record.status !== statusFilter) {
        return false;
      }

      if (typeFilter !== 'all' && record.typeName !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [records, statusFilter, typeFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);
  const visiblePageNumbers = useMemo(() => {
    const pages = [];
    for (let page = 1; page <= totalPages; page += 1) {
      pages.push(page);
    }
    return pages;
  }, [totalPages]);

  async function loadRecords(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const { currentEmployee } = await getCurrentEmployeeContext();

      setEmployeeNo(currentEmployee.employeeNo);

      const mineResponse = await getMyApplications(currentEmployee.employeeNo);
      if (!mineResponse?.success) {
        throw new Error(mineResponse?.error || '申請列表讀取失敗');
      }

      const nextRecords = Array.isArray(mineResponse.data)
        ? mineResponse.data.map(mapApplicationRecord)
        : [];

      setRecords(nextRecords);
    } catch (error) {
      setRecords([]);
      void Swal.fire({
        icon: 'error',
        title: '載入失敗',
        text: error instanceof Error ? error.message : '無法讀取申請紀錄',
      });
    } finally {
      if (showLoading) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    void loadRecords(true);
  }, []);

  async function handleOpenRecord(recordId) {
    try {
      const response = await getApplicationDetail(recordId);
      if (!response?.success) {
        throw new Error(response?.error || '申請明細讀取失敗');
      }

      navigate(`/view-application/${recordId}`, {
        state: {
          application: response.data,
          employeeNo,
        },
      });
    } catch (error) {
      void Swal.fire({
        icon: 'error',
        title: '讀取失敗',
        text: error instanceof Error ? error.message : '無法讀取申請明細',
      });
    }
  }

  return (
    <Layout title="我的申請紀錄">
      <div className="space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-end">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-on-surface">我的申請紀錄</h2>
            <p className="text-on-surface-variant mt-1 text-sm">管理並查看您的所有假單及加班申請狀態</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          <motion.div
            whileHover={{ y: -3 }}
            className="bg-white border-t-4 border-primary p-6 rounded-xl border border-outline-variant flex justify-between items-center relative overflow-hidden group shadow-sm"
          >
            <div className="relative z-10">
              <p className="text-secondary text-xs font-bold uppercase tracking-wider">審核中</p>
              <p className="text-5xl font-black text-primary mt-2">{statusCounts.pending}</p>
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
              <p className="text-secondary text-xs font-bold uppercase tracking-wider">待補件</p>
              <p className="text-5xl font-black text-tertiary mt-2">{statusCounts.needSupplement}</p>
            </div>

            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <FileText size={120} />
            </div>
          </motion.div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-outline-variant flex flex-wrap gap-6 items-end shadow-sm">
          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">篩選狀態</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={statusFilter === 'all' ? 'bg-primary text-white px-4 py-2 rounded-full text-xs font-bold' : 'bg-surface-container border border-outline-variant text-secondary px-4 py-2 rounded-full text-xs font-bold hover:bg-surface-container-high transition-colors'}
              >
                全部
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={statusFilter === 'pending' ? 'bg-primary text-white px-4 py-2 rounded-full text-xs font-bold' : 'bg-surface-container border border-outline-variant text-secondary px-4 py-2 rounded-full text-xs font-bold hover:bg-surface-container-high transition-colors'}
              >
                審核中
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('need_supplement')}
                className={statusFilter === 'need_supplement' ? 'bg-primary text-white px-4 py-2 rounded-full text-xs font-bold' : 'bg-surface-container border border-outline-variant text-secondary px-4 py-2 rounded-full text-xs font-bold hover:bg-surface-container-high transition-colors'}
              >
                待補件
              </button>
            </div>
          </div>
          <div className="space-y-2 flex-grow max-w-[240px]">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">類型</label>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="w-full h-10 border border-outline rounded-lg bg-white text-on-surface px-3 text-sm focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="all">所有類型</option>
              {typeOptions.map((typeName) => (
                <option key={typeName} value={typeName}>
                  {typeName}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void loadRecords(false)}
            disabled={loading || refreshing}
            className="bg-surface-container border border-outline text-on-surface-variant p-2.5 rounded-lg hover:bg-surface-container-high transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} />
          </button>
        </div>

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
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-on-surface-variant">
                      申請紀錄載入中...
                    </td>
                  </tr>
                ) : paginatedRecords.length ? (
                  paginatedRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="hover:bg-surface-container-low transition-colors group cursor-pointer"
                      onClick={() => void handleOpenRecord(record.id)}
                    >
                      <td className="px-6 py-5">
                        <p className="text-sm font-bold text-on-surface">{record.submittedAt || '-'}</p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${record.dotColor}`}></span>
                          <span className="text-sm font-medium">{record.typeName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm text-on-surface leading-snug">{record.period.startDate} {record.period.startTime} -</p>
                        <p className="text-sm text-on-surface leading-snug">{record.period.endDate} {record.period.endTime}</p>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getApplicationStatusStyles(record.status)}`}>
                          {record.statusLabel}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        {record.supplementRequired ? (
                          <button type="button" className="text-tertiary hover:scale-110 transition-transform">
                            <Edit3 size={18} />
                          </button>
                        ) : (
                          <button type="button" className="text-secondary hover:text-primary hover:scale-110 transition-transform">
                            <Eye size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-on-surface-variant">
                      目前沒有符合條件的申請紀錄。
                    </td>
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
              <p className="text-on-surface-variant text-xs font-medium uppercase tracking-wider">
                顯示 {filteredRecords.length ? startIndex + 1 : 0} 至 {Math.min(endIndex, filteredRecords.length)} 筆，共 {filteredRecords.length} 筆申請
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className="w-9 h-9 border border-outline-variant rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-30"
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
        </div>
      </div>
    </Layout>
  );
}
