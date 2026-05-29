"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, CreditCard, X, Zap } from "lucide-react";
import Link from "next/link";
import { API_BASE } from "@/lib/utils";

interface SubState {
  loaded: boolean;
  active: boolean;
  plan: string;
  reports_remaining: number;
  permissions: string[];
}

const SubContext = createContext<SubState>({
  loaded: false, active: false, plan: "", reports_remaining: 0, permissions: [],
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [sub, setSub] = useState<SubState>({
    loaded: false, active: false, plan: "", reports_remaining: 0, permissions: [],
  });

  useEffect(() => {
    const token = localStorage.getItem("dental_token");
    if (!token) { setSub(s => ({ ...s, loaded: true })); return; }
    fetch(`${API_BASE}/api/subscription`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setSub({
        loaded: true,
        active: d.active || false,
        plan: d.plan || "",
        reports_remaining: d.reports_remaining || 0,
        permissions: d.permissions || [],
      }))
      .catch(() => setSub(s => ({ ...s, loaded: true })));
  }, []);

  return <SubContext.Provider value={sub}>{children}</SubContext.Provider>;
}

export function useSubscription() {
  return useContext(SubContext);
}

export function hasPermission(sub: SubState, feature: string): boolean {
  if (sub.plan === "admin") return true;
  return sub.permissions.includes(feature);
}

// Paywall modal
export function PaywallModal({ show, onClose, feature }: { show: boolean; onClose: () => void; feature: string }) {
  const featureNames: Record<string, string> = {
    analysis: "AI-анализ",
    interdental: "Ёршикограмма",
    periodontal: "Пародонтограмма",
    ai_chat: "AI-чат для пациента",
    history: "История пациента",
    dynamics: "Динамика показателей",
    caries_risk: "Оценка риска кариеса",
    reminders: "Чат-бот напоминаний",
    branding: "Брендирование отчётов",
    bulk_send: "Групповые рассылки",
    analytics: "Аналитика по врачам",
    whitening: "Отбеливание",
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                  <Lock className="h-5 w-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold">Функция недоступна</h3>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              <strong>{featureNames[feature] || feature}</strong> не входит в ваш текущий тариф.
              Перейдите на подходящий план, чтобы разблокировать эту функцию.
            </p>
            <div className="rounded-xl bg-gradient-to-r from-cyan-50 to-teal-50 border border-cyan-200 p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-cyan-600" />
                <span className="text-sm font-semibold text-cyan-800">Odonta Index Start — от 1 990 ₽/мес</span>
              </div>
              <p className="text-xs text-cyan-700">Все индексы, ёршикограмма, пародонтограмма, AI-чат и многое другое</p>
            </div>
            <Link href="/subscription"
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-cyan-600 py-3 text-sm font-semibold text-white hover:bg-cyan-700 transition-colors"
            >
              <CreditCard className="h-4 w-4" /> Выбрать тариф
            </Link>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Reports limit modal
export function ReportsLimitModal({ show, onClose }: { show: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <Lock className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-bold">Лимит отчётов исчерпан</h3>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              У вас закончились отчёты на текущем тарифе. Перейдите на более высокий план или продлите подписку.
            </p>
            <Link href="/subscription"
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-cyan-600 py-3 text-sm font-semibold text-white hover:bg-cyan-700 transition-colors"
            >
              <CreditCard className="h-4 w-4" /> Пополнить подписку
            </Link>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
