"use client";

import { motion } from "framer-motion";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`overflow-hidden relative bg-slate-200 rounded-md ${className}`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: "linear",
        }}
      />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-4">
      <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
        <div className="bg-slate-50 p-4 flex gap-4 border-b border-slate-100">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex gap-4 border-b border-slate-50 last:border-0">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Componente original mantenido para compatibilidad
 */
export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-100 border-t-sky-600" />
      <p className="text-sm font-medium text-slate-500">Cargando información...</p>
    </div>
  );
}
