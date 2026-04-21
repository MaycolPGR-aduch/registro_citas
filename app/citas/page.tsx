"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorMessage } from "@/components/ui/error-message";
import { SuccessMessage } from "@/components/ui/success-message";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchJson } from "@/lib/fetcher";
import { ApiPayload, AppointmentSummary } from "@/lib/types";

type ViewMode = "upcoming" | "cancelled" | "history";

function isPastAppointment(appointment: AppointmentSummary) {
  const dateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
  return dateTime.getTime() < Date.now();
}

function formatDateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatTimeLabel(time: string) {
  return time.slice(0, 5);
}

export default function MisCitasPage() {
  const [appointments, setAppointments] = useState<AppointmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [view, setView] = useState<ViewMode>("upcoming");

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetchJson<ApiPayload<AppointmentSummary[]>>("/api/appointments");
      setAppointments(res.data);
    } catch {
      setError("No se pudieron cargar tus citas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function cancelAppointment(id: number) {
    if (!window.confirm("¿Deseas cancelar esta cita?")) {
      return;
    }

    try {
      setProcessingId(id);
      setError(null);
      setSuccess(null);

      await fetchJson(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      setSuccess("Cita cancelada correctamente.");
      await load();
    } catch {
      setError("No se pudo cancelar la cita.");
    } finally {
      setProcessingId(null);
    }
  }

  const summary = useMemo(() => {
    const upcoming = appointments.filter(
      (a) => a.status === "scheduled" && !isPastAppointment(a),
    ).length;

    const cancelled = appointments.filter((a) => a.status === "cancelled").length;

    const history = appointments.filter(
      (a) =>
        a.status === "completed" ||
        a.status === "no_show" ||
        (a.status === "scheduled" && isPastAppointment(a)),
    ).length;

    return { upcoming, cancelled, history, total: appointments.length };
  }, [appointments]);

  const visibleAppointments = useMemo(() => {
    const sorted = [...appointments].sort((a, b) => {
      const aTime = new Date(`${a.appointment_date}T${a.appointment_time}`).getTime();
      const bTime = new Date(`${b.appointment_date}T${b.appointment_time}`).getTime();
      return bTime - aTime;
    });

    switch (view) {
      case "upcoming":
        return sorted
          .filter((a) => a.status === "scheduled" && !isPastAppointment(a))
          .sort((a, b) => {
            const aTime = new Date(`${a.appointment_date}T${a.appointment_time}`).getTime();
            const bTime = new Date(`${b.appointment_date}T${b.appointment_time}`).getTime();
            return aTime - bTime;
          });

      case "cancelled":
        return sorted.filter((a) => a.status === "cancelled");

      case "history":
        return sorted.filter(
          (a) =>
            a.status === "completed" ||
            a.status === "no_show" ||
            (a.status === "scheduled" && isPastAppointment(a)),
        );

      default:
        return sorted;
    }
  }, [appointments, view]);

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Mis citas</h1>
        <p className="text-sm text-slate-600">
          Revisa tus próximas citas, cancelaciones e historial.
        </p>
      </header>

      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage message={success} />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SectionCard>
          <p className="text-sm font-medium text-slate-500">Total</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{summary.total}</p>
        </SectionCard>

        <SectionCard>
          <p className="text-sm font-medium text-slate-500">Próximas</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{summary.upcoming}</p>
        </SectionCard>

        <SectionCard>
          <p className="text-sm font-medium text-slate-500">Canceladas</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{summary.cancelled}</p>
        </SectionCard>

        <SectionCard>
          <p className="text-sm font-medium text-slate-500">Historial</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{summary.history}</p>
        </SectionCard>
      </div>

      <SectionCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={view === "upcoming" ? "btn-primary" : "btn-secondary"}
              onClick={() => setView("upcoming")}
            >
              Próximas
            </button>

            <button
              type="button"
              className={view === "cancelled" ? "btn-primary" : "btn-secondary"}
              onClick={() => setView("cancelled")}
            >
              Canceladas
            </button>

            <button
              type="button"
              className={view === "history" ? "btn-primary" : "btn-secondary"}
              onClick={() => setView("history")}
            >
              Historial
            </button>
          </div>

          <Link href="/citas/nueva" className="btn-primary">
            Reservar nueva cita
          </Link>
        </div>
      </SectionCard>

      <SectionCard>
        {loading && <LoadingState label="Cargando tus citas..." />}

        {!loading && visibleAppointments.length === 0 && (
          <EmptyState
            title="Sin citas"
            description={
              view === "upcoming"
                ? "No tienes próximas citas registradas."
                : view === "cancelled"
                  ? "No tienes citas canceladas."
                  : "No hay citas en tu historial."
            }
          />
        )}

        {!loading && visibleAppointments.length > 0 && (
          <div className="grid gap-4">
            {visibleAppointments.map((a) => {
              const isProcessing = processingId === a.id;
              const canCancel = a.status === "scheduled" && !isPastAppointment(a);

              return (
                <div
                  key={a.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">
                          {a.doctor?.full_name ?? "Médico"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {a.doctor?.specialty_name ?? "Sin especialidad"}
                        </p>
                      </div>

                      <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                        <p>
                          <span className="font-medium">Fecha:</span>{" "}
                          {formatDateLabel(a.appointment_date)}
                        </p>
                        <p>
                          <span className="font-medium">Hora:</span>{" "}
                          {formatTimeLabel(a.appointment_time)}
                        </p>
                      </div>

                      {a.reason && (
                        <p className="text-sm text-slate-700">
                          <span className="font-medium">Motivo:</span> {a.reason}
                        </p>
                      )}

                      {a.notes && (
                        <p className="text-sm text-slate-700">
                          <span className="font-medium">Notas:</span> {a.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-start gap-3 md:items-end">
                      <StatusBadge status={a.status} />

                      {canCancel && (
                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() => cancelAppointment(a.id)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? "Cancelando..." : "Cancelar cita"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </section>
  );
}