"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Send, Download, ArrowLeft, Stethoscope, User as UserIcon,
  Building2, CheckCircle2, AlertCircle, Share2, MessageCircle, Pencil, Save
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PhotoUpload from "@/components/PhotoUpload";
import PhoneInput from "@/components/PhoneInput";
import IndexGauge from "@/components/IndexGauge";
import { API_BASE } from "@/lib/utils";

interface AnalysisResult {
  id: number;
  plaque_pct_front: number;
  plaque_pct_right: number;
  plaque_pct_left: number;
  plaque_pct_overall: number;
  index_fedorov: number;
  index_fedorov_text: string;
  index_api_lange: number;
  index_api_text: string;
  index_ohi_s: number;
  index_ohi_s_text: string;
  index_silness_loe: number;
  index_silness_loe_text: string;
  index_php: number;
  index_php_text: string;
  recommendations: string;
  overlay_front: string;
  overlay_right: string;
  overlay_left: string;
  pdf_url: string;
  access_token: string;
  public_url: string;
}

function AnalyzeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"form" | "loading" | "results">("form");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("dental_token");
    if (!token) { router.replace("/login"); return; }

    // Load existing analysis if ?view=ID
    const viewId = searchParams.get("view");
    if (viewId) {
      setStep("loading");
      fetch(`${API_BASE}/api/analysis/${viewId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then((data) => { setResult(data); setStep("results"); setPatientFio(data.patient_fio || ""); setCardNumber(data.card_number || ""); })
        .catch(() => { setStep("form"); });
    }
  }, [router, searchParams]);
  const [editing, setEditing] = useState(false);
  const [editingRecs, setEditingRecs] = useState(false);
  const [editPctFront, setEditPctFront] = useState(0);
  const [editPctRight, setEditPctRight] = useState(0);
  const [editPctLeft, setEditPctLeft] = useState(0);
  const [editRecs, setEditRecs] = useState("");
  const [saving, setSaving] = useState(false);

  // Form state
  const [patientFio, setPatientFio] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [patientDob, setPatientDob] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [doctorFio, setDoctorFio] = useState(
    () => (typeof window !== "undefined" ? localStorage.getItem("dental_doctor_fio") || "" : "")
  );
  const [doctorPosition, setDoctorPosition] = useState(
    () => (typeof window !== "undefined" ? localStorage.getItem("dental_doctor_position") || "" : "")
  );
  const [showPositionDropdown, setShowPositionDropdown] = useState(false);
  const [positionSearch, setPositionSearch] = useState("");
  const positionOptions = [
    "Гигиенист-стоматологический",
    "Стоматолог-терапевт",
    "Стоматолог-ортодонт",
    "Стоматолог-хирург",
    "Стоматолог-ортопед",
    "Стоматолог-пародонтолог",
    "Детский стоматолог",
    "Стоматолог общей практики",
  ];
  const [clinicName, setClinicName] = useState(
    () => (typeof window !== "undefined" ? localStorage.getItem("dental_clinic_name") || "" : "")
  );
  const [clinicAddress, setClinicAddress] = useState(
    () => (typeof window !== "undefined" ? localStorage.getItem("dental_clinic_address") || "" : "")
  );
  const [clinicPhone, setClinicPhone] = useState(
    () => (typeof window !== "undefined" ? localStorage.getItem("dental_clinic_phone") || "" : "")
  );
  const [hasBraces, setHasBraces] = useState(false);
  const [hasImplants, setHasImplants] = useState(false);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInputValue, setCustomInputValue] = useState("");
  const [doctorComment, setDoctorComment] = useState("");
  const [photos, setPhotos] = useState<{ front: File | null; right: File | null; left: File | null }>({
    front: null, right: null, left: null,
  });
  const [autoDetect, setAutoDetect] = useState<{ has_braces: boolean; has_implants: boolean; confidence: number } | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectResults, setDetectResults] = useState<Record<string, { has_braces: boolean; has_implants: boolean; confidence: number }>>({});

  const handlePhotoWithDetect = async (position: "front" | "right" | "left", file: File | null) => {
    setPhotos((p) => ({ ...p, [position]: file }));
    if (!file) {
      const newResults = { ...detectResults };
      delete newResults[position];
      setDetectResults(newResults);
      // Recalculate from remaining
      const vals = Object.values(newResults);
      const anyBraces = vals.some(v => v.has_braces);
      const anyImplants = vals.some(v => v.has_implants);
      const maxConf = vals.length > 0 ? Math.max(...vals.map(v => v.confidence)) : 0;
      setAutoDetect(vals.length > 0 ? { has_braces: anyBraces, has_implants: anyImplants, confidence: maxConf } : null);
      return;
    }
    setDetecting(true);
    try {
      const token = localStorage.getItem("dental_token");
      const fd = new FormData();
      fd.append("photo", file);
      const resp = await fetch(`${API_BASE}/api/detect-preview`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (resp.ok) {
        const data = await resp.json();
        const newResults = { ...detectResults, [position]: data };
        setDetectResults(newResults);
        // Combine all results — if ANY photo has braces, mark as braces
        const vals = Object.values(newResults);
        const anyBraces = vals.some(v => v.has_braces);
        const anyImplants = vals.some(v => v.has_implants);
        const maxConf = Math.max(...vals.map(v => v.confidence));
        setAutoDetect({ has_braces: anyBraces, has_implants: anyImplants, confidence: maxConf });
        if (anyBraces) setHasBraces(true);
        if (anyImplants) setHasImplants(true);
      }
    } catch {}
    setDetecting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photos.front || !photos.right || !photos.left) {
      setError("Загрузите все 3 фотографии");
      return;
    }
    setError("");
    setStep("loading");

    // Cache clinic/doctor
    localStorage.setItem("dental_doctor_fio", doctorFio);
    localStorage.setItem("dental_doctor_position", doctorPosition);
    localStorage.setItem("dental_clinic_name", clinicName);
    localStorage.setItem("dental_clinic_address", clinicAddress);
    localStorage.setItem("dental_clinic_phone", clinicPhone);

    const formData = new FormData();
    formData.append("patient_fio", patientFio);
    formData.append("patient_dob", patientDob);
    formData.append("patient_phone", patientPhone);
    formData.append("card_number", cardNumber);
    formData.append("doctor_fio", doctorFio);
    formData.append("doctor_position", doctorPosition);
    formData.append("clinic_name", clinicName);
    formData.append("clinic_address", clinicAddress);
    formData.append("clinic_phone", clinicPhone);
    formData.append("has_braces", String(hasBraces));
    formData.append("has_implants", String(hasImplants));
    formData.append("doctor_comment", doctorComment);
    formData.append("photo_front", photos.front);
    formData.append("photo_right", photos.right);
    formData.append("photo_left", photos.left);

    try {
      const token = localStorage.getItem("dental_token");
      const resp = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!resp.ok) throw new Error("Ошибка анализа");
      const data = await resp.json();
      setResult(data);
      setStep("results");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка сервера");
      setStep("form");
    }
  };

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6">
        <AnimatePresence mode="wait">
          {/* ───── FORM ───── */}
          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -50 }}
            >
              <div className="mb-6 flex items-center gap-3">
                <button onClick={() => router.push("/dashboard")} className="rounded-lg p-2 hover:bg-slate-100">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold">Новый анализ</h1>
                  <p className="text-sm text-muted">Заполните данные и загрузите фото</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Patient */}
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-card-border bg-card p-5"
                >
                  <div className="mb-4 flex items-center gap-2 text-primary">
                    <UserIcon className="h-5 w-5" />
                    <h2 className="font-semibold">Пациент</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted">ФИО пациента *</label>
                      <input
                        type="text" required value={patientFio} onChange={(e) => setPatientFio(e.target.value)}
                        placeholder="Иванов Иван Иванович"
                        className="w-full rounded-xl border border-card-border bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted">№ мед. карты *</label>
                      <input
                        type="text" required value={cardNumber} onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="001"
                        className="w-full rounded-xl border border-card-border bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted">Дата рождения</label>
                      <input
                        type="date" value={patientDob} onChange={(e) => setPatientDob(e.target.value)}
                        className="w-full rounded-xl border border-card-border bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted">Телефон пациента</label>
                      <PhoneInput
                        value={patientPhone} onChange={setPatientPhone}
                        className="w-full rounded-xl border border-card-border bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm cursor-pointer rounded-lg border border-card-border px-3 py-1.5 hover:bg-slate-50 transition-colors has-[:checked]:bg-primary/10 has-[:checked]:border-primary/30">
                      <input type="checkbox" checked={hasBraces} onChange={(e) => setHasBraces(e.target.checked)}
                        className="h-4 w-4 rounded border-card-border accent-primary" />
                      Брекеты
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer rounded-lg border border-card-border px-3 py-1.5 hover:bg-slate-50 transition-colors has-[:checked]:bg-primary/10 has-[:checked]:border-primary/30">
                      <input type="checkbox" checked={hasImplants} onChange={(e) => setHasImplants(e.target.checked)}
                        className="h-4 w-4 rounded border-card-border accent-primary" />
                      Импланты
                    </label>
                    {customTags.map((tag, i) => (
                      <span key={i} className="flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/30 px-3 py-1.5 text-sm text-primary">
                        {tag}
                        <button type="button" onClick={() => setCustomTags(customTags.filter((_, j) => j !== i))}
                          className="ml-1 text-primary/50 hover:text-danger text-xs font-bold">✕</button>
                      </span>
                    ))}
                    {showCustomInput ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={customInputValue}
                          onChange={(e) => setCustomInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && customInputValue.trim()) {
                              e.preventDefault();
                              setCustomTags([...customTags, customInputValue.trim()]);
                              setCustomInputValue("");
                              setShowCustomInput(false);
                            }
                            if (e.key === "Escape") setShowCustomInput(false);
                          }}
                          placeholder="Введите..."
                          autoFocus
                          className="w-32 rounded-lg border border-primary px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/10"
                        />
                        <button type="button" onClick={() => {
                          if (customInputValue.trim()) {
                            setCustomTags([...customTags, customInputValue.trim()]);
                            setCustomInputValue("");
                          }
                          setShowCustomInput(false);
                        }} className="text-primary text-sm font-medium">OK</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setShowCustomInput(true)}
                        className="flex items-center gap-1 rounded-lg border border-dashed border-card-border px-3 py-1.5 text-sm text-muted hover:text-primary hover:border-primary transition-colors">
                        <span className="text-base leading-none">+</span> Добавить
                      </button>
                    )}
                  </div>
                </motion.section>

                {/* Doctor + Clinic */}
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-2xl border border-card-border bg-card p-5"
                >
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div>
                      <div className="mb-4 flex items-center gap-2 text-primary">
                        <Stethoscope className="h-5 w-5" />
                        <h2 className="font-semibold">Врач</h2>
                      </div>
                      <div className="space-y-3">
                        <input
                          type="text" value={doctorFio} onChange={(e) => setDoctorFio(e.target.value)}
                          placeholder="ФИО врача"
                          className="w-full rounded-xl border border-card-border bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
                        />
                        <div className="relative">
                          <input
                            type="text"
                            value={doctorPosition}
                            onChange={(e) => { setDoctorPosition(e.target.value); setPositionSearch(e.target.value); setShowPositionDropdown(true); }}
                            onFocus={() => setShowPositionDropdown(true)}
                            onBlur={() => setTimeout(() => setShowPositionDropdown(false), 200)}
                            placeholder="Выберите или введите должность"
                            className="w-full rounded-xl border border-card-border bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
                          />
                          {showPositionDropdown && (
                            <div className="absolute z-10 mt-1 w-full rounded-xl border border-card-border bg-white shadow-lg max-h-48 overflow-y-auto">
                              {positionOptions
                                .filter((opt) => opt.toLowerCase().includes((positionSearch || doctorPosition).toLowerCase()))
                                .map((opt) => (
                                  <button
                                    key={opt}
                                    type="button"
                                    onMouseDown={() => { setDoctorPosition(opt); setShowPositionDropdown(false); }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 transition-colors"
                                  >
                                    {opt}
                                  </button>
                                ))}
                              {positionSearch && !positionOptions.some((o) => o.toLowerCase() === positionSearch.toLowerCase()) && (
                                <button
                                  type="button"
                                  onMouseDown={() => { setDoctorPosition(positionSearch); setShowPositionDropdown(false); }}
                                  className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/10 transition-colors border-t border-card-border"
                                >
                                  + Добавить «{positionSearch}»
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="mb-4 flex items-center gap-2 text-primary">
                        <Building2 className="h-5 w-5" />
                        <h2 className="font-semibold">Клиника</h2>
                      </div>
                      <div className="space-y-3">
                        <input
                          type="text" value={clinicName} onChange={(e) => setClinicName(e.target.value)}
                          placeholder="Название клиники"
                          className="w-full rounded-xl border border-card-border bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
                        />
                        <input
                          type="text" value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)}
                          placeholder="Адрес"
                          className="w-full rounded-xl border border-card-border bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
                        />
                        <input
                          type="tel" value={clinicPhone} onChange={(e) => { const d = e.target.value.replace(/[^\d+\s()-]/g, ""); setClinicPhone(d); }}
                          placeholder="Телефон"
                          className="w-full rounded-xl border border-card-border bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
                        />
                      </div>
                    </div>
                  </div>
                </motion.section>

                {/* Photos */}
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-2xl border border-card-border bg-card p-5"
                >
                  <h2 className="mb-4 font-semibold text-primary">Фотографии зубов *</h2>
                  <div className="grid grid-cols-3 gap-4">
                    <PhotoUpload label="Правая сторона" name="photo_right" onChange={(f) => handlePhotoWithDetect("right", f)} />
                    <PhotoUpload label="Фронтальная" name="photo_front" onChange={(f) => handlePhotoWithDetect("front", f)} />
                    <PhotoUpload label="Левая сторона" name="photo_left" onChange={(f) => handlePhotoWithDetect("left", f)} />
                  </div>

                  {/* AI auto-detect banner — right after photos */}
                  {detecting && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="mt-4 flex items-center gap-3 rounded-xl bg-cyan-50 border border-cyan-200 px-4 py-3">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                      <div>
                        <p className="text-sm font-medium text-cyan-700">AI анализирует фото...</p>
                        <p className="text-xs text-cyan-500">Определяем брекеты и импланты</p>
                      </div>
                    </motion.div>
                  )}
                  {autoDetect && !detecting && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                      className={`mt-4 flex items-center gap-3 rounded-xl border px-4 py-3 ${
                        autoDetect.has_braces || autoDetect.has_implants
                          ? "bg-amber-50 border-amber-200"
                          : "bg-green-50 border-green-200"
                      }`}>
                      <span className="text-lg">🤖</span>
                      <div>
                        <p className={`text-sm font-medium ${autoDetect.has_braces || autoDetect.has_implants ? "text-amber-700" : "text-green-700"}`}>
                          {autoDetect.has_braces && "☑ Обнаружены брекеты "}
                          {autoDetect.has_implants && "☑ Обнаружены импланты "}
                          {!autoDetect.has_braces && !autoDetect.has_implants && "Брекеты и импланты не обнаружены"}
                        </p>
                        <p className="text-xs text-gray-400">Уверенность: {Math.round(autoDetect.confidence * 100)}%</p>
                      </div>
                    </motion.div>
                  )}
                </motion.section>

                {/* Comment */}
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-2xl border border-card-border bg-card p-5"
                >
                  <h2 className="mb-3 font-semibold text-primary">Комментарий врача</h2>
                  <textarea
                    value={doctorComment} onChange={(e) => setDoctorComment(e.target.value)}
                    rows={3} placeholder="Дополнительные заметки..."
                    className="w-full rounded-xl border border-card-border bg-slate-50 px-3 py-2.5 text-sm outline-none resize-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
                  />
                </motion.section>

                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-danger"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors"
                >
                  <Send className="h-5 w-5" />
                  Анализировать
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* ───── LOADING ───── */}
          {step === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32"
            >
              <div className="relative mb-6">
                <div className="h-20 w-20 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Stethoscope className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h2 className="text-xl font-bold">AI анализирует фотографии...</h2>
              <p className="mt-2 text-sm text-muted">Определяем зоны налёта и рассчитываем индексы</p>
            </motion.div>
          )}

          {/* ───── RESULTS ───── */}
          {step === "results" && result && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <button onClick={() => { setStep("form"); setResult(null); }}
                    className="rounded-lg p-2 hover:bg-slate-100">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      Результаты
                    </h1>
                    <p className="text-xs sm:text-sm text-muted">{patientFio} — карта {cardNumber}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <motion.a
                    href={`${API_BASE}${result.pdf_url}`}
                    download
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 rounded-xl bg-success px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-success/20"
                  >
                    <Download className="h-4 w-4" />
                    PDF
                  </motion.a>
                  <motion.a
                    href={`https://wa.me/?text=${encodeURIComponent(`Отчёт о гигиене полости рта: ${window.location.origin}/report/${result.access_token}`)}`}
                    target="_blank"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp
                  </motion.a>
                  <motion.a
                    href={`https://t.me/share/url?url=${encodeURIComponent(`${window.location.origin}/report/${result.access_token}`)}&text=${encodeURIComponent('Отчёт о гигиене полости рта')}`}
                    target="_blank"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 rounded-xl bg-[#0088cc] px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                    Telegram
                  </motion.a>
                  <motion.a
                    href="https://max.ru/id312334497069_bot"
                    target="_blank"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 rounded-xl bg-[#7B68EE] px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                    Max
                  </motion.a>
                  <motion.button
                    onClick={() => {
                      if (result) {
                        setEditPctFront(result.plaque_pct_front);
                        setEditPctRight(result.plaque_pct_right);
                        setEditPctLeft(result.plaque_pct_left);
                        setEditRecs(result.recommendations);
                      }
                      setEditing(!editing);
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${
                      editing ? "bg-slate-200 text-slate-700" : "bg-slate-700 text-white"
                    }`}
                  >
                    <Pencil className="h-4 w-4" />
                    {editing ? "Отмена" : "Править"}
                  </motion.button>
                </div>
              </div>

              {/* Edit panel */}
              <AnimatePresence>
                {editing && result && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 overflow-hidden"
                  >
                    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
                      <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                        <Pencil className="h-4 w-4" /> Ручная корректировка
                      </h3>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="text-xs text-amber-700 block mb-1">Фронт %</label>
                          <input type="number" min="0" max="100" step="0.1"
                            value={editPctFront} onChange={(e) => setEditPctFront(parseFloat(e.target.value) || 0)}
                            className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-amber-700 block mb-1">Правая %</label>
                          <input type="number" min="0" max="100" step="0.1"
                            value={editPctRight} onChange={(e) => setEditPctRight(parseFloat(e.target.value) || 0)}
                            className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-amber-700 block mb-1">Левая %</label>
                          <input type="number" min="0" max="100" step="0.1"
                            value={editPctLeft} onChange={(e) => setEditPctLeft(parseFloat(e.target.value) || 0)}
                            className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm" />
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="text-xs text-amber-700 block mb-1">Рекомендации</label>
                        <textarea
                          value={editRecs} onChange={(e) => setEditRecs(e.target.value)}
                          rows={12}
                          className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm resize-y"
                        />
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={saving}
                        onClick={async () => {
                          setSaving(true);
                          try {
                            const token = localStorage.getItem("dental_token");
                            const resp = await fetch(`${API_BASE}/api/analysis/${result.id}/correct`, {
                              method: "PUT",
                              headers: {
                                "Content-Type": "application/json",
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                              },
                              body: JSON.stringify({
                                plaque_pct_front: editPctFront,
                                plaque_pct_right: editPctRight,
                                plaque_pct_left: editPctLeft,
                                recommendations: editRecs,
                              }),
                            });
                            if (resp.ok) {
                              const updated = await resp.json();
                              setResult({
                                ...result,
                                plaque_pct_front: updated.plaque_pct_front,
                                plaque_pct_right: updated.plaque_pct_right,
                                plaque_pct_left: updated.plaque_pct_left,
                                plaque_pct_overall: updated.plaque_pct_overall,
                                index_fedorov: updated.index_fedorov,
                                index_api_lange: updated.index_api_lange,
                                index_ohi_s: updated.index_ohi_s,
                                index_silness_loe: updated.index_silness_loe,
                                index_php: updated.index_php,
                                recommendations: updated.recommendations,
                              });
                              setEditing(false);
                            }
                          } catch {}
                          setSaving(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 text-sm font-semibold text-white"
                      >
                        <Save className="h-4 w-4" />
                        {saving ? "Сохраняем..." : "Сохранить и пересоздать PDF"}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Overall plaque */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/60">Общий процент налёта</p>
                    <p className="mt-1 text-5xl font-bold">{result.plaque_pct_overall}%</p>
                  </div>
                  <div className="text-right text-sm text-white/60">
                    <p>Фронт: {result.plaque_pct_front}%</p>
                    <p>Правая: {result.plaque_pct_right}%</p>
                    <p>Левая: {result.plaque_pct_left}%</p>
                  </div>
                </div>
              </motion.div>

              {/* Overlay images */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-6 grid grid-cols-3 gap-2"
              >
                {[
                  { src: result.overlay_right, label: "Правая", pct: result.plaque_pct_right },
                  { src: result.overlay_front, label: "Фронт", pct: result.plaque_pct_front },
                  { src: result.overlay_left, label: "Левая", pct: result.plaque_pct_left },
                ].map((img) => (
                  <div key={img.label} className="text-center">
                    <img
                      src={`${API_BASE}/${img.src}`}
                      alt={img.label}
                      className="w-full rounded-2xl border border-card-border"
                    />
                    <p className="mt-2 text-sm font-medium">{img.label} — {img.pct}%</p>
                  </div>
                ))}
              </motion.div>

              {/* Indices */}
              {/* Indices row 1 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
              >
                <IndexGauge
                  label="Фёдорова-Володкиной"
                  value={result.index_fedorov}
                  maxValue={5}
                  interpretation={result.index_fedorov_text}
                  description="Степень налёта на передних зубах"
                  thresholds={{ good: 1.5, ok: 2.0, bad: 3.4 }}
                />
                <IndexGauge
                  label="API Lange"
                  value={result.index_api_lange}
                  maxValue={100}
                  unit="%"
                  interpretation={result.index_api_text}
                  description="Налёт в межзубных промежутках"
                  thresholds={{ good: 25, ok: 40, bad: 70 }}
                />
                <IndexGauge
                  label="Грин-Вермиллиона"
                  value={result.index_ohi_s}
                  maxValue={3}
                  interpretation={result.index_ohi_s_text}
                  description="Уровень налёта и зубного камня"
                  thresholds={{ good: 0.6, ok: 1.8, bad: 3.0 }}
                />
              </motion.div>

              {/* Indices row 2 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-2"
              >
                <IndexGauge
                  label="Silness–Löe"
                  value={result.index_silness_loe}
                  maxValue={3}
                  interpretation={result.index_silness_loe_text}
                  description="Международный индекс зубного налёта"
                  thresholds={{ good: 0.9, ok: 1.9, bad: 3.0 }}
                />
                <IndexGauge
                  label="PHP (Podshadley–Haley)"
                  value={result.index_php}
                  maxValue={5}
                  interpretation={result.index_php_text}
                  description="Эффективность чистки зубов"
                  thresholds={{ good: 0.6, ok: 1.6, bad: 5.0 }}
                />
              </motion.div>

              {/* Recommendations — editable */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-2xl border border-card-border bg-card p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold">Рекомендации</h2>
                  {!editingRecs ? (
                    <button
                      onClick={() => { setEditingRecs(true); setEditRecs(result.recommendations); }}
                      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Редактировать
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingRecs(false)}
                        className="text-xs text-muted hover:text-foreground transition-colors"
                      >
                        Отмена
                      </button>
                      <button
                        disabled={saving}
                        onClick={async () => {
                          setSaving(true);
                          try {
                            const token = localStorage.getItem("dental_token");
                            const resp = await fetch(`${API_BASE}/api/analysis/${result.id}/correct`, {
                              method: "PUT",
                              headers: {
                                "Content-Type": "application/json",
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                              },
                              body: JSON.stringify({
                                plaque_pct_front: result.plaque_pct_front,
                                plaque_pct_right: result.plaque_pct_right,
                                plaque_pct_left: result.plaque_pct_left,
                                recommendations: editRecs,
                              }),
                            });
                            if (resp.ok) {
                              const updated = await resp.json();
                              setResult({ ...result, recommendations: updated.recommendations });
                              setEditingRecs(false);
                            }
                          } catch {}
                          setSaving(false);
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {saving ? "..." : "Сохранить"}
                      </button>
                    </div>
                  )}
                </div>
                {editingRecs ? (
                  <textarea
                    value={editRecs}
                    onChange={(e) => setEditRecs(e.target.value)}
                    rows={15}
                    className="w-full rounded-xl border border-primary/30 bg-primary/[0.03] px-4 py-3 text-sm leading-relaxed font-sans resize-y outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    autoFocus
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80 font-sans">
                    {result.recommendations}
                  </pre>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </>
  );
}


export default function AnalyzePage() {
  return (
    <Suspense>
      <AnalyzeContent />
    </Suspense>
  );
}
