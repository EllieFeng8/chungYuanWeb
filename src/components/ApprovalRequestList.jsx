export default function ApprovalRequestList({
  items,
  loading,
  showAttachmentColumn,
  isManager = false,
  onRowClick,
  getAgentStatusClassName,
  getApplicationStatusClassName,
}) {
  const emptyColSpan = showAttachmentColumn ? 11 : 10;

  function renderAgentNames(item) {
    const names = Array.isArray(item.agentNames) && item.agentNames.length
      ? item.agentNames
      : [item.agentName].filter(Boolean);

    return names.map((name) => (
      <div key={name}>{name}</div>
    ));
  }

  return (
    <div className="overflow-x-auto">
          <table className="min-w-[1500px] w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="w-[140px] px-4 py-4 text-xs font-bold text-secondary tracking-wider whitespace-nowrap">部門</th>
                <th className="w-[150px] px-4 py-4 text-xs font-bold text-secondary tracking-wider whitespace-nowrap">員工資訊</th>
                <th className="w-[200px] px-4 py-4 text-xs font-bold text-secondary tracking-wider whitespace-nowrap">日期時間</th>
                <th className="w-[140px] px-4 py-4 text-xs font-bold text-secondary tracking-wider whitespace-nowrap">申請類型</th>
                <th className="w-[130px] px-4 py-4 text-xs font-bold text-secondary tracking-wider whitespace-nowrap">時數</th>
                <th className="w-[150px] px-4 py-4 text-xs font-bold text-secondary tracking-wider whitespace-nowrap">
                  {isManager ? '您的審核狀態' : '狀態'}
                </th>
                <th className="w-[140px] px-4 py-4 text-xs font-bold text-secondary tracking-wider whitespace-nowrap">代理人</th>
                <th className="w-[150px] px-4 py-4 text-xs font-bold text-secondary tracking-wider whitespace-nowrap">代理人狀態</th>
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
                    <td className="px-4 py-4 text-sm break-words">{item.department}</td>
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
                    {showAttachmentColumn ? (
                      <td className="px-4 py-4 text-sm">{item.attachmentStatus}</td>
                    ) : null}
                    <td className="px-4 py-4 text-xs text-on-surface-variant leading-relaxed">
                      {String(item.requestTime || '-').split(' ').map((part, i) => (
                        <div key={i}>{part}</div>
                      ))}
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
                  <td colSpan={emptyColSpan} className="px-4 py-10 text-center text-sm text-secondary">查無待審批資料</td>
                </tr>
              )}
            </tbody>
          </table>
    </div>
  );
}
