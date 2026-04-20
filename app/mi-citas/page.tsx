"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorMessage } from "@/components/ui/error-message";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { SuccessMessage } from "@/components/ui/success-message";
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
  { value: "no_show", label: "No asistio" },
];

export default function MisCitasPage() {
  const [appointments, setAppointments] = useState<AppointmentSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<"" | AppointmentStatus>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<EditableAppointment>({
    status: "scheduled",
    reason: "",
    notes: "",
  });

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
      setError(null);
      const response = await fetchJson<ApiPayload<AppointmentSummary[]>>(
        `/api/appointments${filtersQuery ? `?${filtersQuery}` : ""}`,
      );
      setAppointments(response.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudieron cargar tus citas.");
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
      setError(null);
      setSuccess(null);

      await fetchJson<ApiPayload<AppointmentSummary>>(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editingForm),
      });

      setEditingId(null);
      setSuccess("Cita actualizada correctamente.");
      await loadAppointments();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo actualizar la cita.");
    } finally {
      setProcessingId(null);
    }
  }

  async function cancelAppointment(appointmentId: number) {
    if (!window.confirm("Deseas cancelar esta cita?")) {
      return;
    }

    try {
      setProcessingId(appointmentId);
      setError(null);
      setSuccess(null);

      await fetchJson<ApiPayload<unknown>>(`/api/appointments/${appointmentId}/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      setSuccess("Cita cancelada correctamente.");
      await loadAppointments();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cancelar la cita.");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Mis Citas"
        description="Gestiona tus citas medicas: crear nuevas, actualizar detalles y cancelar."
      />

      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage message={success} />}

      <SectionCard>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="w-full max-w-xs">
            <label htmlFor="status">Filtrar por estado</label>
            <select
              id="status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "" | AppointmentStatus)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <Link href="/citas/nueva" className="btn-primary">
            Reservar nueva cita
          </Link>
        </div>
      </SectionCard>

      <SectionCard>
        {loading && <LoadingState />}
        {!loading && appointments.length === 0 && (
          <EmptyState title="Sin citas" description="Todavia no tienes citas para el filtro seleccionado." />
        )}

        {!loading && appointments.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Medico</th>
                  <th>Estado</th>
                  <th>Motivo</th>
                  <th>Notas</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => {
                  const isEditing = editingId === appointment.id;
                  const isProcessing = processingId === appointment.id;
                  const editable = appointment.status === "scheduled" || appointment.status === "cancelled";

                  return (
                    <tr key={appointment.id}>
                      <td>{appointment.appointment_date}</td>
                      <td>{appointment.appointment_time.slice(0, 5)}</td>
                      <td>
                        {appointment.doctor?.full_name ?? "Sin medico"}
                        {appointment.doctor?.specialty_name ? ` (${appointment.doctor.specialty_name})` : ""}
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
                          />
                        ) : (
                          appointment.reason ?? "Sin detalle"
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            value={editingForm.notes}
                            onChange={(event) =>
                              setEditingForm((prev) => ({ ...prev, notes: event.target.value }))
                            }
                          />
                        ) : (
                          appointment.notes ?? "Sin notas"
                        )}
                      </td>
                      <td className="space-x-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={() => void saveEdit(appointment.id)}
                              disabled={isProcessing}
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => setEditingId(null)}
                              disabled={isProcessing}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            {editable && (
                              <button type="button" className="btn-secondary" onClick={() => startEdit(appointment)}>
                                Editar
                              </button>
                            )}
                            {appointment.status === "scheduled" && (
                              <button
                                type="button"
                                className="btn-danger"
                                onClick={() => void cancelAppointment(appointment.id)}
                                disabled={isProcessing}
                              >
                                Cancelar cita
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </section>
  );
}
