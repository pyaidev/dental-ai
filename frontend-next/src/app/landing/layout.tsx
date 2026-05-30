import type { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://odontaindex.ru";

async function fetchSeo(): Promise<Record<string, string>> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${API_URL}/api/seo`, {
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    clearTimeout(timeout);
    if (res.ok) return res.json();
  } catch {
    /* fall through to defaults */
  }
  return {};
}

export async function generateMetadata(): Promise<Metadata> {
  const seo = await fetchSeo();

  const title =
    seo.meta_title ||
    "Odonta Index AI — AI-анализ гигиены полости рта для стоматологов";
  const description =
    seo.meta_description ||
    "Загрузите 3 фото зубов с индикатором налёта — нейросеть YOLOv8 рассчитает 5 индексов гигиены (Фёдорова-Володкиной, OHI-S, API Lange, Silness-Löe, PHP) и сформирует PDF-отчёт с персональными рекомендациями за 30 секунд. Бесплатный тариф — 5 отчётов.";
  const keywords = seo.meta_keywords
    ? seo.meta_keywords.split(",").map((k: string) => k.trim())
    : undefined;
  const ogTitle =
    seo.og_title || "Odonta Index AI — AI-анализ гигиены полости рта";
  const ogDescription =
    seo.og_description ||
    "Загрузите 3 фото зубов с индикатором налёта — нейросеть рассчитает индексы гигиены и сформирует PDF-отчёт с рекомендациями за 30 секунд.";
  const ogImage = seo.og_image || "/og-image.png";

  const metadata: Metadata = {
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "ru_RU",
      url: "https://odontaindex.ru",
      siteName: "Odonta Index AI",
      title: ogTitle,
      description: ogDescription,
      images: [{ url: ogImage, width: 1200, height: 630, alt: ogTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [ogImage],
    },
  };

  if (keywords) metadata.keywords = keywords;

  if (seo.yandex_verification) {
    metadata.verification = { yandex: seo.yandex_verification };
  }
  if (seo.google_verification) {
    metadata.verification = {
      ...(metadata.verification as object),
      google: seo.google_verification,
    };
  }

  return metadata;
}

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
