"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FaSignInAlt, FaUserPlus, FaEye, FaEyeSlash, FaHospital, FaCheckCircle } from "react-icons/fa";
import { sileo } from "sileo";
import { signInAction } from "@/app/auth/actions";
import { INITIAL_AUTH_STATE } from "@/app/auth/form-state";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "";
  const [state, formAction, pending] = useActionState(signInAction, INITIAL_AUTH_STATE);
  
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (state.error) {
      sileo.error({ title: "Error de Acceso", description: state.error });
    }
    if (state.message) {
      sileo.success({ title: "Bienvenido", description: state.message });
    }
  }, [state]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 bg-[radial-gradient(circle_at_top_right,_#f8fafc,_#e2e8f0)] relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-[-10%] left-[-10%] w-1/2 h-1/2 bg-sky-100/50 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-1/2 h-1/2 bg-indigo-100/50 rounded-full blur-[120px] -z-10" />

      {/* CARD FLOTANTE PRINCIPAL */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-5xl bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] overflow-hidden flex flex-col md:flex-row min-h-[600px] border border-white"
      >
        
        {/* LADO IZQUIERDO: PANEL VISUAL (Dentro de la Card) */}
        <section className="relative hidden md:flex md:w-1/2 bg-slate-900 overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[20s] hover:scale-110"
            style={{ backgroundImage: "url('/banner_hospital.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-sky-900/90 via-sky-900/40 to-transparent" />
          
          <div className="relative z-10 flex flex-col justify-between h-full p-10 lg:p-14 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-xl border border-white/20">
                <FaHospital className="text-xl text-sky-400" />
              </div>
              <span className="text-sm font-black tracking-widest uppercase italic opacity-80">Sistema Médico</span>
            </div>

            <div className="space-y-6">
              <h1 className="text-4xl lg:text-5xl font-black leading-tight tracking-tight">
                Gestión <br /><span className="text-sky-400">Hospitalaria</span>
              </h1>
              <p className="text-lg text-slate-200 font-medium leading-relaxed">
                Cuidamos tu salud con tecnología de punta.
              </p>
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
                <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 shrink-0">
                  <FaCheckCircle className="text-sm" />
                </div>
                <p className="text-xs lg:text-sm text-slate-300 leading-snug">
                  Control de especialidades, médicos, horarios y citas en una sola plataforma.
                </p>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              © 2026 Sistema Hospitalario
            </div>
          </div>
        </section>

        {/* LADO DERECHO: FORMULARIO (Dentro de la Card) */}
        <section className="flex-1 flex flex-col justify-center p-8 lg:p-14 bg-white">
          <div className="w-full max-w-sm mx-auto space-y-8">
            <div className="space-y-2">
              <div className="md:hidden flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-600 mb-4">
                <FaHospital className="text-xl" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Bienvenido</h2>
              <p className="text-slate-500 font-medium">Ingresa para gestionar tus citas.</p>
            </div>

            <form action={formAction} className="space-y-5">
              <input type="hidden" name="next" value={nextPath} />

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-bold text-slate-700 ml-1">Email</label>
                <input 
                  id="email" 
                  name="email" 
                  type="email" 
                  autoComplete="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border-slate-200 bg-slate-50/50 py-3.5 px-4 focus:border-sky-500 focus:ring-sky-500 transition-all shadow-sm"
                  placeholder="nombre@ejemplo.com"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-bold text-slate-700 ml-1">Contraseña</label>
                <div className="relative group">
                  <input 
                    id="password" 
                    name="password" 
                    type={showPassword ? "text" : "password"} 
                    autoComplete="current-password" 
                    required 
                    className="w-full rounded-2xl border-slate-200 bg-slate-50/50 py-3.5 px-4 focus:border-sky-500 focus:ring-sky-500 transition-all pr-12 shadow-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-600 transition-colors"
                  >
                    {showPassword ? <FaEyeSlash className="text-xl" /> : <FaEye className="text-xl" />}
                  </button>
                </div>
              </div>

              <motion.button 
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                className="btn-primary w-full py-4 text-base font-bold shadow-xl shadow-sky-100 mt-4 rounded-2xl flex items-center justify-center gap-3 transition-all" 
                disabled={pending}
              >
                {pending ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <FaSignInAlt />
                    <span>Entrar</span>
                  </>
                )}
              </motion.button>
            </form>

            <div className="pt-6 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500 font-medium mb-4">¿No tienes cuenta?</p>
              <Link className="inline-flex items-center gap-2 text-sm font-bold text-sky-700 hover:text-sky-600 transition-all px-6 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100" href="/registro">
                <FaUserPlus />
                <span>Registrarse</span>
              </Link>
            </div>
          </div>
        </section>
      </motion.div>
    </main>
  );
}
