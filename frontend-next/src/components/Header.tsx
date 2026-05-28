"use client";

import { motion } from "framer-motion";
import { LogOut, LayoutDashboard, ScanLine, Users, BarChart3, CreditCard, Settings } from "lucide-react";
import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("dental_token");
    router.push("/login");
  };

  const navItems = [
    { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
    { href: "/analyze", label: "Анализ", icon: ScanLine },
    { href: "/patients", label: "Пациенты", icon: Users },
    { href: "/statistics", label: "Статистика", icon: BarChart3 },
    { href: "/subscription", label: "Подписка", icon: CreditCard },
    { href: "/settings", label: "Кабинет", icon: Settings },
  ];

  return (
    <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100/80"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Odonta Index AI" className="h-7" />
          <span className="text-base font-bold tracking-tight hidden sm:block">
            Odonta Index <span className="text-primary">AI</span>
          </span>
        </Link>

        <nav className="flex items-center gap-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-all",
                  isActive
                    ? "text-primary"
                    : "text-gray-400 hover:text-gray-700"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg bg-primary/[0.06]"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
              </Link>
            );
          })}
          <div className="ml-1 h-5 w-px bg-gray-200" />
          <NotificationBell />
          <button
            onClick={handleLogout}
            className="ml-1 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] text-gray-400 hover:text-red-500 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Выйти</span>
          </button>
        </nav>
      </div>
    </motion.header>
  );
}
