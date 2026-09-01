"use client";

import { useEffect, useRef, useState } from "react";
import { number as formatNumber } from "@/lib/format";

export function useCountUp(value: number, active = true) {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const to = Number(value || 0);
    if (!active) {
      displayRef.current = to;
      setDisplay(to);
      return;
    }
    const from = displayRef.current;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const distance = Math.abs(to - from);
    const duration = Math.min(1800, Math.max(800, 480 + Math.sqrt(distance) * 22));
    const easeOutQuint = (t: number) => 1 - (1 - t) ** 5;
    const start = performance.now();
    cancelAnimationFrame(frameRef.current);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const next = Math.round(from + (to - from) * easeOutQuint(t));
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [active, value]);

  return display;
}

export function CountUp({
  value,
  active = true,
  suffix = "",
}: {
  value: number;
  active?: boolean;
  suffix?: string;
}) {
  const display = useCountUp(value, active);
  return (
    <>
      {formatNumber(display)}
      {suffix}
    </>
  );
}
