"use client";

import { FormEvent, useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorMessage } from "@/components/ui/error-message";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { SuccessMessage } from "@/components/ui/success-message";
import { fetchJson } from "@/lib/fetcher";
import { ApiPayload, SpecialtySummary } from "@/lib/types";

type SpecialtyForm = {
  name: string;
  description: string;
};

const INITIAL_FORM: SpecialtyForm = {
  name: "",
  description: "",
};

export default function EspecialidadesPage() {
  const [specialties, setSpecialties] = useState<SpecialtySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<SpecialtyForm>(INITIAL_FORM);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<SpecialtyForm>(INITIAL_FORM);

  async function loadSpecialties() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchJson<ApiPayload<SpecialtySummary[]>>("/api/specialties");
      setSpecialties(response.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudieron cargar especialidades.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSpecialties();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      await fetchJson<ApiPayload<SpecialtySummary>>("/api/specialties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      setForm(INITIAL_FORM);
      setSuccess("Especialidad creada correctamente.");
      await loadSpecialties();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo crear la especialidad.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(item: SpecialtySummary) {
    setEditingId(item.id);
    setEditingForm({
      name: item.name,
      description: item.description ?? "",
    });
  }

  async function saveEdit() {
    if (!editingId) return;

    if (!editingForm.name.trim()) {
      setError("El nombre no puede estar vacio.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      await fetchJson<ApiPayload<SpecialtySummary>>(`/api/specialties/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingForm),
      });

      setEditingId(null);
      setSuccess("Especialidad actualizada correctamente.");
      await loadSpecialties();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo actualizar la especialidad.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeSpecialty(id: number) {
    if (!window.confirm("Deseas eliminar esta especialidad?")) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      await fetchJson<ApiPayload<{ deleted: boolean }>>(`/api/specialties/${id}`, {
        method: "DELETE",
      });

      setSuccess("Especialidad eliminada correctamente.");
      await loadSpecialties();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo eliminar la especialidad.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Especialidades"
        description="Gestiona las especialidades medicas antes de crear o editar medicos."
      />

      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage message={success} />}

      <SectionCard>
        <h2 className="mb-3">Nueva especialidad</h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleCreate}>
          <div>
            <label htmlFor="name">Nombre *</label>
            <input
              id="name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Ejemplo: Cardiologia"
              required
            />
          </div>

          <div>
            <label htmlFor="description">Descripcion</label>
            <input
              id="description"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Descripcion breve"
            />
          </div>

          <div className="md:col-span-2">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Guardando..." : "Crear especialidad"}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard>
        <h2 className="mb-3">Listado</h2>

        {loading && <LoadingState />}
        {!loading && specialties.length === 0 && (
          <EmptyState title="Sin especialidades" description="Agrega al menos una especialidad para continuar." />
        )}

        {!loading && specialties.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Descripcion</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {specialties.map((specialty) => {
                  const isEditing = editingId === specialty.id;

                  return (
                    <tr key={specialty.id}>
                      <td>
                        {isEditing ? (
                          <input
                            value={editingForm.name}
                            onChange={(event) => setEditingForm((prev) => ({ ...prev, name: event.target.value }))}
                          />
                        ) : (
                          specialty.name
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            value={editingForm.description}
                            onChange={(event) =>
                              setEditingForm((prev) => ({ ...prev, description: event.target.value }))
                            }
                          />
                        ) : (
                          specialty.description ?? "Sin descripcion"
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
                            <button type="button" className="btn-secondary" onClick={() => startEdit(specialty)}>
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn-danger"
                              onClick={() => void removeSpecialty(specialty.id)}
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
