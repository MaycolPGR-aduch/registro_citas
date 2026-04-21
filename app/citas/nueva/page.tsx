"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaPlusCircle, FaUserMd, FaUsers, FaCalendarAlt, FaClock, FaStethoscope, FaSave, FaFilter } from "react-icons/fa";
import { sileo } from "sileo";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
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

  const isPatient = currentUser?.role === "patient";
  const canLoadSchedules = useMemo(() => Boolean(form.doctor_id), [form.doctor_id]);

  const loadBaseData = useCallback(async () => {
    try {
      setLoadingBase(true);
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
      console.error(caught);
      sileo.error({ title: "Error", description: "No se pudo cargar información base." });
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
      const params = new URLSearchParams({ doctorId: form.doctor_id });
      if (dateFilter) {
        params.set("date", dateFilter);
      }

      const response = await fetchJson<ApiPayload<ScheduleSummary[]>>(`/api/schedules/available?${params.toString()}`);
      setSchedules(response.data);
    } catch (caught) {
      console.error(caught);
      sileo.error({ title: "Error", description: "No se pudieron cargar horarios." });
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

    const patientIdToSend = isPatient ? currentUser?.patient_id : Number(form.patient_id);

    if (!isPatient && !form.patient_id) {
      sileo.warning({ title: "Falta Paciente", description: "Debes seleccionar un paciente." });
      return;
    }
    if (!form.doctor_id) {
      sileo.warning({ title: "Falta Médico", description: "Debes seleccionar un médico." });
      return;
    }
    if (!form.schedule_id) {
      sileo.warning({ title: "Falta Horario", description: "Debes seleccionar un horario disponible." });
      return;
    }

    if (isPatient && !patientIdToSend) {
      sileo.error({ title: "Error", description: "Tu cuenta no tiene un perfil de paciente asociado." });
      return;
    }

    try {
      setSubmitting(true);
      await fetchJson<ApiPayload<unknown>>("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientIdToSend,
          doctor_id: Number(form.doctor_id),
          schedule_id: Number(form.schedule_id),
          reason: form.reason,
        }),
      });

      sileo.success({ title: "Cita Registrada", description: "Tu cita ha sido programada con éxito." });
      setForm((prev) => ({
        ...prev,
        schedule_id: "",
        reason: "",
      }));

      await loadSchedules();
    } catch (caught) {
      sileo.error({ title: "Error", description: caught instanceof Error ? caught.message : "No se pudo registrar la cita." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Nueva Cita"
        description="Registra una cita médica validando disponibilidad y consistencia de datos."
        icon={<FaPlusCircle size={28} />}
      />

      {loadingBase ? (
        <SectionCard>
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
            <div className="md:col-span-2 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </SectionCard>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <SectionCard>
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                <FaCalendarAlt />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Formulario de Reserva</h2>
            </div>

            <form className="grid gap-6 md:grid-cols-2" onSubmit={handleSubmit}>
              {!isPatient && (
                <div className="space-y-1">
                  <label htmlFor="patient_id" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <FaUsers className="text-sky-500 text-xs" />
                    <span>Paciente *</span>
                  </label>
                  <select
                    id="patient_id"
                    value={form.patient_id}
                    onChange={(event) => setForm((prev) => ({ ...prev, patient_id: event.target.value }))}
                    required
                    className="w-full shadow-sm rounded-xl border-slate-200 focus:border-sky-500 focus:ring-sky-500"
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

              <div className="space-y-1">
                <label htmlFor="doctor_id" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <FaUserMd className="text-sky-500 text-xs" />
                  <span>Médico *</span>
                </label>
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
                  className="w-full shadow-sm rounded-xl border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                >
                  <option value="">Seleccionar médico</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.full_name} ({doctor.specialty_name ?? "Sin especialidad"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="date_filter" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <FaFilter className="text-sky-500 text-xs" />
                  <span>Filtrar Fecha (opcional)</span>
                </label>
                <input
                  id="date_filter"
                  type="date"
                  value={dateFilter}
                  onChange={(event) => {
                    setDateFilter(event.target.value);
                    setForm((prev) => ({ ...prev, schedule_id: "" }));
                  }}
                  className="w-full shadow-sm rounded-xl border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="schedule_id" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <FaClock className="text-sky-500 text-xs" />
                  <span>Horario Disponible *</span>
                </label>
                <div className="relative">
                  <select
                    id="schedule_id"
                    value={form.schedule_id}
                    onChange={(event) => setForm((prev) => ({ ...prev, schedule_id: event.target.value }))}
                    required
                    disabled={!canLoadSchedules || loadingSchedules}
                    className="w-full shadow-sm rounded-xl border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                  >
                    <option value="">{loadingSchedules ? "Buscando horarios..." : "Seleccionar horario"}</option>
                    {schedules.map((schedule) => (
                      <option key={schedule.id} value={schedule.id}>
                        {schedule.schedule_date} | {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                      </option>
                    ))}
                  </select>
                  {loadingSchedules && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label htmlFor="reason" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <FaStethoscope className="text-sky-500 text-xs" />
                  <span>Motivo de Consulta</span>
                </label>
                <textarea
                  id="reason"
                  value={form.reason}
                  onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
                  rows={3}
                  placeholder="Describe brevemente el motivo"
                  className="w-full shadow-sm rounded-xl border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                />
              </div>

              <div className="md:col-span-2 pt-4">
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  type="submit" className="btn-primary flex items-center justify-center gap-2 w-full md:w-auto md:px-10 py-3 text-base shadow-lg shadow-sky-100" disabled={submitting}>
                  {submitting ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <>
                      <FaSave />
                      <span>Registrar Cita</span>
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </SectionCard>
        </motion.div>
      )}

      <AnimatePresence>
        {!loadingBase && canLoadSchedules && !loadingSchedules && schedules.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <EmptyState
              title="Sin horarios para selección"
              description="No hay horarios disponibles para ese médico en los filtros actuales."
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
