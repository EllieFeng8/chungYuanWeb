import { useState } from 'react';
import { BookOpen, Info } from './icons';

const POLICY_SECTIONS = [
  {
    title: '一般假別',
    items: [
      {
        name: '事假',
        unit: '1 H',
        rule: '一年內合計不超過 14 日',
        proof: '否',
        pay: '無薪',
        attendance: '扣全勤',
      },
      {
        name: '病假',
        unit: '1 H',
        rule: '一年內合計不超過 30 日',
        proof: '是',
        pay: '半薪',
        attendance: '扣全勤',
      },
      {
        name: '生理假',
        unit: '1 H',
        rule: '每月可請 1 天',
        proof: '否',
        pay: '半薪（視同病假，每月 1 天）',
        attendance: '不扣全勤',
      },
      {
        name: '家庭照顧假',
        unit: '1 H',
        rule: '一年內合計不超過 7 日',
        proof: '是',
        pay: '無薪（併入事假計算）',
        attendance: '不扣全勤',
      },
      {
        name: '公傷假',
        unit: '4 H',
        rule: '依勞安人員調查核定',
        proof: '是',
        pay: '全薪',
        attendance: '不扣全勤',
      },
      {
        name: '颱風假',
        unit: '1 H',
        rule: '依政府規定',
        proof: '否',
        pay: '全薪（依政府公告）；無薪，不扣全勤',
        attendance: '依公告',
      },
      {
        name: '出差',
        unit: '1 H',
        rule: '-',
        proof: '是',
        pay: '全薪',
        attendance: '不扣全勤',
      },
    ],
  },
  {
    title: '法定與特殊假別',
    items: [
      {
        name: '產檢假',
        unit: '1 H',
        rule: '7 天（含小時、半日、全日請假方式）',
        proof: '是',
        pay: '全薪',
        attendance: '不扣全勤',
      },
      {
        name: '產假',
        unit: '連續 1 次請畢',
        rule: '共 8 星期（56 天），包含例假日、休息日',
        proof: '是',
        pay: '前 8 週全薪（任職滿 6 個月）；未滿 6 個月半薪',
        attendance: '不扣全勤',
      },
      {
        name: '陪產假',
        unit: '天',
        rule: '共有 7 日，配偶分娩當日前後合理期間內請畢，不得分 3 次以上請',
        proof: '是',
        pay: '全薪',
        attendance: '不扣全勤',
      },
      {
        name: '育嬰假',
        unit: '8 H',
        rule: '超過 30 天以上者，請於一個月以前提出',
        proof: '是',
        pay: '留職停薪（可申請育嬰留停津貼，約六成投保薪資）',
        attendance: '不適用',
      },
      {
        name: '婚假',
        unit: '8 H',
        rule: '8 天全薪婚假，請假方式同特休',
        proof: '是',
        pay: '全薪',
        attendance: '不扣全勤',
      },
      {
        name: '喪假',
        unit: '4 H',
        rule: '依親屬關係核定，請提前 3 天請假，百日內要請完',
        proof: '是',
        pay: '全薪',
        attendance: '不扣全勤',
      },
      {
        name: '彈性假（補休）',
        unit: '1 H',
        rule: '超過 3 天以上者，請於 10 天前提出',
        proof: 'X',
        pay: '全薪（折抵加班時數）',
        attendance: '不扣全勤',
      },
    ],
  },
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
                依《請假_加班 規則-A版.xlsx》整理假別規則、證明需求與薪資說明。
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
              <div className="space-y-6">
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
                            <p><span className="font-semibold text-on-surface">最小單位：</span>{item.unit}</p>
                            <p><span className="font-semibold text-on-surface">請假規則：</span>{item.rule}</p>
                            <p><span className="font-semibold text-on-surface">證明需求：</span>{item.proof}</p>
                            <p><span className="font-semibold text-on-surface">全勤影響：</span>{item.attendance}</p>
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
