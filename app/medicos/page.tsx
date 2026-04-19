"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorMessage } from "@/components/ui/error-message";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { SuccessMessage } from "@/components/ui/success-message";
import { fetchJson } from "@/lib/fetcher";
import { ApiPayload, DoctorSummary, SpecialtySummary } from "@/lib/types";

type DoctorForm = {
  full_name: string;
  specialty_id: string;
  email: string;
  phone: string;
  license_number: string;
  active: boolean;
};

const INITIAL_FORM: DoctorForm = {
  full_name: "",
  specialty_id: "",
  email: "",
  phone: "",
  license_number: "",
  active: true,
};

export default function MedicosPage() {
  const [specialties, setSpecialties] = useState<SpecialtySummary[]>([]);
  const [doctors, setDoctors] = useState<DoctorSummary[]>([]);
  const [form, setForm] = useState<DoctorForm>(INITIAL_FORM);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<DoctorForm>(INITIAL_FORM);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [specialtiesResponse, doctorsResponse] = await Promise.all([
        fetchJson<ApiPayload<SpecialtySummary[]>>("/api/specialties"),
        fetchJson<ApiPayload<DoctorSummary[]>>("/api/doctors"),
      ]);

      setSpecialties(specialtiesResponse.data);
      setDoctors(doctorsResponse.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cargar la informacion de medicos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.full_name.trim() || !form.specialty_id) {
      setError("Nombre y especialidad son obligatorios.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      await fetchJson<ApiPayload<DoctorSummary>>("/api/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          specialty_id: Number(form.specialty_id),
        }),
      });

      setForm(INITIAL_FORM);
      setSuccess("Medico creado correctamente.");
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo crear el medico.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(item: DoctorSummary) {
    setEditingId(item.id);
    setEditingForm({
      full_name: item.full_name,
      specialty_id: String(item.specialty_id),
      email: item.email ?? "",
      phone: item.phone ?? "",
      license_number: item.license_number ?? "",
      active: item.active,
    });
  }

  async function saveEdit() {
    if (!editingId) return;

    if (!editingForm.full_name.trim() || !editingForm.specialty_id) {
      setError("Nombre y especialidad son obligatorios.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      await fetchJson<ApiPayload<DoctorSummary>>(`/api/doctors/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingForm,
          specialty_id: Number(editingForm.specialty_id),
        }),
      });

      setEditingId(null);
      setSuccess("Medico actualizado correctamente.");
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo actualizar el medico.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeDoctor(id: number) {
    if (!window.confirm("Deseas eliminar este medico?")) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      await fetchJson<ApiPayload<{ deleted: boolean }>>(`/api/doctors/${id}`, {
        method: "DELETE",
      });

      setSuccess("Medico eliminado correctamente.");
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo eliminar el medico.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Medicos"
        description="Gestion completa de medicos: crear, editar, activar/desactivar y eliminar."
      />

      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage message={success} />}

      <SectionCard>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2>Nuevo medico</h2>
          <Link href="/especialidades" className="btn-secondary">
            Gestionar especialidades
          </Link>
        </div>

        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleCreate}>
          <div>
            <label htmlFor="full_name">Nombre completo *</label>
            <input
              id="full_name"
              value={form.full_name}
              onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
              required
            />
          </div>

          <div>
            <label htmlFor="specialty_id">Especialidad *</label>
            <select
              id="specialty_id"
              value={form.specialty_id}
              onChange={(event) => setForm((prev) => ({ ...prev, specialty_id: event.target.value }))}
              required
            >
              <option value="">Seleccionar especialidad</option>
              {specialties.map((specialty) => (
                <option key={specialty.id} value={specialty.id}>
                  {specialty.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="email">Correo</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="phone">Telefono</label>
            <input
              id="phone"
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="license_number">Numero de licencia</label>
            <input
              id="license_number"
              value={form.license_number}
              onChange={(event) => setForm((prev) => ({ ...prev, license_number: event.target.value }))}
            />
          </div>

          <div className="flex items-end">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
              />
              Activo
            </label>
          </div>

          <div className="md:col-span-2">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Guardando..." : "Crear medico"}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard>
        <h2 className="mb-3">Listado</h2>

        {loading && <LoadingState />}
        {!loading && doctors.length === 0 && (
          <EmptyState title="Sin medicos" description="Registra al menos un medico para iniciar el flujo." />
        )}

        {!loading && doctors.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Especialidad</th>
                  <th>Correo</th>
                  <th>Telefono</th>
                  <th>Licencia</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doctor) => {
                  const isEditing = editingId === doctor.id;

                  return (
                    <tr key={doctor.id}>
                      <td>
                        {isEditing ? (
                          <input
                            value={editingForm.full_name}
                            onChange={(event) =>
                              setEditingForm((prev) => ({ ...prev, full_name: event.target.value }))
                            }
                          />
                        ) : (
                          doctor.full_name
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <select
                            value={editingForm.specialty_id}
                            onChange={(event) =>
                              setEditingForm((prev) => ({ ...prev, specialty_id: event.target.value }))
                            }
                          >
                            <option value="">Seleccionar especialidad</option>
                            {specialties.map((specialty) => (
                              <option key={specialty.id} value={specialty.id}>
                                {specialty.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          doctor.specialty_name ?? "Sin especialidad"
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="email"
                            value={editingForm.email}
                            onChange={(event) =>
                              setEditingForm((prev) => ({ ...prev, email: event.target.value }))
                            }
                          />
                        ) : (
                          doctor.email ?? "No registrado"
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            value={editingForm.phone}
                            onChange={(event) =>
                              setEditingForm((prev) => ({ ...prev, phone: event.target.value }))
                            }
                          />
                        ) : (
                          doctor.phone ?? "No registrado"
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            value={editingForm.license_number}
                            onChange={(event) =>
                              setEditingForm((prev) => ({ ...prev, license_number: event.target.value }))
                            }
                          />
                        ) : (
                          doctor.license_number ?? "No registrado"
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editingForm.active}
                              onChange={(event) =>
                                setEditingForm((prev) => ({ ...prev, active: event.target.checked }))
                              }
                            />
                            Activo
                          </label>
                        ) : doctor.active ? (
                          "Activo"
                        ) : (
                          "Inactivo"
                        )}
                      </td>
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
                            <button type="button" className="btn-secondary" onClick={() => startEdit(doctor)}>
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn-danger"
                              onClick={() => void removeDoctor(doctor.id)}
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
