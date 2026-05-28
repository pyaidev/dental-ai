"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Upload, FileText } from "lucide-react";
import { API_BASE } from "@/lib/utils";

const TOOTH_TYPES = [
  { key: "healthy", label: "Здоровые зубы", desc: "Стандартное отбеливание" },
  { key: "tetracycline", label: "Тетрациклиновые", desc: "Окрашивание антибиотиками" },
  { key: "fluorosis", label: "Флюороз", desc: "Избыток фтора" },
  { key: "after_braces", label: "После брекетов", desc: "Неравномерный цвет" },
];

interface Props {
  patientId: number;
}

export default function WhiteningPanel({ patientId }: Props) {
  const [toothType, setToothType] = useState("healthy");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!photo) return;
    setLoading(true);
    const token = localStorage.getItem("dental_token");
    const formData = new FormData();
    formData.append("patient_id", String(patientId));
    formData.append("tooth_type", toothType);
    formData.append("photo_before", photo);

    try {
      const resp = await fetch(`${API_BASE}/api/whitening`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await resp.json();
      setResult(data.recommendations);
    } catch {}
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-card-border bg-card p-5"
    >
      <h2 className="font-semibold mb-4 flex items-center gap-2 text-primary">
        <Sparkles className="h-5 w-5" /> Отбеливание
      </h2>

      {/* Tooth type */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {TOOTH_TYPES.map(t => (
          <button key={t.key} onClick={() => setToothType(t.key)}
            className={`rounded-xl border p-3 text-left transition-all ${
              toothType === t.key ? "border-primary bg-primary/5" : "border-card-border hover:border-primary/30"
            }`}
          >
            <p className="text-sm font-medium">{t.label}</p>
            <p className="text-xs text-muted">{t.desc}</p>
          </button>
        ))}
      </div>

      {/* Photo upload */}
      <div className="mb-4">
        <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-card-border p-6 cursor-pointer hover:border-primary/50 transition-colors">
          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          {preview ? (
            <img src={preview} alt="Before" className="max-h-40 rounded-lg" />
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted mb-2" />
              <p className="text-sm text-muted">Загрузите фото ДО отбеливания</p>
            </>
          )}
        </label>
      </div>

      <motion.button
        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
        onClick={handleSubmit} disabled={loading || !photo}
        className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? "Анализ..." : "Получить рекомендации"}
      </motion.button>

      {/* Result */}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mt-4 rounded-xl bg-slate-50 p-4"
        >
          <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" /> Рекомендации по отбеливанию
          </h3>
          <pre className="text-sm whitespace-pre-wrap font-sans text-foreground/80 leading-relaxed">{result}</pre>
        </motion.div>
      )}
    </motion.div>
  );
}
