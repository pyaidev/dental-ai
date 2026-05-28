"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Cigarette, Heart, Baby, Droplets, Shield, Clock, Brush, AlertCircle, Sparkles, Palette, Wind, Save, CheckCircle } from "lucide-react";
import { API_BASE } from "@/lib/utils";

interface QuestionnaireProps {
  patientId: number;
  onSaved?: () => void;
}

interface QData {
  smoking: boolean;
  diabetes: boolean;
  pregnancy: boolean;
  dry_mouth: boolean;
  bruxism: boolean;
  brushing_frequency: string;
  uses_interdental: boolean;
  bleeding_gums: boolean;
  sensitivity: boolean;
  wants_whitening: boolean;
  satisfied_color: boolean;
  bad_breath: boolean;
  notes: string;
}

const defaultData: QData = {
  smoking: false, diabetes: false, pregnancy: false, dry_mouth: false, bruxism: false,
  brushing_frequency: "2x", uses_interdental: false, bleeding_gums: false, sensitivity: false,
  wants_whitening: false, satisfied_color: true, bad_breath: false, notes: "",
};

function Toggle({ label, icon: Icon, value, onChange }: { label: string; icon: React.ElementType; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all ${
        value ? "border-primary/30 bg-primary/10 text-primary" : "border-card-border bg-white text-muted hover:bg-slate-50"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export default function Questionnaire({ patientId, onSaved }: QuestionnaireProps) {
  const [data, setData] = useState<QData>(defaultData);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("dental_token");
    if (!token || !patientId) return;
    fetch(`${API_BASE}/api/questionnaire/${patientId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d.exists) setData(d); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [patientId]);

  const update = (field: keyof QData, value: boolean | string) => {
    setData({ ...data, [field]: value });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const token = localStorage.getItem("dental_token");
    try {
      await fetch(`${API_BASE}/api/questionnaire`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...data, patient_id: patientId }),
      });
      setSaved(true);
      onSaved?.();
    } catch {}
    setSaving(false);
  };

  if (!loaded) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-card-border bg-card p-5"
    >
      <h2 className="font-semibold mb-4 flex items-center gap-2 text-primary">
        <Heart className="h-5 w-5" /> Анкета пациента
      </h2>

      {/* General */}
      <div className="mb-4">
        <p className="text-xs font-medium text-muted mb-2">Общее состояние</p>
        <div className="flex flex-wrap gap-2">
          <Toggle label="Курение" icon={Cigarette} value={data.smoking} onChange={(v) => update("smoking", v)} />
          <Toggle label="Диабет" icon={Heart} value={data.diabetes} onChange={(v) => update("diabetes", v)} />
          <Toggle label="Беременность" icon={Baby} value={data.pregnancy} onChange={(v) => update("pregnancy", v)} />
          <Toggle label="Сухость во рту" icon={Droplets} value={data.dry_mouth} onChange={(v) => update("dry_mouth", v)} />
          <Toggle label="Бруксизм" icon={Shield} value={data.bruxism} onChange={(v) => update("bruxism", v)} />
        </div>
      </div>

      {/* Hygiene */}
      <div className="mb-4">
        <p className="text-xs font-medium text-muted mb-2">Гигиена</p>
        <div className="flex flex-wrap gap-2 mb-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted" />
            <span className="text-muted">Чистка:</span>
            {["rarely", "1x", "2x", "3x"].map((freq) => (
              <button key={freq} type="button"
                onClick={() => update("brushing_frequency", freq)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  data.brushing_frequency === freq
                    ? "bg-primary text-white" : "bg-slate-100 text-muted hover:bg-slate-200"
                }`}
              >
                {{ rarely: "Редко", "1x": "1×/день", "2x": "2×/день", "3x": "3×/день" }[freq]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Toggle label="Ёршики/нить" icon={Brush} value={data.uses_interdental} onChange={(v) => update("uses_interdental", v)} />
          <Toggle label="Кровоточивость" icon={AlertCircle} value={data.bleeding_gums} onChange={(v) => update("bleeding_gums", v)} />
          <Toggle label="Чувствительность" icon={Sparkles} value={data.sensitivity} onChange={(v) => update("sensitivity", v)} />
        </div>
      </div>

      {/* Aesthetics */}
      <div className="mb-4">
        <p className="text-xs font-medium text-muted mb-2">Эстетика</p>
        <div className="flex flex-wrap gap-2">
          <Toggle label="Хочет отбеливание" icon={Sparkles} value={data.wants_whitening} onChange={(v) => update("wants_whitening", v)} />
          <Toggle label="Цвет устраивает" icon={Palette} value={data.satisfied_color} onChange={(v) => update("satisfied_color", v)} />
          <Toggle label="Запах изо рта" icon={Wind} value={data.bad_breath} onChange={(v) => update("bad_breath", v)} />
        </div>
      </div>

      {/* Notes */}
      <textarea
        value={data.notes} onChange={(e) => update("notes", e.target.value)}
        placeholder="Заметки..."
        rows={2}
        className="w-full rounded-xl border border-card-border bg-slate-50 px-3 py-2 text-sm outline-none resize-none mb-3 focus:border-primary focus:ring-2 focus:ring-primary/10"
      />

      <motion.button
        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
        onClick={handleSave} disabled={saving}
        className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
          saved ? "bg-success text-white" : "bg-primary text-white hover:bg-primary-dark"
        }`}
      >
        {saved ? <><CheckCircle className="h-4 w-4" /> Сохранено</> : saving ? "Сохраняем..." : <><Save className="h-4 w-4" /> Сохранить анкету</>}
      </motion.button>
    </motion.div>
  );
}
