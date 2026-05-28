"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Shield, Users, FileText, CreditCard, Server, Database,
  TrendingUp, DollarSign, Activity, AlertTriangle, CheckCircle,
  LogOut, LayoutDashboard, ScanLine, BarChart3, Settings, ExternalLink
} from "lucide-react";
import { API_BASE } from "@/lib/utils";

interface Overview {
  users: { total: number; doctors: number; admins: number };
  patients: { total: number };
  analyses: { total: number; this_month: number; this_week: number };
  subscriptions: { active: number; total_revenue: number; total_reports_used: number };
  costs: { ai_requests: number; ai_cost_rub: number; server_cost_rub: number; total_monthly_cost: number };
  profit: number;
}

interface UserItem {
  id: number; username: string; fio: string; role: string;
  last_login: string | null; created_at: string | null;
  subscription: { plan: string; reports_remaining: number; reports_total: number } | null;
}

interface SystemHealth {
  server: string; python: string; os: string;
  disk?: { total_gb: number; used_gb: number; free_gb: number; percent: number };
  redis: string; database: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [system, setSystem] = useState<SystemHealth | null>(null);
  const [tab, setTab] = useState<"overview" | "users" | "system">("overview");

  const token = typeof window !== "undefined" ? localStorage.getItem("dental_token") : null;

  useEffect(() => {
    if (!token) { router.replace("/login"); return; }
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_BASE}/api/admin/overview`, { headers: h }).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/api/admin/users`, { headers: h }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/admin/system`, { headers: h }).then(r => r.ok ? r.json() : null),
    ]).then(([o, u, s]) => {
      setOverview(o);
      setUsers(Array.isArray(u) ? u : []);
      setSystem(s);
    }).catch(() => {});
  }, [token, router]);

  const o = overview;

  return (
    <>
      {/* Admin Header */}
      <motion.header
        initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 bg-slate-900 text-white"
      >
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-cyan-400" />
            <span className="text-sm font-bold">Admin Panel</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <a href="https://odontaindex.ru/dashboard" target="_blank" className="flex items-center gap-1 text-white/50 hover:text-white transition-colors">
              <ExternalLink className="h-3 w-3" /> Основной сайт
            </a>
            <span className="text-white/20">|</span>
            {[
              { href: "https://odontaindex.ru/analyze", label: "Анализ", icon: ScanLine },
              { href: "https://odontaindex.ru/patients", label: "Пациенты", icon: Users },
              { href: "https://odontaindex.ru/statistics", label: "Статистика", icon: BarChart3 },
              { href: "https://odontaindex.ru/settings", label: "Кабинет", icon: Settings },
            ].map(link => (
              <a key={link.href} href={link.href} target="_blank"
                className="flex items-center gap-1 text-white/40 hover:text-white transition-colors">
                <link.icon className="h-3 w-3" /><span className="hidden sm:inline">{link.label}</span>
              </a>
            ))}
            <span className="text-white/20">|</span>
            <button onClick={() => { localStorage.removeItem("dental_token"); router.push("/login"); }}
              className="flex items-center gap-1 text-white/40 hover:text-red-400 transition-colors">
              <LogOut className="h-3 w-3" /> Выйти
            </button>
          </div>
        </div>
      </motion.header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Панель администратора</h1>
            <p className="text-sm text-muted">Мониторинг системы Odonta Index AI</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {([
            { key: "overview", label: "Обзор", icon: TrendingUp },
            { key: "users", label: "Пользователи", icon: Users },
            { key: "system", label: "Система", icon: Server },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                tab === t.key ? "bg-primary/10 text-primary" : "text-muted hover:bg-slate-50"
              }`}
            >
              <t.icon className="h-4 w-4" />{t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === "overview" && o && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { label: "Пользователи", value: o.users.total, sub: `${o.users.doctors} врачей`, icon: Users, color: "#0891b2" },
                { label: "Анализов/мес", value: o.analyses.this_month, sub: `Всего: ${o.analyses.total}`, icon: FileText, color: "#8b5cf6" },
                { label: "Выручка", value: `${o.subscriptions.total_revenue.toLocaleString()} ₽`, sub: `${o.subscriptions.active} подписок`, icon: DollarSign, color: "#10b981" },
                { label: "Прибыль", value: `${o.profit.toLocaleString()} ₽`, sub: `Расходы: ${o.costs.total_monthly_cost} ₽`, icon: TrendingUp, color: o.profit > 0 ? "#10b981" : "#ef4444" },
              ].map((card, i) => (
                <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-2xl bg-white p-5" style={{ boxShadow: "var(--card-shadow)" }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted/60">{card.label}</p>
                      <p className="mt-1 text-2xl font-bold" style={{ color: card.color }}>{card.value}</p>
                      <p className="mt-0.5 text-[11px] text-muted">{card.sub}</p>
                    </div>
                    <card.icon className="h-5 w-5" style={{ color: card.color, opacity: 0.4 }} />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* AI Costs */}
            <div className="rounded-2xl bg-white p-5" style={{ boxShadow: "var(--card-shadow)" }}>
              <h3 className="text-sm font-semibold mb-3">Расходы AI</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-muted">YandexGPT запросы</p>
                  <p className="text-lg font-bold text-primary">{o.costs.ai_requests}</p>
                  <p className="text-xs text-muted">{o.costs.ai_cost_rub} ₽</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-muted">Сервер/мес</p>
                  <p className="text-lg font-bold">{o.costs.server_cost_rub} ₽</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-muted">Итого/мес</p>
                  <p className="text-lg font-bold text-danger">{o.costs.total_monthly_cost} ₽</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Users */}
        {tab === "users" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl bg-white overflow-hidden" style={{ boxShadow: "var(--card-shadow)" }}>
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-sm text-muted">{users.length} пользователей</p>
            </div>
            <div className="divide-y divide-gray-50">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      u.role === "admin" ? "bg-red-50 text-red-500" : "bg-primary/10 text-primary"
                    }`}>
                      {(u.fio || u.username).slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.fio || u.username}</p>
                      <p className="text-[11px] text-muted">@{u.username} · {u.role}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    {u.subscription ? (
                      <span className="rounded-md bg-green-50 px-2 py-0.5 text-green-600 font-medium">
                        {u.subscription.plan} ({u.subscription.reports_remaining}/{u.subscription.reports_total})
                      </span>
                    ) : (
                      <span className="text-muted">Нет подписки</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* System */}
        {tab === "system" && system && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: "Сервер", value: system.server, icon: Server, status: "ok" },
                { label: "Redis", value: system.redis, icon: Database, status: system.redis === "connected" ? "ok" : "error" },
                { label: "PostgreSQL", value: system.database, icon: Database, status: system.database === "connected" ? "ok" : "error" },
              ].map(s => (
                <div key={s.label} className="rounded-2xl bg-white p-5 flex items-center gap-3" style={{ boxShadow: "var(--card-shadow)" }}>
                  {s.status === "ok"
                    ? <CheckCircle className="h-5 w-5 text-success" />
                    : <AlertTriangle className="h-5 w-5 text-danger" />}
                  <div>
                    <p className="text-xs text-muted">{s.label}</p>
                    <p className="text-sm font-semibold">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {system.disk && (
              <div className="rounded-2xl bg-white p-5" style={{ boxShadow: "var(--card-shadow)" }}>
                <h3 className="text-sm font-semibold mb-3">Диск</h3>
                <div className="h-3 rounded-full bg-gray-100 overflow-hidden mb-2">
                  <div className={`h-full rounded-full ${system.disk.percent > 80 ? "bg-danger" : "bg-primary"}`}
                    style={{ width: `${system.disk.percent}%` }} />
                </div>
                <p className="text-xs text-muted">
                  {system.disk.used_gb} ГБ / {system.disk.total_gb} ГБ ({system.disk.percent}%)
                </p>
              </div>
            )}

            <div className="rounded-2xl bg-white p-5" style={{ boxShadow: "var(--card-shadow)" }}>
              <h3 className="text-sm font-semibold mb-2">Инфо</h3>
              <div className="text-xs text-muted space-y-1">
                <p>Python: {system.python}</p>
                <p>OS: {system.os}</p>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </>
  );
}
