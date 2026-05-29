import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Вход в систему",
  description: "Войдите в Odonta Index AI — сервис AI-анализа гигиены полости рта для стоматологов и гигиенистов.",
  robots: { index: false, follow: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
