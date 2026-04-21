"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { FaStethoscope, FaPlus, FaEdit, FaTrash, FaList, FaSave, FaTimes } from "react-icons/fa";
import { sileo } from "sileo";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
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

const tableContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const rowVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { type: "spring", stiffness: 100, damping: 12 }
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

export default function EspecialidadesPage() {
  const [specialties, setSpecialties] = useState<SpecialtySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<SpecialtyForm>(INITIAL_FORM);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [specialtyToDelete, setSpecialtyToDelete] = useState<SpecialtySummary | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<SpecialtyForm>(INITIAL_FORM);

  async function loadSpecialties() {
    try {
      setLoading(true);
      const response = await fetchJson<ApiPayload<SpecialtySummary[]>>("/api/specialties");
      setSpecialties(response.data);
    } catch (caught) {
      sileo.error({ title: "Error", description: caught instanceof Error ? caught.message : "No se pudieron cargar especialidades." });
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
      sileo.warning({ title: "Falta Nombre", description: "El nombre de la especialidad es obligatorio." });
      return;
    }
    if (form.name.trim().length < 3) {
      sileo.warning({ title: "Nombre Muy Corto", description: "El nombre debe tener al menos 3 caracteres." });
      return;
    }

    try {
      setSubmitting(true);
      await fetchJson<ApiPayload<SpecialtySummary>>("/api/specialties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      setForm(INITIAL_FORM);
      sileo.success({ title: "Éxito", description: "Especialidad creada correctamente." });
      setIsModalOpen(false);
      await loadSpecialties();
    } catch (caught) {
      sileo.error({ title: "Error", description: caught instanceof Error ? caught.message : "No se pudo crear la especialidad." });
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
      sileo.warning({ title: "Nombre Requerido", description: "El nombre no puede estar vacio." });
      return;
    }

    try {
      setSubmitting(true);
      await fetchJson<ApiPayload<SpecialtySummary>>(`/api/specialties/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingForm),
      });

      setEditingId(null);
      sileo.success({ title: "Actualizado", description: "Especialidad actualizada correctamente." });
      await loadSpecialties();
    } catch (caught) {
      sileo.error({ title: "Error", description: caught instanceof Error ? caught.message : "No se pudo actualizar la especialidad." });
    } finally {
      setSubmitting(false);
    }
  }

  function confirmDelete(item: SpecialtySummary) {
    setSpecialtyToDelete(item);
    setIsDeleteModalOpen(true);
  }

  async function handleRemove() {
    if (!specialtyToDelete) return;

    try {
      setSubmitting(true);
      await fetchJson<ApiPayload<{ deleted: boolean }>>(`/api/specialties/${specialtyToDelete.id}`, {
        method: "DELETE",
      });

      sileo.success({ title: "Eliminado", description: `Especialidad ${specialtyToDelete.name} eliminada correctamente.` });
      setIsDeleteModalOpen(false);
      setSpecialtyToDelete(null);
      await loadSpecialties();
    } catch (caught) {
      sileo.error({ title: "Error", description: caught instanceof Error ? caught.message : "No se pudo eliminar la especialidad." });
    } finally {
      setSubmitting(false);
    }
  }

  function closeModal() {
    setIsModalOpen(false);
    setForm(INITIAL_FORM);
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Especialidades"
        description="Gestiona las especialidades médicas antes de crear o editar médicos."
        icon={<FaStethoscope size={28} />}
      />

      <SectionCard>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
              <FaList />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Listado de Especialidades</h2>
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            type="button" className="btn-primary flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
            <FaPlus className="text-sm" />
            <span>Nueva Especialidad</span>
          </motion.button>
        </div>

        {loading ? (
          <div className="mt-6">
            <TableSkeleton rows={5} cols={3} />
          </div>
        ) : (
          <>
            {!loading && specialties.length === 0 && (
              <EmptyState title="Sin especialidades" description="Agrega al menos una especialidad para continuar." />
            )}

            {!loading && specialties.length > 0 && (
              <div className="table-wrap mt-4">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Descripción</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <motion.tbody
                    variants={tableContainerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <AnimatePresence mode="popLayout">
                      {specialties.map((specialty) => {
                        const isEditing = editingId === specialty.id;

                        return (
                          <motion.tr key={specialty.id} variants={rowVariants} layout exit="exit">
                            <td>
                              {isEditing ? (
                                <input
                                  value={editingForm.name}
                                  onChange={(event) => setEditingForm((prev) => ({ ...prev, name: event.target.value }))}
                                  className="w-full shadow-sm px-2 py-1 rounded"
                                />
                              ) : (
                                <span className="font-semibold text-slate-700">{specialty.name}</span>
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  value={editingForm.description}
                                  onChange={(event) =>
                                    setEditingForm((prev) => ({ ...prev, description: event.target.value }))
                                  }
                                  className="w-full shadow-sm px-2 py-1 rounded"
                                />
                              ) : (
                                <span className="text-slate-500 text-sm">{specialty.description ?? "Sin descripción"}</span>
                              )}
                            </td>
                            <td className="space-x-2">
                              {isEditing ? (
                                <div className="flex gap-2">
                                  <motion.button 
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    type="button" className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs" onClick={() => void saveEdit()} disabled={submitting}>
                                    <FaSave />
                                    <span>Guardar</span>
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    type="button"
                                    className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs"
                                    onClick={() => setEditingId(null)}
                                    disabled={submitting}
                                  >
                                    <FaTimes />
                                    <span>Cancelar</span>
                                  </motion.button>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <motion.button 
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    type="button" className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs" onClick={() => startEdit(specialty)}>
                                    <FaEdit className="text-sky-600" />
                                    <span>Editar</span>
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.05, backgroundColor: "#fee2e2" }} whileTap={{ scale: 0.95 }}
                                    type="button"
                                    className="btn-danger flex items-center gap-1.5 px-3 py-1.5 text-xs"
                                    onClick={() => confirmDelete(specialty)}
                                    disabled={submitting}
                                  >
                                    <FaTrash />
                                    <span>Eliminar</span>
                                  </motion.button>
                                </div>
                              )}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </motion.tbody>
                </table>
              </div>
            )}
          </>
        )}
      </SectionCard>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={
        <div className="flex items-center gap-2">
          <FaStethoscope className="text-sky-600" />
          <span>Nueva Especialidad</span>
        </div>
      }>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            await handleCreate(e);
          }}
        >
          <div className="space-y-1">
            <label htmlFor="modal-name" className="text-sm font-semibold text-slate-700">Nombre *</label>
            <input
              id="modal-name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Ejemplo: Cardiología"
              required
              className="w-full shadow-sm px-3 py-2 rounded-xl border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="modal-description" className="text-sm font-semibold text-slate-700">Descripción</label>
            <input
              id="modal-description"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Descripción breve"
              className="w-full shadow-sm px-3 py-2 rounded-xl border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" className="btn-secondary flex items-center gap-2" onClick={closeModal}>
              <FaTimes />
              <span>Cancelar</span>
            </button>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={submitting}>
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <FaSave />
                  <span>Crear Especialidad</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Confirmación para Eliminar */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => void handleRemove()}
        title="Eliminar Especialidad"
        description={`¿Estás seguro de que deseas eliminar la especialidad ${specialtyToDelete?.name}? Todos los médicos asociados podrían verse afectados.`}
        isLoading={submitting}
      />
    </section>
  );
}
