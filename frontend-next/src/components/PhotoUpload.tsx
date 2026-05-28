"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoUploadProps {
  label: string;
  name: string;
  onChange: (file: File | null) => void;
}

export default function PhotoUpload({ label, name, onChange }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
      onChange(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center"
    >
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "relative w-full aspect-[4/3] rounded-2xl border-2 border-dashed cursor-pointer overflow-hidden transition-all duration-300",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.02]"
            : preview
            ? "border-transparent"
            : "border-card-border hover:border-primary/50 hover:bg-slate-50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] || null)}
        />

        <AnimatePresence mode="wait">
          {preview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0"
            >
              <img
                src={preview}
                alt={label}
                className="h-full w-full object-cover rounded-2xl"
              />
              <button
                onClick={clear}
                className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full flex-col items-center justify-center gap-2 p-4"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <ImagePlus className="h-6 w-6 text-muted" />
              </div>
              <span className="text-xs text-muted text-center">Нажмите или перетащите</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <span className="mt-2 text-sm font-medium text-muted">{label}</span>
    </motion.div>
  );
}
