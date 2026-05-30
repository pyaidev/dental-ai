import Link from "next/link";
import { ScanLine, BarChart3, FileText, Bell, Brush, ClipboardList } from "lucide-react";
import { FadeUp, ScaleIn, PulsingArrow, StepNumber, AnimatedCounter, FloatingParticles, GradientText, FeatureCard, PulsingBadge } from "@/components/landing/AnimatedSection";

const featureIcons = [ScanLine, BarChart3, FileText, Bell, Brush, ClipboardList];
const featureColors = ["#0891b2", "#8b5cf6", "#f97316", "#10b981", "#ec4899", "#3b82f6"];
const features = [
  { title: "AI-анализ налёта", desc: "Нейросеть YOLOv8 определяет зоны налёта по фото с индикатором" },
  { title: "5 индексов гигиены", desc: "Фёдорова-Володкиной, API Lange, OHI-S, Silness-Löe, PHP" },
  { title: "PDF-отчёты", desc: "Профессиональные отчёты с QR-кодом для пациента" },
  { title: "Telegram + Max", desc: "Автоматические напоминания пациентам о визитах" },
  { title: "Ёршикограмма", desc: "Интерактивная карта межзубных промежутков" },
  { title: "Пародонтограмма", desc: "Глубина карманов, кровоточивость, подвижность" },
];

const steps = [
  { num: "01", title: "Загрузите фото", desc: "3 фотографии зубов с индикатором налёта" },
  { num: "02", title: "AI анализирует", desc: "Нейросеть определяет налёт и рассчитывает индексы" },
  { num: "03", title: "Получите отчёт", desc: "PDF с рекомендациями по средствам гигиены" },
  { num: "04", title: "Отправьте пациенту", desc: "Через Telegram, Max или email — в один клик" },
];

const plans = [
  { name: "Free", price: 0, priceLabel: "Бесплатно", sub: "Для знакомства с сервисом", features: ["5 бесплатных отчётов", "AI-анализ налёта", "Odonta Hygiene Score", "Базовые рекомендации"], popular: false },
  { name: "Start", price: 1990, priceLabel: "1 990 ₽/мес", sub: "Для частного врача", features: ["30 отчётов в месяц", "Все индексы гигиены", "PDF-отчёт", "Подбор ёршиков", "Пародонт. скрининг", "AI-чат для пациента"], popular: false },
  { name: "Pro", price: 2990, priceLabel: "2 990 ₽/мес", sub: "Для врачей и гигиенистов", features: ["100 отчётов в месяц", "Все функции Start", "История пациента", "Динамика показателей", "Оценка риска кариеса", "Чат-бот напоминаний"], popular: true },
  { name: "Clinic", price: 5990, priceLabel: "5 990 ₽/мес", sub: "Для клиник", features: ["200 отчётов в месяц", "Все функции Pro", "Брендирование отчётов", "Логотип клиники в PDF", "Групповые рассылки"], popular: false },
  { name: "Expert", price: 9990, priceLabel: "9 990 ₽/мес", sub: "Для медицинских центров", features: ["500 отчётов в месяц", "Все функции Clinic", "Аналитика по врачам", "Рейтинг врачей", "Управленческий отчёт"], popular: false },
];

const ambassadors = [
  { name: "Коростелев А.А.", role: "Основатель, стоматолог-гигиенист", quote: "AI помогает стандартизировать оценку гигиены и давать пациентам понятные рекомендации" },
  { name: "Чапурова Г.Ш.", role: "Гигиенист-стоматологический", quote: "Автоматические напоминания значительно повышают комплаенс пациентов" },
];

const reviews = [
  { name: "Мария К.", role: "Стоматолог-терапевт, Москва", quote: "Раньше тратила 15 минут на объяснения пациенту, теперь показываю отчёт Odonta — всё наглядно и понятно. Пациенты сами начинают следить за гигиеной.", stars: 5 },
  { name: "Алексей Д.", role: "Гигиенист, клиника «Дентал Плюс»", quote: "Индексы считаются автоматически — не нужно вручную заполнять таблицы. Экономлю по 10 минут на каждом приёме.", stars: 5 },
  { name: "Елена В.", role: "Детский стоматолог, Санкт-Петербург", quote: "Дети в восторге от визуализации! Показываю им где налёт — и они сразу понимают, зачем чистить зубы. Родители тоже довольны отчётами.", stars: 5 },
  { name: "Ирина С.", role: "Ортодонт, Екатеринбург", quote: "Для пациентов с брекетами — незаменимый инструмент. Видно все проблемные зоны, и пациент получает конкретные рекомендации по ёршикам.", stars: 5 },
];

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

      {/* HERO */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#f0fdfa] via-white to-white" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#0891b2]/5 rounded-full blur-[120px]" />
        <div className="absolute top-40 right-1/4 w-72 h-72 bg-cyan-200/10 rounded-full blur-[100px]" />
        <FloatingParticles />

        <div className="relative mx-auto max-w-6xl px-6">
          <FadeUp>
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#ecfeff] px-4 py-1.5 text-xs font-medium text-[#0891b2] mb-8">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0891b2] animate-pulse" />
                Используют 50+ стоматологий
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-[1.1]">
                AI-анализ гигиены
                <br />
                <GradientText>полости рта</GradientText>
              </h1>

              <p className="mt-6 text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
                Загрузите фото зубов — нейросеть определит налёт, рассчитает индексы
                и подберёт средства гигиены за 30 секунд
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register"
                  className="rounded-2xl bg-[#0891b2] px-8 py-4 text-base font-semibold text-white shadow-xl shadow-[#0891b2]/25 hover:bg-[#0e7490] hover:shadow-[#0891b2]/35 transition-all">
                  Попробовать бесплатно
                </Link>
                <a href="#how"
                  className="rounded-2xl border border-gray-200 px-8 py-4 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                  Как это работает
                </a>
              </div>
            </div>
          </FadeUp>

          {/* Stats */}
          <FadeUp delay={0.3}>
            <div className="mt-20 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              {[
                { value: 5, suffix: "", label: "индексов гигиены" },
                { value: 30, suffix: " сек", label: "на анализ" },
                { value: 95, suffix: "%", label: "точность AI" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-bold text-[#0891b2]"><AnimatedCounter value={stat.value} suffix={stat.suffix} /></div>
                  <div className="mt-1 text-xs text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 bg-[#f8fafb]">
        <div className="mx-auto max-w-6xl px-6">
          <FadeUp>
            <div className="text-center mb-16">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0891b2] mb-3">Возможности</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
                Всё для стоматолога-гигиениста
              </h2>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const Icon = featureIcons[i];
              const color = featureColors[i];
              return (
                <FeatureCard key={f.title} delay={i * 0.08}>
                  <div className="group rounded-2xl bg-white p-7 border border-gray-100">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: color + "12" }}>
                      <Icon className="h-6 w-6" style={{ color }} />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mb-2">{f.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                  </div>
                </FeatureCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <FadeUp>
            <div className="text-center mb-16">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0891b2] mb-3">Процесс</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
                4 шага к результату
              </h2>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <FadeUp key={step.num} delay={i * 0.15}>
                <div className="relative">
                  <StepNumber num={step.num} delay={i * 0.15} />
                  <h3 className="text-lg font-bold text-gray-900 mb-2 mt-3">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                  {i < 3 && <PulsingArrow />}
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 bg-[#f8fafb]">
        <div className="mx-auto max-w-6xl px-6">
          <FadeUp>
            <div className="text-center mb-16">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0891b2] mb-3">Тарифы</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
                Выберите свой план
              </h2>
              <p className="mt-3 text-gray-500">От бесплатного знакомства до полной аналитики клиники</p>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {plans.map((plan, i) => (
              <ScaleIn key={plan.name} delay={i * 0.08}>
                <div className={`relative rounded-2xl p-6 transition-all h-full flex flex-col ${
                  plan.popular
                    ? "bg-[#0891b2] text-white shadow-xl shadow-[#0891b2]/20 scale-[1.03]"
                    : "bg-white border border-gray-100 hover:shadow-lg"
                }`}>
                  {plan.popular && (
                    <PulsingBadge className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <div className="rounded-full bg-amber-400 px-3 py-0.5 text-[10px] font-bold text-amber-900 whitespace-nowrap shadow-lg shadow-amber-400/30">
                        Хит продаж
                      </div>
                    </PulsingBadge>
                  )}
                  <h3 className={`text-base font-bold ${plan.popular ? "text-white" : "text-gray-900"}`}>Odonta Index {plan.name}</h3>
                  <p className={`mt-1 text-xs ${plan.popular ? "text-white/70" : "text-gray-400"}`}>{plan.sub}</p>
                  <div className="mt-4 mb-5">
                    <span className={`text-2xl font-black ${plan.popular ? "text-white" : "text-gray-900"}`}>{plan.priceLabel}</span>
                  </div>
                  <ul className="space-y-2 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-[13px]">
                        <span className={`text-xs mt-0.5 ${plan.popular ? "text-cyan-200" : "text-[#0891b2]"}`}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register"
                    className={`mt-6 block w-full rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
                      plan.popular
                        ? "bg-white text-[#0891b2] hover:bg-gray-100"
                        : plan.price === 0
                          ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          : "bg-[#0891b2]/10 text-[#0891b2] hover:bg-[#0891b2]/20"
                    }`}>
                    {plan.price === 0 ? "Начать бесплатно" : "Выбрать"}
                  </Link>
                </div>
              </ScaleIn>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <FadeUp>
            <div className="text-center mb-16">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0891b2] mb-3">Отзывы</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
                Что говорят врачи
              </h2>
              <p className="mt-3 text-gray-500">Более 100 стоматологов уже используют Odonta Index AI</p>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {reviews.map((review, i) => (
              <FadeUp key={review.name} delay={i * 0.1}>
                <div className="rounded-2xl bg-white p-7 border border-gray-100 shadow-sm hover:shadow-md transition-shadow h-full">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: review.stars }).map((_, j) => (
                      <span key={j} className="text-amber-400 text-lg">&#9733;</span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed mb-5 italic">
                    &laquo;{review.quote}&raquo;
                  </p>
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
        </div>
      </section>

      {/* AMBASSADORS */}
      <section className="py-24 bg-[#f8fafb]">
        <div className="mx-auto max-w-6xl px-6">
          <FadeUp>
            <div className="text-center mb-16">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0891b2] mb-3">Амбассадоры</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
                Наши амбассадоры
              </h2>
              <p className="mt-3 text-gray-500">Эксперты, которые доверяют Odonta Index AI</p>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {ambassadors.map((expert, i) => (
              <FadeUp key={expert.name} delay={i * 0.15}>
                <div className="rounded-2xl bg-white p-8 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0891b2]/10 text-lg font-bold text-[#0891b2]">
                      {expert.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{expert.name}</p>
                      <p className="text-xs text-gray-500">{expert.role}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed italic">
                    &laquo;{expert.quote}&raquo;
                  </p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <FadeUp>
          <div className="mx-auto max-w-4xl px-6">
            <div className="rounded-3xl bg-gradient-to-br from-[#0891b2] via-[#0e7490] to-[#155e75] p-12 sm:p-16 text-center text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  Начните анализировать<br />уже сегодня
                </h2>
                <p className="mt-4 text-white/70 max-w-md mx-auto">
                  Регистрация бесплатна. Первые 5 отчётов — в подарок.
                </p>
                <Link href="/register"
                  className="mt-8 inline-block rounded-2xl bg-white px-10 py-4 text-base font-bold text-[#0891b2] shadow-xl hover:shadow-2xl transition-all">
                  Создать аккаунт
                </Link>
              </div>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="Odonta Index AI" className="h-14" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400">
              <Link href="/privacy" className="hover:text-[#0891b2] transition-colors">Политика обработки ПД</Link>
              <Link href="/terms" className="hover:text-[#0891b2] transition-colors">Пользовательское соглашение</Link>
              <Link href="/consent" className="hover:text-[#0891b2] transition-colors">Согласие на обработку ПД</Link>
            </div>
          </div>
          <div className="mt-6 text-center text-[11px] text-gray-300">
            <p>ИП Коростелев Александр Андреевич · ИНН: 312334497069 · ОГРНИП: 323508100020560</p>
            <p className="mt-1">140002, Московская обл, г. Люберцы, ул. Кирова, д. 9, корп. 2</p>
            <p className="mt-2">© 2026 Odonta Index AI · <a href="https://kwork.ru/user/pyaidev" target="_blank" className="hover:text-[#0891b2]">pyaidev</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
