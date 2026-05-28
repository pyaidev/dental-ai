"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Download, Activity, Shield, Calendar } from "lucide-react";
import { API_BASE } from "@/lib/utils";

interface ReportData {
  id: number;
  date: string;
  patient: { fio: string; date_of_birth: string; card_number: string };
  doctor: { fio: string; position: string };
  clinic: { name: string; address: string; phone: string };
  plaque: { overall: number; front: number; right: number; left: number };
  severity: string;
  severity_color: string;
  indices: Record<string, { value: number; name: string }>;
  has_braces: boolean;
  has_implants: boolean;
  recommendations: string;
  next_visit: string;
  overlay_front: string;
  overlay_right: string;
  overlay_left: string;
  pdf_url: string | null;
}

const colorMap: Record<string, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
};

export default function PublicReportPage() {
  const params = useParams();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/report/${params.id}/public`)  // id = access_token (secure)
      .then((r) => {
        if (!r.ok) throw new Error("Отчёт не найден");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Отчёт не найден</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-b border-slate-200 px-4 py-5"
      >
        <div className="mx-auto max-w-2xl text-center">
          <img src="/logo.png" alt="Odonta Index AI" className="mx-auto mb-2 h-10" />
          <h1 className="text-xl font-bold">Отчёт о гигиене полости рта</h1>
          {data.clinic.name && (
            <p className="mt-1 text-sm text-gray-500">{data.clinic.name}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">{data.date}</p>
        </div>
      </motion.div>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        {/* Patient info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-white border border-slate-200 p-4"
        >
          <p className="text-sm"><span className="text-gray-500">Пациент:</span> <strong>{data.patient.fio}</strong></p>
          {data.doctor.fio && (
            <p className="text-sm mt-1"><span className="text-gray-500">Врач:</span> {data.doctor.fio}, {data.doctor.position}</p>
          )}
        </motion.div>

        {/* Overall result */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-slate-900 text-white p-6 text-center"
        >
          <p className="text-sm text-white/60">Общий процент налёта</p>
          <p className="text-5xl font-bold mt-1">{data.plaque.overall}%</p>
          <div className={`mt-3 inline-block rounded-full px-4 py-1 text-sm font-medium text-white ${colorMap[data.severity_color] || "bg-gray-500"}`}>
            {data.severity}
          </div>
          <div className="mt-3 flex justify-center gap-6 text-sm text-white/60">
            <span>Фронт: {data.plaque.front}%</span>
            <span>Правая: {data.plaque.right}%</span>
            <span>Левая: {data.plaque.left}%</span>
          </div>
        </motion.div>

        {/* Overlay images */}
        {data.overlay_front && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-3 gap-2"
          >
            {[
              { src: data.overlay_right, label: "Правая" },
              { src: data.overlay_front, label: "Фронт" },
              { src: data.overlay_left, label: "Левая" },
            ].map((img) => (
              <div key={img.label} className="text-center">
                <img src={`${API_BASE}/${img.src}`} alt={img.label} className="w-full rounded-xl border border-slate-200" />
                <p className="mt-1 text-xs text-gray-500">{img.label}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Indices */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl bg-white border border-slate-200 p-4"
        >
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-600" /> Индексы гигиены
          </h2>
          <div className="space-y-2">
            {Object.values(data.indices).map((idx) => (
              <div key={idx.name} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{idx.name}</span>
                <span className="font-semibold">{idx.value ?? "—"}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Ortho status */}
        {(data.has_braces || data.has_implants) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="rounded-2xl bg-white border border-slate-200 p-4"
          >
            <h2 className="font-semibold mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-cyan-600" /> Ортопедический статус
            </h2>
            <div className="flex gap-3 text-sm">
              {data.has_braces && <span className="rounded-full bg-cyan-50 px-3 py-1 text-cyan-700">Брекеты</span>}
              {data.has_implants && <span className="rounded-full bg-cyan-50 px-3 py-1 text-cyan-700">Импланты</span>}
            </div>
          </motion.div>
        )}

        {/* Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl bg-white border border-slate-200 p-4"
        >
          <h2 className="font-semibold mb-3">Рекомендации</h2>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 font-sans">
            {data.recommendations}
          </pre>
        </motion.div>

        {/* Next visit */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl bg-cyan-50 border border-cyan-200 p-4 flex items-center gap-3"
        >
          <Calendar className="h-8 w-8 text-cyan-600 shrink-0" />
          <div>
            <p className="text-sm text-cyan-800 font-medium">Следующий визит</p>
            <p className="text-lg font-bold text-cyan-700">через {data.next_visit}</p>
          </div>
        </motion.div>

        {/* Download PDF */}
        {data.pdf_url && (
          <motion.a
            href={`${API_BASE}${data.pdf_url}`}
            download
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center gap-2 w-full rounded-2xl bg-cyan-600 py-4 text-white font-semibold shadow-lg shadow-cyan-600/20"
          >
            <Download className="h-5 w-5" />
            Скачать PDF отчёт
          </motion.a>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-4">
          Odonta Index AI — анализ индексов гигиены полости рта<br />
          Результаты не являются диагнозом и не заменяют консультацию врача
        </p>
      </div>
    </div>
  );
}
