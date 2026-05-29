import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Odonta Index AI — AI-анализ гигиены полости рта для стоматологов",
    template: "%s | Odonta Index AI",
  },
  description:
    "Сервис AI-анализа зубного налёта по фотографиям. Автоматический расчёт индексов гигиены (Фёдорова-Володкиной, OHI-S, API, Silness-Löe, PHP), PDF-отчёты, рекомендации по средствам гигиены. Для стоматологов и гигиенистов.",
  keywords: [
    "анализ зубного налёта",
    "индексы гигиены полости рта",
    "AI стоматология",
    "Odonta Index",
    "Фёдорова-Володкиной",
    "OHI-S",
    "стоматологический отчёт",
    "гигиенист стоматологический",
    "анализ налёта по фото",
    "индекс гигиены онлайн",
    "пародонтограмма онлайн",
    "ёршикограмма",
    "PDF отчёт стоматолог",
    "AI dental plaque analysis",
    "dental hygiene index calculator",
  ],
  metadataBase: new URL("https://odontaindex.ru"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "https://odontaindex.ru",
    siteName: "Odonta Index AI",
    title: "Odonta Index AI — AI-анализ гигиены полости рта",
    description:
      "Загрузите 3 фото зубов с индикатором налёта — нейросеть рассчитает индексы гигиены и сформирует PDF-отчёт с рекомендациями за 30 секунд.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Odonta Index AI — сервис анализа гигиены полости рта",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Odonta Index AI — AI-анализ гигиены полости рта",
    description:
      "Нейросеть анализирует налёт по фото, рассчитывает 5 индексов гигиены и формирует PDF-отчёт для пациента.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  verification: {
    yandex: "yandex-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
