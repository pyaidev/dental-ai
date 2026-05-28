"use client";

import { useState } from "react";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function PhoneInput({ value, onChange, placeholder = "+7 (___) ___-__-__", className = "" }: PhoneInputProps) {
  const formatPhone = (raw: string) => {
    // Keep only digits and +
    const digits = raw.replace(/[^\d+]/g, "");

    // Auto-add +7 if starts with 8 or 7
    let clean = digits;
    if (clean.startsWith("8") && clean.length > 1) clean = "+7" + clean.slice(1);
    if (clean.startsWith("7") && !clean.startsWith("+")) clean = "+" + clean;
    if (!clean.startsWith("+") && clean.length > 0) clean = "+" + clean;

    // Format: +7 (XXX) XXX-XX-XX
    const d = clean.replace(/\D/g, "");
    let formatted = "";
    if (d.length > 0) formatted = "+" + d.slice(0, 1);
    if (d.length > 1) formatted += " (" + d.slice(1, 4);
    if (d.length > 4) formatted += ") " + d.slice(4, 7);
    if (d.length > 7) formatted += "-" + d.slice(7, 9);
    if (d.length > 9) formatted += "-" + d.slice(9, 11);

    return formatted;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    onChange(formatted);
  };

  const isValid = value.replace(/\D/g, "").length >= 11;

  return (
    <div className="relative">
      <input
        type="tel"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={18}
        className={`${className} ${value && !isValid ? "border-red-300 focus:border-red-400 focus:ring-red-200/50" : ""}`}
      />
      {value && (
        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${isValid ? "text-green-500" : "text-red-400"}`}>
          {isValid ? "✓" : "✗"}
        </span>
      )}
    </div>
  );
}
