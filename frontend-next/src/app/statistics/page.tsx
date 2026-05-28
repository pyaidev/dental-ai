"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { BarChart3, PieChart, AlertTriangle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { API_BASE } from "@/lib/utils";

interface MonthlyData {
  month: string;
  month_name: string;
  count: number;
  avg_plaque: number;
}

interface Stats {
  monthly: MonthlyData[];
  distribution: { good: number; satisfactory: number; unsatisfactory: number; poor: number; total: number };
  attention_needed: { patient_fio: string; card_number: string; plaque_pct: number; date: string }[];
}

export default function StatisticsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("dental_token");
    if (!token) { router.replace("/login"); return; }
    fetch(`${API_BASE}/api/statistics`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </>
    );
  }

  const d = {
    monthly: stats?.monthly ?? [],
    distribution: stats?.distribution ?? { good: 0, satisfactory: 0, unsatisfactory: 0, poor: 0, total: 0 },
    attention_needed: stats?.attention_needed ?? [],
  };
  const maxCount = d.monthly.length > 0 ? Math.max(...d.monthly.map((m) => m.count), 1) : 1;

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Статистика клиники</h1>
          <p className="mt-1 text-sm text-muted">Обзор за последние 12 месяцев</p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Monthly chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-white p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Анализов по месяцам</h2>
            </div>
            <div className="flex items-end gap-1 h-40">
              {d.monthly.map((m, i) => (
                <motion.div
                  key={`${m.month}-${i}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${(m.count / maxCount) * 100}%` }}
                  transition={{ delay: i * 0.05, duration: 0.5 }}
                  className="flex-1 bg-primary/80 rounded-t hover:bg-primary transition-colors relative group cursor-default"
                  style={{ minHeight: m.count > 0 ? "4px" : "0px" }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    {m.count}
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="flex gap-1 mt-1">
              {d.monthly.map((m, i) => (
                <div key={`label-${i}`} className="flex-1 text-[8px] text-center text-muted truncate">
                  {m.month.slice(5)}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-white p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Распределение гигиены</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: "Хороший (0-10%)", value: d.distribution.good, color: "bg-emerald-500" },
                { label: "Удовлетворительный (11-30%)", value: d.distribution.satisfactory, color: "bg-amber-500" },
                { label: "Неудовлетворительный (31-50%)", value: d.distribution.unsatisfactory, color: "bg-orange-500" },
                { label: "Плохой (>50%)", value: d.distribution.poor, color: "bg-red-500" },
              ].map((item) => {
                const pct = d.distribution.total > 0 ? (item.value / d.distribution.total) * 100 : 0;
                return (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted">{item.label}</span>
                      <span className="font-medium">{item.value} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8 }}
                        className={`h-full rounded-full ${item.color}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted text-center">Всего анализов: {d.distribution.total}</p>
          </motion.div>

          {/* Avg plaque trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl bg-white p-5"
          >
            <h2 className="font-semibold mb-4">Средний налёт по месяцам</h2>
            <div className="flex items-end gap-1 h-32">
              {d.monthly.map((m, i) => (
                <motion.div
                  key={`${m.month}-${i}`}
                  className="flex-1 flex flex-col items-center justify-end"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="text-[9px] font-medium mb-1">{m.avg_plaque > 0 ? `${m.avg_plaque}%` : ""}</div>
                  <div
                    className={`w-full rounded-t transition-all ${
                      m.avg_plaque <= 10 ? "bg-emerald-400" : m.avg_plaque <= 30 ? "bg-amber-400" : m.avg_plaque <= 50 ? "bg-orange-400" : "bg-red-400"
                    }`}
                    style={{ height: `${Math.max((m.avg_plaque / 100) * 100, m.avg_plaque > 0 ? 4 : 0)}%` }}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Attention needed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl bg-white p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <h2 className="font-semibold">Требуют внимания</h2>
            </div>
            {d.attention_needed.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">Нет данных</p>
            ) : (
              <div className="space-y-2">
                {d.attention_needed.map((p, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{p.patient_fio}</p>
                      <p className="text-xs text-muted">{p.date}</p>
                    </div>
                    <span className="text-sm font-bold text-danger">{p.plaque_pct}%</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
