import { useRef, useEffect, useCallback } from 'react';
import { getTelegramWebApp } from '../utils/telegram';
import './TimeWheelPicker.css';

interface TimeWheelPickerProps {
  hours: string;
  minutes: string;
  onHourChange: (h: string) => void;
  onMinuteChange: (m: string) => void;
  isToday?: boolean;
}

const ITEM_H = 46;
const PAD = 2;

function pad(n: number) { return String(n).padStart(2, '0'); }

const HOURS_LIST = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES_LIST = Array.from({ length: 60 }, (_, i) => pad(i));

export const TimeWheelPicker = ({
  hours, minutes, onHourChange, onMinuteChange, isToday,
}: TimeWheelPickerProps) => {
  const hRef = useRef<HTMLDivElement>(null);
  const mRef = useRef<HTMLDivElement>(null);
  const lastHVal = useRef(hours);
  const lastMVal = useRef(minutes);
  const isUserScrollingH = useRef(false);
  const isUserScrollingM = useRef(false);
  const snapTimeoutH = useRef<number | null>(null);
  const snapTimeoutM = useRef<number | null>(null);
  const rafIdH = useRef<number | null>(null);
  const rafIdM = useRef<number | null>(null);

  const webApp = getTelegramWebApp();
  const lastHapticTime = useRef(0);
  const triggerHaptic = useCallback(() => {
    const now = Date.now();
    if (now - lastHapticTime.current > 80) {
      lastHapticTime.current = now;
      try { webApp?.HapticFeedback?.selectionChanged?.(); } catch { /* */ }
    }
  }, [webApp]);

  // Current time for past-blocking
  const now = new Date();
  const curH = now.getHours();
  const curM = now.getMinutes();

  // Minimum allowed values (only relevant when isToday)
  const minHour = isToday ? curH : 0;
  const minMinute = (isToday && (parseInt(hours, 10) || 0) === curH) ? curM + 1 : 0;

  const hIdx = Math.max(0, Math.min(23, parseInt(hours, 10) || 0));
  const mIdx = Math.max(0, Math.min(59, parseInt(minutes, 10) || 0));

  // Initial scroll position on mount
  useEffect(() => {
    if (hRef.current) hRef.current.scrollTop = hIdx * ITEM_H;
    if (mRef.current) mRef.current.scrollTop = mIdx * ITEM_H;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync scroll when props change externally
  useEffect(() => {
    if (hRef.current && !isUserScrollingH.current) {
      const target = hIdx * ITEM_H;
      if (Math.abs(hRef.current.scrollTop - target) > 2) {
        hRef.current.scrollTop = target;
      }
    }
  }, [hIdx]);

  useEffect(() => {
    if (mRef.current && !isUserScrollingM.current) {
      const target = mIdx * ITEM_H;
      if (Math.abs(mRef.current.scrollTop - target) > 2) {
        mRef.current.scrollTop = target;
      }
    }
  }, [mIdx]);

  // If today and hour is current hour, ensure minutes are not in the past
  useEffect(() => {
    if (isToday && hIdx === curH && mIdx < minMinute) {
      const validMinIdx = Math.min(minMinute, 59);
      const validMinStr = MINUTES_LIST[validMinIdx];
      lastMVal.current = validMinStr;
      if (mRef.current) {
        mRef.current.scrollTop = validMinIdx * ITEM_H;
      }
      onMinuteChange(validMinStr);
    }
  }, [isToday, hIdx, curH, mIdx, minMinute, onMinuteChange]);

  // High-performance scroll listeners with past-time bounce-back
  const onHScroll = useCallback(() => {
    const el = hRef.current;
    if (!el) return;
    isUserScrollingH.current = true;

    if (rafIdH.current) cancelAnimationFrame(rafIdH.current);
    rafIdH.current = requestAnimationFrame(() => {
      const idx = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(23, idx));
      const val = HOURS_LIST[clamped];
      if (val && val !== lastHVal.current) {
        lastHVal.current = val;
        triggerHaptic();
        onHourChange(val);
      }
    });

    if (snapTimeoutH.current) window.clearTimeout(snapTimeoutH.current);
    snapTimeoutH.current = window.setTimeout(() => {
      isUserScrollingH.current = false;
      let targetIdx = Math.round(el.scrollTop / ITEM_H);
      // Bounce back if landed on a past hour
      if (isToday && targetIdx < minHour) {
        targetIdx = minHour;
        const val = HOURS_LIST[targetIdx];
        lastHVal.current = val;
        onHourChange(val);
      }
      const snapTop = targetIdx * ITEM_H;
      if (Math.abs(el.scrollTop - snapTop) > 1) {
        el.scrollTo({ top: snapTop, behavior: 'smooth' });
      }
    }, 80);
  }, [triggerHaptic, onHourChange, isToday, minHour]);

  const onMScroll = useCallback(() => {
    const el = mRef.current;
    if (!el) return;
    isUserScrollingM.current = true;

    if (rafIdM.current) cancelAnimationFrame(rafIdM.current);
    rafIdM.current = requestAnimationFrame(() => {
      const idx = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(59, idx));
      const val = MINUTES_LIST[clamped];
      if (val && val !== lastMVal.current) {
        lastMVal.current = val;
        triggerHaptic();
        onMinuteChange(val);
      }
    });

    if (snapTimeoutM.current) window.clearTimeout(snapTimeoutM.current);
    snapTimeoutM.current = window.setTimeout(() => {
      isUserScrollingM.current = false;
      let targetIdx = Math.round(el.scrollTop / ITEM_H);
      // Bounce back if landed on a past minute (same hour as now, today)
      if (isToday && targetIdx < minMinute && hIdx === curH) {
        targetIdx = Math.min(minMinute, 59);
        const val = MINUTES_LIST[targetIdx];
        lastMVal.current = val;
        onMinuteChange(val);
      }
      const snapTop = targetIdx * ITEM_H;
      if (Math.abs(el.scrollTop - snapTop) > 1) {
        el.scrollTo({ top: snapTop, behavior: 'smooth' });
      }
    }, 80);
  }, [triggerHaptic, onMinuteChange, isToday, minMinute, hIdx, curH]);

  // Direct tap on item — block past taps
  const clickH = useCallback((idx: number) => {
    if (isToday && idx < minHour) return;
    triggerHaptic();
    const val = HOURS_LIST[idx];
    lastHVal.current = val;
    hRef.current?.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
    onHourChange(val);
  }, [triggerHaptic, onHourChange, isToday, minHour]);

  const clickM = useCallback((idx: number) => {
    if (isToday && hIdx === curH && idx < minMinute) return;
    triggerHaptic();
    const val = MINUTES_LIST[idx];
    lastMVal.current = val;
    mRef.current?.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
    onMinuteChange(val);
  }, [triggerHaptic, onMinuteChange, isToday, hIdx, curH, minMinute]);

  const viewH = ITEM_H * (PAD * 2 + 1);

  return (
    <div className="twp-root">
      <div className="twp-badge">
        <span className="twp-digit">{pad(hIdx)}</span>
        <span className="twp-colon">:</span>
        <span className="twp-digit">{pad(mIdx)}</span>
      </div>

      <div className="twp-drums" style={{ height: viewH }}>
        <div className="twp-lens" style={{ top: PAD * ITEM_H, height: ITEM_H }} />
        <div className="twp-fade twp-fade-top" />
        <div className="twp-fade twp-fade-bottom" />

        <div className="twp-col">
          <div className="twp-col-label">Hour</div>
          <div
            ref={hRef}
            className="twp-scroll"
            style={{ height: viewH }}
            onScroll={onHScroll}
          >
            <div style={{ height: PAD * ITEM_H, flexShrink: 0 }} />
            {HOURS_LIST.map((h, i) => {
              const diff = Math.abs(i - hIdx);
              const isPast = isToday && i < minHour;
              const cls = 'twp-item'
                + (isPast ? ' past' : '')
                + ' ' + (i === hIdx ? 'sel' : diff === 1 ? 'n1' : diff === 2 ? 'n2' : 'far');
              return <div key={h} className={cls} style={{ height: ITEM_H }} onClick={() => clickH(i)}>{h}</div>;
            })}
            <div style={{ height: PAD * ITEM_H, flexShrink: 0 }} />
          </div>
        </div>

        <div className="twp-sep" style={{ lineHeight: `${viewH}px` }}>:</div>

        <div className="twp-col">
          <div className="twp-col-label">Min</div>
          <div
            ref={mRef}
            className="twp-scroll"
            style={{ height: viewH }}
            onScroll={onMScroll}
          >
            <div style={{ height: PAD * ITEM_H, flexShrink: 0 }} />
            {MINUTES_LIST.map((m, i) => {
              const diff = Math.abs(i - mIdx);
              const isPast = isToday && hIdx === curH && i < minMinute;
              const cls = 'twp-item'
                + (isPast ? ' past' : '')
                + ' ' + (i === mIdx ? 'sel' : diff === 1 ? 'n1' : diff === 2 ? 'n2' : 'far');
              return <div key={m} className={cls} style={{ height: ITEM_H }} onClick={() => clickM(i)}>{m}</div>;
            })}
            <div style={{ height: PAD * ITEM_H, flexShrink: 0 }} />
          </div>
        </div>
      </div>
    </div>
  );
};

