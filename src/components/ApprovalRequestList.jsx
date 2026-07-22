export default function ApprovalRequestList({
  items,
  loading,
  showAttachmentColumn,
  isManager = false,
  onRowClick,
  getAgentStatusClassName,
  getApplicationStatusClassName,
}) {
  const emptyColSpan = showAttachmentColumn ? 10 : 9;

  function renderAgentNames(item) {
    const names = Array.isArray(item.agentNames) && item.agentNames.length
      ? item.agentNames
      : [item.agentName].filter(Boolean);

    return names.map((name) => (
      <div key={name}>{name}</div>
    ));
  }

  return (
    <>
      <div className="space-y-4 p-4 lg:hidden">
        {loading ? (
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-10 text-center text-sm text-secondary">
            資料讀取中...
          </div>
        ) : items.length ? (
          items.map((item, idx) => (
            <button
              key={item.seqNo || idx}
              type="button"
              onClick={() => onRowClick(item)}
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-left transition-colors hover:bg-surface-container-low"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-on-surface">{item.applicant}</div>
                  <div className="text-xs text-on-surface-variant">{item.department}</div>
                </div>
                <span className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getApplicationStatusClassName(item)}`}>
                  {item.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <InfoField label="申請類型" value={item.type} dotColor={item.typeColor} />
                <InfoField label="申請日期時間" value={item.requestTime} />
                <InfoField label="日期時間" value={item.duration} />
                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">代理人名稱</div>
                  <div className="text-sm text-on-surface">
                    {renderAgentNames(item)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">代理人狀態</div>
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getAgentStatusClassName(item.agentStatus)}`}>
                    {item.agentStatus}
                  </span>
                </div>
                {showAttachmentColumn ? <InfoField label="附件" value={item.attachmentStatus} /> : null}
              </div>

              <div className="mt-4 space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">詳情</div>
                <p className="line-clamp-2 text-sm text-secondary">{item.detail}</p>
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-10 text-center text-sm text-secondary">
            查無待審批資料
          </div>
        )}
      </div>

      <div className="hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="w-[11%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">部門</th>
                <th className="w-[12%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">員工資訊</th>
                <th className="w-[13%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">申請日期時間</th>
                <th className="w-[10%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">申請類型</th>
                <th className="w-[15%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">日期時間</th>
                <th className="w-[10%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">代理人</th>
                <th className="w-[11%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">代理人狀態</th>
                {showAttachmentColumn ? <th className="w-[6%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">附件</th> : null}
                <th className="w-[8%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">
                  {isManager ? '您的審核狀態' : '狀態'}
                </th>
                <th className="w-[10%] px-4 py-4 text-xs font-bold text-secondary tracking-wider">詳情</th>
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
                    <td className="px-4 py-4 text-xs text-on-surface-variant leading-relaxed">
                      {String(item.requestTime || '-').split(' ').map((part, i) => (
                        <div key={i}>{part}</div>
                      ))}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${item.typeColor}`}></span>
                        <span className="text-sm break-words">{item.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-on-surface-variant leading-relaxed">
                      {String(item.duration || '-').split(' - ').map((part, i) => (
                        <div key={i}>{part}</div>
                      ))}
                    </td>
                    <td className="px-4 py-4 text-sm break-words">
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
                    <td className="px-4 py-4">
                      <span className={`inline-flex whitespace-nowrap items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getApplicationStatusClassName(item)}`}>
                        {item.status}
                      </span>
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
      </div>
    </>
  );
}

function InfoField({ label, value, dotColor = '' }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</div>
      <div className="flex items-start gap-2 text-sm text-on-surface">
        {dotColor ? <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColor}`}></span> : null}
        <span className="break-words">{value}</span>
      </div>
    </div>
  );
}
