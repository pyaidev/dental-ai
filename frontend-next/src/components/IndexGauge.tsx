"use client";

import { motion } from "framer-motion";

interface IndexGaugeProps {
  label: string;
  value: number;
  maxValue: number;
  unit?: string;
  interpretation: string;
  description: string;
  thresholds: { good: number; ok: number; bad: number };
}

function getColor(value: number, thresholds: { good: number; ok: number; bad: number }) {
  if (value <= thresholds.good) return "#10b981";
  if (value <= thresholds.ok) return "#f59e0b";
  if (value <= thresholds.bad) return "#f97316";
  return "#ef4444";
}

export default function IndexGauge({
  label,
  value,
  maxValue,
  unit = "",
  interpretation,
  description,
  thresholds,
}: IndexGaugeProps) {
  const color = getColor(value, thresholds);
  const percentage = Math.min((value / maxValue) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      className="rounded-2xl border border-card-border bg-card p-5 text-center"
    >
      <div className="relative mx-auto mb-3 flex h-20 w-20 items-center justify-center">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40" cy="40" r="34"
            fill="none" stroke="#f1f5f9" strokeWidth="6"
          />
          <motion.circle
            cx="40" cy="40" r="34"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 34}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - percentage / 100) }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold" style={{ color }}>
            {value}{unit}
          </span>
        </div>
      </div>

      <h4 className="text-sm font-semibold">{label}</h4>
      <p className="mt-0.5 text-xs text-muted">{description}</p>
      <div
        className="mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-medium text-white"
        style={{ backgroundColor: color }}
      >
        {interpretation}
      </div>
    </motion.div>
  );
}
