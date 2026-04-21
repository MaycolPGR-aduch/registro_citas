"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  FaCalendarDay,
  FaLayerGroup,
  FaList,
  FaEdit,
  FaTrash,
  FaSave,
  FaTimes,
  FaFilter,
  FaTimesCircle,
  FaCalendarAlt,
  FaUserMd,
} from "react-icons/fa";
import { sileo } from "sileo";
import { ScheduleCalendar } from "@/components/ui/schedule-calendar";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/loading-state";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { fetchJson } from "@/lib/fetcher";
import { timeToMinutes } from "@/lib/validation";
import { ApiPayload, DoctorSummary, ScheduleSummary } from "@/lib/types";

type ScheduleEditForm = {
  doctor_id: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
};

type BulkForm = {
  doctor_id: string;
  start_time: string;
  end_time: string;
  slot_minutes: string;
  is_available: boolean;
};

type BulkResult = {
  created: number;
  skipped: number;
  message: string;
};

const INITIAL_BULK_FORM: BulkForm = {
  doctor_id: "",
  start_time: "08:00",
  end_time: "13:00",
  slot_minutes: "30",
  is_available: true,
};

const SLOT_OPTIONS = [
  { value: "15", label: "15 min" },
  { value: "20", label: "20 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" },
];

const tableContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1, x: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 12 },
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.18 } },
};

function calcSlots(start: string, end: string, slotMin: number): number {
  if (!start || !end || slotMin <= 0) return 0;
  const diff = timeToMinutes(end) - timeToMinutes(start);
  return diff > 0 ? Math.floor(diff / slotMin) : 0;
}


export default function CalendarioPage() {
  const [doctors, setDoctors] = useState<DoctorSummary[]>([]);
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([]);

  const [activeDoctor, setActiveDoctor] = useState("");
  const [activeDate, setActiveDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

 
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<ScheduleEditForm>({
    doctor_id: "", schedule_date: "", start_time: "", end_time: "", is_available: true,
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<ScheduleSummary | null>(null);

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState<BulkForm>(INITIAL_BULK_FORM);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const hasActiveFilter = activeDoctor !== "" || activeDate !== "";

  useEffect(() => {
    fetchJson<ApiPayload<DoctorSummary[]>>("/api/doctors")
      .then((res) => setDoctors(res.data.filter((d) => d.active)))
      .catch(() => sileo.error({ title: "Error", description: "No se pudieron cargar los médicos." }));
  }, []);

  const loadSchedules = useCallback(async () => {
    if (!hasActiveFilter) {
      setSchedules([]);
      return;
    }
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeDoctor) params.set("doctorId", activeDoctor);
      if (activeDate) params.set("date", activeDate);
      const res = await fetchJson<ApiPayload<ScheduleSummary[]>>(
        `/api/schedules?${params.toString()}`,
      );
      setSchedules(res.data);
    } catch (caught) {
      sileo.error({
        title: "Error",
        description: caught instanceof Error ? caught.message : "No se pudieron cargar los horarios.",
      });
    } finally {
      setLoading(false);
    }
  }, [activeDoctor, activeDate, hasActiveFilter]);

  useEffect(() => {
    const id = window.setTimeout(() => void loadSchedules(), 0);
    return () => window.clearTimeout(id);
  }, [loadSchedules]);

  function clearFilters() {
    setActiveDoctor("");
    setActiveDate("");
    setSchedules([]);
  }

  function handleDayClick(date: string) {
    setActiveDate(date);
  }

  function openBulkModal() {
    setBulkForm({ ...INITIAL_BULK_FORM, doctor_id: activeDoctor });
    setIsBulkModalOpen(true);
  }

  const slotPreview = useMemo(
    () => calcSlots(bulkForm.start_time, bulkForm.end_time, Number(bulkForm.slot_minutes)),
    [bulkForm.start_time, bulkForm.end_time, bulkForm.slot_minutes],
  );

  async function handleBulkSubmit() {
    if (!activeDate) {
      sileo.warning({ title: "Sin Fecha", description: "Selecciona un día en el calendario primero." });
      return;
    }
    if (!bulkForm.doctor_id) {
      sileo.warning({ title: "Falta Médico", description: "Selecciona un médico para generar los bloques." });
      return;
    }
    if (!bulkForm.start_time || !bulkForm.end_time) {
      sileo.warning({ title: "Faltan Horas", description: "Completa la hora de inicio y fin." });
      return;
    }
    if (timeToMinutes(bulkForm.end_time) <= timeToMinutes(bulkForm.start_time)) {
      sileo.warning({ title: "Rango Inválido", description: "La hora de fin debe ser posterior a la de inicio." });
      return;
    }
    if (slotPreview === 0) {
      sileo.warning({ title: "Sin Bloques", description: "El rango es menor al intervalo seleccionado." });
      return;
    }

    try {
      setBulkSubmitting(true);
      const res = await fetchJson<ApiPayload<BulkResult>>("/api/schedules/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: Number(bulkForm.doctor_id),
          schedule_date: activeDate,
          start_time: bulkForm.start_time,
          end_time: bulkForm.end_time,
          slot_minutes: Number(bulkForm.slot_minutes),
          is_available: bulkForm.is_available,
        }),
      });

      const { created, skipped } = res.data;
      sileo.success({
        title: "Bloques Generados",
        description: `${created} bloque${created !== 1 ? "s" : ""} creado${created !== 1 ? "s" : ""}${skipped > 0 ? `, ${skipped} omitido${skipped !== 1 ? "s" : ""} (ya existían)` : ""}.`,
      });

      setIsBulkModalOpen(false);
      await loadSchedules();
    } catch (caught) {
      sileo.error({
        title: "Error",
        description: caught instanceof Error ? caught.message : "No se pudieron generar los bloques.",
      });
    } finally {
      setBulkSubmitting(false);
    }
  }

  function startEdit(item: ScheduleSummary) {
    setEditingId(item.id);
    setEditingForm({
      doctor_id: String(item.doctor_id),
      schedule_date: item.schedule_date,
      start_time: item.start_time.slice(0, 5),
      end_time: item.end_time.slice(0, 5),
      is_available: item.is_available,
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    if (!editingForm.doctor_id || !editingForm.schedule_date || !editingForm.start_time || !editingForm.end_time) {
      sileo.warning({ title: "Faltan Datos", description: "Completa todos los campos requeridos." });
      return;
    }
    if (timeToMinutes(editingForm.end_time) <= timeToMinutes(editingForm.start_time)) {
      sileo.warning({ title: "Rango Inválido", description: "La hora de fin debe ser posterior a la de inicio." });
      return;
    }
    try {
      setSubmitting(true);
      await fetchJson<ApiPayload<ScheduleSummary>>(`/api/schedules/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editingForm, doctor_id: Number(editingForm.doctor_id) }),
      });
      setEditingId(null);
      sileo.success({ title: "Actualizado", description: "Horario actualizado correctamente." });
      await loadSchedules();
    } catch (caught) {
      sileo.error({ title: "Error", description: caught instanceof Error ? caught.message : "No se pudo actualizar." });
    } finally {
      setSubmitting(false);
    }
  }

  function confirmDelete(item: ScheduleSummary) {
    setScheduleToDelete(item);
    setIsDeleteModalOpen(true);
  }

  async function handleRemove() {
    if (!scheduleToDelete) return;
    try {
      setSubmitting(true);
      await fetchJson<ApiPayload<{ deleted: boolean }>>(`/api/schedules/${scheduleToDelete.id}`, {
        method: "DELETE",
      });
      sileo.success({ title: "Eliminado", description: "Horario eliminado correctamente." });
      setIsDeleteModalOpen(false);
      setScheduleToDelete(null);
      await loadSchedules();
    } catch (caught) {
      sileo.error({ title: "Error", description: caught instanceof Error ? caught.message : "No se pudo eliminar." });
    } finally {
      setSubmitting(false);
    }
  }

  const activeDoctorName = doctors.find((d) => String(d.id) === activeDoctor)?.full_name ?? null;
  const activeDateLabel = activeDate
    ? new Intl.DateTimeFormat("es-PE", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
        .format(new Date(`${activeDate}T00:00:00`))
    : null;

  return (
    <section className="space-y-6">
      <PageHeader
        title="Agenda de Horarios"
        description="Filtra por médico y selecciona un día para ver o generar bloques de horario."
        icon={<FaCalendarDay size={28} />}
      />

      {/* ── Sección 1: Calendario ── */}
      <SectionCard>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
              <FaCalendarAlt />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">Calendario</h2>
              <p className="text-xs text-slate-400">
                Filtra por médico · haz click en un día para seleccionarlo
              </p>
            </div>
          </div>

          {/* Botón generar bloques — solo visible cuando hay fecha seleccionada */}
          <AnimatePresence>
            {activeDate && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={openBulkModal}
                className="btn-primary flex items-center gap-2 shadow-lg shadow-sky-100"
              >
                <FaLayerGroup className="text-sm" />
                <span>Generar bloques</span>
                <span className="rounded-lg bg-sky-400/30 px-2 py-0.5 text-xs font-black">
                  {new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short" })
                    .format(new Date(`${activeDate}T00:00:00`))}
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <ScheduleCalendar
          doctors={doctors}
          doctorFilter={activeDoctor}
          selectedDate={activeDate}
          onDoctorFilterChange={setActiveDoctor}
          onDayClick={handleDayClick}
        />
      </SectionCard>

      {/* ── Sección 2: Filtros activos + tabla ── */}
      <AnimatePresence>
        {hasActiveFilter && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: "spring" as const, stiffness: 120, damping: 16 }}
            className="space-y-4"
          >
            {/* Badges de filtros activos */}
            <SectionCard>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                    <FaFilter />
                  </div>
                  <span className="text-sm font-black text-slate-700">Mostrando horarios de:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {activeDoctorName && (
                    <span className="flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                      <FaUserMd className="text-[10px]" />
                      {activeDoctorName}
                      <button
                        type="button"
                        onClick={() => setActiveDoctor("")}
                        className="ml-0.5 text-sky-400 transition-colors hover:text-sky-700"
                        aria-label="Quitar filtro de médico"
                      >
                        <FaTimesCircle />
                      </button>
                    </span>
                  )}
                  {activeDateLabel && (
                    <span className="flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                      <FaCalendarAlt className="text-[10px]" />
                      {activeDateLabel}
                      <button
                        type="button"
                        onClick={() => setActiveDate("")}
                        className="ml-0.5 text-indigo-400 transition-colors hover:text-indigo-700"
                        aria-label="Quitar filtro de fecha"
                      >
                        <FaTimesCircle />
                      </button>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <FaTimesCircle className="text-[10px]" />
                    <span>Limpiar todo</span>
                  </button>
                </div>
              </div>
            </SectionCard>

            {/* Tabla */}
            <SectionCard>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                  <FaList />
                </div>
                <h2 className="text-lg font-black text-slate-800">
                  Horarios
                  {schedules.length > 0 && (
                    <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-sm font-black text-sky-700">
                      {schedules.length}
                    </span>
                  )}
                </h2>
              </div>

              {loading ? (
                <TableSkeleton cols={8} rows={5} />
              ) : schedules.length === 0 ? (
                <EmptyState
                  title="Sin horarios para este filtro"
                  description="No hay bloques registrados. Usa el botón 'Generar bloques' para crearlos."
                />
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Inicio</th>
                        <th>Fin</th>
                        <th>Médico</th>
                        <th>Especialidad</th>
                        <th>Disponible</th>
                        <th>Cita activa</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <motion.tbody variants={tableContainerVariants} initial="hidden" animate="visible">
                      <AnimatePresence mode="popLayout">
                        {schedules.map((schedule) => {
                          const isEditing = editingId === schedule.id;
                          return (
                            <motion.tr key={schedule.id} variants={rowVariants} layout exit="exit">
                              <td>
                                {isEditing ? (
                                  <input type="date" value={editingForm.schedule_date}
                                    onChange={(e) => setEditingForm((p) => ({ ...p, schedule_date: e.target.value }))}
                                    className="w-full shadow-sm" />
                                ) : (
                                  <span className="font-semibold text-slate-700">{schedule.schedule_date}</span>
                                )}
                              </td>
                              <td>
                                {isEditing ? (
                                  <input type="time" value={editingForm.start_time}
                                    onChange={(e) => setEditingForm((p) => ({ ...p, start_time: e.target.value }))}
                                    className="shadow-sm rounded px-1" />
                                ) : schedule.start_time.slice(0, 5)}
                              </td>
                              <td>
                                {isEditing ? (
                                  <input type="time" value={editingForm.end_time}
                                    onChange={(e) => setEditingForm((p) => ({ ...p, end_time: e.target.value }))}
                                    className="shadow-sm rounded px-1" />
                                ) : schedule.end_time.slice(0, 5)}
                              </td>
                              <td>
                                {isEditing ? (
                                  <select value={editingForm.doctor_id}
                                    onChange={(e) => setEditingForm((p) => ({ ...p, doctor_id: e.target.value }))}
                                    className="w-full shadow-sm">
                                    <option value="">Seleccionar médico</option>
                                    {doctors.map((d) => (
                                      <option key={d.id} value={d.id}>{d.full_name}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="font-medium text-slate-800">{schedule.doctor_name}</span>
                                )}
                              </td>
                              <td>
                                <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                                  {schedule.specialty_name ?? "Sin especialidad"}
                                </span>
                              </td>
                              <td>
                                {isEditing ? (
                                  <label className="inline-flex items-center gap-2">
                                    <input type="checkbox" checked={editingForm.is_available}
                                      onChange={(e) => setEditingForm((p) => ({ ...p, is_available: e.target.checked }))} />
                                    Disponible
                                  </label>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full ${schedule.is_available ? "bg-emerald-500" : "bg-rose-400"}`} />
                                    <span className={schedule.is_available ? "text-emerald-600 font-medium" : "text-rose-500 font-medium"}>
                                      {schedule.is_available ? "Sí" : "No"}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td>
                                {schedule.has_active_appointment ? (
                                  <span className="text-xs font-bold uppercase tracking-tighter text-sky-600">Reservado</span>
                                ) : (
                                  <span className="text-xs font-medium text-slate-300">Libre</span>
                                )}
                              </td>
                              <td>
                                {isEditing ? (
                                  <div className="flex gap-2">
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                      type="button" className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs"
                                      onClick={() => void saveEdit()} disabled={submitting}>
                                      <FaSave /><span>Guardar</span>
                                    </motion.button>
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                      type="button" className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs"
                                      onClick={() => setEditingId(null)} disabled={submitting}>
                                      <FaTimes /><span>Cancelar</span>
                                    </motion.button>
                                  </div>
                                ) : (
                                  <div className="flex gap-2">
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                      type="button" className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs"
                                      onClick={() => startEdit(schedule)}>
                                      <FaEdit className="text-sky-600" /><span>Editar</span>
                                    </motion.button>
                                    <motion.button whileHover={{ scale: 1.05, backgroundColor: "#fee2e2" }} whileTap={{ scale: 0.95 }}
                                      type="button" className="btn-danger flex items-center gap-1.5 px-3 py-1.5 text-xs"
                                      onClick={() => confirmDelete(schedule)} disabled={submitting}>
                                      <FaTrash /><span>Eliminar</span>
                                    </motion.button>
                                  </div>
                                )}
                              </td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </motion.tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mensaje cuando no hay filtros */}
      <AnimatePresence>
        {!hasActiveFilter && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SectionCard>
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <FaFilter className="text-2xl" />
                </div>
                <div>
                  <p className="text-base font-black text-slate-600">Selecciona un médico o un día</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Usa el filtro del calendario para ver los horarios de un médico,<br />
                    o haz click en un día para ver los bloques de esa fecha.
                  </p>
                </div>
              </div>
            </SectionCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal de generación bulk — fuera de SectionCard para evitar z-index/overflow issues ── */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <FaLayerGroup className="text-sky-600" />
            <span>Generar Bloques</span>
            {activeDate && (
              <span className="ml-1 rounded-lg border border-sky-100 bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-700">
                {new Intl.DateTimeFormat("es-PE", { weekday: "short", day: "numeric", month: "short" })
                  .format(new Date(`${activeDate}T00:00:00`))}
              </span>
            )}
          </div>
        }
      >
        <div className="space-y-5">
          {/* Médico */}
          <div className="space-y-1">
            <label htmlFor="bulk-doctor" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FaUserMd className="text-sky-500 text-xs" />
              <span>Médico *</span>
            </label>
            <select
              id="bulk-doctor"
              value={bulkForm.doctor_id}
              onChange={(e) => setBulkForm((p) => ({ ...p, doctor_id: e.target.value }))}
              className="w-full shadow-sm"
            >
              <option value="">Seleccionar médico</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}{d.specialty_name ? ` — ${d.specialty_name}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Horas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="bulk-start" className="text-sm font-semibold text-slate-700">Hora inicio *</label>
              <input id="bulk-start" type="time" value={bulkForm.start_time}
                onChange={(e) => setBulkForm((p) => ({ ...p, start_time: e.target.value }))}
                className="w-full shadow-sm" />
            </div>
            <div className="space-y-1">
              <label htmlFor="bulk-end" className="text-sm font-semibold text-slate-700">Hora fin *</label>
              <input id="bulk-end" type="time" value={bulkForm.end_time}
                onChange={(e) => setBulkForm((p) => ({ ...p, end_time: e.target.value }))}
                className="w-full shadow-sm" />
            </div>
          </div>

          {/* Intervalo */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Intervalo por bloque *</label>
            <div className="flex flex-wrap gap-2">
              {SLOT_OPTIONS.map((opt) => {
                const slots = calcSlots(bulkForm.start_time, bulkForm.end_time, Number(opt.value));
                const active = bulkForm.slot_minutes === opt.value;
                return (
                  <motion.button
                    key={opt.value}
                    type="button"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setBulkForm((p) => ({ ...p, slot_minutes: opt.value }))}
                    className={[
                      "flex flex-col items-center rounded-xl border px-3 py-2 text-xs font-bold transition-all",
                      active
                        ? "border-sky-500 bg-sky-500 text-white shadow-md shadow-sky-100"
                        : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50",
                    ].join(" ")}
                  >
                    <span>{opt.label}</span>
                    {slots > 0 && (
                      <span className={`text-[10px] font-black ${active ? "text-sky-100" : "text-slate-400"}`}>
                        ~{slots} bloques
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Preview animado */}
          <AnimatePresence>
            {slotPreview > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3"
              >
                <FaLayerGroup className="shrink-0 text-sky-500" />
                <div>
                  <p className="text-sm font-black text-sky-800">
                    Se generarán <span className="text-sky-600">{slotPreview} bloques</span>
                  </p>
                  <p className="text-xs text-sky-600">
                    De {bulkForm.start_time} a {bulkForm.end_time} · cada {bulkForm.slot_minutes} min
                    {activeDate && ` · ${new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short" }).format(new Date(`${activeDate}T00:00:00`))}`}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Disponibilidad */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <label className="inline-flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={bulkForm.is_available}
                onChange={(e) => setBulkForm((p) => ({ ...p, is_available: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-sky-600"
              />
              <div>
                <p className="text-sm font-semibold text-slate-700">Marcar como disponibles</p>
                <p className="text-xs text-slate-400">Los bloques estarán listos para reserva inmediata</p>
              </div>
            </label>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              className="btn-secondary flex items-center gap-2"
              onClick={() => setIsBulkModalOpen(false)}
              disabled={bulkSubmitting}
            >
              <FaTimes className="text-xs" />
              <span>Cancelar</span>
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              className="btn-primary flex items-center gap-2 shadow-lg shadow-sky-100"
              onClick={() => void handleBulkSubmit()}
              disabled={bulkSubmitting}
            >
              {bulkSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Generando...</span>
                </>
              ) : (
                <>
                  <FaLayerGroup className="text-xs" />
                  <span>Generar {slotPreview > 0 ? `${slotPreview} bloques` : "bloques"}</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </Modal>

      {/* Modal de eliminación */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => void handleRemove()}
        title="Eliminar Horario"
        description="¿Estás seguro de que deseas eliminar este bloque? Esta acción podría afectar citas programadas."
        isLoading={submitting}
      />
    </section>
  );
}
