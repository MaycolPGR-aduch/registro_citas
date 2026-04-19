import { SupabaseClient } from "@supabase/supabase-js";
import { AppointmentSummary } from "@/lib/types";

export const APPOINTMENT_SELECT =
  "id, patient_id, doctor_id, schedule_id, appointment_date, appointment_time, status, reason, notes, patients(id, full_name, dni), doctors(id, full_name, specialties(name)), doctor_schedules(id, schedule_date, start_time, end_time)";

export type RawAppointment = {
  id: number;
  patient_id: number;
  doctor_id: number;
  schedule_id: number;
  appointment_date: string;
  appointment_time: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  reason: string | null;
  notes: string | null;
  patients:
    | {
        id: number;
        full_name: string;
        dni: string | null;
      }
    | {
        id: number;
        full_name: string;
        dni: string | null;
      }[]
    | null;
  doctors:
    | {
        id: number;
        full_name: string;
        specialties:
          | {
              name: string;
            }
          | {
              name: string;
            }[]
          | null;
      }
    | {
        id: number;
        full_name: string;
        specialties:
          | {
              name: string;
            }
          | {
              name: string;
            }[]
          | null;
      }[]
    | null;
  doctor_schedules:
    | {
        id: number;
        schedule_date: string;
        start_time: string;
        end_time: string;
      }
    | {
        id: number;
        schedule_date: string;
        start_time: string;
        end_time: string;
      }[]
    | null;
};

export function mapAppointment(raw: RawAppointment): AppointmentSummary {
  const patient = Array.isArray(raw.patients) ? raw.patients[0] ?? null : raw.patients;
  const doctor = Array.isArray(raw.doctors) ? raw.doctors[0] ?? null : raw.doctors;
  const schedule = Array.isArray(raw.doctor_schedules) ? raw.doctor_schedules[0] ?? null : raw.doctor_schedules;
  const specialty = doctor
    ? Array.isArray(doctor.specialties)
      ? doctor.specialties[0] ?? null
      : doctor.specialties
    : null;

  return {
    id: raw.id,
    patient_id: raw.patient_id,
    doctor_id: raw.doctor_id,
    schedule_id: raw.schedule_id,
    appointment_date: raw.appointment_date,
    appointment_time: raw.appointment_time,
    status: raw.status,
    reason: raw.reason,
    notes: raw.notes,
    patient: patient
      ? {
          id: patient.id,
          full_name: patient.full_name,
          dni: patient.dni,
        }
      : null,
    doctor: doctor
      ? {
          id: doctor.id,
          full_name: doctor.full_name,
          specialty_name: specialty?.name ?? null,
        }
      : null,
    schedule: schedule
      ? {
          id: schedule.id,
          schedule_date: schedule.schedule_date,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
        }
      : null,
  };
}

export async function lockSchedule(client: SupabaseClient, scheduleId: number) {
  const { data, error } = await client
    .from("doctor_schedules")
    .update({ is_available: false })
    .eq("id", scheduleId)
    .eq("is_available", true)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false as const, error: error.message };
  }

  if (!data) {
    return { ok: false as const, error: "El horario no esta disponible." };
  }

  return { ok: true as const };
}

export async function hasActiveAppointmentInSchedule(
  client: SupabaseClient,
  scheduleId: number,
  excludeAppointmentId?: number,
) {
  let query = client
    .from("appointments")
    .select("id")
    .eq("schedule_id", scheduleId)
    .neq("status", "cancelled")
    .limit(1);

  if (excludeAppointmentId) {
    query = query.neq("id", excludeAppointmentId);
  }

  const { data, error } = await query;
  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const, hasActive: (data ?? []).length > 0 };
}

export async function releaseScheduleIfNoActiveAppointments(client: SupabaseClient, scheduleId: number) {
  const activeCheck = await hasActiveAppointmentInSchedule(client, scheduleId);
  if (!activeCheck.ok) {
    return { ok: false as const, error: activeCheck.error };
  }

  if (activeCheck.hasActive) {
    return { ok: true as const };
  }

  const { error } = await client.from("doctor_schedules").update({ is_available: true }).eq("id", scheduleId);
  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}
