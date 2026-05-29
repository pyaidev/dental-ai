"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Search, Users, ChevronRight, History, FileText, Trash2, Download, Eye, ClipboardList, Brush, Activity, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Questionnaire from "@/components/Questionnaire";
import InterdentalChart from "@/components/InterdentalChart";
import PeriodontalChart from "@/components/PeriodontalChart";
import WhiteningPanel from "@/components/WhiteningPanel";
import { PaywallModal } from "@/components/SubscriptionGate";
import { API_BASE } from "@/lib/utils";

interface PatientItem {
  id: number;
  fio: string;
  card_number: string;
  date_of_birth: string | null;
  total_analyses: number;
  last_plaque_pct: number | null;
  last_visit: string | null;
}

interface HistoryItem {
  id: number;
  date: string;
  plaque_pct_overall: number;
  index_fedorov: number | null;
  index_api_lange: number | null;
  index_ohi_s: number | null;
  pdf_url: string | null;
}

export default function PatientsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientItem | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "questionnaire" | "interdental" | "periodontal" | "whitening">("history");
  const [paywallFeature, setPaywallFeature] = useState("");
  const [userPerms, setUserPerms] = useState([] as string[]);

  const token = typeof window !== "undefined" ? localStorage.getItem("dental_token") : null;

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/subscription`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setUserPerms(d.permissions || []))
      .catch(() => {});
  }, [token]);

  const search = useCallback(async (q: string) => {
    if (!token) { router.replace("/login"); return; }
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/patients/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      setPatients(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }, [token, router]);

  useEffect(() => { search(""); }, [search]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/subscription`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setUserPerms(d.permissions || []))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const loadHistory = async (patient: PatientItem) => {
    setSelectedPatient(patient);
    setHistoryLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/patients/${patient.id}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      setHistory(data.history || []);
    } catch {}
    setHistoryLoading(false);
  };

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Пациенты
          </h1>
        </motion.div>

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="mb-6 relative"
        >
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по ФИО или номеру карты..."
            className="w-full rounded-2xl border border-card-border bg-card py-3 pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Patient list */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-2xl border border-card-border bg-card overflow-hidden"
          >
            <div className="border-b border-card-border px-5 py-3">
              <p className="text-sm text-muted">{patients.length} пациентов</p>
            </div>
            <div className="divide-y divide-card-border max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center"><div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
              ) : patients.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted">Пациенты не найдены</div>
              ) : (
                patients.map((p) => (
                  <motion.div
                    key={p.id}
                    whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
                    onClick={() => loadHistory(p)}
                    className={`flex cursor-pointer items-center justify-between px-5 py-3 transition-colors ${
                      selectedPatient?.id === p.id ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-muted">
                        {p.fio.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{p.fio}</p>
                        <p className="text-xs text-muted">Карта: {p.card_number} · {p.total_analyses} анализов</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.last_plaque_pct !== null && (
                        <span className={`text-sm font-semibold ${
                          p.last_plaque_pct > 30 ? "text-danger" : p.last_plaque_pct > 15 ? "text-warning" : "text-success"
                        }`}>{p.last_plaque_pct}%</span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted" />
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* Patient history */}
          <AnimatePresence mode="wait">
            {selectedPatient ? (
              <motion.div
                key={selectedPatient.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="rounded-2xl border border-card-border bg-card overflow-hidden"
              >
                <div className="border-b border-card-border px-5 py-3 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" />
                      {selectedPatient.fio}
                    </h2>
                    <p className="text-xs text-muted">Карта: {selectedPatient.card_number}</p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm(`Удалить пациента ${selectedPatient.fio} и все анализы?`)) return;
                      try {
                        await fetch(`${API_BASE}/api/patients/${selectedPatient.id}`, {
                          method: "DELETE",
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        setPatients(patients.filter((p) => p.id !== selectedPatient.id));
                        setSelectedPatient(null);
                        setHistory([]);
                      } catch {}
                    }}
                    className="rounded-lg px-3 py-1.5 text-xs text-danger bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5 inline mr-1" />Удалить
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 overflow-x-auto border-b border-card-border px-3 py-1">
                  {([
                    { key: "history" as const, label: "История", icon: History, perm: "" },
                    { key: "questionnaire" as const, label: "Анкета", icon: ClipboardList, perm: "" },
                    { key: "interdental" as const, label: "Ёршики", icon: Brush, perm: "interdental" },
                    { key: "periodontal" as const, label: "Пародонт", icon: Activity, perm: "periodontal" },
                    { key: "whitening" as const, label: "Отбел.", icon: Sparkles, perm: "whitening" },
                  ]).map(tab => {
                    const locked = tab.perm && !userPerms.includes(tab.perm);
                    return (
                      <button key={tab.key}
                        onClick={() => locked ? setPaywallFeature(tab.perm || "") : setActiveTab(tab.key)}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                          locked ? "text-gray-300 cursor-not-allowed" :
                          activeTab === tab.key ? "bg-primary/10 text-primary" : "text-muted hover:text-foreground"
                        }`}
                        title={locked ? "Недоступно на вашем тарифе" : ""}
                      >
                        <tab.icon className="h-3.5 w-3.5" />{tab.label}
                        {locked && <span className="text-[9px]">🔒</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Tab content */}
                {activeTab === "questionnaire" && selectedPatient && (
                  <div className="p-3"><Questionnaire patientId={selectedPatient.id} /></div>
                )}
                {activeTab === "interdental" && selectedPatient && (
                  <div className="p-3"><InterdentalChart patientId={selectedPatient.id} /></div>
                )}
                {activeTab === "periodontal" && selectedPatient && (
                  <div className="p-3"><PeriodontalChart patientId={selectedPatient.id} /></div>
                )}
                {activeTab === "whitening" && selectedPatient && (
                  <div className="p-3"><WhiteningPanel patientId={selectedPatient.id} /></div>
                )}

                {activeTab === "history" && historyLoading ? (
                  <div className="p-8 text-center"><div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
                ) : activeTab === "history" && history.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted">Нет анализов</div>
                ) : activeTab === "history" ? (
                  <>
                    {/* Mini chart */}
                    <div className="px-5 pt-4 pb-2">
                      <p className="text-xs text-muted mb-2">Динамика налёта</p>
                      <div className="flex items-end gap-1 h-20">
                        {history.map((h, i) => (
                          <motion.div
                            key={h.id}
                            initial={{ height: 0 }}
                            animate={{ height: `${h.plaque_pct_overall}%` }}
                            transition={{ delay: i * 0.1 }}
                            className={`flex-1 rounded-t ${
                              h.plaque_pct_overall <= 10 ? "bg-emerald-400" : h.plaque_pct_overall <= 30 ? "bg-amber-400" : h.plaque_pct_overall <= 50 ? "bg-orange-400" : "bg-red-400"
                            }`}
                            style={{ minHeight: "4px" }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* History list */}
                    <div className="divide-y divide-card-border">
                      {history.map((h) => (
                        <div key={h.id} className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={() => router.push(`/analyze?view=${h.id}`)}
                        >
                          <div>
                            <p className="text-sm font-medium">{h.date}</p>
                            <p className="text-xs text-muted">
                              ФВ: {h.index_fedorov ?? "—"} · API: {h.index_api_lange ?? "—"}% · OHI-S: {h.index_ohi_s ?? "—"}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-bold ${
                              h.plaque_pct_overall > 30 ? "text-danger" : h.plaque_pct_overall > 15 ? "text-warning" : "text-success"
                            }`}>{h.plaque_pct_overall}%</span>
                            <button onClick={(e) => { e.stopPropagation(); router.push(`/analyze?view=${h.id}`); }}
                              className="rounded-lg p-1.5 text-primary hover:bg-primary/10 transition-colors" title="Просмотр">
                              <Eye className="h-4 w-4" />
                            </button>
                            {h.pdf_url && (
                              <a href={`${API_BASE}${h.pdf_url}`} download onClick={(e) => e.stopPropagation()}
                                className="rounded-lg p-1.5 text-primary hover:bg-primary/10 transition-colors" title="Скачать PDF">
                                <Download className="h-4 w-4" />
                              </a>
                            )}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!confirm("Удалить этот анализ?")) return;
                                try {
                                  await fetch(`${API_BASE}/api/analysis/${h.id}`, {
                                    method: "DELETE",
                                    headers: { Authorization: `Bearer ${token}` },
                                  });
                                  setHistory(history.filter((x) => x.id !== h.id));
                                } catch {}
                              }}
                              className="rounded-lg p-1.5 text-muted hover:text-danger hover:bg-red-50 transition-colors" title="Удалить"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border border-dashed border-card-border flex items-center justify-center p-12"
              >
                <p className="text-sm text-muted text-center">
                  Выберите пациента<br />для просмотра истории
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <Footer />
      <PaywallModal show={!!paywallFeature} onClose={() => setPaywallFeature("")} feature={paywallFeature} />
    </>
  );
}
