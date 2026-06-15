import { useState } from 'react';
import { AlertCircle, BookOpen, Info } from './icons';

const POLICY_SECTIONS = [
  {
    title: '一般假別',
    items: [
      {
        name: '特別休假',
        limit: '3-30 天',
        pay: '全薪',
        notice: '建議提前 3-7 天，長假 2 週前',
        note: '依年資給假，未休完應結清或折算工資',
      },
      {
        name: '事假',
        limit: '每年 14 天',
        pay: '無薪',
        notice: '一般事由提前 1 天，緊急事後補辦',
        note: '可用小時請假；家庭照顧事假併入計算',
      },
      {
        name: '婚假',
        limit: '8 天',
        pay: '全薪',
        notice: '建議至少 2 週前',
        note: '需附結婚證明，自結婚日前 10 日起 3 個月內請畢',
      },
      {
        name: '喪假',
        limit: '3-8 天',
        pay: '全薪',
        notice: '事發後第一時間通知',
        note: '需附死亡證明或訃告',
      },
      {
        name: '普通傷病假',
        limit: '未住院 30 天；住院 2 年內累計 1 年',
        pay: '30 天內半薪',
        notice: '急病當日盡早通知；預約就診前 1 天',
        note: '癌症門診或安胎可併入住院傷病假',
      },
      {
        name: '公傷病假',
        limit: '無上限',
        pay: '依法辦理',
        notice: '事發當下立即通報',
        note: '職災醫療期間可請，雇主不得終止契約',
      },
      {
        name: '公假',
        limit: '視情況',
        pay: '全薪',
        notice: '收到公文後立即告知',
        note: '如兵役召集、投票、陪審等',
      },
    ],
  },
  {
    title: '性別相關假別',
    items: [
      {
        name: '產假',
        limit: '8 週',
        pay: '依法辦理',
        notice: '確認預產期後至少 1 個月前',
        note: '雇主不得拒絕或視為缺勤',
      },
      {
        name: '產檢假',
        limit: '7 天',
        pay: '全薪',
        notice: '建議前 1-2 天告知',
        note: '可分次請，以小時或天為單位',
      },
      {
        name: '陪產檢及陪產假',
        limit: '7 天',
        pay: '全薪',
        notice: '配合時程，至少 3 天前',
        note: '緊急生產可事後補辦',
      },
      {
        name: '生理假',
        limit: '每月 1 天；全年前 3 天不併病假',
        pay: '半薪',
        notice: '當日或前 1 天告知即可',
        note: '無需醫師證明，不得影響全勤及考績',
      },
      {
        name: '家庭照顧假',
        limit: '每年 7 天，併入事假',
        pay: '依事假規則',
        notice: '緊急狀況當日盡早通知',
        note: '2026 起可用小時請假，雇主不得拒絕',
      },
      {
        name: '安胎假',
        limit: '併入住院傷病假',
        pay: '依病假規則',
        notice: '醫師建議後立即告知',
        note: '需附診斷證明',
      },
      {
        name: '育嬰留職停薪',
        limit: '最長 2 年',
        pay: '無薪，可申請津貼',
        notice: '至少 1 個月前書面申請',
        note: '子女滿 3 歲前可申請，分次以 2 次為限',
      },
    ],
  },
];

const POLICY_HIGHLIGHTS = [
  '普通傷病假一年 10 天內，雇主不得有不利處分。',
  '全勤獎金應按請假日數比例扣發，不得整筆扣除。',
  '家庭照顧假可用小時申請，且不得拒絕。',
  '婚、喪、公傷病、公假及性別相關假別，不得因請假影響全勤或考績。',
  '緊急情形可事後補辦請假手續。',
];

export default function LeavePolicyInfo() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <section className="mb-8 rounded-xl border border-primary/15 bg-primary/5 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
              <BookOpen size={18} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-bold text-primary">請假規範</div>
              <p className="text-sm text-on-surface">
                依《勞基法假別一覽表.xlsx》整理常用假別、給薪方式與申請提醒。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-primary/20 bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
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
            className="max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-xl bg-surface-container-lowest shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-outline-variant px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-on-surface">請假規範一覽</h3>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    內容整理自《勞基法假別一覽表.xlsx》，作為申請前快速參考。
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
              <div className="space-y-6">
                {/*<section className="rounded-xl border border-amber-200 bg-amber-50 p-4">*/}
                {/*  <div className="flex items-start gap-3">*/}
                {/*    <AlertCircle size={18} className="mt-0.5 text-amber-700" />*/}
                {/*    <div>*/}
                {/*      <div className="text-sm font-bold text-amber-900">2026 重點</div>*/}
                {/*      <ul className="mt-2 space-y-1 text-sm leading-6 text-amber-900">*/}
                {/*        {POLICY_HIGHLIGHTS.map((item) => (*/}
                {/*          <li key={item}>• {item}</li>*/}
                {/*        ))}*/}
                {/*      </ul>*/}
                {/*    </div>*/}
                {/*  </div>*/}
                {/*</section>*/}

                {POLICY_SECTIONS.map((section) => (
                  <section key={section.title} className="space-y-3">
                    <h4 className="text-base font-bold text-on-surface">{section.title}</h4>
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {section.items.map((item) => (
                        <article
                          key={item.name}
                          className="rounded-xl border border-outline-variant bg-white p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-bold text-on-surface">{item.name}</div>
                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                              {item.pay}
                            </span>
                          </div>
                          <div className="mt-3 space-y-2 text-sm text-on-surface-variant">
                            <p><span className="font-semibold text-on-surface">天數上限：</span>{item.limit}</p>
                            <p><span className="font-semibold text-on-surface">申請提醒：</span>{item.notice}</p>
                            <p><span className="font-semibold text-on-surface">注意事項：</span>{item.note}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
