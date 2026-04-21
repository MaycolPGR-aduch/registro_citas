"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { FaCalendarAlt, FaEdit, FaTimes, FaSave, FaFilter, FaList, FaPlusCircle } from "react-icons/fa";
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
  status: "scheduled" | "cancelled";
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

export default function MisCitasPage() {
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

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<AppointmentSummary | null>(null);

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
      console.log(caught);
      sileo.error({ title: "Error", description: "No se pudieron cargar tus citas." });
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
    if (appointment.status !== "scheduled" && appointment.status !== "cancelled") {
      return;
    }

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editingForm),
      });

      setEditingId(null);
      sileo.success({ title: "Actualizado", description: "Cita actualizada correctamente." });
      await loadAppointments();
    } catch (caught) {
      console.log(caught);
      sileo.error({ title: "Error", description: "No se pudo actualizar la cita." });
    } finally {
      setProcessingId(null);
    }
  }

  function confirmCancel(appointment: AppointmentSummary) {
    setAppointmentToCancel(appointment);
    setIsCancelModalOpen(true);
  }

  async function handleCancel() {
    if (!appointmentToCancel) return;

    try {
      setProcessingId(appointmentToCancel.id);
      await fetchJson<ApiPayload<unknown>>(`/api/appointments/${appointmentToCancel.id}/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      sileo.success({ title: "Cancelada", description: "Cita cancelada correctamente." });
      setIsCancelModalOpen(false);
      setAppointmentToCancel(null);
      await loadAppointments();
    } catch (caught) {
      console.log(caught);
      sileo.error({ title: "Error", description: "No se pudo cancelar la cita." });
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Mis Citas"
        description="Gestiona tus citas médicas: crear nuevas, actualizar detalles y cancelar."
        icon={<FaCalendarAlt size={28} />}
      />

      <SectionCard>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="w-full max-w-xs space-y-1">
            <label htmlFor="status" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FaFilter className="text-sky-500 text-xs" />
              <span>Filtrar por Estado</span>
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "" | AppointmentStatus)}
              className="w-full shadow-sm rounded px-3 py-2"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <Link href="/citas/nueva" className="btn-primary group flex items-center gap-2">
            <FaPlusCircle className="text-sm transition-transform group-hover:scale-110" />
            <span>Reservar Nueva Cita</span>
          </Link>
        </div>
      </SectionCard>

      <SectionCard>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
            <FaList />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Listado de Mis Citas</h2>
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : (
          <>
            {!loading && appointments.length === 0 && (
              <EmptyState title="Sin citas" description="Todavía no tienes citas para el filtro seleccionado." />
            )}

            {!loading && appointments.length > 0 && (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Hora</th>
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
                        const editable = appointment.status === "scheduled" || appointment.status === "cancelled";

                        return (
                          <motion.tr key={appointment.id} variants={rowVariants} layout exit="exit">
                            <td><span className="font-medium text-slate-700">{appointment.appointment_date}</span></td>
                            <td><span className="text-slate-600 font-mono">{appointment.appointment_time.slice(0, 5)}</span></td>
                            <td>
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-800">{appointment.doctor?.full_name ?? "Sin médico"}</span>
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
                                      status: event.target.value as "scheduled" | "cancelled",
                                    }))
                                  }
                                  className="text-sm p-1 shadow-sm rounded border-slate-200"
                                >
                                  <option value="scheduled">Programada</option>
                                  <option value="cancelled">Cancelada</option>
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
                                  className="text-sm p-1 w-full shadow-sm rounded border-slate-200"
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
                                  className="text-sm p-1 w-full shadow-sm rounded border-slate-200"
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
                                    className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs shadow-sm"
                                    onClick={() => void saveEdit(appointment.id)}
                                    disabled={isProcessing}
                                  >
                                    <FaSave />
                                    <span>Guardar</span>
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    type="button"
                                    className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs shadow-sm"
                                    onClick={() => setEditingId(null)}
                                    disabled={isProcessing}
                                  >
                                    <FaTimes />
                                    <span>Cancelar</span>
                                  </motion.button>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  {editable && (
                                    <motion.button 
                                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                      type="button" className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs shadow-sm" onClick={() => startEdit(appointment)}>
                                      <FaEdit className="text-sky-600" />
                                      <span>Editar</span>
                                    </motion.button>
                                  )}
                                  {appointment.status === "scheduled" && (
                                    <motion.button
                                      whileHover={{ scale: 1.05, backgroundColor: "#fee2e2" }} whileTap={{ scale: 0.95 }}
                                      type="button"
                                      className="btn-danger flex items-center gap-1.5 px-3 py-1.5 text-xs shadow-sm"
                                      onClick={() => confirmCancel(appointment)}
                                      disabled={isProcessing}
                                    >
                                      <FaTimes />
                                      <span>Cancelar Cita</span>
                                    </motion.button>
                                  )}
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

      {/* Modal de Confirmación para Cancelar */}
      <ConfirmModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={() => void handleCancel()}
        title="Cancelar Cita"
        description={`¿Estás seguro de que deseas cancelar tu cita médica del día ${appointmentToCancel?.appointment_date}?`}
        confirmText="Confirmar Cancelación"
        isLoading={processingId === appointmentToCancel?.id}
      />
    </section>
  );
}
