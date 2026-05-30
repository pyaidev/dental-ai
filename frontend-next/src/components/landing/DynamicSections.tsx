"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { API_BASE } from "@/lib/utils";
import { FadeUp, ScaleIn, PulsingBadge } from "./AnimatedSection";

interface Plan {
  name: string;
  price: number;
  reports_limit: number;
  features: string[];
}

interface ReviewItem {
  id: number;
  name: string;
  role: string;
  quote: string;
  stars: number;
}

export function DynamicPricing() {
  const [plans, setPlans] = useState<Record<string, Plan>>({});

  useEffect(() => {
    fetch(`${API_BASE}/api/plans`)
      .then(r => r.json())
      .then(d => setPlans(d.plans || {}))
      .catch(() => {});
  }, []);

  const planOrder = ["free", "start", "pro", "clinic", "expert"];
  const planSubs: Record<string, string> = {
    free: "Для знакомства", start: "Для частного врача", pro: "Для врачей и гигиенистов",
    clinic: "Для клиник", expert: "Для медицинских центров",
  };

  if (Object.keys(plans).length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
      {planOrder.filter(k => plans[k]).map((key, i) => {
        const plan = plans[key];
        const popular = key === "pro";
        return (
          <ScaleIn key={key} delay={i * 0.08}>
            <div className={`relative rounded-2xl p-6 transition-all h-full flex flex-col ${
              popular ? "bg-[#0891b2] text-white shadow-xl shadow-[#0891b2]/20 scale-[1.03]" : "bg-white border border-gray-100 hover:shadow-lg"
            }`}>
              {popular && (
                <PulsingBadge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="rounded-full bg-amber-400 px-3 py-0.5 text-[10px] font-bold text-amber-900 whitespace-nowrap shadow-lg shadow-amber-400/30">
                    Хит продаж
                  </div>
                </PulsingBadge>
              )}
              <h3 className={`text-base font-bold ${popular ? "text-white" : "text-gray-900"}`}>{plan.name}</h3>
              <p className={`mt-1 text-xs ${popular ? "text-white/70" : "text-gray-400"}`}>{planSubs[key] || ""}</p>
              <div className="mt-4 mb-5">
                <span className={`text-2xl font-black ${popular ? "text-white" : "text-gray-900"}`}>
                  {plan.price === 0 ? "Бесплатно" : `${plan.price.toLocaleString()} ₽/мес`}
                </span>
              </div>
              <ul className="space-y-2 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-[13px]">
                    <span className={`text-xs mt-0.5 ${popular ? "text-cyan-200" : "text-[#0891b2]"}`}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/register"
                className={`mt-6 block w-full rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
                  popular ? "bg-white text-[#0891b2] hover:bg-gray-100"
                    : plan.price === 0 ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : "bg-[#0891b2]/10 text-[#0891b2] hover:bg-[#0891b2]/20"
                }`}>
                {plan.price === 0 ? "Начать бесплатно" : "Выбрать"}
              </Link>
            </div>
          </ScaleIn>
        );
      })}
    </div>
  );
}

export function DynamicReviews() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/reviews`)
      .then(r => r.ok ? r.json() : [])
      .then(setReviews)
      .catch(() => {});
  }, []);

  // Fallback hardcoded reviews if API returns empty
  const displayReviews = reviews.length > 0 ? reviews : [
    { id: 1, name: "Мария К.", role: "Стоматолог-терапевт, Москва", quote: "Раньше тратила 15 минут на объяснения пациенту, теперь показываю отчёт Odonta — всё наглядно и понятно.", stars: 5 },
    { id: 2, name: "Алексей Д.", role: "Гигиенист, клиника «Дентал Плюс»", quote: "Индексы считаются автоматически — не нужно вручную заполнять таблицы. Экономлю по 10 минут на каждом приёме.", stars: 5 },
    { id: 3, name: "Елена В.", role: "Детский стоматолог, Санкт-Петербург", quote: "Дети в восторге от визуализации! Показываю им где налёт — и они сразу понимают, зачем чистить зубы.", stars: 5 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
      {displayReviews.map((review, i) => (
        <FadeUp key={review.id} delay={i * 0.1}>
          <div className="rounded-2xl bg-white p-7 border border-gray-100 shadow-sm hover:shadow-md transition-shadow h-full">
            <div className="flex gap-0.5 mb-4">
              {Array.from({ length: review.stars }).map((_, j) => (
                <span key={j} className="text-amber-400 text-lg">&#9733;</span>
              ))}
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-5 italic">&laquo;{review.quote}&raquo;</p>
            <div className="flex items-center gap-3 mt-auto">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0891b2]/10 text-sm font-bold text-[#0891b2]">
                {review.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{review.name}</p>
                <p className="text-xs text-gray-400">{review.role}</p>
              </div>
            </div>
          </div>
        </FadeUp>
      ))}
    </div>
  );
}
