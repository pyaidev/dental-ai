"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, CheckCircle, AlertTriangle } from "lucide-react";
import { API_BASE } from "@/lib/utils";

const TEETH_UPPER = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
const TEETH_LOWER = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

interface ToothData {
  buccal: [number, number, number];
  lingual: [number, number, number];
  bleeding: boolean;
  mobility: number;
  recession: number;
}

interface Props {
  patientId: number;
}

const defaultTooth = (): ToothData => ({
  buccal: [3, 3, 3], lingual: [3, 3, 3], bleeding: false, mobility: 0, recession: 0,
});

export default function PeriodontalChart({ patientId }: Props) {
  const [data, setData] = useState<Record<string, ToothData>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [summary, setSummary] = useState({ total_teeth: 0, deep_pockets: 0, bleeding_sites: 0 });

  useEffect(() => {
    const token = localStorage.getItem("dental_token");
    if (!token || !patientId) return;
    fetch(`${API_BASE}/api/periodontal/${patientId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => {
        if (d.exists) { setData(d.data); setSummary(d.summary); }
      });
  }, [patientId]);

  const updateTooth = (tooth: string, field: string, index: number | null, value: number | boolean) => {
    const current = data[tooth] || defaultTooth();
    if (field === "bleeding") {
      current.bleeding = value as boolean;
    } else if (field === "mobility") {
      current.mobility = value as number;
    } else if (field === "recession") {
      current.recession = value as number;
    } else if (index !== null) {
      (current as unknown as Record<string, number[]>)[field][index] = value as number;
    }
    setData({ ...data, [tooth]: current });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const token = localStorage.getItem("dental_token");
    try {
      const resp = await fetch(`${API_BASE}/api/periodontal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ patient_id: patientId, data, notes: "" }),
      });
      const result = await resp.json();
      setSummary(result.summary);
      setSaved(true);
    } catch {}
    setSaving(false);
  };

  const renderToothRow = (teeth: number[]) => (
    <div className="flex gap-px overflow-x-auto">
      {teeth.map(t => {
        const tooth = data[String(t)] || defaultTooth();
        const hasDeep = [...tooth.buccal, ...tooth.lingual].some(v => v >= 4);
        return (
          <div key={t} className={`flex-shrink-0 w-14 border rounded-lg p-1 text-center ${hasDeep ? "border-danger bg-red-50" : "border-card-border"}`}>
            <p className={`text-[10px] font-bold ${tooth.bleeding ? "text-danger" : "text-muted"}`}>{t}{tooth.bleeding ? "🩸" : ""}</p>
            {/* Buccal */}
            <div className="flex gap-px justify-center">
              {tooth.buccal.map((v, i) => (
                <input key={`b${i}`} type="number" min={0} max={12} value={v}
                  onChange={(e) => updateTooth(String(t), "buccal", i, parseInt(e.target.value) || 0)}
                  className={`w-4 h-5 text-[9px] text-center border rounded outline-none ${v >= 4 ? "border-danger text-danger bg-red-50" : "border-slate-200"}`}
                />
              ))}
            </div>
            {/* Lingual */}
            <div className="flex gap-px justify-center mt-px">
              {tooth.lingual.map((v, i) => (
                <input key={`l${i}`} type="number" min={0} max={12} value={v}
                  onChange={(e) => updateTooth(String(t), "lingual", i, parseInt(e.target.value) || 0)}
                  className={`w-4 h-5 text-[9px] text-center border rounded outline-none ${v >= 4 ? "border-danger text-danger bg-red-50" : "border-slate-200"}`}
                />
              ))}
            </div>
            {/* Controls */}
            <div className="flex justify-center gap-1 mt-1">
              <button onClick={() => updateTooth(String(t), "bleeding", null, !tooth.bleeding)}
                className={`text-[8px] px-1 rounded ${tooth.bleeding ? "bg-danger text-white" : "bg-slate-100"}`}>K</button>
              <select value={tooth.mobility} onChange={(e) => updateTooth(String(t), "mobility", null, parseInt(e.target.value))}
                className="text-[8px] w-6 border rounded">
                {[0,1,2,3].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-card-border bg-card p-5"
    >
      <h2 className="font-semibold mb-2 text-primary">Пародонтограмма</h2>

      {/* Summary */}
      {summary.total_teeth > 0 && (
        <div className="flex gap-4 mb-3 text-xs">
          <span className="text-muted">Зубов: <b>{summary.total_teeth}</b></span>
          <span className={summary.deep_pockets > 0 ? "text-danger" : "text-success"}>
            <AlertTriangle className="h-3 w-3 inline" /> Карманы ≥4мм: <b>{summary.deep_pockets}</b>
          </span>
          <span className={summary.bleeding_sites > 0 ? "text-danger" : "text-success"}>
            Кровоточивость: <b>{summary.bleeding_sites}</b>
          </span>
        </div>
      )}

      <p className="text-[10px] text-muted mb-1">Верхняя челюсть (вестибулярно / орально)</p>
      {renderToothRow(TEETH_UPPER)}

      <p className="text-[10px] text-muted mb-1 mt-3">Нижняя челюсть (вестибулярно / орально)</p>
      {renderToothRow(TEETH_LOWER)}

      <p className="text-[9px] text-muted mt-2">K — кровоточивость, число — подвижность (0-3), красный — карман ≥4мм</p>

      <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
        onClick={handleSave} disabled={saving}
        className={`w-full mt-3 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold ${
          saved ? "bg-success text-white" : "bg-primary text-white"
        }`}
      >
        {saved ? <><CheckCircle className="h-4 w-4" /> Сохранено</> : <><Save className="h-4 w-4" /> Сохранить</>}
      </motion.button>
    </motion.div>
  );
}
