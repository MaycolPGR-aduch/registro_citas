"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { FaCalendarCheck, FaEdit, FaTrash, FaSave, FaTimes, FaFilter, FaList } from "react-icons/fa";
import { sileo } from "sileo";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { fetchJson } from "@/lib/fetcher";
import { ApiPayload, AppointmentStatus, AppointmentSummary } from "@/lib/types";

type EditableAppointment = {
  status: AppointmentStatus;
  reason: string;
  notes: string;
};

const STATUS_OPTIONS: Array<{ value: "" | AppointmentStatus; label: string }> = [
  { value: "", label: "Todos" },
  { value: "scheduled", label: "Programada" },
  { value: "completed", label: "Completada" },
  { value: "cancelled", label: "Cancelada" },
  { value: "no_show", label: "No asistió" },
];

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

export default function CitasPage() {
  const [appointments, setAppointments] = useState<AppointmentSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<"" | AppointmentStatus>("");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<EditableAppointment>({
    status: "scheduled",
    reason: "",
    notes: "",
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<AppointmentSummary | null>(null);

  const filtersQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter) {
      params.set("status", statusFilter);
    }
    return params.toString();
  }, [statusFilter]);

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchJson<ApiPayload<AppointmentSummary[]>>(
        `/api/appointments${filtersQuery ? `?${filtersQuery}` : ""}`,
      );
      setAppointments(response.data);
    } catch (caught) {
      sileo.error({ title: "Error", description: "No se pudieron cargar las citas." });
    } finally {
      setLoading(false);
    }
  }, [filtersQuery]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAppointments();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadAppointments]);

  function startEdit(appointment: AppointmentSummary) {
    setEditingId(appointment.id);
    setEditingForm({
      status: appointment.status,
      reason: appointment.reason ?? "",
      notes: appointment.notes ?? "",
    });
  }

  async function saveEdit(appointmentId: number) {
    try {
      setProcessingId(appointmentId);
      await fetchJson<ApiPayload<AppointmentSummary>>(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingForm),
      });

      setEditingId(null);
      sileo.success({ title: "Actualizado", description: "Cita actualizada correctamente." });
      await loadAppointments();
    } catch (caught) {
      sileo.error({ title: "Error", description: "No se pudo actualizar la cita." });
    } finally {
      setProcessingId(null);
    }
  }

  function confirmDelete(appointment: AppointmentSummary) {
    setAppointmentToDelete(appointment);
    setIsDeleteModalOpen(true);
  }

  async function handleRemove() {
    if (!appointmentToDelete) return;

    try {
      setProcessingId(appointmentToDelete.id);
      await fetchJson<ApiPayload<{ deleted: boolean }>>(`/api/appointments/${appointmentToDelete.id}`, {
        method: "DELETE",
      });

      sileo.success({ title: "Eliminado", description: "Cita eliminada correctamente." });
      setIsDeleteModalOpen(false);
      setAppointmentToDelete(null);
      await loadAppointments();
    } catch (caught) {
      sileo.error({ title: "Error", description: "No se pudo eliminar la cita." });
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Gestión de Citas"
        description="Edita estado y detalles de citas, o elimínalas cuando sea necesario."
        icon={<FaCalendarCheck size={28} />}
      />

      <SectionCard>
        <div className="max-w-xs space-y-1">
          <label htmlFor="status" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <FaFilter className="text-sky-500 text-xs" />
            <span>Filtrar por Estado</span>
          </label>
          <select
            id="status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "" | AppointmentStatus)}
            className="w-full shadow-sm"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </SectionCard>

      <SectionCard>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
            <FaList />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Listado de Citas</h2>
        </div>

        {loading ? (
          <TableSkeleton cols={8} rows={7} />
        ) : (
          <>
            {!loading && appointments.length === 0 && (
              <EmptyState title="Sin citas" description="No hay citas para el filtro seleccionado." />
            )}

            {!loading && appointments.length > 0 && (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Hora</th>
                      <th>Paciente</th>
                      <th>Médico</th>
                      <th>Estado</th>
                      <th>Motivo</th>
                      <th>Notas</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <motion.tbody
                    variants={tableContainerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <AnimatePresence mode="popLayout">
                      {appointments.map((appointment) => {
                        const isEditing = editingId === appointment.id;
                        const isProcessing = processingId === appointment.id;

                        return (
                          <motion.tr key={appointment.id} variants={rowVariants} layout exit="exit">
                            <td>{appointment.appointment_date}</td>
                            <td>{appointment.appointment_time.slice(0, 5)}</td>
                            <td><span className="font-medium text-slate-700">{appointment.patient?.full_name ?? "Sin paciente"}</span></td>
                            <td>
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-900">{appointment.doctor?.full_name ?? "Sin médico"}</span>
                                <span className="text-[10px] font-bold uppercase text-sky-600">{appointment.doctor?.specialty_name ?? ""}</span>
                              </div>
                            </td>
                            <td>
                              {isEditing ? (
                                <select
                                  value={editingForm.status}
                                  onChange={(event) =>
                                    setEditingForm((prev) => ({
                                      ...prev,
                                      status: event.target.value as AppointmentStatus,
                                    }))
                                  }
                                  className="text-sm p-1 shadow-sm rounded"
                                >
                                  {STATUS_OPTIONS.filter((option) => option.value).map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <StatusBadge status={appointment.status} />
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  value={editingForm.reason}
                                  onChange={(event) =>
                                    setEditingForm((prev) => ({ ...prev, reason: event.target.value }))
                                  }
                                  className="text-sm p-1 w-full shadow-sm rounded"
                                />
                              ) : (
                                <span className="text-slate-600 text-sm">{appointment.reason ?? "Sin detalle"}</span>
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  value={editingForm.notes}
                                  onChange={(event) =>
                                    setEditingForm((prev) => ({ ...prev, notes: event.target.value }))
                                  }
                                  className="text-sm p-1 w-full shadow-sm rounded"
                                />
                              ) : (
                                <span className="text-slate-400 text-xs italic">{appointment.notes ?? "Sin notas"}</span>
                              )}
                            </td>
                            <td className="space-x-2">
                              {isEditing ? (
                                <div className="flex gap-2">
                                  <motion.button
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    type="button"
                                    className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs"
                                    onClick={() => void saveEdit(appointment.id)}
                                    disabled={isProcessing}
                                  >
                                    <FaSave />
                                    <span>Guardar</span>
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    type="button"
                                    className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs"
                                    onClick={() => setEditingId(null)}
                                    disabled={isProcessing}
                                  >
                                    <FaTimes />
                                    <span>Cancelar</span>
                                  </motion.button>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <motion.button 
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    type="button" className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs" onClick={() => startEdit(appointment)}>
                                    <FaEdit className="text-sky-600" />
                                    <span>Editar</span>
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.05, backgroundColor: "#fee2e2" }} whileTap={{ scale: 0.95 }}
                                    type="button"
                                    className="btn-danger flex items-center gap-1.5 px-3 py-1.5 text-xs"
                                    onClick={() => confirmDelete(appointment)}
                                    disabled={isProcessing}
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

      {/* Modal de Confirmación para Eliminar */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => void handleRemove()}
        title="Eliminar Cita"
        description={`¿Estás seguro de que deseas eliminar esta cita médica? Esta acción no se puede deshacer.`}
        isLoading={processingId === appointmentToDelete?.id}
      />
    </section>
  );
}
