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
  hours, minutes, onHourChange, onMinuteChange,
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

  const hIdx = Math.max(0, Math.min(23, parseInt(hours, 10) || 0));
  const mIdx = Math.max(0, Math.min(59, parseInt(minutes, 10) || 0));

  // Initial scroll position on mount
  useEffect(() => {
    if (hRef.current) hRef.current.scrollTop = hIdx * ITEM_H;
    if (mRef.current) mRef.current.scrollTop = mIdx * ITEM_H;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync scroll when props change externally (e.g. initial load or reset)
  useEffect(() => {
    if (hRef.current && !isUserScrollingH.current) {
      const target = hIdx * ITEM_H;
      if (Math.abs(hRef.current.scrollTop - target) > 2) {
        hRef.current.scrollTo({ top: target, behavior: 'smooth' });
      }
    }
  }, [hIdx]);

  useEffect(() => {
    if (mRef.current && !isUserScrollingM.current) {
      const target = mIdx * ITEM_H;
      if (Math.abs(mRef.current.scrollTop - target) > 2) {
        mRef.current.scrollTo({ top: target, behavior: 'smooth' });
      }
    }
  }, [mIdx]);

  // High-performance scroll listeners
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
      const targetIdx = Math.round(el.scrollTop / ITEM_H);
      const snapTop = targetIdx * ITEM_H;
      if (Math.abs(el.scrollTop - snapTop) > 1) {
        el.scrollTo({ top: snapTop, behavior: 'smooth' });
      }
    }, 150);
  }, [triggerHaptic, onHourChange]);

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
      const targetIdx = Math.round(el.scrollTop / ITEM_H);
      const snapTop = targetIdx * ITEM_H;
      if (Math.abs(el.scrollTop - snapTop) > 1) {
        el.scrollTo({ top: snapTop, behavior: 'smooth' });
      }
    }, 150);
  }, [triggerHaptic, onMinuteChange]);

  // Direct tap on any item
  const clickH = useCallback((idx: number) => {
    triggerHaptic();
    const val = HOURS_LIST[idx];
    lastHVal.current = val;
    hRef.current?.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
    onHourChange(val);
  }, [triggerHaptic, onHourChange]);

  const clickM = useCallback((idx: number) => {
    triggerHaptic();
    const val = MINUTES_LIST[idx];
    lastMVal.current = val;
    mRef.current?.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
    onMinuteChange(val);
  }, [triggerHaptic, onMinuteChange]);

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
            {MINUTES_LIST.map((m, i) => {
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
