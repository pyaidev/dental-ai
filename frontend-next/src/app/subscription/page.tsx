"use client";

import { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { CreditCard, Check, Zap, Shield, Star, Package } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { API_BASE } from "@/lib/utils";

interface Plan {
  name: string;
  price: number;
  features: string[];
}

interface SubInfo {
  active: boolean;
  plan?: string;
  plan_name?: string;
  reports_total?: number;
  reports_used?: number;
  reports_remaining?: number;
}

const planIcons: Record<string, React.ElementType> = {
  hygiene: Zap,
  hygiene_brushes: Shield,
  hygiene_perio: Star,
  all: Package,
};

function SubscriptionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [packages] = useState([10, 50, 100]);
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("hygiene");
  const [selectedQty, setSelectedQty] = useState(50);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("dental_token") : null;

  useEffect(() => {
    if (!token) { router.replace("/login"); return; }

    // Handle payment return
    const status = searchParams.get("status");
    if (status === "success") {
      setMessage("✅ Оплата прошла успешно! Подписка активирована.");
    } else if (status === "fail") {
      setMessage("❌ Оплата не прошла. Попробуйте ещё раз.");
    }

    fetch(`${API_BASE}/api/plans`).then(r => r.json()).then(d => setPlans(d.plans));
    fetch(`${API_BASE}/api/subscription`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setSub);
  }, [token, router]);

  const handlePurchase = async () => {
    setLoading(true);
    setMessage("");
    try {
      const resp = await fetch(`${API_BASE}/api/subscription/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: selectedPlan, quantity: selectedQty }),
      });
      const data = await resp.json();
      if (data.payment_url) {
        window.location.href = data.payment_url;
      } else {
        setMessage(data.message);
        // Refresh subscription info
        fetch(`${API_BASE}/api/subscription`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json()).then(setSub);
      }
    } catch { setMessage("Ошибка"); }
    setLoading(false);
  };

  const plan = plans[selectedPlan];
  const total = plan ? plan.price * selectedQty : 0;

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" /> Подписка
          </h1>
          <p className="text-sm text-muted">Выберите план и количество отчётов</p>
        </motion.div>

        {/* Current subscription */}
        {sub?.active && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl bg-gradient-to-r from-primary to-cyan-600 p-5 text-white"
          >
            <p className="text-sm text-white/70">Текущий план</p>
            <p className="text-xl font-bold">{sub.plan_name}</p>
            <div className="mt-2 flex gap-6 text-sm">
              <span>Всего: {sub.reports_total}</span>
              <span>Использовано: {sub.reports_used}</span>
              <span className="font-bold">Осталось: {sub.reports_remaining}</span>
            </div>
          </motion.div>
        )}

        {/* Plans */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {Object.entries(plans).map(([key, p], i) => {
            const Icon = planIcons[key] || Zap;
            const isSelected = selectedPlan === key;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => setSelectedPlan(key)}
                className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${
                  isSelected ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-card-border bg-card hover:border-primary/30"
                }`}
              >
                <Icon className={`h-8 w-8 mb-3 ${isSelected ? "text-primary" : "text-muted"}`} />
                <h3 className="font-semibold text-sm">{p.name}</h3>
                <p className="text-2xl font-bold mt-1">{p.price} ₽<span className="text-xs text-muted font-normal"> /отчёт</span></p>
                <ul className="mt-3 space-y-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-muted">
                      <Check className="h-3 w-3 text-success shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        {/* Quantity */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-2xl border border-card-border bg-card p-5 mb-6"
        >
          <p className="font-semibold mb-3">Количество отчётов</p>
          <div className="flex gap-3">
            {packages.map((qty) => (
              <button key={qty} onClick={() => setSelectedQty(qty)}
                className={`flex-1 rounded-xl py-3 text-center font-bold transition-all ${
                  selectedQty === qty ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-slate-100 text-muted hover:bg-slate-200"
                }`}
              >
                {qty}
              </button>
            ))}
            <input
              type="number" min={10} max={1000} value={selectedQty}
              onChange={(e) => setSelectedQty(Math.max(10, parseInt(e.target.value) || 10))}
              className="w-24 rounded-xl border border-card-border px-3 py-2 text-center text-sm font-bold outline-none focus:border-primary"
            />
          </div>
        </motion.div>

        {/* Summary + Buy */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-2xl border border-card-border bg-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted">Итого</p>
              <p className="text-3xl font-bold">{total.toLocaleString()} ₽</p>
              <p className="text-xs text-muted">{selectedQty} отчётов × {plan?.price || 0} ₽</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handlePurchase} disabled={loading}
              className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {loading ? "Обработка..." : "Оплатить"}
            </motion.button>
          </div>
          {message && <p className="text-sm text-success font-medium">{message}</p>}
        </motion.div>
      </main>
      <Footer />
    </>
  );
}


export default function SubscriptionPage() {
  return <Suspense><SubscriptionContent /></Suspense>;
}
