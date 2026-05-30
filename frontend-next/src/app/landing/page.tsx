"use client";

import Link from "next/link";
import {
  DynamicPricing,
  DynamicReviews,
  DynamicAmbassadors,
  DynamicHero,
  DynamicFeatures,
  DynamicSteps,
  DynamicCTA,
  DynamicFooter,
} from "@/components/landing/DynamicSections";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Odonta Index AI",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web",
  url: "https://odontaindex.ru",
  description: "AI-сервис анализа зубного налёта и расчёта индексов гигиены полости рта для стоматологов и гигиенистов",
  offers: [
    { "@type": "Offer", name: "Free", price: "0", priceCurrency: "RUB", description: "5 бесплатных отчётов" },
    { "@type": "Offer", name: "Start", price: "1990", priceCurrency: "RUB", description: "30 отчётов/мес" },
    { "@type": "Offer", name: "Pro", price: "2990", priceCurrency: "RUB", description: "100 отчётов/мес" },
    { "@type": "Offer", name: "Clinic", price: "5990", priceCurrency: "RUB", description: "200 отчётов/мес" },
    { "@type": "Offer", name: "Expert", price: "9990", priceCurrency: "RUB", description: "500 отчётов/мес" },
  ],
  provider: {
    "@type": "Organization",
    name: "ИП Коростелев Александр Андреевич",
    taxID: "312334497069",
    url: "https://odontaindex.ru",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "47",
    bestRating: "5",
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100/50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Odonta Index AI" className="h-14" />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-500">
            <a href="#features" className="hover:text-gray-900 transition-colors">Возможности</a>
            <a href="#how" className="hover:text-gray-900 transition-colors">Как работает</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Тарифы</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Войти</Link>
            <Link href="/register" className="rounded-xl bg-[#0891b2] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0891b2]/20 hover:bg-[#0e7490] transition-colors">
              Попробовать
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO — dynamic */}
      <DynamicHero />

      {/* FEATURES — dynamic */}
      <DynamicFeatures />

      {/* HOW IT WORKS — dynamic */}
      <DynamicSteps />

      {/* PRICING */}
      <section id="pricing" className="py-24 bg-[#f8fafb]">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0891b2] mb-3">Тарифы</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
              Выберите свой план
            </h2>
            <p className="mt-3 text-gray-500">От бесплатного знакомства до полной аналитики клиники</p>
          </div>
          <DynamicPricing />
        </div>
      </section>

      {/* REVIEWS */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0891b2] mb-3">Отзывы</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
              Что говорят врачи
            </h2>
            <p className="mt-3 text-gray-500">Более 100 стоматологов уже используют Odonta Index AI</p>
          </div>
          <DynamicReviews />
        </div>
      </section>

      {/* AMBASSADORS */}
      <section className="py-24 bg-[#f8fafb]">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0891b2] mb-3">Амбассадоры</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
              Наши амбассадоры
            </h2>
            <p className="mt-3 text-gray-500">Эксперты, которые доверяют Odonta Index AI</p>
          </div>
          <DynamicAmbassadors />
        </div>
      </section>

      {/* CTA — dynamic */}
      <DynamicCTA />

      {/* FOOTER — dynamic */}
      <DynamicFooter />
    </div>
  );
}
