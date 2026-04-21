import { requireStaff } from "@/lib/auth/session";
import { errorResponse, successResponse } from "@/lib/http";
import {
  isValidIsoDate,
  isValidSlotMinutes,
  isValidTime,
  minutesToTime,
  parseBoolean,
  parsePositiveInt,
  timeToMinutes,
} from "@/lib/validation";

type BulkScheduleBody = {
  doctor_id?: unknown;
  schedule_date?: unknown;
  start_time?: unknown;
  end_time?: unknown;
  slot_minutes?: unknown;
  is_available?: unknown;
};

type ExistingScheduleRow = {
  start_time: string;
  end_time: string;
};

export async function POST(request: Request) {
  const authResult = await requireStaff();
  if (!authResult.ok) {
    return authResult.response;
  }

  let body: BulkScheduleBody;
  try {
    body = (await request.json()) as BulkScheduleBody;
  } catch {
    return errorResponse(400, "El cuerpo de la solicitud debe ser JSON válido.");
  }

  const doctorId = parsePositiveInt(body.doctor_id);
  const scheduleDate = body.schedule_date;
  const startTime = body.start_time;
  const endTime = body.end_time;
  const slotMinutes =
    typeof body.slot_minutes === "string" || typeof body.slot_minutes === "number"
      ? Number(body.slot_minutes)
      : null;
  const isAvailable = body.is_available === undefined ? true : parseBoolean(body.is_available);

  if (!doctorId) {
    return errorResponse(400, "doctor_id es obligatorio y debe ser un entero positivo.");
  }

  if (!isValidIsoDate(scheduleDate)) {
    return errorResponse(400, "schedule_date debe tener formato YYYY-MM-DD.");
  }

  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    return errorResponse(400, "start_time y end_time deben ser válidos.");
  }

  if (!isValidSlotMinutes(slotMinutes)) {
    return errorResponse(400, "slot_minutes debe ser un entero entre 5 y 180.");
  }

  if (isAvailable === null) {
    return errorResponse(400, "is_available debe ser true o false.");
  }

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (endMinutes <= startMinutes) {
    return errorResponse(400, "end_time debe ser mayor a start_time.");
  }

  if (endMinutes - startMinutes < slotMinutes) {
    return errorResponse(400, "El rango horario es menor al intervalo indicado.");
  }

  const { data: doctor, error: doctorError } = await authResult.context.supabase
    .from("doctors")
    .select("id")
    .eq("id", doctorId)
    .maybeSingle();

  if (doctorError) {
    return errorResponse(500, "No se pudo validar el médico.", doctorError.message);
  }

  if (!doctor) {
    return errorResponse(404, "No existe el médico indicado.");
  }

  const { data: existingRows, error: existingError } = await authResult.context.supabase
    .from("doctor_schedules")
    .select("start_time, end_time")
    .eq("doctor_id", doctorId)
    .eq("schedule_date", scheduleDate);

  if (existingError) {
    return errorResponse(500, "No se pudo validar horarios existentes.", existingError.message);
  }

  const existingKeys = new Set(
    ((existingRows ?? []) as ExistingScheduleRow[]).map(
      (row) => `${row.start_time.slice(0, 5)}-${row.end_time.slice(0, 5)}`,
    ),
  );

  const payload: Array<{
    doctor_id: number;
    schedule_date: string;
    start_time: string;
    end_time: string;
    is_available: boolean;
  }> = [];

  for (let current = startMinutes; current + slotMinutes <= endMinutes; current += slotMinutes) {
    const slotStart = minutesToTime(current);
    const slotEnd = minutesToTime(current + slotMinutes);
    const key = `${slotStart}-${slotEnd}`;

    if (existingKeys.has(key)) {
      continue;
    }

    payload.push({
      doctor_id: doctorId,
      schedule_date: scheduleDate,
      start_time: slotStart,
      end_time: slotEnd,
      is_available: isAvailable,
    });
  }

  const totalExpected = Math.floor((endMinutes - startMinutes) / slotMinutes);
  const skipped = totalExpected - payload.length;

  if (payload.length === 0) {
    return successResponse({
      created: 0,
      skipped,
      message: "No se crearon bloques nuevos porque todos ya existían.",
    });
  }

  const { data, error } = await authResult.context.supabase
    .from("doctor_schedules")
    .insert(payload)
    .select("id");

  if (error) {
    if (error.code === "23505") {
      return errorResponse(409, "Algunos bloques ya existen para ese médico y fecha.");
    }

    if (error.code === "23514") {
      return errorResponse(400, "Se detectó un rango horario inválido.");
    }

    return errorResponse(500, "No se pudieron crear los bloques horarios.", error.message);
  }

  return successResponse(
    {
      created: data?.length ?? payload.length,
      skipped,
      message: "Bloques horarios generados correctamente.",
    },
    201,
  );
}