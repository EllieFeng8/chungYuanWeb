import { useState } from 'react';
import { BookOpen, Info } from './icons';

const ACCENT_COLOR = '#dd771a';
const ACCENT_BACKGROUND = 'rgba(221, 119, 26, 0.08)';
const ACCENT_BORDER = 'rgba(221, 119, 26, 0.18)';
const ACCENT_SURFACE = 'rgba(221, 119, 26, 0.1)';

const OVERTIME_RULES = [
  '因工作需要加班者，應事先向部門主管提出申請並取得核准。',
  '加班期間應確實從事工作，不得處理私人事務。',
  '加班結束後應填報實際加班時數及工作內容。',
  '未經核准之加班，原則上不予認定。',
  '加班時數及補償方式（加班費或補休）依公司規定及相關法令辦理。',
  '各部門應合理安排工作，避免長期或不必要之加班。',
  '虛報加班時數或不實申報者，依公司規定處理。',
];

export default function OvertimePolicyInfo() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <section
        className="mb-8 rounded-xl border p-5"
        style={{ borderColor: ACCENT_BORDER, backgroundColor: ACCENT_BACKGROUND }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 rounded-full p-2"
              style={{ backgroundColor: ACCENT_SURFACE, color: ACCENT_COLOR }}
            >
              <BookOpen size={18} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-bold" style={{ color: ACCENT_COLOR }}>加班規範</div>
              <p className="text-sm text-on-surface">
                依《請假_加班 規則-A版.xlsx》整理加班申請與認定規則。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-2 self-start rounded-lg border bg-white px-4 py-2 text-sm font-semibold transition-colors"
            style={{ borderColor: ACCENT_BORDER, color: ACCENT_COLOR }}
          >
            <Info size={16} />
            查看規範
          </button>
        </div>
      </section>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 py-6"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-xl bg-surface-container-lowest shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-outline-variant px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-on-surface">加班規則一覽</h3>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    內容整理自《請假_加班 規則-A版.xlsx》，作為申請前快速參考。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm text-secondary transition-colors hover:bg-surface-container"
                >
                  關閉
                </button>
              </div>
            </div>

            <div className="max-h-[calc(85vh-80px)] overflow-y-auto px-6 py-6">
              <div className="rounded-xl border border-outline-variant bg-white p-5">
                <ol className="space-y-3 text-sm leading-7 text-on-surface">
                  {OVERTIME_RULES.map((item, index) => (
                    <li key={item} className="flex gap-3">
                      <span className="w-6 shrink-0 font-semibold" style={{ color: ACCENT_COLOR }}>
                        {index + 1}.
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
