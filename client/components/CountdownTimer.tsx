"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const TARGET = new Date("2026-06-01T00:00:00");

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(): TimeLeft {
  const diff = TARGET.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

function Digit({ value }: { value: string }) {
  return (
    <div className="relative h-[1em] w-[0.6em] overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function CountUnit({ value, label }: { value: number; label: string }) {
  const padded = String(value).padStart(2, "0");
  const [d0, d1] = padded.split("");

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="flex items-center justify-center rounded-lg px-3 py-2.5 tabular-nums"
        style={{
          background: "rgba(255,255,255,0.72)",
          border: "1px solid rgba(13,15,20,0.07)",
          fontSize: "1.5rem",
          lineHeight: 1,
          letterSpacing: "-0.04em",
          fontWeight: 500,
          color: "var(--color-text)",
          minWidth: "3.75rem",
        }}
      >
        <Digit value={d0} />
        <Digit value={d1} />
      </div>
      <span
        className="text-[0.6875rem] font-medium uppercase tracking-[0.1em]"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        {label}
      </span>
    </div>
  );
}

function Separator() {
  return (
    <div
      className="mb-5 self-center text-lg font-light"
      style={{ color: "var(--color-text-tertiary)", letterSpacing: "-0.02em" }}
    >
      :
    </div>
  );
}

export function CountdownTimer() {
  const [time, setTime] = useState<TimeLeft | null>(null);

  useEffect(() => {
    setTime(getTimeLeft());
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) {
    return (
      <div className="flex items-end gap-3">
        {["Jours", "Heures", "Minutes", "Secondes"].map((label) => (
          <div key={label} className="flex flex-col items-center gap-2">
            <div
              className="flex items-center justify-center rounded-lg px-3 py-2.5"
              style={{
                background: "rgba(255,255,255,0.72)",
                border: "1px solid rgba(13,15,20,0.07)",
                minWidth: "3.75rem",
                height: "3rem",
              }}
            />
            <span
              className="text-[0.6875rem] font-medium uppercase tracking-[0.1em]"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-end gap-3">
      <CountUnit value={time.days} label="Jours" />
      <Separator />
      <CountUnit value={time.hours} label="Heures" />
      <Separator />
      <CountUnit value={time.minutes} label="Minutes" />
      <Separator />
      <CountUnit value={time.seconds} label="Secondes" />
    </div>
  );
}
