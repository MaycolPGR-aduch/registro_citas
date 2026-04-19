import { AppointmentStatus } from "@/lib/types";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

export function parsePositiveInt(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    return null;
  }

  return numberValue;
}

export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) {
    return false;
  }

  const asDate = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(asDate.getTime()) && asDate.toISOString().slice(0, 10) === value;
}

export function isValidTime(value: unknown): value is string {
  return typeof value === "string" && TIME_PATTERN.test(value);
}

export function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

export function normalizeOptionalText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

export function validateEmail(value: unknown): string | null {
  const normalized = normalizeOptionalText(value, 120);
  if (!normalized) {
    return null;
  }

  return EMAIL_PATTERN.test(normalized) ? normalized : null;
}

export function isAppointmentStatus(value: unknown): value is AppointmentStatus {
  return value === "scheduled" || value === "completed" || value === "cancelled" || value === "no_show";
}

export function parseBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return null;
}
