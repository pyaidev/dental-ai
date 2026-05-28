"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Activity, Users, FileText, ChevronRight, Calendar, Plus, ArrowUpRight, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { API_BASE } from "@/lib/utils";

interface AnalysisItem {
  id: number;
  patient_fio: string;
  card_number: string;
  plaque_pct_overall: number;
  created_at: string;
}

interface DashboardStats {
  total_analyses: number;
  total_patients: number;
  avg_plaque: number;
  today_analyses: number;
  recent_analyses: AnalysisItem[];
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

function PlaqueLevel({ value }: { value: number }) {
  const color = value > 50 ? "#ef4444" : value > 30 ? "#f97316" : value > 15 ? "#f59e0b" : "#10b981";
  const width = Math.min(value, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums" style={{ color }}>{value}%</span>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("dental_token");
    if (!token) { router.replace("/login"); return; }

    fetch(`${API_BASE}/api/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex flex-1 items-center justify-center min-h-[60vh]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary"
          />
        </div>
      </>
    );
  }

  const data = {
    total_analyses: stats?.total_analyses ?? 0,
    total_patients: stats?.total_patients ?? 0,
    avg_plaque: stats?.avg_plaque ?? 0,
    today_analyses: stats?.today_analyses ?? 0,
    recent_analyses: stats?.recent_analyses ?? [],
  };

  const statCards = [
    { title: "Всего анализов", value: data.total_analyses, icon: FileText, accent: "#0891b2", bg: "#ecfeff" },
    { title: "Пациенты", value: data.total_patients, icon: Users, accent: "#10b981", bg: "#ecfdf5" },
    { title: "Средний налёт", value: `${data.avg_plaque}%`, icon: Activity, accent: data.avg_plaque > 30 ? "#ef4444" : data.avg_plaque > 15 ? "#f59e0b" : "#10b981", bg: data.avg_plaque > 30 ? "#fef2f2" : data.avg_plaque > 15 ? "#fffbeb" : "#ecfdf5" },
    { title: "Сегодня", value: data.today_analyses, icon: Calendar, accent: "#8b5cf6", bg: "#f5f3ff" },
  ];

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8">
        {/* Welcome */}
        <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Дашборд</h1>
            <p className="mt-1 text-sm text-muted">Обзор работы клиники</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/analyze")}
            className="hidden sm:flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary-dark transition-colors"
          >
            <Plus className="h-4 w-4" />
            Новый анализ
          </motion.button>
        </motion.div>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statCards.map((card, i) => (
            <motion.div
              key={card.title}
              {...fadeUp}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              whileHover={{ y: -3, boxShadow: "var(--card-shadow-hover)" }}
              className="rounded-2xl bg-white p-5 transition-all"
              style={{ boxShadow: "var(--card-shadow)" }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium tracking-wide uppercase text-muted/70">{card.title}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight" style={{ color: card.accent }}>{card.value}</p>
                </div>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: card.bg }}
                >
                  <card.icon className="h-5 w-5" style={{ color: card.accent }} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent analyses */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="lg:col-span-2 rounded-2xl bg-white overflow-hidden"
            style={{ boxShadow: "var(--card-shadow)" }}
          >
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Последние анализы</h2>
                <p className="text-xs text-muted mt-0.5">{data.recent_analyses.length} записей</p>
              </div>
              <button
                onClick={() => router.push("/patients")}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Все пациенты <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>

            {data.recent_analyses.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">Нет анализов</p>
                <p className="mt-1 text-xs text-muted">Создайте первый анализ для начала работы</p>
                <button
                  onClick={() => router.push("/analyze")}
                  className="mt-4 rounded-lg bg-primary/10 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                >
                  Создать анализ
                </button>
              </div>
            ) : (
              <div>
                {/* Table header */}
                <div className="grid grid-cols-[1fr_100px_80px_20px] gap-3 px-6 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted/60 border-t border-card-border">
                  <span>Пациент</span>
                  <span className="text-right">Налёт</span>
                  <span className="text-right">Дата</span>
                  <span></span>
                </div>
                {data.recent_analyses.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 + i * 0.04 }}
                    onClick={() => router.push(`/patients`)}
                    className="grid grid-cols-[1fr_100px_80px_20px] gap-3 items-center px-6 py-3 cursor-pointer hover:bg-slate-50/80 transition-colors border-t border-card-border/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-cyan-100 text-xs font-bold text-primary">
                        {item.patient_fio.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.patient_fio}</p>
                        <p className="text-[11px] text-muted">#{item.card_number}</p>
                      </div>
                    </div>
                    <div className="pr-1">
                      <PlaqueLevel value={item.plaque_pct_overall} />
                    </div>
                    <p className="text-[11px] text-muted text-right tabular-nums">
                      {new Date(item.created_at).toLocaleDateString("ru", { day: "2-digit", month: "short" })}
                    </p>
                    <ChevronRight className="h-3.5 w-3.5 text-muted/40" />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Sidebar */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="space-y-4"
          >
            {/* Quick action — mobile & desktop */}
            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => router.push("/analyze")}
              className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#0891b2] via-[#0e7490] to-[#155e75] p-6 text-left text-white"
              style={{ boxShadow: "0 8px 30px rgba(8,145,178,0.25)" }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 mb-4">
                  <Activity className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold">Новый анализ</h3>
                <p className="mt-1 text-sm text-white/70 leading-relaxed">
                  Загрузите фото зубов для AI&#8209;анализа
                </p>
              </div>
            </motion.button>

            {/* Hygiene scale */}
            <div
              className="rounded-2xl bg-white p-5"
              style={{ boxShadow: "var(--card-shadow)" }}
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted/60 mb-4">Шкала гигиены</h3>
              <div className="space-y-3">
                {[
                  { label: "Хороший", range: "0–10%", color: "#10b981", bg: "#ecfdf5" },
                  { label: "Удовлетвор.", range: "11–30%", color: "#f59e0b", bg: "#fffbeb" },
                  { label: "Неудовлетвор.", range: "31–50%", color: "#f97316", bg: "#fff7ed" },
                  { label: "Плохой", range: ">50%", color: "#ef4444", bg: "#fef2f2" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-medium text-foreground/80">{item.label}</span>
                    </div>
                    <span
                      className="rounded-md px-2 py-0.5 text-[10px] font-bold"
                      style={{ backgroundColor: item.bg, color: item.color }}
                    >
                      {item.range}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
