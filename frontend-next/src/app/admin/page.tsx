"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Shield, Users, FileText, CreditCard, Server, Database,
  TrendingUp, DollarSign, Activity, AlertTriangle, CheckCircle,
  LogOut, LayoutDashboard, ScanLine, BarChart3, Settings, ExternalLink,
  Star, Trash2, Edit3, Plus, X, ChevronDown, Lock, Unlock,
  Calendar, Clock, RefreshCw, Eye, MessageSquare, Filter,
  UserCheck, UserX, Search, Save, Package
} from "lucide-react";
import { API_BASE } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Overview {
  users: { total: number; doctors: number; admins: number };
  patients: { total: number };
  analyses: { total: number; this_month: number; this_week: number };
  subscriptions: { active: number; total_revenue: number; total_reports_used: number };
  costs: { ai_requests: number; ai_cost_rub: number; server_cost_rub: number; total_monthly_cost: number };
  profit: number;
}

interface UserItem {
  id: number;
  username: string;
  fio: string;
  role: string;
  is_active?: boolean;
  last_login: string | null;
  created_at: string | null;
  subscription: {
    plan: string;
    status: string;
    reports_remaining: number;
    reports_total: number;
    created_at?: string;
  } | null;
}

interface SystemHealth {
  server: string;
  python: string;
  os: string;
  disk?: { total_gb: number; used_gb: number; free_gb: number; percent: number };
  redis: string;
  database: string;
}

interface Review {
  id?: number;
  name: string;
  role: string;
  quote: string;
  stars: number;
}

type TabKey = "overview" | "users" | "transactions" | "reviews" | "ambassadors" | "plans" | "celery";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—";

const fmtNum = (n: number) => n?.toLocaleString("ru-RU") ?? "0";

const PLAN_COLORS: Record<string, string> = {
  free: "bg-slate-100 text-slate-600",
  basic: "bg-blue-50 text-blue-700",
  pro: "bg-violet-50 text-violet-700",
  clinic: "bg-amber-50 text-amber-700",
  unlimited: "bg-emerald-50 text-emerald-700",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  expired: "bg-red-50 text-red-600",
  cancelled: "bg-slate-100 text-slate-500",
  pending: "bg-yellow-50 text-yellow-700",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, gradient, delay = 0,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; gradient: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
      style={{ background: gradient }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">{label}</p>
          <p className="mt-1.5 text-3xl font-bold">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-white/70">{sub}</p>}
        </div>
        <Icon className="h-8 w-8 text-white/25" />
      </div>
      <div className="pointer-events-none absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10" />
    </motion.div>
  );
}

function Badge({ text, className }: { text: string; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${className}`}>
      {text}
    </span>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

function ReviewModal({
  review, onClose, onSave,
}: {
  review: Review | null;
  onClose: () => void;
  onSave: (r: Review) => void;
}) {
  const [form, setForm] = useState<Review>(
    review ?? { name: "", role: "", quote: "", stars: 5 }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{review?.id ? "Редактировать" : "Добавить"} отзыв</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Имя</label>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Имя Фамилия"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Должность / роль</label>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              placeholder="Стоматолог, Клиника X"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Текст отзыва</label>
            <textarea
              rows={4}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 resize-none"
              value={form.quote}
              onChange={e => setForm(f => ({ ...f, quote: e.target.value }))}
              placeholder="Напишите текст отзыва..."
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Оценка</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setForm(f => ({ ...f, stars: n }))}
                  className="transition-transform hover:scale-110">
                  <Star className={`h-6 w-6 ${n <= form.stars ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Отмена
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.name || !form.quote}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Save className="h-4 w-4" /> Сохранить
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Assign Plan Modal ────────────────────────────────────────────────────────

function AssignPlanModal({
  user, onClose, onSave,
}: {
  user: UserItem;
  onClose: () => void;
  onSave: (userId: number, plan: string, reportsTotal: number) => void;
}) {
  const [plan, setPlan] = useState(user.subscription?.plan ?? "basic");
  const [reports, setReports] = useState(user.subscription?.reports_total ?? 10);

  const PLANS = [
    { key: "basic", label: "Basic", reports: 10 },
    { key: "pro", label: "Pro", reports: 30 },
    { key: "clinic", label: "Clinic", reports: 100 },
    { key: "unlimited", label: "Unlimited", reports: 9999 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">Назначить план</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-500">Пользователь: <span className="font-semibold text-slate-800">{user.fio || user.username}</span></p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {PLANS.map(p => (
            <button key={p.key}
              onClick={() => { setPlan(p.key); setReports(p.reports); }}
              className={`rounded-xl border-2 p-3 text-left transition-all ${
                plan === p.key ? "border-cyan-500 bg-cyan-50" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <p className="text-sm font-bold">{p.label}</p>
              <p className="text-xs text-slate-500">{p.reports === 9999 ? "∞" : p.reports} отчётов</p>
            </button>
          ))}
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-slate-600">Кол-во отчётов</label>
          <input type="number" min={1} max={9999}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            value={reports}
            onChange={e => setReports(Number(e.target.value))}
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Отмена
          </button>
          <button onClick={() => onSave(user.id, plan, reports)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
            <Package className="h-4 w-4" /> Назначить
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [system, setSystem] = useState<SystemHealth | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [tab, setTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Users tab
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "doctor" | "admin">("all");
  const [assignUser, setAssignUser] = useState<UserItem | null>(null);

  // Transactions tab
  const [txStatusFilter, setTxStatusFilter] = useState<"all" | "active" | "expired" | "cancelled">("all");

  // Reviews tab
  const [editReview, setEditReview] = useState<Review | null | "new">(null);
  const [reviewSaving, setReviewSaving] = useState(false);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("dental_token") : null;

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(
    async (silent = false) => {
      if (!token) { router.replace("/login"); return; }
      if (!silent) setLoading(true);
      else setRefreshing(true);

      try {
        const [o, u, s, r] = await Promise.all([
          fetch(`${API_BASE}/api/admin/overview`, { headers }).then(res => res.ok ? res.json() : null),
          fetch(`${API_BASE}/api/admin/users`, { headers }).then(res => res.ok ? res.json() : []),
          fetch(`${API_BASE}/api/admin/system`, { headers }).then(res => res.ok ? res.json() : null),
          fetch(`${API_BASE}/api/admin/reviews`, { headers }).then(res => res.ok ? res.json() : []),
        ]);

        setOverview(o);
        setUsers(Array.isArray(u) ? u : []);
        setSystem(s);
        setReviews(Array.isArray(r) ? r : []);
      } catch {
        /* silently fail */
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token]
  );

  useEffect(() => { fetchData(); }, [fetchData]);

  // Block / unblock user
  const toggleBlock = async (u: UserItem) => {
    const action = u.is_active !== false ? "block" : "unblock";
    await fetch(`${API_BASE}/api/admin/users/${u.id}/${action}`, {
      method: "POST", headers,
    });
    setUsers(prev =>
      prev.map(x => x.id === u.id ? { ...x, is_active: action === "unblock" } : x)
    );
  };

  // Assign plan
  const handleAssignPlan = async (userId: number, plan: string, reportsTotal: number) => {
    await fetch(`${API_BASE}/api/admin/users/${userId}/assign-plan`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ plan, reports_total: reportsTotal }),
    });
    setAssignUser(null);
    fetchData(true);
  };

  // Save review
  const handleSaveReview = async (r: Review) => {
    setReviewSaving(true);
    try {
      if (r.id) {
        await fetch(`${API_BASE}/api/admin/reviews/${r.id}`, {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(r),
        });
        setReviews(prev => prev.map(x => (x.id === r.id ? r : x)));
      } else {
        const res = await fetch(`${API_BASE}/api/admin/reviews`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(r),
        });
        if (res.ok) {
          const created = await res.json();
          setReviews(prev => [...prev, created]);
        }
      }
    } finally {
      setReviewSaving(false);
      setEditReview(null);
    }
  };

  // Delete review
  const handleDeleteReview = async (id: number) => {
    if (!confirm("Удалить отзыв?")) return;
    await fetch(`${API_BASE}/api/admin/reviews/${id}`, { method: "DELETE", headers });
    setReviews(prev => prev.filter(x => x.id !== id));
  };

  // ─── Derived data ───────────────────────────────────────────────────────────

  const filteredUsers = users.filter(u => {
    const matchSearch =
      !userSearch ||
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.fio || "").toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = userRoleFilter === "all" || u.role === userRoleFilter;
    return matchSearch && matchRole;
  });

  const allSubscriptions = users
    .filter(u => u.subscription)
    .map(u => ({ ...u.subscription!, userId: u.id, username: u.username, fio: u.fio }));

  const filteredTx =
    txStatusFilter === "all"
      ? allSubscriptions
      : allSubscriptions.filter(s => s.status === txStatusFilter);

  const o = overview;

  // ─── Render ─────────────────────────────────────────────────────────────────

  const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "overview", label: "Обзор", icon: LayoutDashboard },
    { key: "users", label: "Пользователи", icon: Users },
    { key: "transactions", label: "Транзакции", icon: CreditCard },
    { key: "plans", label: "Тарифы", icon: Package },
    { key: "reviews", label: "Отзывы", icon: MessageSquare },
    { key: "ambassadors", label: "Амбассадоры", icon: Star },
    { key: "celery", label: "Задачи", icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* ── Sidebar ── */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-slate-900 min-h-screen">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
          <Shield className="h-5 w-5 text-cyan-400 shrink-0" />
          <div>
            <p className="text-sm font-bold text-white">Admin Panel</p>
            <p className="text-[10px] text-white/40">Odonta Index AI</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 p-3 flex-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-left ${
                tab === t.key
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-white/50 hover:bg-white/5 hover:text-white"
              }`}
            >
              <t.icon className="h-4 w-4 shrink-0" />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-1">
          <a href="/dashboard" target="_blank"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-white/40 hover:text-white hover:bg-white/5 transition-all">
            <ExternalLink className="h-3.5 w-3.5" /> Основной сайт
          </a>
          <button
            onClick={() => { localStorage.removeItem("dental_token"); router.push("/login"); }}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-white/40 hover:text-red-400 hover:bg-red-400/5 transition-all">
            <LogOut className="h-3.5 w-3.5" /> Выйти
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 min-w-0">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-40 bg-slate-900 text-white">
          <div className="flex h-12 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-bold">Admin Panel</span>
            </div>
            <button onClick={() => { localStorage.removeItem("dental_token"); router.push("/login"); }}
              className="text-white/50 hover:text-red-400 transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          {/* Mobile tabs */}
          <div className="flex border-t border-white/10 overflow-x-auto scrollbar-hide">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap shrink-0 border-b-2 transition-all ${
                  tab === t.key ? "border-cyan-400 text-cyan-400 bg-white/5" : "border-transparent text-white/40"
                }`}
              >
                <t.icon className="h-3.5 w-3.5" />{t.label}
              </button>
            ))}
          </div>
        </header>

        {/* Content area */}
        <div className="p-5 sm:p-7 max-w-[1200px]">
          {/* Page title + refresh */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                {TABS.find(t => t.key === tab)?.label}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Панель управления Odonta Index AI</p>
            </div>
            <button onClick={() => fetchData(true)}
              className={`flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-all shadow-sm ${refreshing ? "pointer-events-none" : ""}`}>
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Обновить
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-8 w-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {/* ─────────────── OVERVIEW ─────────────── */}
              {tab === "overview" && (
                <motion.div key="overview"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* KPI cards */}
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                      label="Всего пользователей"
                      value={fmtNum(o?.users.total ?? 0)}
                      sub={`${o?.users.doctors ?? 0} врачей · ${o?.users.admins ?? 0} адм.`}
                      icon={Users}
                      gradient="linear-gradient(135deg, #0891b2 0%, #0e7490 100%)"
                      delay={0}
                    />
                    <StatCard
                      label="Анализов всего"
                      value={fmtNum(o?.analyses.total ?? 0)}
                      sub={`${o?.analyses.this_month ?? 0} за месяц · ${o?.analyses.this_week ?? 0} за неделю`}
                      icon={FileText}
                      gradient="linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)"
                      delay={0.06}
                    />
                    <StatCard
                      label="Выручка"
                      value={`${fmtNum(o?.subscriptions.total_revenue ?? 0)} ₽`}
                      sub={`${o?.subscriptions.active ?? 0} активных подписок`}
                      icon={DollarSign}
                      gradient="linear-gradient(135deg, #059669 0%, #047857 100%)"
                      delay={0.12}
                    />
                    <StatCard
                      label="Прибыль"
                      value={`${fmtNum(o?.profit ?? 0)} ₽`}
                      sub={`Расходы: ${fmtNum(o?.costs.total_monthly_cost ?? 0)} ₽/мес`}
                      icon={TrendingUp}
                      gradient={
                        (o?.profit ?? 0) >= 0
                          ? "linear-gradient(135deg, #16a34a 0%, #15803d 100%)"
                          : "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"
                      }
                      delay={0.18}
                    />
                  </div>

                  {/* Secondary cards row */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">YandexGPT</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Запросы</span>
                          <span className="font-bold text-slate-800">{fmtNum(o?.costs.ai_requests ?? 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Стоимость</span>
                          <span className="font-bold text-violet-600">{fmtNum(o?.costs.ai_cost_rub ?? 0)} ₽</span>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Сервер</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Стоимость/мес</span>
                          <span className="font-bold text-slate-800">{fmtNum(o?.costs.server_cost_rub ?? 0)} ₽</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Итого расходы</span>
                          <span className="font-bold text-red-600">{fmtNum(o?.costs.total_monthly_cost ?? 0)} ₽</span>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Подписки</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Активных</span>
                          <span className="font-bold text-emerald-600">{o?.subscriptions.active ?? 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Отчётов использовано</span>
                          <span className="font-bold text-slate-800">{fmtNum(o?.subscriptions.total_reports_used ?? 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent registrations */}
                  <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-700">Последние регистрации</h3>
                      <span className="text-xs text-slate-400">{users.length} всего</span>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {[...users]
                        .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
                        .slice(0, 8)
                        .map(u => (
                          <div key={u.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold shrink-0 ${
                                u.role === "admin" ? "bg-red-100 text-red-600" : "bg-cyan-100 text-cyan-700"
                              }`}>
                                {(u.fio || u.username).slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">{u.fio || u.username}</p>
                                <p className="text-[11px] text-slate-400">@{u.username}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-right">
                              {u.subscription ? (
                                <Badge
                                  text={u.subscription.plan}
                                  className={PLAN_COLORS[u.subscription.plan] ?? "bg-slate-100 text-slate-600"}
                                />
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                              <span className="text-[11px] text-slate-400 hidden sm:block">
                                <Calendar className="h-3 w-3 inline mr-1" />
                                {fmt(u.created_at)}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ─────────────── USERS ─────────────── */}
              {tab === "users" && (
                <motion.div key="users"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* Filters */}
                  <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-48">
                      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-sm"
                        placeholder="Поиск по имени или логину..."
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                      />
                    </div>
                    <div className="flex rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                      {(["all", "doctor", "admin"] as const).map(r => (
                        <button key={r}
                          onClick={() => setUserRoleFilter(r)}
                          className={`px-4 py-2 text-xs font-medium transition-all ${
                            userRoleFilter === r
                              ? "bg-cyan-500 text-white"
                              : "text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          {r === "all" ? "Все" : r === "doctor" ? "Врачи" : "Админы"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {filteredUsers.length} пользователей
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Пользователь</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Роль</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Подписка</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Отчёты</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Посл. вход</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Рег-ция</th>
                            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Действия</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredUsers.map(u => (
                            <tr key={u.id} className={`group hover:bg-slate-50 transition-colors ${u.is_active === false ? "opacity-50" : ""}`}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${
                                    u.role === "admin" ? "bg-red-100 text-red-600" : "bg-cyan-100 text-cyan-700"
                                  }`}>
                                    {(u.fio || u.username).slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-800 leading-tight">{u.fio || "—"}</p>
                                    <p className="text-[11px] text-slate-400">@{u.username}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge
                                  text={u.role}
                                  className={u.role === "admin" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"}
                                />
                              </td>
                              <td className="px-4 py-3">
                                {u.subscription ? (
                                  <Badge
                                    text={u.subscription.plan}
                                    className={PLAN_COLORS[u.subscription.plan] ?? "bg-slate-100 text-slate-600"}
                                  />
                                ) : (
                                  <span className="text-xs text-slate-300">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-600">
                                {u.subscription
                                  ? `${u.subscription.reports_remaining ?? "?"} / ${u.subscription.reports_total}`
                                  : <span className="text-slate-300">—</span>}
                              </td>
                              <td className="px-4 py-3 text-[11px] text-slate-400">{fmt(u.last_login)}</td>
                              <td className="px-4 py-3 text-[11px] text-slate-400">{fmt(u.created_at)}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setAssignUser(u)}
                                    title="Назначить план"
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-cyan-50 hover:text-cyan-600 transition-all"
                                  >
                                    <Package className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => toggleBlock(u)}
                                    title={u.is_active !== false ? "Заблокировать" : "Разблокировать"}
                                    className={`rounded-lg p-1.5 transition-all ${
                                      u.is_active !== false
                                        ? "text-slate-400 hover:bg-red-50 hover:text-red-500"
                                        : "text-emerald-500 hover:bg-emerald-50"
                                    }`}
                                  >
                                    {u.is_active !== false ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {filteredUsers.length === 0 && (
                        <div className="flex flex-col items-center gap-2 py-14 text-slate-400">
                          <Users className="h-8 w-8 opacity-30" />
                          <p className="text-sm">Нет пользователей</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ─────────────── TRANSACTIONS ─────────────── */}
              {tab === "transactions" && (
                <motion.div key="transactions"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* Status filter */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                      <Filter className="h-3.5 w-3.5 text-slate-400 ml-3" />
                      {(["all", "active", "expired", "cancelled"] as const).map(s => (
                        <button key={s}
                          onClick={() => setTxStatusFilter(s)}
                          className={`px-4 py-2 text-xs font-medium transition-all ${
                            txStatusFilter === s ? "bg-cyan-500 text-white" : "text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          {s === "all" ? "Все" : s === "active" ? "Активные" : s === "expired" ? "Истекшие" : "Отменённые"}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-slate-400">{filteredTx.length} записей</span>
                  </div>

                  {/* Summary mini-cards */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Активных", count: allSubscriptions.filter(s => s.status === "active").length, color: "text-emerald-600 bg-emerald-50" },
                      { label: "Истекших", count: allSubscriptions.filter(s => s.status === "expired").length, color: "text-red-600 bg-red-50" },
                      { label: "Отменённых", count: allSubscriptions.filter(s => s.status === "cancelled").length, color: "text-slate-500 bg-slate-100" },
                    ].map(c => (
                      <div key={c.label} className="rounded-xl bg-white border border-slate-100 p-4 shadow-sm text-center">
                        <p className={`text-2xl font-bold ${c.color.split(" ")[0]}`}>{c.count}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{c.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Table */}
                  <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Пользователь</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Тариф</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Статус</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Использовано</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Дата</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredTx.map((s, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-medium text-slate-800">{s.fio || s.username}</p>
                                <p className="text-[11px] text-slate-400">@{s.username}</p>
                              </td>
                              <td className="px-4 py-3">
                                <Badge
                                  text={s.plan}
                                  className={PLAN_COLORS[s.plan] ?? "bg-slate-100 text-slate-600"}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Badge
                                  text={s.status}
                                  className={STATUS_COLORS[s.status] ?? "bg-slate-100 text-slate-500"}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-cyan-500"
                                      style={{
                                        width: s.reports_total > 0
                                          ? `${Math.min(100, ((s.reports_total - (s.reports_remaining ?? 0)) / s.reports_total) * 100)}%`
                                          : "0%"
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs text-slate-500">
                                    {s.reports_total - (s.reports_remaining ?? 0)}/{s.reports_total}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-[11px] text-slate-400">{fmt(s.created_at ?? null)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {filteredTx.length === 0 && (
                        <div className="flex flex-col items-center gap-2 py-14 text-slate-400">
                          <CreditCard className="h-8 w-8 opacity-30" />
                          <p className="text-sm">Нет транзакций</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ─────────────── REVIEWS ─────────────── */}
              {tab === "reviews" && (
                <motion.div key="reviews"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{reviews.length} отзывов на лендинге</p>
                    <button
                      onClick={() => setEditReview("new")}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity shadow-sm"
                    >
                      <Plus className="h-4 w-4" /> Добавить отзыв
                    </button>
                  </div>

                  {reviews.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-slate-100 py-16 text-slate-400 shadow-sm">
                      <MessageSquare className="h-10 w-10 opacity-25" />
                      <p className="text-sm">Нет отзывов</p>
                      <button onClick={() => setEditReview("new")}
                        className="text-xs text-cyan-600 hover:underline">
                        Добавить первый отзыв
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {reviews.map((r, i) => (
                        <motion.div key={r.id ?? i}
                          initial={{ opacity: 0, scale: 0.97 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className="group rounded-2xl bg-white border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(n => (
                                <Star key={n} className={`h-3.5 w-3.5 ${
                                  n <= r.stars ? "fill-amber-400 text-amber-400" : "text-slate-200"
                                }`} />
                              ))}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditReview(r)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all">
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => r.id && handleDeleteReview(r.id)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-sm text-slate-600 leading-relaxed mb-4 line-clamp-4">"{r.quote}"</p>

                          <div className="flex items-center gap-2.5 pt-3 border-t border-slate-50">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-[10px] font-bold text-white shrink-0">
                              {r.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-700 leading-tight">{r.name}</p>
                              <p className="text-[11px] text-slate-400">{r.role}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
          {/* ─── Ambassadors Tab ─── */}
          {tab === "ambassadors" && (
            <AmbassadorsManager token={token} />
          )}

          {/* ─── Plans Tab ─── */}
          {tab === "plans" && (
            <PlansManager token={token} />
          )}

          {/* ─── Celery Tab ─── */}
          {tab === "celery" && (
            <CeleryMonitor token={token} />
          )}
        </div>
      </div>

      {/* ─── Modals ─── */}
      <AnimatePresence>
        {editReview !== null && (
          <ReviewModal
            key="review-modal"
            review={editReview === "new" ? null : editReview}
            onClose={() => setEditReview(null)}
            onSave={handleSaveReview}
          />
        )}
        {assignUser && (
          <AssignPlanModal
            key="assign-modal"
            user={assignUser}
            onClose={() => setAssignUser(null)}
            onSave={handleAssignPlan}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Ambassadors Manager ────────────────────────────────────────────────────

function AmbassadorsManager({ token }: { token: string | null }) {
  const [items, setItems] = useState<{ id: number; name: string; role: string; quote: string }[]>([]);
  const [editing, setEditing] = useState<{ id: number; name: string; role: string; quote: string } | "new" | null>(null);
  const [form, setForm] = useState({ name: "", role: "", quote: "" });

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/ambassadors`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setItems).catch(() => {});
  }, [token]);

  const openNew = () => { setForm({ name: "", role: "", quote: "" }); setEditing("new"); };
  const openEdit = (a: typeof items[0]) => { setForm({ name: a.name, role: a.role, quote: a.quote }); setEditing(a); };

  const handleSave = async () => {
    const isNew = editing === "new";
    const url = isNew ? `${API_BASE}/api/admin/ambassadors` : `${API_BASE}/api/admin/ambassadors/${(editing as { id: number }).id}`;
    const resp = await fetch(url, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (isNew) setItems([data, ...items]);
      else setItems(items.map(i => i.id === data.id ? data : i));
      setEditing(null);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`${API_BASE}/api/admin/ambassadors/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setItems(items.filter(i => i.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Амбассадоры</h2>
        <button onClick={openNew} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" /> Добавить
        </button>
      </div>

      {editing !== null && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 space-y-3">
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="ФИО"
            className="w-full rounded-lg border px-3 py-2 text-sm" />
          <input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="Должность"
            className="w-full rounded-lg border px-3 py-2 text-sm" />
          <textarea value={form.quote} onChange={e => setForm({ ...form, quote: e.target.value })} placeholder="Цитата" rows={3}
            className="w-full rounded-lg border px-3 py-2 text-sm resize-none" />
          <div className="flex gap-2">
            <button onClick={handleSave} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Сохранить</button>
            <button onClick={() => setEditing(null)} className="rounded-lg border px-4 py-2 text-sm text-gray-500">Отмена</button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map(a => (
          <div key={a.id} className="rounded-xl border bg-white p-5 group">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {a.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <p className="font-bold text-sm">{a.name}</p>
                <p className="text-xs text-gray-400">{a.role}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 italic mb-3">&laquo;{a.quote}&raquo;</p>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openEdit(a)} className="text-xs text-primary hover:underline">Изменить</button>
              <button onClick={() => handleDelete(a.id)} className="text-xs text-red-500 hover:underline">Удалить</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Plans Manager ──────────────────────────────────────────────────────────

function PlansManager({ token }: { token: string | null }) {
  const [plans, setPlans] = useState<Record<string, { name: string; price: number; reports_limit: number; features: string[]; permissions: string[] }>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState(0);
  const [editReports, setEditReports] = useState(0);
  const [editFeatures, setEditFeatures] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/plans`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setPlans(d.plans || {})).catch(() => {});
  }, [token]);

  const startEdit = (key: string) => {
    const p = plans[key];
    setEditing(key);
    setEditPrice(p.price);
    setEditReports(p.reports_limit);
    setEditFeatures(p.features.join("\n"));
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const resp = await fetch(`${API_BASE}/api/admin/plans/${editing}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ price: editPrice, reports_limit: editReports, features: editFeatures.split("\n").filter(Boolean) }),
    });
    if (resp.ok) {
      setPlans({ ...plans, [editing]: { ...plans[editing], price: editPrice, reports_limit: editReports, features: editFeatures.split("\n").filter(Boolean) } });
      setEditing(null);
      setMsg("Тариф обновлён!");
      setTimeout(() => setMsg(""), 3000);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Управление тарифами</h2>
        {msg && <span className="text-sm text-green-600 font-medium">{msg}</span>}
      </div>
      <p className="text-xs text-gray-400">Изменения применяются мгновенно для всех новых подписок. Существующие подписки не затрагиваются.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Object.entries(plans).map(([key, plan]) => (
          <motion.div key={key} layout
            className={`rounded-2xl border p-5 transition-all ${editing === key ? "border-primary bg-primary/5 shadow-lg" : "border-gray-200 bg-white hover:shadow-md"}`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">{plan.name}</h3>
              {editing !== key && (
                <button onClick={() => startEdit(key)} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Edit3 className="h-3 w-3" /> Изменить
                </button>
              )}
            </div>
            {editing === key ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">Цена (₽/мес)</label>
                  <input type="number" value={editPrice} onChange={e => setEditPrice(Number(e.target.value))}
                    className="w-full rounded-lg border px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Лимит отчётов</label>
                  <input type="number" value={editReports} onChange={e => setEditReports(Number(e.target.value))}
                    className="w-full rounded-lg border px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Функции (по одной на строку)</label>
                  <textarea value={editFeatures} onChange={e => setEditFeatures(e.target.value)} rows={4}
                    className="w-full rounded-lg border px-3 py-2 text-sm mt-1 resize-none" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-white">
                    {saving ? "..." : "Сохранить"}
                  </button>
                  <button onClick={() => setEditing(null)} className="rounded-lg border px-4 py-2 text-sm text-gray-500">Отмена</button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2">{plan.price === 0 ? "Бесплатно" : `${plan.price.toLocaleString()} ₽`}</div>
                <div className="text-xs text-gray-400 mb-3">{plan.reports_limit} отчётов</div>
                <ul className="space-y-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                      <CheckCircle className="h-3 w-3 text-green-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Celery Monitor ─────────────────────────────────────────────────────────

function CeleryMonitor({ token }: { token: string | null }) {
  const [data, setData] = useState<{ status: string; workers: string[]; active: { id: string; name: string; worker: string }[]; scheduled: { name: string; eta: string; worker: string }[]; queue_length: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/admin/celery`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Celery задачи</h2>
        <button onClick={refresh} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Обновить
        </button>
      </div>
      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`rounded-xl p-4 border ${data.status === "connected" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              <p className="text-xs text-gray-500">Статус</p>
              <p className={`text-sm font-bold ${data.status === "connected" ? "text-green-700" : "text-red-700"}`}>{data.status}</p>
            </div>
            <div className="rounded-xl p-4 border bg-white border-gray-200">
              <p className="text-xs text-gray-500">Воркеры</p>
              <p className="text-sm font-bold">{data.workers.length}</p>
            </div>
            <div className="rounded-xl p-4 border bg-white border-gray-200">
              <p className="text-xs text-gray-500">Активные задачи</p>
              <p className="text-sm font-bold">{data.active.length}</p>
            </div>
            <div className="rounded-xl p-4 border bg-white border-gray-200">
              <p className="text-xs text-gray-500">Очередь</p>
              <p className="text-sm font-bold">{data.queue_length}</p>
            </div>
          </div>

          {data.workers.length > 0 && (
            <div className="rounded-xl border bg-white p-4">
              <h3 className="text-sm font-semibold mb-2">Воркеры</h3>
              {data.workers.map(w => (
                <div key={w} className="flex items-center gap-2 text-xs py-1">
                  <span className="h-2 w-2 rounded-full bg-green-500" /> {w}
                </div>
              ))}
            </div>
          )}

          {data.active.length > 0 && (
            <div className="rounded-xl border bg-white p-4">
              <h3 className="text-sm font-semibold mb-2">Активные задачи</h3>
              {data.active.map(t => (
                <div key={t.id} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                  <span className="font-mono">{t.name}</span>
                  <span className="text-gray-400">{t.worker}</span>
                </div>
              ))}
            </div>
          )}

          {data.scheduled.length > 0 && (
            <div className="rounded-xl border bg-white p-4">
              <h3 className="text-sm font-semibold mb-2">Запланированные</h3>
              {data.scheduled.map((t, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                  <span className="font-mono">{t.name}</span>
                  <span className="text-gray-400">{t.eta}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
