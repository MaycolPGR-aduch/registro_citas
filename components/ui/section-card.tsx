import { PropsWithChildren } from "react";

type SectionCardProps = PropsWithChildren<{
  className?: string;
}>;

export function SectionCard({ children, className }: SectionCardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
