"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, UserPlus, Stethoscope, Building2, Phone } from "lucide-react";
import Link from "next/link";
import { API_BASE } from "@/lib/utils";
import PhoneInput from "@/components/PhoneInput";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fio: "", username: "", password: "", confirmPassword: "",
    clinic_name: "", phone: "", position: "Гигиенист-стоматологический",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const positions = [
    "Гигиенист-стоматологический", "Стоматолог-терапевт", "Стоматолог-ортодонт",
    "Стоматолог-хирург", "Стоматолог-ортопед", "Стоматолог-пародонтолог",
    "Детский стоматолог", "Стоматолог общей практики",
  ];

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!agreePrivacy || !agreeTerms) { setError("Примите условия использования"); return; }
    if (form.password !== form.confirmPassword) { setError("Пароли не совпадают"); return; }
    if (form.password.length < 6) { setError("Пароль минимум 6 символов"); return; }

    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!resp.ok) { const d = await resp.json(); throw new Error(d.detail || "Ошибка"); }
      const data = await resp.json();
      localStorage.setItem("dental_token", data.token);
      localStorage.setItem("dental_user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally { setLoading(false); }
  };

  const inputClass = "w-full rounded-xl border border-gray-200 bg-gray-50 py-2 px-3 text-sm outline-none transition-all focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/10";
  const inputIconClass = "w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/10";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Navbar */}
      <nav className="border-b border-gray-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="/" className="flex items-center"><img src="/logo.png" alt="Odonta Index AI" className="h-14" /></a>
          <a href="/login" className="rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700">Войти</a>
        </div>
      </nav>

      <div className="flex flex-1 items-center justify-center px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="mb-6 text-center">
          <img src="/logo.png" alt="Odonta Index AI" className="mx-auto mb-2 h-16" />
          <p className="text-sm text-gray-400">Создайте аккаунт стоматологической команды</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="mb-1 text-lg font-semibold text-center">Регистрация</h2>
          <p className="mb-4 text-xs text-gray-400 text-center">Заполните данные для создания аккаунта</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* FIO */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">ФИО врача *</label>
              <div className="relative">
                <Stethoscope className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
                <input type="text" required value={form.fio} onChange={(e) => update("fio", e.target.value)}
                  placeholder="Иванов Иван Иванович" className={inputIconClass} />
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Роль в клинике</label>
              <select value={form.position} onChange={(e) => update("position", e.target.value)}
                className={inputClass}>
                {positions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <p className="mt-1 text-xs text-gray-400">Необязательное поле. Можно выбрать «Врач» или «Координатор».</p>
            </div>

            {/* Clinic + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Клиника</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
                  <input type="text" value={form.clinic_name} onChange={(e) => update("clinic_name", e.target.value)}
                    placeholder="Название" className={inputIconClass} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Телефон</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
                  <PhoneInput value={form.phone} onChange={(v) => update("phone", v)}
                    className={inputIconClass} />
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Email/Username */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Email *</label>
              <input type="text" required value={form.username} onChange={(e) => update("username", e.target.value)}
                placeholder="doctor@clinic.com" className={inputClass} />
            </div>

            {/* Password */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Пароль</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required value={form.password}
                  onChange={(e) => update("password", e.target.value)} placeholder="Минимум 6 символов"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 px-3 pr-10 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Повторите пароль</label>
              <input type={showPassword ? "text" : "password"} required value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)} placeholder="Повторите пароль"
                className={inputClass} />
            </div>

            {/* Consent checkboxes */}
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-cyan-600" />
                <span className="text-xs text-gray-500">
                  Я даю <a href="/consent" target="_blank" className="text-cyan-600 underline">согласие</a> на обработку моих персональных данных согласно <a href="/privacy" target="_blank" className="text-cyan-600 underline">Политике</a>
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-cyan-600" />
                <span className="text-xs text-gray-500">
                  Принимаю <a href="/terms" target="_blank" className="text-cyan-600 underline">пользовательское соглашение</a>
                </span>
              </label>
            </div>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded-xl bg-red-50 p-3 text-sm text-red-500">{error}</motion.p>
            )}

            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="w-full rounded-xl bg-cyan-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700 disabled:opacity-50"
            >
              {loading ? "Регистрация..." : <><UserPlus className="h-4 w-4 inline mr-2" />Создать аккаунт</>}
            </motion.button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-400">
          Уже есть аккаунт? <Link href="/login" className="text-cyan-600 hover:underline">Войти</Link>
        </p>
      </motion.div>
    </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-6">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400 mb-3">
            <a href="/privacy" className="hover:text-cyan-600 transition-colors">Политика обработки ПД</a>
            <a href="/terms" className="hover:text-cyan-600 transition-colors">Пользовательское соглашение</a>
            <a href="/consent" className="hover:text-cyan-600 transition-colors">Согласие на обработку ПД</a>
          </div>
          <p className="text-[11px] text-gray-300">ИП Коростелев А.А. · ИНН: 312334497069 · © 2026 Odonta Index AI</p>
        </div>
      </footer>
    </div>
  );
}
