import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Регистрация",
  description: "Создайте аккаунт в Odonta Index AI. Бесплатно — 5 отчётов. AI-анализ зубного налёта, расчёт индексов гигиены, PDF-отчёты для пациентов.",
  robots: { index: true, follow: true },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
