import { useEffect, useState } from 'react';
import { ChevronDown } from './icons';

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));

function parseTime(value) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return { hour: '', minute: '' };
  }

  const [hour, minute] = value.split(':');
  return { hour, minute };
}

export default function TimeSelect24({
  value,
  onChange,
  disabled = false,
  required = false,
}) {
  const parsedValue = parseTime(value);
  const [draftHour, setDraftHour] = useState(parsedValue.hour);
  const [draftMinute, setDraftMinute] = useState(parsedValue.minute);

  useEffect(() => {
    setDraftHour(parsedValue.hour);
    setDraftMinute(parsedValue.minute);
  }, [parsedValue.hour, parsedValue.minute]);

  function updateTime(nextHour, nextMinute) {
    setDraftHour(nextHour);
    setDraftMinute(nextMinute);

    if (!nextHour || !nextMinute) {
      return;
    }

    onChange(`${nextHour}:${nextMinute}`);
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
      <div className="relative">
        <select
          value={draftHour}
          onChange={(event) => updateTime(event.target.value, draftMinute)}
          disabled={disabled}
          required={required}
          className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm disabled:bg-surface-container-low disabled:text-on-surface-variant"
        >
          <option value="">時</option>
          {HOURS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
      </div>

      <span className="text-sm font-semibold text-on-surface-variant">:</span>

      <div className="relative">
        <select
          value={draftMinute}
          onChange={(event) => updateTime(draftHour, event.target.value)}
          disabled={disabled}
          required={required}
          className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm disabled:bg-surface-container-low disabled:text-on-surface-variant"
        >
          <option value="">分</option>
          {MINUTES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
      </div>
    </div>
  );
}
