"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorMessage } from "@/components/ui/error-message";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { SuccessMessage } from "@/components/ui/success-message";
import { fetchJson } from "@/lib/fetcher";
import {
  ApiPayload,
  DoctorSummary,
  PatientSummary,
  ScheduleSummary,
  SpecialtySummary,
  UserRole,
} from "@/lib/types";

type AppointmentForm = {
  patient_id: string;
  specialty_id: string;
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
  specialty_id: "",
  doctor_id: "",
  schedule_id: "",
  reason: "",
};

function formatTimeRange(schedule: ScheduleSummary) {
  return `${schedule.start_time.slice(0, 5)} - ${schedule.end_time.slice(0, 5)}`;
}

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

  const specialtyOptions = useMemo<SpecialtySummary[]>(() => {
    const map = new Map<number, SpecialtySummary>();

    for (const doctor of doctors) {
      if (!doctor.specialty_id) continue;

      if (!map.has(doctor.specialty_id)) {
        map.set(doctor.specialty_id, {
          id: doctor.specialty_id,
          name: doctor.specialty_name ?? `Especialidad ${doctor.specialty_id}`,
          description: null,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    if (!form.specialty_id) {
      return doctors;
    }

    return doctors.filter(
      (doctor) => String(doctor.specialty_id) === form.specialty_id,
    );
  }, [doctors, form.specialty_id]);

  const selectedDoctor = useMemo(() => {
    return doctors.find((doctor) => String(doctor.id) === form.doctor_id) ?? null;
  }, [doctors, form.doctor_id]);

  const selectedSchedule = useMemo(() => {
    return schedules.find((schedule) => String(schedule.id) === form.schedule_id) ?? null;
  }, [schedules, form.schedule_id]);

  const selectedPatient = useMemo(() => {
    if (!form.patient_id) return null;
    return patients.find((patient) => String(patient.id) === form.patient_id) ?? null;
  }, [patients, form.patient_id]);

  const canLoadSchedules = Boolean(form.doctor_id);

  const loadBaseData = useCallback(async () => {
    try {
      setLoadingBase(true);
      setError(null);

      const meResponse = await fetchJson<ApiPayload<AuthMePayload>>("/api/auth/me");
      const me = meResponse.data;
      setCurrentUser(me);

      const doctorsResponse = await fetchJson<ApiPayload<DoctorSummary[]>>("/api/doctors");
      const activeDoctors = doctorsResponse.data.filter((doctor) => doctor.active);
      setDoctors(activeDoctors);

      if (me.role !== "patient") {
        const patientsResponse = await fetchJson<ApiPayload<PatientSummary[]>>("/api/patients");
        setPatients(patientsResponse.data);
      } else {
        setPatients([]);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo cargar la información base.",
      );
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
        onlyAvailable: "true",
      });

      if (dateFilter) {
        params.set("date", dateFilter);
      }

      const response = await fetchJson<ApiPayload<ScheduleSummary[]>>(
        `/api/schedules?${params.toString()}`,
      );

      setSchedules(response.data);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudieron cargar los horarios disponibles.",
      );
    } finally {
      setLoadingSchedules(false);
    }
  }, [canLoadSchedules, dateFilter, form.doctor_id]);

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  function handleSpecialtyChange(value: string) {
    setSuccess(null);
    setForm((prev) => ({
      ...prev,
      specialty_id: value,
      doctor_id: "",
      schedule_id: "",
    }));
    setSchedules([]);
  }

  function handleDoctorChange(value: string) {
    setSuccess(null);
    setForm((prev) => ({
      ...prev,
      doctor_id: value,
      schedule_id: "",
    }));
    setSchedules([]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess(null);

    const patientIdToSend = isPatient ? currentUser?.patient_id : Number(form.patient_id);

    if ((!isPatient && !form.patient_id) || !form.doctor_id || !form.schedule_id) {
      setError("Debes seleccionar paciente, médico y horario.");
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
          reason: form.reason.trim(),
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
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo registrar la cita.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Nueva cita"
        description="Registra una cita médica guiándote por especialidad, médico y horarios realmente disponibles."
      />

      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage message={success} />}

      {loadingBase && <LoadingState label="Cargando datos para la nueva cita..." />}

      {!loadingBase && (
        <>
          <SectionCard>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              {!isPatient && (
                <div className="md:col-span-2">
                  <label htmlFor="patient_id">Paciente *</label>
                  <select
                    id="patient_id"
                    value={form.patient_id}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, patient_id: event.target.value }))
                    }
                    required
                  >
                    <option value="">Seleccionar paciente</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.full_name}
                        {patient.dni ? ` - ${patient.dni}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="specialty_id">Especialidad</label>
                <select
                  id="specialty_id"
                  value={form.specialty_id}
                  onChange={(event) => handleSpecialtyChange(event.target.value)}
                >
                  <option value="">Todas las especialidades</option>
                  {specialtyOptions.map((specialty) => (
                    <option key={specialty.id} value={specialty.id}>
                      {specialty.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="doctor_id">Médico *</label>
                <select
                  id="doctor_id"
                  value={form.doctor_id}
                  onChange={(event) => handleDoctorChange(event.target.value)}
                  required
                >
                  <option value="">Seleccionar médico</option>
                  {filteredDoctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.full_name}
                      {doctor.specialty_name ? ` (${doctor.specialty_name})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="date_filter">Fecha</label>
                <input
                  id="date_filter"
                  type="date"
                  value={dateFilter}
                  onChange={(event) => {
                    setDateFilter(event.target.value);
                    setForm((prev) => ({ ...prev, schedule_id: "" }));
                  }}
                />
                <p className="input-helper">
                  Puedes dejarla vacía para ver todos los próximos horarios del médico.
                </p>
              </div>

              <div>
                <label htmlFor="schedule_id">Horario disponible *</label>
                <select
                  id="schedule_id"
                  value={form.schedule_id}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, schedule_id: event.target.value }))
                  }
                  required
                  disabled={!canLoadSchedules || loadingSchedules}
                >
                  <option value="">
                    {!form.doctor_id
                      ? "Primero selecciona un médico"
                      : loadingSchedules
                        ? "Cargando horarios..."
                        : "Seleccionar horario"}
                  </option>

                  {schedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.schedule_date} | {formatTimeRange(schedule)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="reason">Motivo de consulta</label>
                <textarea
                  id="reason"
                  value={form.reason}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, reason: event.target.value }))
                  }
                  rows={4}
                  placeholder="Describe brevemente el motivo de la cita"
                />
              </div>

              <div className="md:col-span-2 flex flex-wrap gap-3">
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Registrando..." : "Registrar cita"}
                </button>

                <Link href="/mi-citas" className="btn-secondary">
                  Ver mis citas
                </Link>
              </div>
            </form>
          </SectionCard>

          <SectionCard>
            <h2 className="text-lg font-semibold text-slate-900">Resumen de selección</h2>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {!isPatient && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Paciente</p>
                  <p className="mt-1 text-sm text-slate-900">
                    {selectedPatient?.full_name ?? "Aún no seleccionado"}
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Especialidad</p>
                <p className="mt-1 text-sm text-slate-900">
                  {selectedDoctor?.specialty_name ?? "Aún no seleccionada"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Médico</p>
                <p className="mt-1 text-sm text-slate-900">
                  {selectedDoctor?.full_name ?? "Aún no seleccionado"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Fecha</p>
                <p className="mt-1 text-sm text-slate-900">
                  {selectedSchedule?.schedule_date ?? "Aún no seleccionada"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Horario</p>
                <p className="mt-1 text-sm text-slate-900">
                  {selectedSchedule ? formatTimeRange(selectedSchedule) : "Aún no seleccionado"}
                </p>
              </div>
            </div>
          </SectionCard>

          {!loadingSchedules && form.doctor_id && schedules.length === 0 && (
            <EmptyState
              title="Sin horarios disponibles"
              description="No hay bloques libres para el médico y filtro elegidos. Prueba otra fecha o selecciona otro médico."
            />
          )}
        </>
      )}
    </section>
  );
}