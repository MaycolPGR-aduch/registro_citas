"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { FaUserMd, FaList, FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaStethoscope } from "react-icons/fa";
import { sileo } from "sileo";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { fetchJson } from "@/lib/fetcher";
import { ApiPayload, DoctorSummary, SpecialtySummary } from "@/lib/types";
import { validateEmail } from "@/lib/validation";

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

export default function MedicosPage() {
  const [specialties, setSpecialties] = useState<SpecialtySummary[]>([]);
  const [doctors, setDoctors] = useState<DoctorSummary[]>([]);
  const [form, setForm] = useState<DoctorForm>(INITIAL_FORM);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [doctorToDelete, setDoctorToDelete] = useState<DoctorSummary | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<DoctorForm>(INITIAL_FORM);

  async function loadData() {
    try {
      setLoading(true);
      const [specialtiesResponse, doctorsResponse] = await Promise.all([
        fetchJson<ApiPayload<SpecialtySummary[]>>("/api/specialties"),
        fetchJson<ApiPayload<DoctorSummary[]>>("/api/doctors"),
      ]);

      setSpecialties(specialtiesResponse.data);
      setDoctors(doctorsResponse.data);
    } catch (caught) {
      sileo.error({ title: "Error", description: caught instanceof Error ? caught.message : "No se pudo cargar la informacion de medicos." });
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

    if (!form.full_name.trim()) {
      sileo.warning({ title: "Falta Nombre", description: "El nombre completo es obligatorio." });
      return;
    }
    if (!form.specialty_id) {
      sileo.warning({ title: "Falta Especialidad", description: "Debes seleccionar una especialidad médica." });
      return;
    }
    if (form.email && !validateEmail(form.email)) {
      sileo.warning({ title: "Email Inválido", description: "Por favor ingresa un correo electrónico real." });
      return;
    }

    try {
      setSubmitting(true);
      await fetchJson<ApiPayload<DoctorSummary>>("/api/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          specialty_id: Number(form.specialty_id),
        }),
      });

      setForm(INITIAL_FORM);
      sileo.success({ title: "Éxito", description: "Médico creado correctamente." });
      setIsModalOpen(false);
      await loadData();
    } catch (caught) {
      sileo.error({ title: "Error", description: caught instanceof Error ? caught.message : "No se pudo crear el medico." });
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

    if (!editingForm.full_name.trim()) {
      sileo.warning({ title: "Nombre Vacío", description: "El nombre no puede estar vacío." });
      return;
    }
    if (editingForm.email && !validateEmail(editingForm.email)) {
      sileo.warning({ title: "Email Inválido", description: "El correo electrónico no es válido." });
      return;
    }

    try {
      setSubmitting(true);
      await fetchJson<ApiPayload<DoctorSummary>>(`/api/doctors/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingForm,
          specialty_id: Number(editingForm.specialty_id),
        }),
      });

      setEditingId(null);
      sileo.success({ title: "Actualizado", description: "Médico actualizado correctamente." });
      await loadData();
    } catch (caught) {
      sileo.error({ title: "Error", description: caught instanceof Error ? caught.message : "No se pudo actualizar el medico." });
    } finally {
      setSubmitting(false);
    }
  }

  function confirmDelete(doctor: DoctorSummary) {
    setDoctorToDelete(doctor);
    setIsDeleteModalOpen(true);
  }

  async function handleRemove() {
    if (!doctorToDelete) return;

    try {
      setSubmitting(true);
      await fetchJson<ApiPayload<{ deleted: boolean }>>(`/api/doctors/${doctorToDelete.id}`, {
        method: "DELETE",
      });

      sileo.success({ title: "Eliminado", description: `Médico ${doctorToDelete.full_name} eliminado correctamente.` });
      setIsDeleteModalOpen(false);
      setDoctorToDelete(null);
      await loadData();
    } catch (caught) {
      sileo.error({ title: "Error", description: caught instanceof Error ? caught.message : "No se pudo eliminar el medico." });
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
        title="Médicos"
        description="Gestión completa de médicos: crear, editar, activar/desactivar y eliminar."
        icon={<FaUserMd size={28} />}
      />

      <SectionCard>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
              <FaList />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Listado de Médicos</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/especialidades" className="btn-secondary group flex items-center gap-2">
              <FaStethoscope className="text-sm transition-transform group-hover:scale-110" />
              <span>Gestionar Especialidades</span>
            </Link>
            <motion.button 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }}
              type="button" 
              className="btn-primary flex items-center gap-2" 
              onClick={() => setIsModalOpen(true)}
            >
              <FaPlus className="text-sm" />
              <span>Nuevo Médico</span>
            </motion.button>
          </div>
        </div>

        {loading ? (
          <div className="mt-6">
            <TableSkeleton cols={7} rows={6} />
          </div>
        ) : (
          <>
            {!loading && doctors.length === 0 && (
              <EmptyState title="Sin médicos" description="Registra al menos un médico para iniciar el flujo." />
            )}

            {!loading && doctors.length > 0 && (
              <div className="table-wrap mt-4">
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
                  <motion.tbody
                    variants={tableContainerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <AnimatePresence mode="popLayout">
                      {doctors.map((doctor) => {
                        const isEditing = editingId === doctor.id;

                        return (
                          <motion.tr 
                            key={doctor.id}
                            variants={rowVariants}
                            layout
                            exit="exit"
                          >
                            <td>
                              {isEditing ? (
                                <input
                                  value={editingForm.full_name}
                                  onChange={(event) =>
                                    setEditingForm((prev) => ({ ...prev, full_name: event.target.value }))
                                  }
                                  className="w-full"
                                />
                              ) : (
                                <span className="font-semibold text-slate-700">{doctor.full_name}</span>
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <select
                                  value={editingForm.specialty_id}
                                  onChange={(event) =>
                                    setEditingForm((prev) => ({ ...prev, specialty_id: event.target.value }))
                                  }
                                  className="w-full"
                                >
                                  <option value="">Seleccionar especialidad</option>
                                  {specialties.map((specialty) => (
                                    <option key={specialty.id} value={specialty.id}>
                                      {specialty.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                                  {doctor.specialty_name ?? "Sin especialidad"}
                                </span>
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
                                  className="w-full"
                                />
                              ) : (
                                <span className="text-slate-500">{doctor.email ?? "No registrado"}</span>
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  value={editingForm.phone}
                                  onChange={(event) =>
                                    setEditingForm((prev) => ({ ...prev, phone: event.target.value }))
                                  }
                                  className="w-full"
                                />
                              ) : (
                                <span className="text-slate-500">{doctor.phone ?? "No registrado"}</span>
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  value={editingForm.license_number}
                                  onChange={(event) =>
                                    setEditingForm((prev) => ({ ...prev, license_number: event.target.value }))
                                  }
                                  className="w-full"
                                />
                              ) : (
                                <span className="text-xs font-mono text-slate-400">{doctor.license_number ?? "N/A"}</span>
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
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className={`h-2 w-2 rounded-full ${doctor.active ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                                  <span className={doctor.active ? 'text-emerald-600 font-medium' : 'text-rose-500 font-medium'}>
                                    {doctor.active ? "Activo" : "Inactivo"}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="space-x-2">
                              {isEditing ? (
                                <div className="flex gap-2">
                                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs" onClick={() => void saveEdit()} disabled={submitting}>
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
                                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs" onClick={() => startEdit(doctor)}>
                                    <FaEdit className="text-sky-600" />
                                    <span>Editar</span>
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.05, backgroundColor: "#fecaca" }} whileTap={{ scale: 0.95 }}
                                    type="button"
                                    className="btn-danger flex items-center gap-1.5 px-3 py-1.5 text-xs"
                                    onClick={() => confirmDelete(doctor)}
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

      {/* Modal para Crear */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={
        <div className="flex items-center gap-2">
          <FaUserMd className="text-sky-600" />
          <span>Nuevo Médico</span>
        </div>
      }>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            await handleCreate(e);
          }}
        >
          <div>
            <label htmlFor="modal-full_name" className="text-sm font-semibold text-slate-700">Nombre completo *</label>
            <input
              id="modal-full_name"
              value={form.full_name}
              onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
              required
              className="w-full shadow-sm"
            />
          </div>

          <div>
            <label htmlFor="modal-specialty_id" className="text-sm font-semibold text-slate-700">Especialidad *</label>
            <select
              id="modal-specialty_id"
              value={form.specialty_id}
              onChange={(event) => setForm((prev) => ({ ...prev, specialty_id: event.target.value }))}
              required
              className="w-full shadow-sm"
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
            <label htmlFor="modal-email" className="text-sm font-semibold text-slate-700">Correo</label>
            <input
              id="modal-email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full shadow-sm"
            />
          </div>

          <div>
            <label htmlFor="modal-phone" className="text-sm font-semibold text-slate-700">Telefono</label>
            <input
              id="modal-phone"
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              className="w-full shadow-sm"
            />
          </div>

          <div>
            <label htmlFor="modal-license_number" className="text-sm font-semibold text-slate-700">Numero de licencia</label>
            <input
              id="modal-license_number"
              value={form.license_number}
              onChange={(event) => setForm((prev) => ({ ...prev, license_number: event.target.value }))}
              className="w-full shadow-sm"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-sky-600"
              />
              <span className="text-sm font-semibold text-slate-700">Médico activo en el sistema</span>
            </label>
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
                  <span>Crear Médico</span>
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
        title="Eliminar Médico"
        description={`¿Estás seguro de que deseas eliminar al médico ${doctorToDelete?.full_name}? Esta acción no se puede deshacer.`}
        isLoading={submitting}
      />
    </section>
  );
}
