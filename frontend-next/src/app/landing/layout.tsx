import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Odonta Index AI — AI-анализ гигиены полости рта для стоматологов",
  description:
    "Загрузите 3 фото зубов с индикатором налёта — нейросеть YOLOv8 рассчитает 5 индексов гигиены (Фёдорова-Володкиной, OHI-S, API Lange, Silness-Löe, PHP) и сформирует PDF-отчёт с персональными рекомендациями за 30 секунд. Бесплатный тариф — 5 отчётов.",
  alternates: { canonical: "/" },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
