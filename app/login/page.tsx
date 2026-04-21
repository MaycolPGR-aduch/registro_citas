"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useMemo, useState } from "react";

import { signInAction } from "@/app/auth/actions";
import { INITIAL_AUTH_STATE } from "@/app/auth/form-state";
import { ErrorMessage } from "@/components/ui/error-message";
import { SectionCard } from "@/components/ui/section-card";
import { SuccessMessage } from "@/components/ui/success-message";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "";

  const [state, formAction, pending] = useActionState(signInAction, INITIAL_AUTH_STATE);
  const [showPassword, setShowPassword] = useState(false);

  const hasFeedback = useMemo(() => {
    return Boolean(state.error || state.message);
  }, [state.error, state.message]);

  return (
    <section className="mx-auto flex min-h-[78vh] w-full max-w-6xl items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-2">
        <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-sky-600 via-cyan-600 to-blue-700 p-10 text-white">
          <div>
            <p className="mb-3 inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
              Sistema web
            </p>
            <h1 className="text-4xl font-bold leading-tight">
              Gestión de citas médicas
            </h1>
            <p className="mt-4 max-w-md text-sm text-white/90">
              Administra pacientes, médicos, horarios y citas en una sola plataforma.
              Inicia sesión para acceder según tu rol.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm font-semibold">Acceso por roles</p>
              <p className="mt-1 text-sm text-white/85">
                Administración y pacientes con vistas diferenciadas.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm font-semibold">Gestión centralizada</p>
              <p className="mt-1 text-sm text-white/85">
                Control de especialidades, médicos, horarios y citas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center bg-slate-50 p-5 sm:p-8">
          <div className="w-full max-w-md space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium text-sky-700">Bienvenido</p>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                Iniciar sesión
              </h2>
              <p className="text-sm text-slate-600">
                Ingresa con tu cuenta para acceder a las funciones según tu rol.
              </p>
            </div>

            {hasFeedback && (
              <div className="space-y-3">
                {state.error && <ErrorMessage message={state.error} />}
                {state.message && <SuccessMessage message={state.message} />}
              </div>
            )}

            <SectionCard className="border border-slate-200 bg-white shadow-sm">
              <form action={formAction} className="space-y-4">
                <input type="hidden" name="next" value={nextPath} />

                <div>
                  <label htmlFor="email">Correo electrónico</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="correo@ejemplo.com"
                    required
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label htmlFor="password" className="mb-0">
                      Contraseña
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="text-xs font-semibold text-sky-700 hover:text-sky-600"
                    >
                      {showPassword ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>

                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Ingresa tu contraseña"
                    required
                  />
                </div>

                <button type="submit" className="btn-primary w-full" disabled={pending}>
                  {pending ? "Ingresando..." : "Ingresar"}
                </button>
              </form>
            </SectionCard>

            <SectionCard className="border border-slate-200 bg-white shadow-sm">
              <p className="text-sm text-slate-700">
                ¿No tienes cuenta?{" "}
                <Link className="font-semibold text-sky-700 hover:text-sky-600" href="/registro">
                  Regístrate como paciente
                </Link>
              </p>
            </SectionCard>
          </div>
        </div>
      </div>
    </section>
  );
}