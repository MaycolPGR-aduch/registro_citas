"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { FaUsers, FaEdit, FaTrash, FaList, FaSave, FaTimes, FaSearch, FaUserPlus } from "react-icons/fa";
import { sileo } from "sileo";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { fetchJson } from "@/lib/fetcher";
import { ApiPayload, PatientSummary } from "@/lib/types";
import { validateEmail } from "@/lib/validation";

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

export default function PacientesPage() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<PatientForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<PatientSummary | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<PatientForm>(INITIAL_FORM);

  async function loadPatients(searchText: string) {
    try {
      setLoading(true);
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
      sileo.error({ title: "Error", description: caught instanceof Error ? caught.message : "No se pudieron cargar pacientes." });
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

    if (!form.full_name.trim()) {
      sileo.warning({ title: "Nombre Requerido", description: "El nombre del paciente es obligatorio." });
      return;
    }
    if (form.email && !validateEmail(form.email)) {
      sileo.warning({ title: "Email Inválido", description: "Por favor revisa el formato del correo." });
      return;
    }
    if (form.dni && form.dni.length < 5) {
      sileo.warning({ title: "DNI Corto", description: "El DNI parece ser demasiado corto." });
      return;
    }

    try {
      setSubmitting(true);
      await fetchJson<ApiPayload<PatientSummary>>("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      setForm(INITIAL_FORM);
      sileo.success({ title: "Registrado", description: "Paciente registrado correctamente." });
      setIsModalOpen(false);
      await loadPatients(query);
    } catch (caught) {
      sileo.error({ title: "Error", description: caught instanceof Error ? caught.message : "No se pudo registrar el paciente." });
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
      sileo.warning({ title: "Nombre Requerido", description: "El nombre no puede estar vacío." });
      return;
    }
    if (editingForm.email && !validateEmail(editingForm.email)) {
      sileo.warning({ title: "Email Inválido", description: "El correo electrónico no es válido." });
      return;
    }

    try {
      setSubmitting(true);
      await fetchJson<ApiPayload<PatientSummary>>(`/api/patients/${editingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editingForm),
      });

      setEditingId(null);
      sileo.success({ title: "Actualizado", description: "Paciente actualizado correctamente." });
      await loadPatients(query);
    } catch (caught) {
      sileo.error({ title: "Error", description: caught instanceof Error ? caught.message : "No se pudo actualizar el paciente." });
    } finally {
      setSubmitting(false);
    }
  }

  function confirmDelete(patient: PatientSummary) {
    setPatientToDelete(patient);
    setIsDeleteModalOpen(true);
  }

  async function handleRemove() {
    if (!patientToDelete) return;

    try {
      setSubmitting(true);
      await fetchJson<ApiPayload<{ deleted: boolean }>>(`/api/patients/${patientToDelete.id}`, {
        method: "DELETE",
      });

      sileo.success({ title: "Eliminado", description: `Paciente ${patientToDelete.full_name} eliminado correctamente.` });
      setIsDeleteModalOpen(false);
      setPatientToDelete(null);
      await loadPatients(query);
    } catch (caught) {
      sileo.error({ title: "Error", description: caught instanceof Error ? caught.message : "No se pudo eliminar el paciente." });
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
        title="Pacientes"
        description="Gestión completa de pacientes: crear, buscar, editar y eliminar."
        icon={<FaUsers size={28} />}
      />

      <SectionCard>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
              <FaList />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Listado de Pacientes</h2>
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            type="button" className="btn-primary flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
            <FaUserPlus className="text-sm" />
            <span>Nuevo Paciente</span>
          </motion.button>
        </div>
        
        <form className="mt-6 flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-4 border border-slate-100" onSubmit={handleSearch}>
          <div className="w-full max-w-md space-y-1">
            <label htmlFor="search" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FaSearch className="text-sky-500 text-xs" />
              <span>Buscar Paciente</span>
            </label>
            <input
              id="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nombre, DNI o correo..."
              className="w-full shadow-sm rounded-xl"
            />
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            type="submit" className="btn-secondary flex items-center gap-2">
            <FaSearch className="text-sm" />
            <span>Buscar</span>
          </motion.button>
        </form>

        {loading ? (
          <div className="mt-6">
            <TableSkeleton cols={6} rows={8} />
          </div>
        ) : (
          <>
            {!loading && patients.length === 0 && (
              <EmptyState title="Sin pacientes" description="No hay pacientes para el criterio de búsqueda actual." />
            )}
            {!loading && patients.length > 0 && (
              <div className="table-wrap mt-6">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>DNI</th>
                      <th>Correo</th>
                      <th>Teléfono</th>
                      <th>Nacimiento</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <motion.tbody
                    variants={tableContainerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <AnimatePresence mode="popLayout">
                      {patients.map((patient) => {
                        const isEditing = editingId === patient.id;

                        return (
                          <motion.tr key={patient.id} variants={rowVariants} layout exit="exit">
                            <td>
                              {isEditing ? (
                                <input
                                  value={editingForm.full_name}
                                  onChange={(event) =>
                                    setEditingForm((prev) => ({ ...prev, full_name: event.target.value }))
                                  }
                                  className="w-full shadow-sm rounded px-2 py-1"
                                />
                              ) : (
                                <span className="font-semibold text-slate-700">{patient.full_name}</span>
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  value={editingForm.dni}
                                  onChange={(event) => setEditingForm((prev) => ({ ...prev, dni: event.target.value }))}
                                  className="w-full shadow-sm rounded px-2 py-1"
                                />
                              ) : (
                                <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{patient.dni ?? "No registrado"}</span>
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  type="email"
                                  value={editingForm.email}
                                  onChange={(event) => setEditingForm((prev) => ({ ...prev, email: event.target.value }))}
                                  className="w-full shadow-sm rounded px-2 py-1"
                                />
                              ) : (
                                <span className="text-slate-500 text-sm">{patient.email ?? "No registrado"}</span>
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  value={editingForm.phone}
                                  onChange={(event) => setEditingForm((prev) => ({ ...prev, phone: event.target.value }))}
                                  className="w-full shadow-sm rounded px-2 py-1"
                                />
                              ) : (
                                <span className="text-slate-500 text-sm">{patient.phone ?? "No registrado"}</span>
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
                                  className="w-full shadow-sm rounded px-2 py-1"
                                />
                              ) : (
                                <span className="text-slate-400 text-sm">{patient.birth_date ?? "No registrado"}</span>
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
                                    type="button" className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs" onClick={() => startEdit(patient)}>
                                    <FaEdit className="text-sky-600" />
                                    <span>Editar</span>
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.05, backgroundColor: "#fee2e2" }} whileTap={{ scale: 0.95 }}
                                    type="button" className="btn-danger flex items-center gap-1.5 px-3 py-1.5 text-xs" onClick={() => confirmDelete(patient)} disabled={submitting}>
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
          <FaUsers className="text-sky-600" />
          <span>Nuevo Paciente</span>
        </div>
      }>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            await handleCreate(e);
          }}
        >
          <div className="space-y-1">
            <label htmlFor="modal-full_name" className="text-sm font-semibold text-slate-700">Nombre completo *</label>
            <input
              id="modal-full_name"
              value={form.full_name}
              onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
              placeholder="Ejemplo: Juan Pérez"
              required
              className="w-full shadow-sm rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="modal-dni" className="text-sm font-semibold text-slate-700">DNI</label>
            <input
              id="modal-dni"
              value={form.dni}
              onChange={(event) => setForm((prev) => ({ ...prev, dni: event.target.value }))}
              className="w-full shadow-sm rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="modal-birth_date" className="text-sm font-semibold text-slate-700">Fecha de nacimiento</label>
            <input
              id="modal-birth_date"
              type="date"
              value={form.birth_date}
              onChange={(event) => setForm((prev) => ({ ...prev, birth_date: event.target.value }))}
              className="w-full shadow-sm rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="modal-phone" className="text-sm font-semibold text-slate-700">Teléfono</label>
            <input
              id="modal-phone"
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              className="w-full shadow-sm rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="modal-email" className="text-sm font-semibold text-slate-700">Correo</label>
            <input
              id="modal-email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="correo@ejemplo.com"
              className="w-full shadow-sm rounded-xl"
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
                  <span>Registrar Paciente</span>
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
        title="Eliminar Paciente"
        description={`¿Estás seguro de que deseas eliminar al paciente ${patientToDelete?.full_name}? Esta acción no se puede deshacer y borrará todo su historial.`}
        isLoading={submitting}
      />
    </section>
  );
}
