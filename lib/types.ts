export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";
export type UserRole = "admin" | "receptionist" | "patient";

export type ProfileSummary = {
  id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
};

export type SpecialtySummary = {
  id: number;
  name: string;
  description: string | null;
};

export type DoctorSummary = {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  license_number: string | null;
  active: boolean;
  specialty_id: number;
  specialty_name: string | null;
};

export type ScheduleSummary = {
  id: number;
  doctor_id: number;
  schedule_date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  doctor_name: string;
  specialty_name: string | null;
  has_active_appointment: boolean;
};

export type PatientSummary = {
  id: number;
  full_name: string;
  dni: string | null;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
};

export type AppointmentSummary = {
  id: number;
  patient_id: number;
  doctor_id: number;
  schedule_id: number;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  reason: string | null;
  notes: string | null;
  patient: {
    id: number;
    full_name: string;
    dni: string | null;
  } | null;
  doctor: {
    id: number;
    full_name: string;
    specialty_name: string | null;
  } | null;
  schedule: {
    id: number;
    schedule_date: string;
    start_time: string;
    end_time: string;
  } | null;
};

export type ApiPayload<T> = {
  data: T;
};

export type ApiFailure = {
  error: string;
  details?: string;
};
