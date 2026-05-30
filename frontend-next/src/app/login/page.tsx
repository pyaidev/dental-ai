"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import Link from "next/link";
import { API_BASE } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [needVerification, setNeedVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("verified");
    if (v === "success") setVerified("Email подтверждён! Теперь войдите в систему.");
    else if (v === "error") setError("Неверная или истёкшая ссылка подтверждения.");
  }, []);
  const [captcha, setCaptcha] = useState(() => {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    return { a, b, sum: a + b };
  });

  const refreshCaptcha = () => {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    setCaptcha({ a, b, sum: a + b });
    setCaptchaAnswer("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (parseInt(captchaAnswer) !== captcha.sum) {
      setError("Неверный ответ на задачу");
      refreshCaptcha();
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (resp.status === 403) {
        const data = await resp.json();
        setNeedVerification(true);
        setError(data.detail || "Email не подтверждён");
        return;
      }
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.detail || "Неверный логин или пароль");
      }
      const data = await resp.json();
      localStorage.setItem("dental_token", data.token);
      localStorage.setItem("dental_user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Navbar */}
      <nav className="border-b border-gray-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="/" className="flex items-center"><img src="/logo.png" alt="Odonta Index AI" className="h-14" /></a>
          <a href="/register" className="rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700">Регистрация</a>
        </div>
      </nav>
      <div className="flex flex-1 items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >

        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
          <h2 className="mb-6 text-xl font-semibold text-center text-gray-900">Вход в систему</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-600">Логин</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
                <input
                  type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin" required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/10"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-600">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
                <input
                  type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-12 text-sm outline-none transition-all focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-600">
                Решите: <span className="font-bold text-gray-900">{captcha.a} + {captcha.b} = ?</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number" value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)}
                  placeholder="Ответ" required
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"
                />
                <button type="button" onClick={refreshCaptcha}
                  className="rounded-xl border border-gray-200 px-3 text-gray-400 hover:text-gray-600 hover:bg-gray-50">↻</button>
              </div>
            </div>

            {verified && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded-xl bg-green-50 p-3 text-sm text-green-600 font-medium">{verified}</motion.div>
            )}

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded-xl bg-red-50 p-3 text-sm text-red-500">
                <p>{error}</p>
                {needVerification && (
                  <button
                    onClick={async () => {
                      setResending(true);
                      try {
                        await fetch(`${API_BASE}/api/auth/resend-verification`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ username, password }),
                        });
                        setError("Письмо отправлено повторно. Проверьте почту.");
                        setNeedVerification(false);
                      } catch {}
                      setResending(false);
                    }}
                    disabled={resending}
                    className="mt-2 text-xs font-medium text-cyan-600 hover:underline"
                  >
                    {resending ? "Отправка..." : "Отправить письмо повторно"}
                  </button>
                )}
              </motion.div>
            )}

            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="w-full rounded-xl bg-cyan-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700 disabled:opacity-50"
            >
              {loading ? "Входим..." : "Войти"}
            </motion.button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-400">
          Нет аккаунта? <Link href="/register" className="text-cyan-600 hover:underline">Регистрация</Link>
        </p>
        <p className="mt-2 text-center text-xs text-gray-300">Odonta Index AI v1.0</p>
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
