import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  FileClock,
  FileUp,
  Link2,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import Layout from '../components/Layout';
import { getCurrentEmployeeContext } from '../lib/applicationUtils';
import {
  deleteAttendanceImport,
  getAttendanceExportUrl,
  getAttendanceImports,
  getAttendanceLogs,
  getAttendanceReconciliations,
  getAttendanceWorks,
  importAttendance,
  pairAttendance,
  reconcileAttendance,
  updateAttendanceWork,
} from '../lib/cfctApi';

const today = new Date();
const DEFAULT_FROM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
const DEFAULT_TO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

const TABS = [
  { id: 'imports', label: '匯入批次' },
  { id: 'logs', label: '原始打卡' },
  { id: 'works', label: '出勤紀錄' },
  { id: 'reconciliations', label: '加班比對' },
];

const RECON_LABELS = {
  normal: '正常',
  paired: '配對完成',
  broken: '配對失敗',
  missing_in: '缺上班卡',
  missing_out: '缺下班卡',
  short: '做不足',
  over: '超時',
  too_long: '超時',
  no_out: '缺下班卡',
  no_in: '缺上班卡',
  noout: '缺下班卡',
  no_data: '資料不全',
  nodata: '資料不全',
};

function unwrapList(response) {
  if (response?.success === false) throw new Error(response.error || '資料讀取失敗');
  return Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : date.toLocaleDateString('zh-TW');
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value).replace('T', ' ').slice(0, 16)
    : date.toLocaleString('zh-TW', { hour12: false });
}

function formatHours(value) {
  return value === null || value === undefined ? '-' : Number(value).toFixed(2);
}

function toDateTimeLocal(value) {
  return value ? String(value).slice(0, 16) : '';
}

function statusTone(state) {
  const normalized = String(state || '').toLowerCase();
  if (normalized === 'normal' || normalized === 'paired' || normalized === 'ok') return 'bg-emerald-50 text-emerald-700';
  if (normalized.includes('no_data') || normalized.includes('nodata')) return 'bg-slate-100 text-slate-600';
  if (['short', 'over', 'too_long', 'no_out', 'noout', 'broken', 'missing_in', 'missing_out'].includes(normalized)) return 'bg-red-50 text-red-600';
  return 'bg-slate-100 text-slate-600';
}

function StatusPill({ state, fallback = '-' }) {
  const key = String(state || '').toLowerCase();
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusTone(key)}`}>{RECON_LABELS[key] || state || fallback}</span>;
}

export default function AttendanceManagement() {
  const [activeTab, setActiveTab] = useState('imports');
  const [filters, setFilters] = useState({ from: DEFAULT_FROM, to: DEFAULT_TO, employeeNo: '', onlyIssue: false });
  const [imports, setImports] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState('');
  const [file, setFile] = useState(null);
  const [remark, setRemark] = useState('');
  const [importerEmpNo, setImporterEmpNo] = useState('');
  const [editing, setEditing] = useState(null);

  const queryFilters = useMemo(() => ({
    EmployeeNo: filters.employeeNo,
    From: filters.from,
    To: filters.to,
  }), [filters.employeeNo, filters.from, filters.to]);

  async function loadImports() {
    setLoading(true);
    try {
      setImports(unwrapList(await getAttendanceImports()));
    } catch (error) {
      void Swal.fire({ icon: 'error', title: '載入失敗', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function searchCurrentTab(tab = activeTab) {
    if (tab === 'imports') return loadImports();
    setLoading(true);
    try {
      let response;
      if (tab === 'logs') {
        response = await getAttendanceLogs({ ...queryFilters, OnlyUnknown: filters.onlyIssue || '' });
      } else if (tab === 'works') {
        response = await getAttendanceWorks({ ...queryFilters, OnlyBroken: filters.onlyIssue || '' });
      } else {
        response = await getAttendanceReconciliations({ ...queryFilters, OnlyAbnormal: filters.onlyIssue || '' });
      }
      setRows(unwrapList(response));
    } catch (error) {
      setRows([]);
      void Swal.fire({ icon: 'error', title: '查詢失敗', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadImports();
    void (async () => {
      try {
        const context = await getCurrentEmployeeContext();
        setImporterEmpNo(context.currentEmployee.employeeNo || '');
      } catch {
        setImporterEmpNo('');
      }
    })();
  }, []);

  async function handleUpload(event) {
    event.preventDefault();
    if (!file) {
      void Swal.fire({ icon: 'warning', title: '請選擇打卡檔案' });
      return;
    }
    setAction('upload');
    try {
      const formData = new FormData();
      formData.append('File', file);
      if (importerEmpNo) formData.append('ImporterEmpNo', importerEmpNo);
      if (remark.trim()) formData.append('Remark', remark.trim());
      const response = await importAttendance(formData);
      if (response?.success === false) throw new Error(response.error || '匯入失敗');
      const result = response?.data || {};
      setFile(null);
      setRemark('');
      document.getElementById('attendance-file').value = '';
      await loadImports();
      void Swal.fire({
        icon: 'success',
        title: '匯入完成',
        html: `共 ${result.totalRows ?? 0} 筆，成功 ${result.okRows ?? 0} 筆，重複 ${result.dupRows ?? 0} 筆，格式錯誤 ${result.badRows ?? 0} 筆，未對應 ${result.unknownRows ?? 0} 筆。`,
      });
    } catch (error) {
      void Swal.fire({ icon: 'error', title: '匯入失敗', text: error.message });
    } finally {
      setAction('');
    }
  }

  async function runWorkflow(type) {
    if (!filters.from || !filters.to) return;
    setAction(type);
    try {
      const payload = { from: filters.from, to: filters.to, employeeNo: filters.employeeNo.trim() || null };
      const response = type === 'pair' ? await pairAttendance(payload) : await reconcileAttendance(payload);
      if (response?.success === false) throw new Error(response.error || '處理失敗');
      const result = response?.data || {};
      const html = type === 'pair'
        ? `已配對 ${result.pairedCount ?? 0} 筆，配對失敗 ${result.brokenCount ?? 0} 筆，略過人工修正 ${result.skipManual ?? 0} 筆。`
        : `共 ${result.totalApps ?? 0} 筆：正常 ${result.normal ?? 0}，做不足 ${result.short ?? 0}，超時 ${result.over ?? 0}，缺下班卡 ${result.noOut ?? 0}，資料不全 ${result.noData ?? 0}。`;
      void Swal.fire({ icon: 'success', title: type === 'pair' ? '配對完成' : '比對完成', html });
      if ((type === 'pair' && activeTab === 'works') || (type === 'reconcile' && activeTab === 'reconciliations')) {
        await searchCurrentTab();
      }
    } catch (error) {
      void Swal.fire({ icon: 'error', title: '處理失敗', text: error.message });
    } finally {
      setAction('');
    }
  }

  async function handleDeleteImport(item) {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: '撤銷這批匯入？',
      text: `${item.fileName || '未命名檔案'} 的原始打卡將一併軟刪除。`,
      showCancelButton: true,
      confirmButtonText: '確定撤銷',
      cancelButtonText: '取消',
      confirmButtonColor: '#ba1a1a',
    });
    if (!confirm.isConfirmed) return;
    setAction(`delete-${item.seqNo}`);
    try {
      const response = await deleteAttendanceImport(item.seqNo, item.rowVer);
      if (response?.success === false) throw new Error(response.error || '撤銷失敗');
      await loadImports();
      void Swal.fire({ icon: 'success', title: '已撤銷', timer: 1200, showConfirmButton: false });
    } catch (error) {
      void Swal.fire({ icon: 'error', title: '撤銷失敗', text: error.message });
    } finally {
      setAction('');
    }
  }

  async function handleSaveWork(event) {
    event.preventDefault();
    setAction('edit');
    try {
      const response = await updateAttendanceWork(editing.seqNo, {
        punchInAt: editing.punchInAt || null,
        punchOutAt: editing.punchOutAt || null,
        remark: editing.remark.trim() || null,
        rowVer: editing.rowVer,
      });
      if (response?.success === false) throw new Error(response.error || '修正失敗');
      setEditing(null);
      await searchCurrentTab('works');
      void Swal.fire({ icon: 'success', title: '出勤資料已更新', timer: 1200, showConfirmButton: false });
    } catch (error) {
      void Swal.fire({ icon: 'error', title: '修正失敗', text: error.message });
    } finally {
      setAction('');
    }
  }

  function switchTab(tab) {
    setActiveTab(tab);
    setRows([]);
    void searchCurrentTab(tab);
  }

  return (
    <Layout title="出勤管理">
      <div className="page-container">
        <section className="card p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5 text-primary"><Clock3 size={24} /></div>
                <div>
                  <h2 className="text-xl font-bold text-on-surface">指紋機打卡比對</h2>
                  <p className="mt-1 text-sm text-secondary">匯入打卡、配對上下班，再與已核准加班單比對。</p>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-bold text-on-surface-variant">開始日期<input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className="block h-10 rounded-lg border border-outline-variant bg-white px-3 text-sm font-normal text-on-surface outline-none focus:border-primary" /></label>
              <label className="space-y-1 text-xs font-bold text-on-surface-variant">結束日期<input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className="block h-10 rounded-lg border border-outline-variant bg-white px-3 text-sm font-normal text-on-surface outline-none focus:border-primary" /></label>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 border-t border-outline-variant/60 pt-5">
            <button type="button" disabled={Boolean(action)} onClick={() => void runWorkflow('pair')} className="btn-primary"><Link2 size={18} />{action === 'pair' ? '配對中...' : '配對上下班'}</button>
            <button type="button" disabled={Boolean(action)} onClick={() => void runWorkflow('reconcile')} className="btn-tertiary"><RefreshCw size={18} />{action === 'reconcile' ? '比對中...' : '比對加班單'}</button>
            <p className="flex items-center text-xs text-secondary"><AlertTriangle size={15} className="mr-1.5 text-tertiary" />兩個步驟均可安全重跑，人工修正的紀錄不會被覆蓋。</p>
          </div>
        </section>

        <section className="card">
          <div className="flex overflow-x-auto border-b border-outline-variant bg-surface-container-low">
            {TABS.map((tab) => <button key={tab.id} type="button" onClick={() => switchTab(tab.id)} className={`whitespace-nowrap border-b-2 px-5 py-4 text-sm font-bold transition-colors ${activeTab === tab.id ? 'border-primary bg-white text-primary' : 'border-transparent text-secondary hover:text-primary'}`}>{tab.label}</button>)}
          </div>

          {activeTab === 'imports' ? (
            <div>
              <form onSubmit={handleUpload} className="grid gap-4 border-b border-outline-variant p-5 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                <label className="space-y-1.5 text-xs font-bold text-on-surface-variant">打卡檔案（CSV / TXT）<input id="attendance-file" type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm font-normal file:mr-3 file:rounded file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:font-bold file:text-primary" /></label>
                <label className="space-y-1.5 text-xs font-bold text-on-surface-variant">備註<input value={remark} onChange={(e) => setRemark(e.target.value)} maxLength={200} placeholder="例：2026 年 8 月打卡" className="block h-10 w-full rounded-lg border border-outline-variant bg-white px-3 text-sm font-normal outline-none focus:border-primary" /></label>
                <button disabled={Boolean(action)} className="btn-primary h-10"><FileUp size={18} />{action === 'upload' ? '匯入中...' : '上傳並匯入'}</button>
              </form>
              <ImportTable items={imports} loading={loading} action={action} onDelete={handleDeleteImport} />
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant p-4">
                <label className="flex items-center gap-2 text-sm text-secondary"><input type="checkbox" checked={filters.onlyIssue} onChange={(e) => setFilters({ ...filters, onlyIssue: e.target.checked })} className="h-4 w-4 accent-primary" />{activeTab === 'logs' ? '只看未對應員編' : activeTab === 'works' ? '只看配對失敗' : '只看異常'}</label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="relative">
                    <span className="sr-only">員工編號</span>
                    <input
                      value={filters.employeeNo}
                      onChange={(e) => setFilters({ ...filters, employeeNo: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void searchCurrentTab();
                      }}
                      placeholder="員工編號"
                      className="h-10 w-40 rounded-lg border border-outline-variant bg-white px-3 text-sm text-on-surface outline-none focus:border-primary"
                    />
                  </label>
                  {activeTab === 'reconciliations' && <a href={getAttendanceExportUrl({ ...queryFilters, OnlyAbnormal: filters.onlyIssue || '' })} className="btn-secondary"><Download size={17} />匯出 CSV</a>}
                  <button type="button" onClick={() => void searchCurrentTab()} disabled={loading} className="btn-primary"><Search size={17} />查詢</button>
                </div>
              </div>
              <DataTable type={activeTab} rows={rows} loading={loading} onEdit={(row) => setEditing({ ...row, punchInAt: toDateTimeLocal(row.punchInAt), punchOutAt: toDateTimeLocal(row.punchOutAt), remark: row.remark || '' })} />
            </div>
          )}
        </section>
      </div>

      {editing && <EditWorkModal value={editing} setValue={setEditing} onClose={() => setEditing(null)} onSubmit={handleSaveWork} saving={action === 'edit'} />}
    </Layout>
  );
}

function ImportTable({ items, loading, action, onDelete }) {
  return <div className="overflow-x-auto"><table className="min-w-[1050px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">檔案</th><th className="px-5 py-3">日期範圍</th><th className="px-5 py-3">匯入時間</th><th className="px-5 py-3 text-right">總數</th><th className="px-5 py-3 text-right">成功</th><th className="px-5 py-3 text-right">重複</th><th className="px-5 py-3 text-right">錯誤</th><th className="px-5 py-3 text-right">未對應</th><th className="px-5 py-3">備註</th><th className="px-5 py-3 text-center">操作</th></tr></thead><tbody className="divide-y divide-slate-100">{loading ? <EmptyRow colSpan={10} text="載入中..." /> : items.length ? items.map((item) => <tr key={item.seqNo} className="hover:bg-slate-50"><td className="px-5 py-4 font-bold text-slate-800"><div>{item.fileName || '-'}</div><div className="mt-1 text-xs font-normal text-slate-400">{item.importerEmpNo || '-'}</div></td><td className="px-5 py-4">{formatDate(item.minPunchDate)} ～ {formatDate(item.maxPunchDate)}</td><td className="px-5 py-4 whitespace-nowrap">{formatDateTime(item.ctime)}</td><td className="px-5 py-4 text-right">{item.totalRows}</td><td className="px-5 py-4 text-right text-emerald-600">{item.okRows}</td><td className="px-5 py-4 text-right">{item.dupRows}</td><td className="px-5 py-4 text-right text-red-600">{item.badRows}</td><td className="px-5 py-4 text-right text-tertiary">{item.unknownRows}</td><td className="max-w-[180px] truncate px-5 py-4">{item.remark || '-'}</td><td className="px-5 py-4 text-center"><button type="button" disabled={action === `delete-${item.seqNo}`} onClick={() => void onDelete(item)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="撤銷批次"><Trash2 size={17} /></button></td></tr>) : <EmptyRow colSpan={10} text="尚無匯入批次" />}</tbody></table></div>;
}

function DataTable({ type, rows, loading, onEdit }) {
  if (type === 'logs') return <div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">員工</th><th className="px-5 py-3">打卡時間</th><th className="px-5 py-3">方向</th><th className="px-5 py-3">批次</th><th className="px-5 py-3">對應狀態</th></tr></thead><tbody className="divide-y divide-slate-100">{loading ? <EmptyRow colSpan={5} text="查詢中..." /> : rows.length ? rows.map((row) => <tr key={row.seqNo}><td className="px-5 py-4 font-bold">{row.employeeName || '-'} <span className="ml-2 font-mono text-xs font-normal text-slate-400">{row.employeeNo}</span></td><td className="px-5 py-4">{formatDateTime(row.punchAt)}</td><td className="px-5 py-4"><StatusPill state={row.flag === 'A' ? '上班 A' : row.flag === 'B' ? '下班 B' : row.flag} /></td><td className="px-5 py-4">#{row.importSeqNo}</td><td className="px-5 py-4">{row.isKnownEmp ? <span className="text-emerald-600">已對應</span> : <span className="text-red-600">未對應員編</span>}</td></tr>) : <EmptyRow colSpan={5} />}</tbody></table></div>;
  if (type === 'works') return <div className="overflow-x-auto"><table className="min-w-[1050px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">員工</th><th className="px-5 py-3">工作日</th><th className="px-5 py-3">上班</th><th className="px-5 py-3">下班</th><th className="px-5 py-3 text-right">淨工時</th><th className="px-5 py-3">配對狀態</th><th className="px-5 py-3">備註</th><th className="px-5 py-3 text-center">修正</th></tr></thead><tbody className="divide-y divide-slate-100">{loading ? <EmptyRow colSpan={8} text="查詢中..." /> : rows.length ? rows.map((row) => <tr key={row.seqNo} className="hover:bg-slate-50"><td className="px-5 py-4 font-bold">{row.employeeName || '-'}<div className="font-mono text-xs font-normal text-slate-400">{row.employeeNo} · {row.departmentName || '-'}</div></td><td className="px-5 py-4">{formatDate(row.workDate)}<div className="text-xs text-slate-400">第 {row.segOrder} 段</div></td><td className="px-5 py-4 whitespace-nowrap">{formatDateTime(row.punchInAt)}</td><td className="px-5 py-4 whitespace-nowrap">{formatDateTime(row.punchOutAt)}</td><td className="px-5 py-4 text-right font-bold">{formatHours(row.netHours)}</td><td className="px-5 py-4"><StatusPill state={row.pairState} />{row.isManual && <div className="mt-1 text-xs text-tertiary">人工修正</div>}</td><td className="max-w-[180px] truncate px-5 py-4">{row.remark || '-'}</td><td className="px-5 py-4 text-center"><button type="button" onClick={() => onEdit(row)} className="rounded-lg p-2 text-primary hover:bg-primary/10" title="修正出勤"><Pencil size={17} /></button></td></tr>) : <EmptyRow colSpan={8} />}</tbody></table></div>;
  return <div className="overflow-x-auto"><table className="min-w-[1150px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">員工 / 單號</th><th className="px-5 py-3">加班日</th><th className="px-5 py-3">申請時間</th><th className="px-5 py-3">實際打卡</th><th className="px-5 py-3 text-right">申請</th><th className="px-5 py-3 text-right">實際</th><th className="px-5 py-3 text-right">差異</th><th className="px-5 py-3">判定</th><th className="px-5 py-3">備註</th></tr></thead><tbody className="divide-y divide-slate-100">{loading ? <EmptyRow colSpan={9} text="查詢中..." /> : rows.length ? rows.map((row) => <tr key={row.seqNo} className="hover:bg-slate-50"><td className="px-5 py-4 font-bold">{row.employeeName || '-'}<div className="font-mono text-xs font-normal text-slate-400">{row.employeeNo} · {row.appNo || `#${row.appSeqNo}`}</div></td><td className="px-5 py-4">{formatDate(row.workDate)}<div className="text-xs text-slate-400">{row.leaveTypeName || '-'}</div></td><td className="px-5 py-4 whitespace-nowrap">{formatDateTime(row.appStartTime)}<br />{formatDateTime(row.appEndTime)}</td><td className="px-5 py-4 whitespace-nowrap">{formatDateTime(row.punchInAt)}<br />{formatDateTime(row.punchOutAt)}</td><td className="px-5 py-4 text-right">{formatHours(row.appliedHours)}</td><td className="px-5 py-4 text-right font-bold">{formatHours(row.actualHours)}</td><td className="px-5 py-4 text-right">{row.diffMinutes == null ? '-' : `${row.diffMinutes} 分`}</td><td className="px-5 py-4"><StatusPill state={row.reconState} /></td><td className="max-w-[180px] truncate px-5 py-4">{row.remark || '-'}</td></tr>) : <EmptyRow colSpan={9} />}</tbody></table></div>;
}

function EmptyRow({ colSpan, text = '查無資料' }) {
  return <tr><td colSpan={colSpan} className="px-5 py-12 text-center text-slate-400"><FileClock size={28} className="mx-auto mb-2 opacity-50" />{text}</td></tr>;
}

function EditWorkModal({ value, setValue, onClose, onSubmit, saving }) {
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"><form onSubmit={onSubmit} className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-outline-variant px-6 py-4"><div><h3 className="text-lg font-bold">修正出勤紀錄</h3><p className="mt-1 text-xs text-secondary">{value.employeeName || value.employeeNo} · {formatDate(value.workDate)}</p></div><button type="button" onClick={onClose} className="rounded-full p-2 text-secondary hover:bg-slate-100"><X size={19} /></button></div><div className="grid gap-4 p-6 sm:grid-cols-2"><label className="space-y-2 text-xs font-bold text-on-surface-variant">上班時間<input type="datetime-local" value={value.punchInAt} onChange={(e) => setValue({ ...value, punchInAt: e.target.value })} className="block h-11 w-full rounded-lg border border-outline-variant px-3 text-sm font-normal outline-none focus:border-primary" /></label><label className="space-y-2 text-xs font-bold text-on-surface-variant">下班時間<input type="datetime-local" value={value.punchOutAt} onChange={(e) => setValue({ ...value, punchOutAt: e.target.value })} className="block h-11 w-full rounded-lg border border-outline-variant px-3 text-sm font-normal outline-none focus:border-primary" /></label><label className="space-y-2 text-xs font-bold text-on-surface-variant sm:col-span-2">修正備註<textarea value={value.remark} onChange={(e) => setValue({ ...value, remark: e.target.value })} rows={3} maxLength={500} className="block w-full rounded-lg border border-outline-variant p-3 text-sm font-normal outline-none focus:border-primary" /></label><div className="sm:col-span-2 flex gap-2 rounded-lg bg-primary/5 p-3 text-xs text-on-surface-variant"><CheckCircle2 size={17} className="shrink-0 text-primary" />儲存後會自動重算淨工時（含 12:00～13:00 午休扣除）；原始打卡不會被變更。</div></div><div className="flex justify-end gap-3 border-t border-outline-variant bg-slate-50 px-6 py-4"><button type="button" onClick={onClose} className="btn-secondary">取消</button><button disabled={saving} className="btn-primary">{saving ? '儲存中...' : '儲存修正'}</button></div></form></div>;
}
