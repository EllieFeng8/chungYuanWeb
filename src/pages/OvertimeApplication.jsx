import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { FileText, Lock, ChevronDown, Plus } from '../components/icons';
import Layout from '../components/Layout';

const ACCENT_COLOR = '#dd771a';
export default function OvertimeApplication() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isReminderOpen, setIsReminderOpen] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);

  function handleStartDateChange(event) {
    const nextValue = event.target.value;
    setStartDate(nextValue);

    if (endDate && nextValue > endDate) {
      setEndDate(nextValue);
    }
  }

  function handleEndDateChange(event) {
    const nextValue = event.target.value;
    setEndDate(nextValue);

    if (startDate && nextValue < startDate) {
      setStartDate(nextValue);
    }
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
    <Layout title="加班申請" showBack>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-3xl font-bold text-on-surface">
            <span>新增</span>
            <span className="mx-2" style={{ color: ACCENT_COLOR }}>
              加班
            </span>
            <span>申請</span>
          </h2>
        </div>

        <section className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden mb-8">
          <div className="h-1.5 w-full" style={{ backgroundColor: ACCENT_COLOR }}></div>
          <div className="p-8">
            <div className="flex items-center gap-2 mb-8 border-b border-outline-variant pb-4">
              <FileText size={20} style={{ color: ACCENT_COLOR }} />
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
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">加班類型</label>
                  <div className="relative">
                    <select className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-[#dd771a]/20 focus:border-[#dd771a] outline-none text-on-surface text-sm">
                      <option>平日加班</option>
                      <option>假日加班</option>
                      <option>國定假日加班</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">代理人姓名</label>
                  <div className="relative">
                    <select className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-[#dd771a]/20 focus:border-[#dd771a] outline-none text-on-surface text-sm">
                      <option>AAA</option>
                      <option>BBB</option>
                      <option>CCC</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                  </div>
                </div>

                <div className="hidden md:block"></div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">開始日期</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={startDate}
                      onChange={handleStartDateChange}
                      className="w-full h-10 border border-outline rounded-lg bg-white text-on-surface px-3 text-sm focus:ring-1 focus:ring-[#dd771a] focus:border-[#dd771a] outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">結束日期</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={endDate}
                      onChange={handleEndDateChange}
                      className="w-full h-10 border border-outline rounded-lg bg-white text-on-surface px-3 text-sm focus:ring-1 focus:ring-[#dd771a] focus:border-[#dd771a] outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">開始時間</label>
                  <div className="relative">
                    <input
                      type="time"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                      className="w-full h-10 border border-outline rounded-lg bg-white text-on-surface px-3 text-sm focus:ring-1 focus:ring-[#dd771a] focus:border-[#dd771a] outline-none"
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
                      className="w-full h-10 border border-outline rounded-lg bg-white text-on-surface px-3 text-sm focus:ring-1 focus:ring-[#dd771a] focus:border-[#dd771a] outline-none"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">加班事由</label>
                  <div className="relative">
                    <select className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-[#dd771a]/20 focus:border-[#dd771a] outline-none text-on-surface text-sm">
                      <option>趕工出貨</option>
                      <option>盤點作業</option>
                      <option>設備維護</option>
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
                  className="flex items-center gap-1.5 transition-colors font-semibold text-sm"
                  style={{ color: ACCENT_COLOR }}
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
                  className="px-10 py-2.5 text-white rounded-lg shadow-md transition-all font-bold text-sm hover:opacity-90"
                  style={{ backgroundColor: ACCENT_COLOR }}
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
            className="w-full max-w-md rounded-xl bg-surface-container-lowest p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-5 text-lg font-semibold text-on-surface">加班提醒</h3>
            <p className="text-sm leading-7 text-on-surface">請事前或於次工作日提出加班申請。</p>
            <p className="text-sm leading-7 text-error">※ 未依規定提出，可能導致申請失敗，請特別注意。</p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsReminderOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: ACCENT_COLOR }}
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
