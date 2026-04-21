"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { FaClock, FaPlus, FaEdit, FaTrash, FaList, FaSave, FaTimes, FaFilter, FaUserMd, FaCalendarAlt } from "react-icons/fa";
import { sileo } from "sileo";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { fetchJson } from "@/lib/fetcher";
import { ApiPayload, DoctorSummary, ScheduleSummary } from "@/lib/types";
import { timeToMinutes } from "@/lib/validation";

type ScheduleForm = {
  doctor_id: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
};

const INITIAL_FORM: ScheduleForm = {
  doctor_id: "",
  schedule_date: "",
  start_time: "",
  end_time: "",
  is_available: true,
};

const tableContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const rowVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { type: "spring", stiffness: 100, damping: 12 }
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

export default function HorariosPage() {
  const [doctors, setDoctors] = useState<DoctorSummary[]>([]);
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([]);

  const [form, setForm] = useState<ScheduleForm>(INITIAL_FORM);
  const [doctorFilter, setDoctorFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<ScheduleSummary | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<ScheduleForm>(INITIAL_FORM);

  const loadDoctors = useCallback(async () => {
    const response = await fetchJson<ApiPayload<DoctorSummary[]>>("/api/doctors");
    setDoctors(response.data);
  }, []);

  const loadSchedules = useCallback(async () => {
    const params = new URLSearchParams();
    if (doctorFilter) params.set("doctorId", doctorFilter);
    if (dateFilter) params.set("date", dateFilter);

    const response = await fetchJson<ApiPayload<ScheduleSummary[]>>(
      `/api/schedules${params.toString() ? `?${params.toString()}` : ""}`,
    );
    setSchedules(response.data);
  }, [dateFilter, doctorFilter]);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([loadDoctors(), loadSchedules()]);
    } catch (caught) {
      sileo.error({ title: "Error", description: caught instanceof Error ? caught.message : "No se pudo cargar la información de horarios." });
    } finally {
      setLoading(false);
    }
  }, [loadDoctors, loadSchedules]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAll();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadAll]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.doctor_id || !form.schedule_date || !form.start_time || !form.end_time) {
      sileo.warning({ title: "Faltan Datos", description: "Por favor completa todos los campos del horario." });
      return;
    }

    if (timeToMinutes(form.end_time) <= timeToMinutes(form.start_time)) {
      sileo.warning({ title: "Error de Tiempo", description: "La hora de fin debe ser posterior a la de inicio." });
      return;
    }

    try {
      setSubmitting(true);
      await fetchJson<ApiPayload<ScheduleSummary>>("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          doctor_id: Number(form.doctor_id),
        }),
      });

      setForm(INITIAL_FORM);
      sileo.success({ title: "Éxito", description: "Horario creado correctamente." });
      setIsModalOpen(false);
      await loadSchedules();
    } catch (caught) {
      sileo.error({ title: "Error", description: caught instanceof Error ? caught.message : "No se pudo crear el horario." });
    } finally {
      setSubmitting(false);
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
      sileo.warning({ title: "Faltan Datos", description: "Completa doctor, fecha, hora inicio y hora fin." });
      return;
    }

    if (timeToMinutes(editingForm.end_time) <= timeToMinutes(editingForm.start_time)) {
      sileo.warning({ title: "Error de Tiempo", description: "La hora de fin debe ser posterior a la de inicio." });
      return;
    }

    try {
      setSubmitting(true);
      await fetchJson<ApiPayload<ScheduleSummary>>(`/api/schedules/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingForm,
          doctor_id: Number(editingForm.doctor_id),
        }),
      });

      setEditingId(null);
      sileo.success({ title: "Actualizado", description: "Horario actualizado correctamente." });
      await loadSchedules();
    } catch (caught) {
      sileo.error({ title: "Error", description: caught instanceof Error ? caught.message : "No se pudo actualizar el horario." });
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
      sileo.error({ title: "Error", description: caught instanceof Error ? caught.message : "No se pudo eliminar el horario." });
    } finally {
      setSubmitting(false);
    }
  }

  function closeModal() {
    setIsModalOpen(false);
    setForm(INITIAL_FORM);
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Horarios"
        description="Gestiona bloques horarios por médico, incluyendo disponibilidad y edición."
        icon={<FaClock size={28} />}
      />

      <SectionCard>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
              <FaFilter />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Filtros de Búsqueda</h2>
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            type="button" className="btn-primary flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
            <FaPlus className="text-sm" />
            <span>Nuevo Horario</span>
          </motion.button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="doctor-filter" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FaUserMd className="text-sky-500 text-xs" />
              <span>Filtrar por Médico</span>
            </label>
            <select
              id="doctor-filter"
              value={doctorFilter}
              onChange={(event) => setDoctorFilter(event.target.value)}
              className="w-full shadow-sm"
            >
              <option value="">Todos los médicos</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="date-filter" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FaCalendarAlt className="text-sky-500 text-xs" />
              <span>Filtrar por Fecha</span>
            </label>
            <input
              id="date-filter"
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="w-full shadow-sm"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
            <FaList />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Listado de Horarios</h2>
        </div>

        {loading ? (
          <TableSkeleton cols={8} rows={7} />
        ) : (
          <>
            {!loading && schedules.length === 0 && (
              <EmptyState title="Sin horarios" description="No hay horarios para los filtros actuales." />
            )}

            {!loading && schedules.length > 0 && (
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
                  <motion.tbody
                    variants={tableContainerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <AnimatePresence mode="popLayout">
                      {schedules.map((schedule) => {
                        const isEditing = editingId === schedule.id;

                        return (
                          <motion.tr key={schedule.id} variants={rowVariants} layout exit="exit">
                            <td>
                              {isEditing ? (
                                <input
                                  type="date"
                                  value={editingForm.schedule_date}
                                  onChange={(event) =>
                                    setEditingForm((prev) => ({ ...prev, schedule_date: event.target.value }))
                                  }
                                  className="w-full shadow-sm"
                                />
                              ) : (
                                <span className="font-semibold text-slate-700">{schedule.schedule_date}</span>
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  type="time"
                                  value={editingForm.start_time}
                                  onChange={(event) =>
                                    setEditingForm((prev) => ({ ...prev, start_time: event.target.value }))
                                  }
                                  className="shadow-sm rounded px-1"
                                />
                              ) : (
                                schedule.start_time.slice(0, 5)
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  type="time"
                                  value={editingForm.end_time}
                                  onChange={(event) =>
                                    setEditingForm((prev) => ({ ...prev, end_time: event.target.value }))
                                  }
                                  className="shadow-sm rounded px-1"
                                />
                              ) : (
                                schedule.end_time.slice(0, 5)
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <select
                                  value={editingForm.doctor_id}
                                  onChange={(event) =>
                                    setEditingForm((prev) => ({ ...prev, doctor_id: event.target.value }))
                                  }
                                  className="w-full shadow-sm"
                                >
                                  <option value="">Seleccionar médico</option>
                                  {doctors.map((doctor) => (
                                    <option key={doctor.id} value={doctor.id}>
                                      {doctor.full_name}
                                    </option>
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
                                  <input
                                    type="checkbox"
                                    checked={editingForm.is_available}
                                    onChange={(event) =>
                                      setEditingForm((prev) => ({ ...prev, is_available: event.target.checked }))
                                    }
                                  />
                                  Disponible
                                </label>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className={`h-2 w-2 rounded-full ${schedule.is_available ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                                  <span className={schedule.is_available ? 'text-emerald-600 font-medium' : 'text-rose-500 font-medium'}>
                                    {schedule.is_available ? "Si" : "No"}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td>
                              {schedule.has_active_appointment ? (
                                <span className="text-sky-600 font-bold text-xs uppercase tracking-tighter">Reservado</span>
                              ) : (
                                <span className="text-slate-300 font-medium text-xs">Libre</span>
                              )}
                            </td>
                            <td className="space-x-2">
                              {isEditing ? (
                                <div className="flex gap-2">
                                  <motion.button 
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    type="button" className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs" onClick={() => void saveEdit()} disabled={submitting}>
                                    <FaSave />
                                    <span>Guardar</span>
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    type="button"
                                    className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs"
                                    onClick={() => setEditingId(null)}
                                    disabled={submitting}
                                  >
                                    <FaTimes />
                                    <span>Cancelar</span>
                                  </motion.button>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <motion.button 
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    type="button" className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs" onClick={() => startEdit(schedule)}>
                                    <FaEdit className="text-sky-600" />
                                    <span>Editar</span>
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.05, backgroundColor: "#fee2e2" }} whileTap={{ scale: 0.95 }}
                                    type="button"
                                    className="btn-danger flex items-center gap-1.5 px-3 py-1.5 text-xs"
                                    onClick={() => confirmDelete(schedule)}
                                    disabled={submitting}
                                  >
                                    <FaTrash />
                                    <span>Eliminar</span>
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
          </>
        )}
      </SectionCard>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={
        <div className="flex items-center gap-2">
          <FaClock className="text-sky-600" />
          <span>Nuevo Horario</span>
        </div>
      }>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            await handleCreate(e);
          }}
        >
          <div className="space-y-1">
            <label htmlFor="modal-doctor_id" className="text-sm font-semibold text-slate-700">Médico *</label>
            <select
              id="modal-doctor_id"
              value={form.doctor_id}
              onChange={(event) => setForm((prev) => ({ ...prev, doctor_id: event.target.value }))}
              required
              className="w-full shadow-sm rounded-xl border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            >
              <option value="">Seleccionar médico</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="modal-schedule_date" className="text-sm font-semibold text-slate-700">Fecha *</label>
            <input
              id="modal-schedule_date"
              type="date"
              value={form.schedule_date}
              onChange={(event) => setForm((prev) => ({ ...prev, schedule_date: event.target.value }))}
              required
              className="w-full shadow-sm rounded-xl border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="modal-start_time" className="text-sm font-semibold text-slate-700">Hora inicio *</label>
              <input
                id="modal-start_time"
                type="time"
                value={form.start_time}
                onChange={(event) => setForm((prev) => ({ ...prev, start_time: event.target.value }))}
                required
                className="w-full shadow-sm rounded-xl border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="modal-end_time" className="text-sm font-semibold text-slate-700">Hora fin *</label>
              <input
                id="modal-end_time"
                type="time"
                value={form.end_time}
                onChange={(event) => setForm((prev) => ({ ...prev, end_time: event.target.value }))}
                required
                className="w-full shadow-sm rounded-xl border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_available}
                onChange={(event) => setForm((prev) => ({ ...prev, is_available: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-sky-600"
              />
              <span className="text-sm font-semibold text-slate-700">Horario disponible para reserva</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" className="btn-secondary flex items-center gap-2" onClick={closeModal}>
              <FaTimes />
              <span>Cancelar</span>
            </button>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={submitting}>
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <FaSave />
                  <span>Crear Horario</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Confirmación para Eliminar */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => void handleRemove()}
        title="Eliminar Horario"
        description={`¿Estás seguro de que deseas eliminar este bloque de horario? Esta acción podría afectar a las citas programadas.`}
        isLoading={submitting}
      />
    </section>
  );
}
