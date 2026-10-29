import { ArrowDown, ArrowUp } from 'lucide-react';
import { useRef } from 'react';

export default function ApprovalRequestList({
  items,
  loading,
  showAttachmentColumn,
  showPayrollColumn = false,
  isAdmin = false,
  isManager = false,
  dateTimeSortDirection = 'desc',
  onDateTimeSortChange,
  onRowClick,
  getAgentStatusClassName,
  getApplicationStatusClassName,
  onPayrollRecordedChange,
  updatingPayrollSeqNos = new Set(),
}) {
  const emptyColSpan = 10 + (showPayrollColumn ? 1 : 0) + (showAttachmentColumn ? 1 : 0);
  const topScrollbarRef = useRef(null);
  const tableScrollbarRef = useRef(null);

  function syncHorizontalScroll(source, targetRef) {
    if (targetRef.current && targetRef.current.scrollLeft !== source.scrollLeft) {
      targetRef.current.scrollLeft = source.scrollLeft;
    }
  }

  function renderAgentNames(item) {
    const names = Array.isArray(item.agentNames) && item.agentNames.length
      ? item.agentNames
      : [item.agentName].filter(Boolean);

    return names.map((name) => (
      <div key={name}>{name}</div>
    ));
  }

  return (
    <div>
      <div
        ref={topScrollbarRef}
        className="overflow-x-auto overflow-y-hidden border-b border-outline-variant bg-surface-container-lowest"
        onScroll={(event) => syncHorizontalScroll(event.currentTarget, tableScrollbarRef)}
        aria-label="審核列表頂部橫向捲軸"
      >
        <div className="h-px min-w-[1500px]" />
      </div>
      <div
        ref={tableScrollbarRef}
        className="overflow-x-auto"
        onScroll={(event) => syncHorizontalScroll(event.currentTarget, topScrollbarRef)}
      >
          <table className="min-w-[1500px] w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="w-[140px] px-4 py-4 text-xs font-bold text-secondary tracking-wider whitespace-nowrap">
                  {isAdmin ? '員工編號' : '部門'}
                </th>
                <th className="w-[150px] px-4 py-4 text-xs font-bold text-secondary tracking-wider whitespace-nowrap">員工資訊</th>
                <th
                  className="w-[200px] px-4 py-4 text-xs font-bold text-secondary tracking-wider whitespace-nowrap"
                  aria-sort={dateTimeSortDirection === 'asc' ? 'ascending' : 'descending'}
                >
                  <div className="flex items-center gap-2">
                    <span>日期時間</span>
                    <button
                      type="button"
                      onClick={onDateTimeSortChange}
                      className="inline-flex items-center gap-1 rounded-md border border-outline-variant bg-surface-container-lowest px-2 py-1 text-[11px] font-medium text-on-surface transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      aria-label={`日期時間目前為${dateTimeSortDirection === 'asc' ? '舊到新' : '新到舊'}，點擊切換`}
                    >
                      {dateTimeSortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <ArrowDown className="h-3 w-3" aria-hidden="true" />
                      )}
                      <span>{dateTimeSortDirection === 'asc' ? '舊到新' : '新到舊'}</span>
                    </button>
                  </div>
                </th>
                <th className="w-[140px] px-4 py-4 text-xs font-bold text-secondary tracking-wider whitespace-nowrap">申請類型</th>
                <th className="w-[130px] px-4 py-4 text-xs font-bold text-secondary tracking-wider whitespace-nowrap">時數</th>
                <th className="w-[150px] px-4 py-4 text-xs font-bold text-secondary tracking-wider whitespace-nowrap">
                  {isManager ? '您的審核狀態' : '狀態'}
                </th>
                <th className="w-[140px] px-4 py-4 text-xs font-bold text-secondary tracking-wider whitespace-nowrap">代理人</th>
                <th className="w-[150px] px-4 py-4 text-xs font-bold text-secondary tracking-wider whitespace-nowrap">代理人狀態</th>
                {showPayrollColumn ? <th className="w-[120px] px-4 py-4 text-xs font-bold text-secondary tracking-wider whitespace-nowrap">薪資登錄狀態</th> : null}
                {showAttachmentColumn ? <th className="w-[90px] px-4 py-4 text-xs font-bold text-secondary tracking-wider whitespace-nowrap">附件</th> : null}
                <th className="w-[150px] px-4 py-4 text-xs font-bold text-secondary tracking-wider whitespace-nowrap">申請日期時間</th>
                <th className="w-[170px] px-4 py-4 text-xs font-bold text-secondary tracking-wider whitespace-nowrap">詳情</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr>
                  <td colSpan={emptyColSpan} className="px-4 py-10 text-center text-sm text-secondary">資料讀取中...</td>
                </tr>
              ) : items.length ? (
                items.map((item, idx) => (
                  <tr
                    key={item.seqNo || idx}
                    className="cursor-pointer transition-colors hover:bg-surface-container-low"
                    onClick={() => onRowClick(item)}
                  >
                    <td className="px-4 py-4 text-sm break-words">{isAdmin ? item.employeeNo : item.department}</td>
                    <td className="px-4 py-4 text-sm font-medium break-words">{item.applicant}</td>
                    <td className="px-3 py-4 text-xs text-on-surface-variant leading-relaxed">
                      {String(item.duration || '-').split(' - ').map((part, i) => (
                        <div key={i}>{part}</div>
                      ))}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${item.typeColor}`}></span>
                        <span className="text-sm break-words">{item.type}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-sm font-medium text-on-surface">{item.hours || '-'}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex whitespace-nowrap items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getApplicationStatusClassName(item)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm break-words">
                      {renderAgentNames(item)}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex whitespace-nowrap items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getAgentStatusClassName(item.agentStatus)}`}>
                        {item.agentStatus}
                      </span>
                    </td>
                    {showPayrollColumn ? (
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={item.payrollRecorded}
                          disabled={updatingPayrollSeqNos.has(item.seqNo)}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => onPayrollRecordedChange(item, event.target.checked)}
                          className="h-4 w-4 cursor-pointer rounded border-outline text-primary accent-primary disabled:cursor-wait disabled:opacity-50"
                          aria-label={`${item.applicant}薪資已登錄`}
                        />
                      </td>
                    ) : null}
                    {showAttachmentColumn ? (
                      <td className="px-4 py-4 text-sm">{item.attachmentStatus}</td>
                    ) : null}
                    <td className="px-4 py-4 text-xs text-on-surface-variant leading-relaxed">
                      {String(item.requestTime || '-').split(' ').map((part, i) => (
                        <div key={i}>{part}</div>
                      ))}
                    </td>
                    <td className="max-w-0 overflow-hidden px-4 py-4">
                      <p className="block w-full truncate text-sm text-secondary" title={item.detail}>
                        {item.detail}
                      </p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={emptyColSpan} className="px-4 py-10 text-center text-sm text-secondary">查無待審批資料</td>
                </tr>
              )}
            </tbody>
          </table>
      </div>
    </div>
  );
}
