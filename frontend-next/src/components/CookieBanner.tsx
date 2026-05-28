"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookies_accepted")) setShow(true);
  }, []);

  const accept = () => {
    localStorage.setItem("cookies_accepted", "true");
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white p-4 shadow-lg"
        >
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              ИП Коростелев Александр Андреевич (ИНН: 312334497069) обрабатывает файлы cookie в соответствии с{" "}
              <Link href="/privacy" className="text-cyan-600 underline">Политикой обработки персональных данных</Link>,
              включая передачу данных, определённых в указанной Политике, партнёрам.
            </p>
            <button onClick={accept}
              className="shrink-0 rounded-xl bg-cyan-600 px-6 py-2 text-sm font-semibold text-white hover:bg-cyan-700">
              Принять
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
