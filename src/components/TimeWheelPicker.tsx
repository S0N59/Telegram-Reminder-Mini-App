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
  const isScrollingH = useRef(false);
  const isScrollingM = useRef(false);
  const scrollTimeoutH = useRef<number | null>(null);
  const scrollTimeoutM = useRef<number | null>(null);

  const webApp = getTelegramWebApp();
  const lastHapticTime = useRef(0);
  const haptic = useCallback(() => {
    const now = Date.now();
    if (now - lastHapticTime.current > 70) {
      lastHapticTime.current = now;
      try { webApp?.HapticFeedback?.selectionChanged?.(); } catch { /* */ }
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync scroll when props change externally (not during active scroll)
  useEffect(() => {
    if (hRef.current && !isScrollingH.current) {
      const targetTop = hIdx * ITEM_H;
      if (Math.abs(hRef.current.scrollTop - targetTop) > 2) {
        hRef.current.scrollTo({ top: targetTop, behavior: 'smooth' });
      }
    }
  }, [hIdx]);

  useEffect(() => {
    if (mRef.current && !isScrollingM.current) {
      const targetTop = mIdx * ITEM_H;
      if (Math.abs(mRef.current.scrollTop - targetTop) > 2) {
        mRef.current.scrollTo({ top: targetTop, behavior: 'smooth' });
      }
    }
  }, [mIdx]);

  // Handle scroll with smooth inertia and gentle snap on stop
  const onHScroll = useCallback(() => {
    const el = hRef.current;
    if (!el) return;
    isScrollingH.current = true;
    const idx = Math.round(el.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(hoursAvail.length - 1, idx));
    const val = hoursAvail[clamped];
    if (val && val !== lastHVal.current) {
      lastHVal.current = val;
      haptic();
      onHourChange(val);
    }
    if (scrollTimeoutH.current) window.clearTimeout(scrollTimeoutH.current);
    scrollTimeoutH.current = window.setTimeout(() => {
      isScrollingH.current = false;
      const finalIdx = Math.round(el.scrollTop / ITEM_H);
      const snapTop = finalIdx * ITEM_H;
      if (Math.abs(el.scrollTop - snapTop) > 1) {
        el.scrollTo({ top: snapTop, behavior: 'smooth' });
      }
    }, 140);
  }, [hoursAvail, haptic, onHourChange]);

  const onMScroll = useCallback(() => {
    const el = mRef.current;
    if (!el) return;
    isScrollingM.current = true;
    const idx = Math.round(el.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(minutesAvail.length - 1, idx));
    const val = minutesAvail[clamped];
    if (val && val !== lastMVal.current) {
      lastMVal.current = val;
      haptic();
      onMinuteChange(val);
    }
    if (scrollTimeoutM.current) window.clearTimeout(scrollTimeoutM.current);
    scrollTimeoutM.current = window.setTimeout(() => {
      isScrollingM.current = false;
      const finalIdx = Math.round(el.scrollTop / ITEM_H);
      const snapTop = finalIdx * ITEM_H;
      if (Math.abs(el.scrollTop - snapTop) > 1) {
        el.scrollTo({ top: snapTop, behavior: 'smooth' });
      }
    }, 140);
  }, [minutesAvail, haptic, onMinuteChange]);

  // Click on number to jump directly
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

  // Mouse wheel support for desktop
  const handleWheel = (ref: React.RefObject<HTMLDivElement>, e: React.WheelEvent) => {
    e.preventDefault();
    if (!ref.current) return;
    const delta = e.deltaY > 0 ? ITEM_H : -ITEM_H;
    ref.current.scrollBy({ top: delta, behavior: 'smooth' });
  };

  // Mouse drag support for desktop
  const setupDrag = (ref: React.RefObject<HTMLDivElement>) => {
    return (e: React.MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const startY = e.pageY;
      const startScrollTop = el.scrollTop;
      let isDragging = false;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = startY - moveEvent.pageY;
        if (Math.abs(delta) > 3) isDragging = true;
        el.scrollTop = startScrollTop + delta;
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        if (isDragging) {
          const idx = Math.round(el.scrollTop / ITEM_H);
          el.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };
  };

  // Quick increment buttons
  const addMinutes = (delta: number) => {
    haptic();
    let totalM = (parseInt(clampedH, 10) * 60 + parseInt(clampedM, 10) + delta) % (24 * 60);
    if (totalM < 0) totalM += 24 * 60;
    const newH = pad(Math.floor(totalM / 60));
    const newM = pad(totalM % 60);
    onHourChange(newH);
    onMinuteChange(newM);
  };

  const setMinutePreset = (targetMin: string) => {
    haptic();
    if (minutesAvail.includes(targetMin)) {
      onMinuteChange(targetMin);
    }
  };

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
            onWheel={(e) => handleWheel(hRef, e)}
            onMouseDown={setupDrag(hRef)}
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
            onWheel={(e) => handleWheel(mRef, e)}
            onMouseDown={setupDrag(mRef)}
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

      {/* Quick shortcuts for fast time picking */}
      <div className="twp-quick-chips">
        <button type="button" className="twp-chip" onClick={() => addMinutes(15)}>+15m</button>
        <button type="button" className="twp-chip" onClick={() => addMinutes(30)}>+30m</button>
        <button type="button" className="twp-chip" onClick={() => addMinutes(60)}>+1h</button>
        <button type="button" className="twp-chip" onClick={() => setMinutePreset('00')}>:00</button>
        <button type="button" className="twp-chip" onClick={() => setMinutePreset('30')}>:30</button>
      </div>
    </div>
  );
};
