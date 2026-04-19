import Link from "next/link";
import { SectionCard } from "@/components/ui/section-card";
import { PageHeader } from "@/components/ui/page-header";

const quickLinks = [
  {
    href: "/especialidades",
    title: "Especialidades",
    description: "Crear, editar y eliminar especialidades medicas.",
  },
  {
    href: "/medicos",
    title: "Medicos",
    description: "Gestion completa de medicos y su estado activo.",
  },
  {
    href: "/horarios",
    title: "Horarios",
    description: "Administrar bloques horarios por medico.",
  },
  {
    href: "/pacientes",
    title: "Pacientes",
    description: "Registrar, editar o eliminar pacientes.",
  },
  {
    href: "/citas/nueva",
    title: "Nueva Cita",
    description: "Crear citas validando disponibilidad real del horario.",
  },
  {
    href: "/citas",
    title: "Gestion de Citas",
    description: "Cambiar estado, editar detalles, cancelar o borrar citas.",
  },
];

export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Panel Principal"
        description="Version funcional v1 con gestion operativa de especialidades, medicos, horarios, pacientes y citas."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((item) => (
          <SectionCard key={item.href} className="flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <h2>{item.title}</h2>
              <p className="text-sm text-slate-600">{item.description}</p>
            </div>
            <Link href={item.href} className="btn-primary inline-flex w-fit items-center gap-2">
              Ir a {item.title}
            </Link>
          </SectionCard>
        ))}
      </div>
    </section>
  );
}
