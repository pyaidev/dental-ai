"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, ZoomIn } from "lucide-react";
import { API_BASE } from "@/lib/utils";

interface OverlayViewerProps {
  originalSrc: string;
  overlaySrc: string;
  label: string;
  plaquePct: number;
}

export default function OverlayViewer({ originalSrc, overlaySrc, label, plaquePct }: OverlayViewerProps) {
  const [opacity, setOpacity] = useState(100);
  const [showOverlay, setShowOverlay] = useState(true);
  const [zoomed, setZoomed] = useState(false);

  const color = plaquePct > 50 ? "#ef4444" : plaquePct > 30 ? "#f97316" : plaquePct > 15 ? "#f59e0b" : "#10b981";

  return (
    <div className="text-center">
      {/* Image container */}
      <div
        className={`relative overflow-hidden rounded-xl border border-gray-100 cursor-pointer transition-all ${zoomed ? "fixed inset-4 z-50 rounded-2xl" : ""}`}
        onClick={() => setZoomed(!zoomed)}
      >
        {/* Original photo */}
        <img src={`${API_BASE}/${originalSrc}`} alt={label} className="w-full" />

        {/* Overlay layer */}
        {showOverlay && (
          <img
            src={`${API_BASE}/${overlaySrc}`}
            alt="overlay"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: opacity / 100, mixBlendMode: "normal" }}
          />
        )}

        {/* Zoom icon */}
        <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/30 text-white">
          <ZoomIn className="h-3 w-3" />
        </div>

        {/* Plaque badge */}
        <div className="absolute bottom-2 left-2 rounded-md px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: color }}>
          {plaquePct}%
        </div>
      </div>

      {/* Zoomed backdrop */}
      {zoomed && <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setZoomed(false)} />}

      {/* Controls */}
      <div className="mt-2 flex items-center gap-2 justify-center">
        <button
          onClick={(e) => { e.stopPropagation(); setShowOverlay(!showOverlay); }}
          className={`rounded-md p-1 transition-colors ${showOverlay ? "text-primary bg-primary/10" : "text-gray-300"}`}
          title={showOverlay ? "Скрыть маску" : "Показать маску"}
        >
          {showOverlay ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>

        <input
          type="range" min={0} max={100} value={opacity}
          onChange={(e) => setOpacity(parseInt(e.target.value))}
          className="h-1 w-20 accent-primary cursor-pointer"
          title={`Прозрачность: ${opacity}%`}
        />

        <span className="text-[10px] text-gray-400 w-8">{opacity}%</span>
      </div>

      <p className="mt-1 text-xs font-medium text-gray-500">{label}</p>
    </div>
  );
}
