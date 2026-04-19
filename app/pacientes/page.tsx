"use client";

import { FormEvent, useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorMessage } from "@/components/ui/error-message";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { SuccessMessage } from "@/components/ui/success-message";
import { fetchJson } from "@/lib/fetcher";
import { ApiPayload, PatientSummary } from "@/lib/types";

type PatientForm = {
  full_name: string;
  dni: string;
  birth_date: string;
  phone: string;
  email: string;
};

const INITIAL_FORM: PatientForm = {
  full_name: "",
  dni: "",
  birth_date: "",
  phone: "",
  email: "",
};

export default function PacientesPage() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<PatientForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<PatientForm>(INITIAL_FORM);

  async function loadPatients(searchText: string) {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchText.trim()) {
        params.set("query", searchText.trim());
      }
      const queryString = params.toString();
      const response = await fetchJson<ApiPayload<PatientSummary[]>>(
        `/api/patients${queryString ? `?${queryString}` : ""}`,
      );
      setPatients(response.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudieron cargar pacientes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPatients("");
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadPatients(query);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess(null);

    if (!form.full_name.trim()) {
      setError("El nombre del paciente es obligatorio.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await fetchJson<ApiPayload<PatientSummary>>("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      setForm(INITIAL_FORM);
      setSuccess("Paciente registrado correctamente.");
      await loadPatients(query);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo registrar el paciente.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(patient: PatientSummary) {
    setEditingId(patient.id);
    setEditingForm({
      full_name: patient.full_name,
      dni: patient.dni ?? "",
      birth_date: patient.birth_date ?? "",
      phone: patient.phone ?? "",
      email: patient.email ?? "",
    });
  }

  async function saveEdit() {
    if (!editingId) return;

    if (!editingForm.full_name.trim()) {
      setError("El nombre del paciente es obligatorio.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      await fetchJson<ApiPayload<PatientSummary>>(`/api/patients/${editingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editingForm),
      });

      setEditingId(null);
      setSuccess("Paciente actualizado correctamente.");
      await loadPatients(query);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo actualizar el paciente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removePatient(id: number) {
    if (!window.confirm("Deseas eliminar este paciente?")) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      await fetchJson<ApiPayload<{ deleted: boolean }>>(`/api/patients/${id}`, {
        method: "DELETE",
      });

      setSuccess("Paciente eliminado correctamente.");
      await loadPatients(query);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo eliminar el paciente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Pacientes"
        description="Gestion completa de pacientes: crear, buscar, editar y eliminar."
      />

      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage message={success} />}

      <SectionCard>
        <h2 className="mb-3">Nuevo paciente</h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleCreate}>
          <div className="md:col-span-2">
            <label htmlFor="full_name">Nombre completo *</label>
            <input
              id="full_name"
              value={form.full_name}
              onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
              placeholder="Ejemplo: Juan Perez"
              required
            />
          </div>
          <div>
            <label htmlFor="dni">DNI</label>
            <input
              id="dni"
              value={form.dni}
              onChange={(event) => setForm((prev) => ({ ...prev, dni: event.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="birth_date">Fecha de nacimiento</label>
            <input
              id="birth_date"
              type="date"
              value={form.birth_date}
              onChange={(event) => setForm((prev) => ({ ...prev, birth_date: event.target.value }))}
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
            <label htmlFor="email">Correo</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Guardando..." : "Registrar paciente"}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard>
        <h2 className="mb-3">Listado de pacientes</h2>
        <form className="mb-4 flex flex-wrap items-end gap-2" onSubmit={handleSearch}>
          <div className="w-full max-w-md">
            <label htmlFor="search">Buscar por nombre, DNI o correo</label>
            <input
              id="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Texto de busqueda"
            />
          </div>
          <button type="submit" className="btn-secondary">
            Buscar
          </button>
        </form>

        {loading && <LoadingState />}
        {!loading && patients.length === 0 && (
          <EmptyState title="Sin pacientes" description="No hay pacientes para el criterio de busqueda actual." />
        )}
        {!loading && patients.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>DNI</th>
                  <th>Correo</th>
                  <th>Telefono</th>
                  <th>Nacimiento</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => {
                  const isEditing = editingId === patient.id;

                  return (
                    <tr key={patient.id}>
                      <td>
                        {isEditing ? (
                          <input
                            value={editingForm.full_name}
                            onChange={(event) =>
                              setEditingForm((prev) => ({ ...prev, full_name: event.target.value }))
                            }
                          />
                        ) : (
                          patient.full_name
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            value={editingForm.dni}
                            onChange={(event) => setEditingForm((prev) => ({ ...prev, dni: event.target.value }))}
                          />
                        ) : (
                          patient.dni ?? "No registrado"
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="email"
                            value={editingForm.email}
                            onChange={(event) => setEditingForm((prev) => ({ ...prev, email: event.target.value }))}
                          />
                        ) : (
                          patient.email ?? "No registrado"
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            value={editingForm.phone}
                            onChange={(event) => setEditingForm((prev) => ({ ...prev, phone: event.target.value }))}
                          />
                        ) : (
                          patient.phone ?? "No registrado"
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="date"
                            value={editingForm.birth_date}
                            onChange={(event) =>
                              setEditingForm((prev) => ({ ...prev, birth_date: event.target.value }))
                            }
                          />
                        ) : (
                          patient.birth_date ?? "No registrado"
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
                            <button type="button" className="btn-secondary" onClick={() => startEdit(patient)}>
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn-danger"
                              onClick={() => void removePatient(patient.id)}
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
