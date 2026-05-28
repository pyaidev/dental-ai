"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-cyan-50/30 to-slate-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="text-8xl font-bold text-primary/20">404</div>
        <h1 className="mt-4 text-2xl font-bold">Страница не найдена</h1>
        <p className="mt-2 text-sm text-muted">Такой страницы не существует или она была удалена</p>
        <Link href="/dashboard">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mt-6 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20"
          >
            На главную
          </motion.button>
        </Link>
      </motion.div>
    </div>
  );
}
