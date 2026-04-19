import { AppointmentStatus } from "@/lib/types";

type StatusBadgeProps = {
  status: AppointmentStatus;
};

const STATUS_STYLES: Record<AppointmentStatus, { label: string; className: string }> = {
  scheduled: {
    label: "Programada",
    className: "bg-sky-100 text-sky-800 border-sky-200",
  },
  completed: {
    label: "Completada",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  cancelled: {
    label: "Cancelada",
    className: "bg-rose-100 text-rose-800 border-rose-200",
  },
  no_show: {
    label: "No asistio",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = STATUS_STYLES[status];
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${style.className}`}>
      {style.label}
    </span>
  );
}
