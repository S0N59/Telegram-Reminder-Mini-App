import { useRef, useEffect, useCallback } from 'react';
import { getTelegramWebApp } from '../utils/telegram';
import './TimeWheelPicker.css';

interface TimeWheelPickerProps {
  hours: string;
  minutes: string;
  onHourChange: (h: string) => void;
  onMinuteChange: (m: string) => void;
  isToday: boolean;
}

const ITEM_H = 52;
const PAD = 2;

function pad(n: number) { return String(n).padStart(2, '0'); }

export const TimeWheelPicker = ({
  hours, minutes, onHourChange, onMinuteChange, isToday,
}: TimeWheelPickerProps) => {
  const hRef = useRef<HTMLDivElement>(null);
  const mRef = useRef<HTMLDivElement>(null);
  const lastHVal = useRef(hours);
  const lastMVal = useRef(minutes);
  const prevHLen = useRef(-1);
  const prevMLen = useRef(-1);

  const webApp = getTelegramWebApp();
  const haptic = useCallback(() => {
    try { webApp?.HapticFeedback?.selectionChanged?.(); } catch { /* */ }
  }, [webApp]);

  const now = new Date();
  const curH = now.getHours();
  const curM = now.getMinutes();

  // Build available lists
  const startH = isToday ? curH : 0;
  const hoursAvail: string[] = [];
  for (let h = startH; h <= 23; h++) hoursAvail.push(pad(h));

  const selHNum = parseInt(hours, 10) || 0;
  const minStart = (isToday && selHNum === curH) ? Math.min(curM + 1, 59) : 0;
  const minutesAvail: string[] = [];
  for (let m = minStart; m <= 59; m++) minutesAvail.push(pad(m));

  // Clamp to available
  const clampedH = hoursAvail.includes(hours) ? hours : (hoursAvail[0] ?? '00');
  const clampedM = minutesAvail.includes(minutes) ? minutes : (minutesAvail[0] ?? '00');

  const hIdx = Math.max(0, hoursAvail.indexOf(clampedH));
  const mIdx = Math.max(0, minutesAvail.indexOf(clampedM));

  // Notify parent if clamped values differ
  useEffect(() => {
    if (clampedH !== hours) onHourChange(clampedH);
  }, [clampedH, hours, onHourChange]);

  useEffect(() => {
    if (clampedM !== minutes) onMinuteChange(clampedM);
  }, [clampedM, minutes, onMinuteChange]);

  // Set scroll position on mount
  useEffect(() => {
    if (hRef.current) hRef.current.scrollTop = hIdx * ITEM_H;
    if (mRef.current) mRef.current.scrollTop = mIdx * ITEM_H;
    prevHLen.current = hoursAvail.length;
    prevMLen.current = minutesAvail.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When available list length changes (e.g. switching hours changes minutes list),
  // reset scroll position to match current selection
  useEffect(() => {
    if (prevMLen.current !== -1 && prevMLen.current !== minutesAvail.length) {
      if (mRef.current) {
        mRef.current.scrollTop = mIdx * ITEM_H;
      }
    }
    prevMLen.current = minutesAvail.length;
  }, [minutesAvail.length, mIdx]);

  useEffect(() => {
    if (prevHLen.current !== -1 && prevHLen.current !== hoursAvail.length) {
      if (hRef.current) {
        hRef.current.scrollTop = hIdx * ITEM_H;
      }
    }
    prevHLen.current = hoursAvail.length;
  }, [hoursAvail.length, hIdx]);

  // Direct onScroll — NO debounce. Read position immediately.
  const onHScroll = useCallback(() => {
    const el = hRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(hoursAvail.length - 1, idx));
    const val = hoursAvail[clamped];
    if (val && val !== lastHVal.current) {
      lastHVal.current = val;
      haptic();
      onHourChange(val);
    }
  }, [hoursAvail, haptic, onHourChange]);

  const onMScroll = useCallback(() => {
    const el = mRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(minutesAvail.length - 1, idx));
    const val = minutesAvail[clamped];
    if (val && val !== lastMVal.current) {
      lastMVal.current = val;
      haptic();
      onMinuteChange(val);
    }
  }, [minutesAvail, haptic, onMinuteChange]);

  // Click to jump
  const clickH = useCallback((idx: number) => {
    haptic();
    lastHVal.current = hoursAvail[idx];
    hRef.current?.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
    onHourChange(hoursAvail[idx]);
  }, [hoursAvail, haptic, onHourChange]);

  const clickM = useCallback((idx: number) => {
    haptic();
    lastMVal.current = minutesAvail[idx];
    mRef.current?.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
    onMinuteChange(minutesAvail[idx]);
  }, [minutesAvail, haptic, onMinuteChange]);

  const viewH = ITEM_H * (PAD * 2 + 1);

  return (
    <div className="twp-root">
      <div className="twp-badge">
        <span className="twp-digit">{clampedH}</span>
        <span className="twp-colon">:</span>
        <span className="twp-digit">{clampedM}</span>
      </div>

      <div className="twp-drums" style={{ height: viewH }}>
        <div className="twp-lens" style={{ top: PAD * ITEM_H, height: ITEM_H }} />
        <div className="twp-fade twp-fade-top" />
        <div className="twp-fade twp-fade-bottom" />

        <div className="twp-col">
          <div className="twp-col-label">Hour</div>
          <div ref={hRef} className="twp-scroll" style={{ height: viewH }} onScroll={onHScroll}>
            <div style={{ height: PAD * ITEM_H, flexShrink: 0 }} />
            {hoursAvail.map((h, i) => {
              const diff = Math.abs(i - hIdx);
              const cls = 'twp-item ' + (i === hIdx ? 'sel' : diff === 1 ? 'n1' : diff === 2 ? 'n2' : 'far');
              return <div key={h} className={cls} style={{ height: ITEM_H }} onClick={() => clickH(i)}>{h}</div>;
            })}
            <div style={{ height: PAD * ITEM_H, flexShrink: 0 }} />
          </div>
        </div>

        <div className="twp-sep" style={{ lineHeight: `${viewH}px` }}>:</div>

        <div className="twp-col">
          <div className="twp-col-label">Min</div>
          <div ref={mRef} className="twp-scroll" style={{ height: viewH }} onScroll={onMScroll}>
            <div style={{ height: PAD * ITEM_H, flexShrink: 0 }} />
            {minutesAvail.map((m, i) => {
              const diff = Math.abs(i - mIdx);
              const cls = 'twp-item ' + (i === mIdx ? 'sel' : diff === 1 ? 'n1' : diff === 2 ? 'n2' : 'far');
              return <div key={m} className={cls} style={{ height: ITEM_H }} onClick={() => clickM(i)}>{m}</div>;
            })}
            <div style={{ height: PAD * ITEM_H, flexShrink: 0 }} />
          </div>
        </div>
      </div>
    </div>
  );
};
