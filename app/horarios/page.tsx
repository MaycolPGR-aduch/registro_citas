"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorMessage } from "@/components/ui/error-message";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { SuccessMessage } from "@/components/ui/success-message";
import { fetchJson } from "@/lib/fetcher";
import { ApiPayload, DoctorSummary, ScheduleSummary } from "@/lib/types";

type ScheduleForm = {
  doctor_id: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
};

type BulkScheduleForm = {
  doctor_id: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
  slot_minutes: string;
  is_available: boolean;
};

type BulkScheduleResponse = {
  created: number;
  skipped: number;
  message: string;
};

const INITIAL_FORM: ScheduleForm = {
  doctor_id: "",
  schedule_date: "",
  start_time: "",
  end_time: "",
  is_available: true,
};

const INITIAL_BULK_FORM: BulkScheduleForm = {
  doctor_id: "",
  schedule_date: "",
  start_time: "",
  end_time: "",
  slot_minutes: "30",
  is_available: true,
};

export default function HorariosPage() {
  const [doctors, setDoctors] = useState<DoctorSummary[]>([]);
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([]);

  const [form, setForm] = useState<ScheduleForm>(INITIAL_FORM);
  const [bulkForm, setBulkForm] = useState<BulkScheduleForm>(INITIAL_BULK_FORM);

  const [doctorFilter, setDoctorFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      setError(null);
      await Promise.all([loadDoctors(), loadSchedules()]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cargar la información de horarios.");
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
      setError("Completa médico, fecha, hora inicio y hora fin.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      await fetchJson<ApiPayload<ScheduleSummary>>("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          doctor_id: Number(form.doctor_id),
        }),
      });

      setForm(INITIAL_FORM);
      setSuccess("Horario creado correctamente.");
      await loadSchedules();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo crear el horario.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBulkCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !bulkForm.doctor_id ||
      !bulkForm.schedule_date ||
      !bulkForm.start_time ||
      !bulkForm.end_time ||
      !bulkForm.slot_minutes
    ) {
      setError("Completa médico, fecha, hora inicio, hora fin e intervalo.");
      return;
    }

    try {
      setBulkSubmitting(true);
      setError(null);
      setSuccess(null);

      const response = await fetchJson<ApiPayload<BulkScheduleResponse>>("/api/schedules/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: Number(bulkForm.doctor_id),
          schedule_date: bulkForm.schedule_date,
          start_time: bulkForm.start_time,
          end_time: bulkForm.end_time,
          slot_minutes: Number(bulkForm.slot_minutes),
          is_available: bulkForm.is_available,
        }),
      });

      setSuccess(
        `${response.data.message} Creados: ${response.data.created}. Omitidos: ${response.data.skipped}.`,
      );

      setBulkForm(INITIAL_BULK_FORM);
      await loadSchedules();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudieron generar los bloques horarios.");
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
      setError("Completa médico, fecha, hora inicio y hora fin.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      await fetchJson<ApiPayload<ScheduleSummary>>(`/api/schedules/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingForm,
          doctor_id: Number(editingForm.doctor_id),
        }),
      });

      setEditingId(null);
      setSuccess("Horario actualizado correctamente.");
      await loadSchedules();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo actualizar el horario.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeSchedule(id: number) {
    if (!window.confirm("¿Deseas eliminar este horario?")) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      await fetchJson<ApiPayload<{ deleted: boolean }>>(`/api/schedules/${id}`, {
        method: "DELETE",
      });

      setSuccess("Horario eliminado correctamente.");
      await loadSchedules();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo eliminar el horario.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Horarios"
        description="Gestiona bloques horarios por médico, incluyendo creación manual, generación automática y edición."
      />

      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage message={success} />}

      <SectionCard>
        <h2 className="mb-3 text-lg font-semibold">Nuevo horario individual</h2>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={handleCreate}>
          <div>
            <label htmlFor="doctor_id">Médico *</label>
            <select
              id="doctor_id"
              value={form.doctor_id}
              onChange={(event) => setForm((prev) => ({ ...prev, doctor_id: event.target.value }))}
              required
            >
              <option value="">Seleccionar médico</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="schedule_date">Fecha *</label>
            <input
              id="schedule_date"
              type="date"
              value={form.schedule_date}
              onChange={(event) => setForm((prev) => ({ ...prev, schedule_date: event.target.value }))}
              required
            />
          </div>

          <div className="flex items-end">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_available}
                onChange={(event) => setForm((prev) => ({ ...prev, is_available: event.target.checked }))}
              />
              Disponible
            </label>
          </div>

          <div>
            <label htmlFor="start_time">Hora inicio *</label>
            <input
              id="start_time"
              type="time"
              value={form.start_time}
              onChange={(event) => setForm((prev) => ({ ...prev, start_time: event.target.value }))}
              required
            />
          </div>

          <div>
            <label htmlFor="end_time">Hora fin *</label>
            <input
              id="end_time"
              type="time"
              value={form.end_time}
              onChange={(event) => setForm((prev) => ({ ...prev, end_time: event.target.value }))}
              required
            />
          </div>

          <div className="md:col-span-3">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Guardando..." : "Crear horario"}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard>
        <h2 className="mb-3 text-lg font-semibold">Generación automática de bloques</h2>
        <p className="mb-4 text-sm text-slate-600">
          Crea varios bloques en una sola acción, por ejemplo de 09:00 a 13:00 cada 30 minutos.
        </p>

        <form className="grid gap-3 md:grid-cols-3" onSubmit={handleBulkCreate}>
          <div>
            <label htmlFor="bulk_doctor_id">Médico *</label>
            <select
              id="bulk_doctor_id"
              value={bulkForm.doctor_id}
              onChange={(event) =>
                setBulkForm((prev) => ({ ...prev, doctor_id: event.target.value }))
              }
              required
            >
              <option value="">Seleccionar médico</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="bulk_schedule_date">Fecha *</label>
            <input
              id="bulk_schedule_date"
              type="date"
              value={bulkForm.schedule_date}
              onChange={(event) =>
                setBulkForm((prev) => ({ ...prev, schedule_date: event.target.value }))
              }
              required
            />
          </div>

          <div>
            <label htmlFor="slot_minutes">Intervalo (minutos) *</label>
            <select
              id="slot_minutes"
              value={bulkForm.slot_minutes}
              onChange={(event) =>
                setBulkForm((prev) => ({ ...prev, slot_minutes: event.target.value }))
              }
              required
            >
              <option value="15">15 minutos</option>
              <option value="20">20 minutos</option>
              <option value="30">30 minutos</option>
              <option value="45">45 minutos</option>
              <option value="60">60 minutos</option>
            </select>
          </div>

          <div>
            <label htmlFor="bulk_start_time">Hora inicio *</label>
            <input
              id="bulk_start_time"
              type="time"
              value={bulkForm.start_time}
              onChange={(event) =>
                setBulkForm((prev) => ({ ...prev, start_time: event.target.value }))
              }
              required
            />
          </div>

          <div>
            <label htmlFor="bulk_end_time">Hora fin *</label>
            <input
              id="bulk_end_time"
              type="time"
              value={bulkForm.end_time}
              onChange={(event) =>
                setBulkForm((prev) => ({ ...prev, end_time: event.target.value }))
              }
              required
            />
          </div>

          <div className="flex items-end">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={bulkForm.is_available}
                onChange={(event) =>
                  setBulkForm((prev) => ({ ...prev, is_available: event.target.checked }))
                }
              />
              Crear como disponibles
            </label>
          </div>

          <div className="md:col-span-3">
            <button type="submit" className="btn-primary" disabled={bulkSubmitting}>
              {bulkSubmitting ? "Generando..." : "Generar bloques automáticos"}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard>
        <h2 className="mb-3 text-lg font-semibold">Filtros</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label htmlFor="doctor-filter">Filtrar por médico</label>
            <select
              id="doctor-filter"
              value={doctorFilter}
              onChange={(event) => setDoctorFilter(event.target.value)}
            >
              <option value="">Todos</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="date-filter">Filtrar por fecha</label>
            <input
              id="date-filter"
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <h2 className="mb-3 text-lg font-semibold">Listado</h2>

        {loading && <LoadingState />}
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
              <tbody>
                {schedules.map((schedule) => {
                  const isEditing = editingId === schedule.id;

                  return (
                    <tr key={schedule.id}>
                      <td>
                        {isEditing ? (
                          <input
                            type="date"
                            value={editingForm.schedule_date}
                            onChange={(event) =>
                              setEditingForm((prev) => ({ ...prev, schedule_date: event.target.value }))
                            }
                          />
                        ) : (
                          schedule.schedule_date
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
                          >
                            <option value="">Seleccionar médico</option>
                            {doctors.map((doctor) => (
                              <option key={doctor.id} value={doctor.id}>
                                {doctor.full_name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          schedule.doctor_name
                        )}
                      </td>

                      <td>{schedule.specialty_name ?? "Sin especialidad"}</td>

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
                        ) : schedule.is_available ? (
                          "Sí"
                        ) : (
                          "No"
                        )}
                      </td>

                      <td>{schedule.has_active_appointment ? "Sí" : "No"}</td>

                      <td className="space-x-2">
                        {isEditing ? (
                          <>
                            <button type="button" className="btn-primary" onClick={() => void saveEdit()} disabled={submitting}>
                              Guardar
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => setEditingId(null)}
                              disabled={submitting}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="btn-secondary" onClick={() => startEdit(schedule)}>
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn-danger"
                              onClick={() => void removeSchedule(schedule.id)}
                              disabled={submitting}
                            >
                              Eliminar
                            </button>
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