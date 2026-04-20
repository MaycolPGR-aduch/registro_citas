"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorMessage } from "@/components/ui/error-message";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { SuccessMessage } from "@/components/ui/success-message";
import { fetchJson } from "@/lib/fetcher";
import { ApiPayload, DoctorSummary, PatientSummary, ScheduleSummary, UserRole } from "@/lib/types";

type AppointmentForm = {
  patient_id: string;
  doctor_id: string;
  schedule_id: string;
  reason: string;
};

type AuthMePayload = {
  user_id: string;
  role: UserRole;
  patient_id: number | null;
};

const INITIAL_FORM: AppointmentForm = {
  patient_id: "",
  doctor_id: "",
  schedule_id: "",
  reason: "",
};

export default function NuevaCitaPage() {
  const [currentUser, setCurrentUser] = useState<AuthMePayload | null>(null);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [doctors, setDoctors] = useState<DoctorSummary[]>([]);
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([]);
  const [dateFilter, setDateFilter] = useState("");
  const [form, setForm] = useState<AppointmentForm>(INITIAL_FORM);
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isPatient = currentUser?.role === "patient";
  const canLoadSchedules = useMemo(() => Boolean(form.doctor_id), [form.doctor_id]);

  const loadBaseData = useCallback(async () => {
    try {
      setLoadingBase(true);
      setError(null);

      const meResponse = await fetchJson<ApiPayload<AuthMePayload>>("/api/auth/me");
      const me = meResponse.data;
      setCurrentUser(me);

      const doctorsResponse = await fetchJson<ApiPayload<DoctorSummary[]>>("/api/doctors");
      setDoctors(doctorsResponse.data.filter((doctor) => doctor.active));

      if (me.role !== "patient") {
        const patientsResponse = await fetchJson<ApiPayload<PatientSummary[]>>("/api/patients");
        setPatients(patientsResponse.data);
      } else {
        setPatients([]);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cargar informacion base.");
    } finally {
      setLoadingBase(false);
    }
  }, []);

  const loadSchedules = useCallback(async () => {
    if (!canLoadSchedules) {
      setSchedules([]);
      return;
    }

    try {
      setLoadingSchedules(true);
      setError(null);

      const params = new URLSearchParams({
        doctorId: form.doctor_id,
      });
      if (dateFilter) {
        params.set("date", dateFilter);
      }

      const response = await fetchJson<ApiPayload<ScheduleSummary[]>>(`/api/schedules/available?${params.toString()}`);
      setSchedules(response.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudieron cargar horarios.");
    } finally {
      setLoadingSchedules(false);
    }
  }, [canLoadSchedules, dateFilter, form.doctor_id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBaseData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadBaseData]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSchedules();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadSchedules]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess(null);

    const patientIdToSend = isPatient ? currentUser?.patient_id : Number(form.patient_id);

    if ((!isPatient && !form.patient_id) || !form.doctor_id || !form.schedule_id) {
      setError("Debes seleccionar paciente, medico y horario.");
      return;
    }

    if (isPatient && !patientIdToSend) {
      setError("Tu cuenta no tiene un perfil de paciente asociado.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await fetchJson<ApiPayload<unknown>>("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patient_id: patientIdToSend,
          doctor_id: Number(form.doctor_id),
          schedule_id: Number(form.schedule_id),
          reason: form.reason,
        }),
      });

      setSuccess("Cita registrada correctamente.");
      setForm((prev) => ({
        ...prev,
        schedule_id: "",
        reason: "",
      }));

      await loadSchedules();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo registrar la cita.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Nueva Cita"
        description="Registra una cita medica validando disponibilidad y consistencia de datos."
      />

      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage message={success} />}

      {loadingBase && <LoadingState />}

      {!loadingBase && (
        <SectionCard>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
            {!isPatient && (
              <div>
                <label htmlFor="patient_id">Paciente *</label>
                <select
                  id="patient_id"
                  value={form.patient_id}
                  onChange={(event) => setForm((prev) => ({ ...prev, patient_id: event.target.value }))}
                  required
                >
                  <option value="">Seleccionar paciente</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.full_name} {patient.dni ? `- ${patient.dni}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="doctor_id">Medico *</label>
              <select
                id="doctor_id"
                value={form.doctor_id}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    doctor_id: event.target.value,
                    schedule_id: "",
                  }))
                }
                required
              >
                <option value="">Seleccionar medico</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.full_name} ({doctor.specialty_name ?? "Sin especialidad"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="date_filter">Fecha (filtro opcional)</label>
              <input
                id="date_filter"
                type="date"
                value={dateFilter}
                onChange={(event) => {
                  setDateFilter(event.target.value);
                  setForm((prev) => ({ ...prev, schedule_id: "" }));
                }}
              />
            </div>

            <div>
              <label htmlFor="schedule_id">Horario *</label>
              <select
                id="schedule_id"
                value={form.schedule_id}
                onChange={(event) => setForm((prev) => ({ ...prev, schedule_id: event.target.value }))}
                required
                disabled={!canLoadSchedules || loadingSchedules}
              >
                <option value="">Seleccionar horario</option>
                {schedules.map((schedule) => (
                  <option key={schedule.id} value={schedule.id}>
                    {schedule.schedule_date} | {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="reason">Motivo de consulta</label>
              <textarea
                id="reason"
                value={form.reason}
                onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
                rows={3}
                placeholder="Describe brevemente el motivo"
              />
            </div>

            <div className="md:col-span-2">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? "Registrando..." : "Registrar cita"}
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      {!loadingBase && canLoadSchedules && !loadingSchedules && schedules.length === 0 && (
        <EmptyState
          title="Sin horarios para seleccion"
          description="No hay horarios disponibles para ese medico en los filtros actuales."
        />
      )}
    </section>
  );
}
