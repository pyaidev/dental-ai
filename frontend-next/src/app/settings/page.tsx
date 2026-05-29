"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  User, Lock, Building2, Phone, Save, CheckCircle, CreditCard,
  Zap, Shield, Star, Package, ChevronRight, Clock, FileText, Settings as SettingsIcon,
  Bell, MessageCircle, Send
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { API_BASE } from "@/lib/utils";

interface UserInfo { id: number; username: string; fio: string; role: string; }
interface SubInfo {
  active: boolean; plan?: string; plan_name?: string;
  reports_total?: number; reports_used?: number; reports_remaining?: number;
  price_per_report?: number;
}

const planIcons: Record<string, React.ElementType> = { hygiene: Zap, hygiene_brushes: Shield, hygiene_perio: Star, all: Package };

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"profile" | "notifications" | "security">("profile");
  const [user, setUser] = useState<UserInfo | null>(null);
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [fio, setFio] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");
  const [position, setPosition] = useState("");
  const [tgEnabled, setTgEnabled] = useState(false);
  const [waEnabled, setWaEnabled] = useState(false);
  const [tgBotUsername, setTgBotUsername] = useState("OdontaAI_bot");
  const [controlReminder, setControlReminder] = useState(true);
  const [plannedReminder, setPlannedReminder] = useState(true);
  const [reminderText, setReminderText] = useState("Здравствуйте! Подошло время плановой профессиональной гигиены полости рта. Врач ждёт вас!");
  const [notifSaved, setNotifSaved] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saved, setSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("dental_token") : null;

  useEffect(() => {
    if (!token) { router.replace("/login"); return; }
    fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setUser(d); setFio(d.fio || ""); });
    fetch(`${API_BASE}/api/subscription`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setSub).catch(() => {});
    setClinicName(localStorage.getItem("dental_clinic_name") || "");
    setClinicAddress(localStorage.getItem("dental_clinic_address") || "");
    setClinicPhone(localStorage.getItem("dental_clinic_phone") || "");
    setPosition(localStorage.getItem("dental_doctor_position") || "");
  }, [token, router]);

  const handleSaveProfile = () => {
    localStorage.setItem("dental_clinic_name", clinicName);
    localStorage.setItem("dental_clinic_address", clinicAddress);
    localStorage.setItem("dental_clinic_phone", clinicPhone);
    localStorage.setItem("dental_doctor_position", position);
    localStorage.setItem("dental_doctor_fio", fio);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    if (newPassword.length < 6) { setPasswordError("Минимум 6 символов"); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Пароли не совпадают"); return; }
    try {
      const resp = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });
      if (!resp.ok) { const d = await resp.json(); throw new Error(d.detail || "Ошибка"); }
      setPasswordSaved(true);
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
      setTimeout(() => setPasswordSaved(false), 2000);
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  if (!user) return null;

  const PlanIcon = sub?.plan ? planIcons[sub.plan] || Zap : Zap;
  const usedPercent = sub?.reports_total ? Math.round((sub.reports_used || 0) / sub.reports_total * 100) : 0;

  const inputClass = "w-full rounded-xl border border-card-border bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10";

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:px-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-primary" /> Личный кабинет
          </h1>
        </motion.div>

        {/* Profile header card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-xl font-bold">
                {fio.split(" ").map(n => n[0]).join("").slice(0, 2) || "?"}
              </div>
              <div>
                <p className="text-lg font-bold">{fio || user.username}</p>
                <p className="text-sm text-white/60">{position || (user.role === "admin" ? "Администратор" : "Врач")} · @{user.username}</p>
                {clinicName && <p className="text-xs text-white/40 mt-0.5">{clinicName}</p>}
              </div>
            </div>
            {/* Balance */}
            <div className="text-right">
              <p className="text-xs text-white/50">Баланс отчётов</p>
              <p className="text-3xl font-bold">{sub?.reports_remaining ?? 0}</p>
              <p className="text-xs text-white/40">из {sub?.reports_total ?? 0}</p>
            </div>
          </div>

          {/* Progress bar */}
          {sub?.active && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-white/50 mb-1">
                <span>Использовано: {sub.reports_used} отчётов</span>
                <span>{usedPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${usedPercent}%` }}
                  className={`h-full rounded-full ${usedPercent > 80 ? "bg-red-400" : usedPercent > 50 ? "bg-amber-400" : "bg-cyan-400"}`}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Subscription info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="mb-6 rounded-2xl border border-card-border bg-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> Тариф
            </h3>
            <button onClick={() => router.push("/subscription")}
              className="flex items-center gap-1 text-sm text-primary hover:underline">
              {sub?.active ? "Пополнить" : "Купить"} <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {sub?.active ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <PlanIcon className="h-6 w-6 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted">Тариф</p>
                <p className="text-sm font-bold">{sub.plan_name}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <FileText className="h-6 w-6 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted">Всего</p>
                <p className="text-sm font-bold">{sub.reports_total}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <Clock className="h-6 w-6 mx-auto text-muted mb-1" />
                <p className="text-xs text-muted">Использовано</p>
                <p className="text-sm font-bold">{sub.reports_used}</p>
              </div>
              <div className="rounded-xl bg-cyan-50 p-3 text-center">
                <Zap className="h-6 w-6 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted">Осталось</p>
                <p className="text-lg font-bold text-primary">{sub.reports_remaining}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted mb-3">У вас нет активной подписки</p>
              <button onClick={() => router.push("/subscription")}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white">
                Выбрать тариф
              </button>
            </div>
          )}

          {/* Pricing hint */}
          <div className="mt-4 pt-4 border-t border-card-border">
            <p className="text-xs text-muted mb-2">Стоимость отчётов:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="rounded-lg bg-slate-50 px-2 py-1.5 text-center">
                <span className="font-bold">35 ₽</span> — Гигиена
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-1.5 text-center">
                <span className="font-bold">40 ₽</span> — + Ёршики
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-1.5 text-center">
                <span className="font-bold">50 ₽</span> — + Пародонт
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-1.5 text-center">
                <span className="font-bold">60 ₽</span> — Полный
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {([
            { key: "profile", label: "Профиль", icon: User },
            { key: "notifications", label: "Уведомления", icon: Bell },
            { key: "security", label: "Безопасность", icon: Lock },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                tab === t.key ? "bg-primary/10 text-primary" : "text-muted hover:bg-slate-50"
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Profile tab */}
        {tab === "profile" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl border border-card-border bg-card p-6"
          >
            <h3 className="font-semibold mb-4">Личные данные</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">ФИО</label>
                <input type="text" value={fio} onChange={(e) => { setFio(e.target.value); setSaved(false); }} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Специализация</label>
                <input type="text" value={position} onChange={(e) => { setPosition(e.target.value); setSaved(false); }}
                  placeholder="Гигиенист-стоматологический" className={inputClass} />
              </div>
            </div>

            <h3 className="font-semibold mt-6 mb-4">Клиника</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Название</label>
                <input type="text" value={clinicName} onChange={(e) => { setClinicName(e.target.value); setSaved(false); }} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Телефон</label>
                <input type="tel" value={clinicPhone} onChange={(e) => { setClinicPhone(e.target.value); setSaved(false); }} className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted">Адрес</label>
                <input type="text" value={clinicAddress} onChange={(e) => { setClinicAddress(e.target.value); setSaved(false); }} className={inputClass} />
              </div>
            </div>

            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={handleSaveProfile}
              className={`mt-4 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold ${
                saved ? "bg-success text-white" : "bg-primary text-white"
              }`}
            >
              {saved ? <><CheckCircle className="h-4 w-4" /> Сохранено</> : <><Save className="h-4 w-4" /> Сохранить</>}
            </motion.button>
          </motion.div>
        )}

        {/* Notifications tab */}
        {tab === "notifications" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Channels */}
            <div className="rounded-2xl border border-card-border bg-card p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" /> Каналы уведомлений
              </h3>

              {/* Telegram */}
              <div className="flex items-center justify-between py-4 border-b border-card-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0088cc]/10">
                    <Send className="h-5 w-5 text-[#0088cc]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Telegram</p>
                    <p className="text-xs text-muted">Бот отправляет напоминания пациентам</p>
                  </div>
                </div>
                <button onClick={() => setTgEnabled(!tgEnabled)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${tgEnabled ? "bg-primary" : "bg-slate-200"}`}>
                  <motion.div animate={{ x: tgEnabled ? 20 : 2 }}
                    className="absolute top-1 h-5 w-5 rounded-full bg-white shadow" />
                </button>
              </div>

              {tgEnabled && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  className="pt-3 pl-13"
                >
                  <p className="text-xs text-muted mb-2">Бот: <a href="https://t.me/OdontaAI_bot" target="_blank" className="font-mono text-primary hover:underline">@OdontaAI_bot</a></p>
                  <a href="https://t.me/OdontaAI_bot" target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0088cc]/10 px-3 py-1.5 text-xs font-medium text-[#0088cc] hover:bg-[#0088cc]/20 transition-colors mb-2">
                    Открыть бот в Telegram
                  </a>
                  <p className="text-xs text-muted">Пациент должен написать боту /start, чтобы получать уведомления</p>
                </motion.div>
              )}

              {/* VK / Max */}
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]/10">
                    <MessageCircle className="h-5 w-5 text-[#25D366]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">VK / Max</p>
                    <p className="text-xs text-muted">Отправка напоминаний через VK Мессенджер (Max)</p>
                  </div>
                </div>
                <button onClick={() => setWaEnabled(!waEnabled)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${waEnabled ? "bg-[#25D366]" : "bg-slate-200"}`}>
                  <motion.div animate={{ x: waEnabled ? 20 : 2 }}
                    className="absolute top-1 h-5 w-5 rounded-full bg-white shadow" />
                </button>
              </div>

              {waEnabled && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  className="pt-1 pl-13"
                >
                  <a href="https://max.ru/id312334497069_bot" target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366]/10 px-3 py-1.5 text-xs font-medium text-[#25D366] hover:bg-[#25D366]/20 transition-colors mb-2">
                    Открыть бот в Max
                  </a>
                  <p className="text-xs text-muted">Пациент должен написать боту /start, чтобы получать уведомления</p>
                </motion.div>
              )}
            </div>

            {/* Reminder types */}
            <div className="rounded-2xl border border-card-border bg-card p-6">
              <h3 className="font-semibold mb-4">Типы напоминаний</h3>

              <div className="flex items-center justify-between py-3 border-b border-card-border">
                <div>
                  <p className="text-sm font-medium">Контролируемая гигиена</p>
                  <p className="text-xs text-muted">Через 2 недели, если индекс высокий (&gt;30%)</p>
                </div>
                <button onClick={() => setControlReminder(!controlReminder)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${controlReminder ? "bg-primary" : "bg-slate-200"}`}>
                  <motion.div animate={{ x: controlReminder ? 20 : 2 }}
                    className="absolute top-1 h-5 w-5 rounded-full bg-white shadow" />
                </button>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">Плановая гигиена</p>
                  <p className="text-xs text-muted">По расписанию (1-6 мес в зависимости от индекса)</p>
                </div>
                <button onClick={() => setPlannedReminder(!plannedReminder)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${plannedReminder ? "bg-primary" : "bg-slate-200"}`}>
                  <motion.div animate={{ x: plannedReminder ? 20 : 2 }}
                    className="absolute top-1 h-5 w-5 rounded-full bg-white shadow" />
                </button>
              </div>
            </div>

            {/* Custom text */}
            <div className="rounded-2xl border border-card-border bg-card p-6">
              <h3 className="font-semibold mb-3">Текст напоминания</h3>
              <p className="text-xs text-muted mb-2">Этот текст будет отправлен пациенту при плановом напоминании</p>
              <textarea
                value={reminderText} onChange={(e) => { setReminderText(e.target.value); setNotifSaved(false); }}
                rows={4}
                className="w-full rounded-xl border border-card-border bg-slate-50 px-3 py-2.5 text-sm outline-none resize-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                onClick={() => { setNotifSaved(true); setTimeout(() => setNotifSaved(false), 2000); }}
                className={`mt-3 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold ${
                  notifSaved ? "bg-success text-white" : "bg-primary text-white"
                }`}
              >
                {notifSaved ? <><CheckCircle className="h-4 w-4" /> Сохранено</> : <><Save className="h-4 w-4" /> Сохранить настройки</>}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Security tab */}
        {tab === "security" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl border border-card-border bg-card p-6"
          >
            <h3 className="font-semibold mb-4">Сменить пароль</h3>
            <div className="space-y-3 max-w-md">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Текущий пароль</label>
                <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Новый пароль</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Повторите</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} />
              </div>
              {passwordError && <p className="text-sm text-danger">{passwordError}</p>}
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={handleChangePassword}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold ${
                  passwordSaved ? "bg-success text-white" : "bg-slate-700 text-white hover:bg-slate-800"
                }`}
              >
                {passwordSaved ? <><CheckCircle className="h-4 w-4" /> Пароль изменён</> : "Сменить пароль"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </main>
      <Footer />
    </>
  );
}
