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

  const now = new Date();
  const curH = now.getHours();
  const curM = now.getMinutes();

  // Dynamic available lists — strictly no past hours on today
  const startH = isToday ? curH : 0;
  const hoursAvail: string[] = [];
  for (let h = startH; h <= 23; h++) hoursAvail.push(pad(h));

  const selHNum = parseInt(hours, 10) || 0;
  const minStart = (isToday && selHNum === curH) ? Math.min(curM + 1, 59) : 0;
  const minutesAvail: string[] = [];
  for (let m = minStart; m <= 59; m++) minutesAvail.push(pad(m));

  // Clamped valid values
  const clampedH = hoursAvail.includes(hours) ? hours : (hoursAvail[0] ?? '00');
  const clampedM = minutesAvail.includes(minutes) ? minutes : (minutesAvail[0] ?? '00');

  const hIdx = Math.max(0, hoursAvail.indexOf(clampedH));
  const mIdx = Math.max(0, minutesAvail.indexOf(clampedM));

  // Emit corrected values if clamped differed
  useEffect(() => {
    if (clampedH !== hours) {
      lastHVal.current = clampedH;
      onHourChange(clampedH);
    }
  }, [clampedH, hours, onHourChange]);

  useEffect(() => {
    if (clampedM !== minutes) {
      lastMVal.current = clampedM;
      onMinuteChange(clampedM);
    }
  }, [clampedM, minutes, onMinuteChange]);

  // Initial scroll position on mount
  useEffect(() => {
    if (hRef.current) hRef.current.scrollTop = hIdx * ITEM_H;
    if (mRef.current) mRef.current.scrollTop = mIdx * ITEM_H;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync scroll when available items or selection changes
  useEffect(() => {
    if (hRef.current && !isUserScrollingH.current) {
      const target = hIdx * ITEM_H;
      if (Math.abs(hRef.current.scrollTop - target) > 2) {
        hRef.current.scrollTop = target;
      }
    }
  }, [hIdx, hoursAvail.length]);

  useEffect(() => {
    if (mRef.current && !isUserScrollingM.current) {
      const target = mIdx * ITEM_H;
      if (Math.abs(mRef.current.scrollTop - target) > 2) {
        mRef.current.scrollTop = target;
      }
    }
  }, [mIdx, minutesAvail.length]);

  // Scroll listeners
  const onHScroll = useCallback(() => {
    const el = hRef.current;
    if (!el) return;
    isUserScrollingH.current = true;

    if (rafIdH.current) cancelAnimationFrame(rafIdH.current);
    rafIdH.current = requestAnimationFrame(() => {
      const rawIdx = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(hoursAvail.length - 1, rawIdx));
      const val = hoursAvail[clamped];
      if (val && val !== lastHVal.current) {
        lastHVal.current = val;
        triggerHaptic();
        onHourChange(val);
      }
    });

    if (snapTimeoutH.current) window.clearTimeout(snapTimeoutH.current);
    snapTimeoutH.current = window.setTimeout(() => {
      isUserScrollingH.current = false;
      const rawIdx = Math.round(el.scrollTop / ITEM_H);
      const targetIdx = Math.max(0, Math.min(hoursAvail.length - 1, rawIdx));
      const val = hoursAvail[targetIdx];
      if (val && val !== lastHVal.current) {
        lastHVal.current = val;
        onHourChange(val);
      }
      const snapTop = targetIdx * ITEM_H;
      el.scrollTo({ top: snapTop, behavior: 'smooth' });
    }, 80);
  }, [hoursAvail, triggerHaptic, onHourChange]);

  const onMScroll = useCallback(() => {
    const el = mRef.current;
    if (!el) return;
    isUserScrollingM.current = true;

    if (rafIdM.current) cancelAnimationFrame(rafIdM.current);
    rafIdM.current = requestAnimationFrame(() => {
      const rawIdx = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(minutesAvail.length - 1, rawIdx));
      const val = minutesAvail[clamped];
      if (val && val !== lastMVal.current) {
        lastMVal.current = val;
        triggerHaptic();
        onMinuteChange(val);
      }
    });

    if (snapTimeoutM.current) window.clearTimeout(snapTimeoutM.current);
    snapTimeoutM.current = window.setTimeout(() => {
      isUserScrollingM.current = false;
      const rawIdx = Math.round(el.scrollTop / ITEM_H);
      const targetIdx = Math.max(0, Math.min(minutesAvail.length - 1, rawIdx));
      const val = minutesAvail[targetIdx];
      if (val && val !== lastMVal.current) {
        lastMVal.current = val;
        onMinuteChange(val);
      }
      const snapTop = targetIdx * ITEM_H;
      el.scrollTo({ top: snapTop, behavior: 'smooth' });
    }, 80);
  }, [minutesAvail, triggerHaptic, onMinuteChange]);

  const clickH = useCallback((idx: number) => {
    const clampedIdx = Math.max(0, Math.min(hoursAvail.length - 1, idx));
    triggerHaptic();
    const val = hoursAvail[clampedIdx];
    lastHVal.current = val;
    hRef.current?.scrollTo({ top: clampedIdx * ITEM_H, behavior: 'smooth' });
    onHourChange(val);
  }, [hoursAvail, triggerHaptic, onHourChange]);

  const clickM = useCallback((idx: number) => {
    const clampedIdx = Math.max(0, Math.min(minutesAvail.length - 1, idx));
    triggerHaptic();
    const val = minutesAvail[clampedIdx];
    lastMVal.current = val;
    mRef.current?.scrollTo({ top: clampedIdx * ITEM_H, behavior: 'smooth' });
    onMinuteChange(val);
  }, [minutesAvail, triggerHaptic, onMinuteChange]);

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
          <div
            ref={hRef}
            className="twp-scroll"
            style={{ height: viewH }}
            onScroll={onHScroll}
          >
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
          <div
            ref={mRef}
            className="twp-scroll"
            style={{ height: viewH }}
            onScroll={onMScroll}
          >
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

