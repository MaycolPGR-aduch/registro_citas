"use client";

import Link from "next/link";
import { motion, Variants } from "framer-motion";
import {
  FaStethoscope,
  FaUserMd,
  FaClock,
  FaUsers,
  FaPlusCircle,
  FaCalendarCheck,
  FaArrowRight,
} from "react-icons/fa";
import { SectionCard } from "@/components/ui/section-card";

const quickLinks = [
  {
    href: "/especialidades",
    title: "Especialidades",
    description: "Crear, editar y eliminar especialidades médicas del sistema.",
    icon: <FaStethoscope />,
    lightColor: "bg-blue-50 text-blue-600",
  },
  {
    href: "/medicos",
    title: "Médicos",
    description: "Gestión completa de médicos, sus perfiles y estados activos.",
    icon: <FaUserMd />,
    lightColor: "bg-sky-50 text-sky-600",
  },
  {
    href: "/horarios",
    title: "Horarios",
    description: "Administrar bloques horarios y disponibilidad por médico.",
    icon: <FaClock />,
    lightColor: "bg-indigo-50 text-indigo-600",
  },
  {
    href: "/pacientes",
    title: "Pacientes",
    description: "Registro y administración de la base de datos de pacientes.",
    icon: <FaUsers />,
    lightColor: "bg-violet-50 text-violet-600",
  },
  {
    href: "/citas/nueva",
    title: "Nueva Cita",
    description: "Agendar citas validando la disponibilidad real en tiempo real.",
    icon: <FaPlusCircle />,
    lightColor: "bg-emerald-50 text-emerald-600",
  },
  {
    href: "/citas",
    title: "Gestión de Citas",
    description: "Control total de citas: estados, ediciones y cancelaciones.",
    icon: <FaCalendarCheck />,
    lightColor: "bg-rose-50 text-rose-600",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 120, damping: 16 },
  },
};

export function QuickLinksGrid() {
  return (
    <motion.div
      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {quickLinks.map((item) => (
        <motion.div
          key={item.href}
          variants={cardVariants}
          whileHover={{ y: -6 }}
          whileTap={{ scale: 0.97 }}
        >
          <Link href={item.href} className="group block h-full">
            <SectionCard className="h-full flex flex-col justify-between gap-5 border-transparent bg-white transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.03)] group-hover:shadow-[0_16px_36px_rgba(0,0,0,0.08)] group-hover:border-slate-200">
              <div className="space-y-3">
                <motion.div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${item.lightColor}`}
                  whileHover={{ rotate: 10, scale: 1.08 }}
                >
                  {item.icon}
                </motion.div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-800 transition-colors group-hover:text-sky-600">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-500">{item.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-sky-600">
                <span>Gestionar módulo</span>
                <FaArrowRight className="text-[9px]" />
              </div>
            </SectionCard>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
