"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, CheckCircle } from "lucide-react";
import { API_BASE } from "@/lib/utils";

const BRUSH_SIZES = [
  { size: "0.4mm", color: "#FF69B4", name: "Розовый" },
  { size: "0.45mm", color: "#FF4500", name: "Оранжевый" },
  { size: "0.5mm", color: "#FF0000", name: "Красный" },
  { size: "0.6mm", color: "#0000FF", name: "Синий" },
  { size: "0.7mm", color: "#FFFF00", name: "Жёлтый" },
  { size: "0.8mm", color: "#00FF00", name: "Зелёный" },
  { size: "1.1mm", color: "#800080", name: "Фиолетовый" },
  { size: "1.3mm", color: "#808080", name: "Серый" },
];

const TOOTH_PAIRS_UPPER = ["18-17","17-16","16-15","15-14","14-13","13-12","12-11","11-21","21-22","22-23","23-24","24-25","25-26","26-27","27-28"];
const TOOTH_PAIRS_LOWER = ["48-47","47-46","46-45","45-44","44-43","43-42","42-41","41-31","31-32","32-33","33-34","34-35","35-36","36-37","37-38"];

interface Props {
  patientId: number;
}

export default function InterdentalChart({ patientId }: Props) {
  const [data, setData] = useState<Record<string, string>>({});
  const [selectedBrush, setSelectedBrush] = useState(BRUSH_SIZES[0].size);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("dental_token");
    if (!token || !patientId) return;
    fetch(`${API_BASE}/api/interdental/${patientId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.exists) setData(d.data); });
  }, [patientId]);

  const togglePair = (pair: string) => {
    const newData = { ...data };
    if (newData[pair] === selectedBrush) {
      delete newData[pair];
    } else {
      newData[pair] = selectedBrush;
    }
    setData(newData);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const token = localStorage.getItem("dental_token");
    await fetch(`${API_BASE}/api/interdental`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ patient_id: patientId, data, notes: "" }),
    });
    setSaved(true);
    setSaving(false);
  };

  const getBrushColor = (size: string) => BRUSH_SIZES.find(b => b.size === size)?.color || "#ddd";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-card-border bg-card p-5"
    >
      <h2 className="font-semibold mb-4 text-primary">Ёршикограмма</h2>

      {/* Brush selector */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {BRUSH_SIZES.map(b => (
          <button key={b.size} onClick={() => setSelectedBrush(b.size)}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-all ${
              selectedBrush === b.size ? "ring-2 ring-primary bg-slate-50" : "hover:bg-slate-50"
            }`}
          >
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: b.color }} />
            {b.size}
          </button>
        ))}
      </div>

      {/* Upper jaw */}
      <div className="mb-2">
        <p className="text-xs text-muted mb-1">Верхняя челюсть</p>
        <div className="flex gap-0.5 justify-center">
          {TOOTH_PAIRS_UPPER.map(pair => (
            <button key={pair} onClick={() => togglePair(pair)}
              className="w-6 h-8 rounded text-[7px] border border-slate-200 hover:border-primary transition-all flex items-center justify-center"
              style={{ backgroundColor: data[pair] ? getBrushColor(data[pair]) + "40" : "white", borderColor: data[pair] ? getBrushColor(data[pair]) : undefined }}
              title={pair}
            >
              {data[pair] ? "●" : pair.split("-")[0].slice(-1)}
            </button>
          ))}
        </div>
      </div>

      {/* Lower jaw */}
      <div className="mb-4">
        <p className="text-xs text-muted mb-1">Нижняя челюсть</p>
        <div className="flex gap-0.5 justify-center">
          {TOOTH_PAIRS_LOWER.map(pair => (
            <button key={pair} onClick={() => togglePair(pair)}
              className="w-6 h-8 rounded text-[7px] border border-slate-200 hover:border-primary transition-all flex items-center justify-center"
              style={{ backgroundColor: data[pair] ? getBrushColor(data[pair]) + "40" : "white", borderColor: data[pair] ? getBrushColor(data[pair]) : undefined }}
              title={pair}
            >
              {data[pair] ? "●" : pair.split("-")[0].slice(-1)}
            </button>
          ))}
        </div>
      </div>

      <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
        onClick={handleSave} disabled={saving}
        className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold ${
          saved ? "bg-success text-white" : "bg-primary text-white"
        }`}
      >
        {saved ? <><CheckCircle className="h-4 w-4" /> Сохранено</> : <><Save className="h-4 w-4" /> Сохранить</>}
      </motion.button>
    </motion.div>
  );
}
