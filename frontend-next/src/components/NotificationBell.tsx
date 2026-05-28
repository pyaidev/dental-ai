"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CreditCard, AlertTriangle, AlertCircle, CheckCircle, FileText, Activity, Clock, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/utils";

interface Notification {
  type: "success" | "warning" | "danger" | "info";
  icon: string;
  title: string;
  message: string;
  action: string | null;
  time: string | null;
}

const iconMap: Record<string, React.ElementType> = {
  "credit-card": CreditCard,
  "alert-triangle": AlertTriangle,
  "alert-circle": AlertCircle,
  "check-circle": CheckCircle,
  "file-text": FileText,
  "activity": Activity,
  "clock": Clock,
};

const colorMap: Record<string, string> = {
  success: "text-green-500 bg-green-50",
  warning: "text-amber-500 bg-amber-50",
  danger: "text-red-500 bg-red-50",
  info: "text-cyan-500 bg-cyan-50",
};

export default function NotificationBell() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("dental_token");
    if (!token) return;
    fetch(`${API_BASE}/api/notifications`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setNotifs(d.notifications || []); setUnread(d.unread || 0); })
      .catch(() => {});

    // Poll every 60s
    const interval = setInterval(() => {
      fetch(`${API_BASE}/api/notifications`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { setNotifs(d.notifications || []); setUnread(d.unread || 0); })
        .catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="relative rounded-lg p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute right-0 top-10 z-50 w-80 rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
              <p className="text-sm font-semibold">Уведомления</p>
              <button onClick={() => setOpen(false)} className="text-gray-300 hover:text-gray-500">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">Нет уведомлений</div>
              ) : (
                notifs.map((n, i) => {
                  const Icon = iconMap[n.icon] || Bell;
                  return (
                    <div
                      key={i}
                      onClick={() => { if (n.action) { router.push(n.action); setOpen(false); } }}
                      className={`flex gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${n.action ? "cursor-pointer hover:bg-gray-50" : ""} transition-colors`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorMap[n.type]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{n.title}</p>
                        <p className="text-[11px] text-gray-400 truncate">{n.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
