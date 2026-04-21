"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FaChevronLeft,
  FaChevronRight,
  FaFilter,
  FaInfoCircle,
} from "react-icons/fa";
import { fetchJson } from "@/lib/fetcher";
import { ApiPayload, DoctorSummary } from "@/lib/types";

type DayInfo = {
  date: string;
  count: number;
};

const DAYS_OF_WEEK = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];


function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getDayColor(count: number): string {
  if (count === 0) return "";
  if (count <= 2) return "bg-sky-100 text-sky-700 border-sky-200";
  if (count <= 5) return "bg-sky-200 text-sky-800 border-sky-300";
  return "bg-sky-500 text-white border-sky-600";
}


type ScheduleCalendarProps = {
  doctors: DoctorSummary[];
  doctorFilter: string;
  selectedDate: string;
  onDoctorFilterChange: (doctorId: string) => void;
  onDayClick: (date: string) => void;
};


export function ScheduleCalendar({
  doctors,
  doctorFilter,
  selectedDate,
  onDoctorFilterChange,
  onDayClick,
}: ScheduleCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [dayInfo, setDayInfo] = useState<DayInfo[]>([]);
  const [loadingDays, setLoadingDays] = useState(false);

  const loadMonthData = useCallback(async () => {
    setLoadingDays(true);
    try {
      const firstDay = toIso(year, month, 1);
      const lastDay = toIso(year, month, new Date(year, month + 1, 0).getDate());

      const params = new URLSearchParams({ onlyAvailable: "false" });
      if (doctorFilter) params.set("doctorId", doctorFilter);

      const res = await fetchJson<ApiPayload<{ schedule_date: string }[]>>(
        `/api/schedules?${params.toString()}`,
      );

      const counts: Record<string, number> = {};
      for (const s of res.data ?? []) {
        if (s.schedule_date >= firstDay && s.schedule_date <= lastDay) {
          counts[s.schedule_date] = (counts[s.schedule_date] ?? 0) + 1;
        }
      }

      setDayInfo(Object.entries(counts).map(([date, count]) => ({ date, count })));
    } catch {
    } finally {
      setLoadingDays(false);
    }
  }, [year, month, doctorFilter]);

  useEffect(() => {
    const id = window.setTimeout(() => void loadMonthData(), 0);
    return () => window.clearTimeout(id);
  }, [loadMonthData]);

  const { daysInMonth, startOffset } = useMemo(() => {
    const dim = new Date(year, month + 1, 0).getDate();
    const offset = new Date(year, month, 1).getDay();
    return { daysInMonth: dim, startOffset: offset };
  }, [year, month]);

  const countMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of dayInfo) map[d.date] = d.count;
    return map;
  }, [dayInfo]);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  const todayIso = toIso(today.getFullYear(), today.getMonth(), today.getDate());
  const isPast = (day: number) => toIso(year, month, day) < todayIso;

  return (
    <div>
      {/* ── Filtro de médico ── */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <FaFilter className="text-sky-500 text-xs" />
          <span>Ver bloques de:</span>
        </div>
        <select
          value={doctorFilter}
          onChange={(e) => onDoctorFilterChange(e.target.value)}
          className="w-full max-w-xs shadow-sm"
        >
          <option value="">Todos los médicos</option>
          {doctors.map((d) => (
            <option key={d.id} value={String(d.id)}>
              {d.full_name}{d.specialty_name ? ` — ${d.specialty_name}` : ""}
            </option>
          ))}
        </select>
        {loadingDays && (
          <span className="ml-auto animate-pulse text-xs text-slate-400">Actualizando...</span>
        )}
      </div>

      {/* ── Navegación de mes ── */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <motion.button
          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
          type="button" onClick={prevMonth}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-sky-300 hover:text-sky-600"
        >
          <FaChevronLeft className="text-xs" />
        </motion.button>

        <p className="text-lg font-black text-slate-900">{MONTHS[month]} {year}</p>

        <motion.button
          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
          type="button" onClick={nextMonth}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-sky-300 hover:text-sky-600"
        >
          <FaChevronRight className="text-xs" />
        </motion.button>
      </div>

      {/* ── Leyenda ── */}
      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
        {[
          { color: "bg-slate-100 border-slate-200", label: "Sin bloques" },
          { color: "bg-sky-100 border-sky-200", label: "1–2 bloques" },
          { color: "bg-sky-200 border-sky-300", label: "3–5 bloques" },
          { color: "bg-sky-500 border-sky-600", label: "6+ bloques" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`h-3 w-3 rounded-full border ${item.color}`} />
            <span>{item.label}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1.5 text-slate-400">
          <FaInfoCircle className="text-sky-400" />
          <span>Click en un día para seleccionarlo</span>
        </div>
      </div>

      {/* ── Grid del calendario ── */}
      <div className="grid grid-cols-7 gap-1">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-black uppercase tracking-wider text-slate-400">
            {d}
          </div>
        ))}

        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const iso = toIso(year, month, day);
          const count = countMap[iso] ?? 0;
          const isToday = iso === todayIso;
          const past = isPast(day);
          const isSelected = iso === selectedDate;
          const colorClass = getDayColor(count);

          return (
            <motion.button
              key={day}
              type="button"
              whileHover={!past ? { scale: 1.06, y: -2 } : {}}
              whileTap={!past ? { scale: 0.94 } : {}}
              onClick={() => !past && onDayClick(iso)}
              className={[
                "relative flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl border p-2 text-sm font-bold transition-all",
                past
                  ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                  : isSelected
                  ? "cursor-pointer border-sky-500 bg-sky-500 text-white shadow-lg ring-2 ring-sky-300 ring-offset-1"
                  : count > 0
                  ? `cursor-pointer border ${colorClass} shadow-sm hover:shadow-md`
                  : "cursor-pointer border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700",
                isToday && !past && !isSelected ? "ring-2 ring-sky-400 ring-offset-1" : "",
              ].join(" ")}
            >
              <span className={isToday && !isSelected ? "font-black text-sky-600" : ""}>{day}</span>
              {count > 0 && !past && (
                <span className={`text-[10px] font-black leading-none ${isSelected ? "text-sky-100" : "opacity-80"}`}>
                  {count}
                </span>
              )}
              {isToday && !isSelected && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-sky-500" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export { toIso };
