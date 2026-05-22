import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Lock,
  ChevronDown,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from '../components/icons';
import Layout from '../components/Layout';

const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];

function formatDate(date) {
  if (!date) {
    return '請選擇日期';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}/${month}/${day}`;
}

function isSameDay(firstDate, secondDate) {
  return (
    firstDate &&
    secondDate &&
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}
function handleSubmit(event) {
  event.preventDefault();
  void Swal.fire({
    icon: 'success',
    title: '提交成功',
    showConfirmButton: false,
    timer: 1000,
  });
}
function buildMonthDays(currentMonth) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push(new Date(year, month, day));
  }

  return days;
}

function CalendarField({ label, value, onChange, isOpen, onToggle, onClose }) {
  const containerRef = useRef(null);
  const [currentMonth, setCurrentMonth] = useState(() => value ?? new Date());

  useEffect(() => {
    if (value) {
      setCurrentMonth(new Date(value.getFullYear(), value.getMonth(), 1));
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const days = useMemo(() => buildMonthDays(currentMonth), [currentMonth]);
  const monthLabel = `${currentMonth.getFullYear()} 年 ${currentMonth.getMonth() + 1} 月`;

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
        {label}
      </label>
      <div className="relative" ref={containerRef}>
        <input type="date" className="w-full h-10 border border-outline rounded-lg bg-white text-on-surface px-3 text-sm focus:ring-1 focus:ring-primary outline-none" />
      </div>
    </div>
  );
}

export default function LeaveApplication() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [openCalendar, setOpenCalendar] = useState(null);
  const [isReminderOpen, setIsReminderOpen] = useState(true);
  const [attachments, setAttachments] = useState([]);

  function handleStartDateChange(date) {
    setStartDate(date);

    if (endDate && date > endDate) {
      setEndDate(date);
    }
  }

  function handleEndDateChange(date) {
    setEndDate(date);

    if (startDate && date < startDate) {
      setStartDate(date);
    }
  }

  function handleOpenFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event) {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (!selectedFiles.length) {
      return;
    }

    setAttachments((current) => {
      const nextFiles = [...current];

      selectedFiles.forEach((file) => {
        const exists = nextFiles.some(
          (currentFile) =>
            currentFile.name === file.name &&
            currentFile.size === file.size &&
            currentFile.lastModified === file.lastModified
        );

        if (!exists) {
          nextFiles.push(file);
        }
      });

      return nextFiles;
    });

    event.target.value = '';
  }

  function handleRemoveAttachment(fileToRemove) {
    setAttachments((current) =>
      current.filter(
        (file) =>
          !(
            file.name === fileToRemove.name &&
            file.size === fileToRemove.size &&
            file.lastModified === fileToRemove.lastModified
          )
      )
    );
  }

  return (
    <Layout title="請假申請" showBack>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-3xl font-bold text-on-surface">
            <span>新增</span><span className="text-primary mx-2">請假</span><span>申請</span>
          </h2>
        </div>

        <section className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden mb-8">
          <div className="h-1.5 bg-primary w-full"></div>
          <div className={`p-8 transition-[padding] duration-200 ${openCalendar ? 'pb-44 md:pb-52' : 'pb-8'}`}>
            <div className="flex items-center gap-2 mb-8 border-b border-outline-variant pb-4">
              <FileText className="text-primary" size={20} />
              <h3 className="text-lg font-semibold text-on-surface">申請詳情</h3>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">員工姓名</label>
                  <div className="relative">
                    <input
                      className="w-full h-11 px-4 bg-surface-container-low border border-outline-variant rounded-lg text-on-surface-variant cursor-not-allowed focus:ring-0"
                      readOnly
                      value="張小明"
                    />
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">類型</label>
                  <div className="relative">
                    <select className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm">
                      <option>病假</option>
                      <option>事假</option>
                      <option>特休</option>
                      <option>公假</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">代理人姓名</label>
                  <div className="relative">
                    <select className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm">
                      <option>AAA</option>
                      <option>BBB</option>
                      <option>CCC</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                  </div>
                </div>

                <div className="hidden md:block"></div>

                <CalendarField
                  label="開始日期"
                  value={startDate}
                  onChange={handleStartDateChange}
                  isOpen={openCalendar === 'start'}
                  onToggle={() => setOpenCalendar((current) => (current === 'start' ? null : 'start'))}
                  onClose={() => setOpenCalendar(null)}
                />

                <CalendarField
                  label="結束日期"
                  value={endDate}
                  onChange={handleEndDateChange}
                  isOpen={openCalendar === 'end'}
                  onToggle={() => setOpenCalendar((current) => (current === 'end' ? null : 'end'))}
                  onClose={() => setOpenCalendar(null)}
                />

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">開始時間</label>
                  <div className="relative">
                    <input
                      type="time"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                      className="w-full h-10 border border-outline rounded-lg bg-white text-on-surface px-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">結束時間</label>
                  <div className="relative">
                    <input
                      type="time"
                      value={endTime}
                      onChange={(event) => setEndTime(event.target.value)}
                      className="w-full h-10 border border-outline rounded-lg bg-white text-on-surface px-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">原因</label>
                  <div className="relative">
                    <select className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm">
                      <option>身體不適</option>
                      <option>家裡有事</option>
                      <option>個人進修</option>
                      <option>其他</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleOpenFilePicker}
                  className="flex items-center gap-1.5 text-primary hover:text-primary-container transition-colors font-semibold text-sm"
                >
                  <Plus size={18} />
                  <span>新增附件</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                {attachments.length ? (
                  <div className="mt-4 space-y-2">
                    {attachments.map((file) => (
                      <div
                        key={`${file.name}-${file.lastModified}-${file.size}`}
                        className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium text-on-surface">{file.name}</div>
                          <div className="text-xs text-on-surface-variant">
                            {(file.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(file)}
                          className="text-xs font-bold text-secondary transition-colors hover:text-error"
                        >
                          移除
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="pt-10 flex justify-end gap-4 border-t border-outline-variant mt-8">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-10 py-2.5 border border-outline rounded-lg text-secondary hover:bg-surface-container transition-colors font-bold text-sm"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-10 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-container shadow-md transition-all font-bold text-sm"
                >
                  提交申請
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>

      {isReminderOpen ? createPortal(
        <div
          className="fixed left-0 top-0 z-[9999] flex h-screen w-screen items-center justify-center bg-black/40 px-4"
          onClick={() => setIsReminderOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-surface-container-lowest p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-5 text-lg font-semibold text-on-surface">請假提醒</h3>
            <div className="space-y-4 text-sm leading-7 text-on-surface">
              <p className="text-sm leading-7 text-on-surface">事、特、病（急）、公假（事前或臨時情況就當天），其它詳細內容請參考網頁版的規定</p>
              <p className="text-sm leading-7 text-error">※ 未依規定提出，可能導致申請失敗，請特別注意。</p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsReminderOpen(false)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </Layout>
  );
}
