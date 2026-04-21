"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useActionState } from "react";
import { signUpPatientAction } from "@/app/auth/actions";
import { INITIAL_AUTH_STATE } from "@/app/auth/form-state";
import { ErrorMessage } from "@/components/ui/error-message";
import { SectionCard } from "@/components/ui/section-card";
import { SuccessMessage } from "@/components/ui/success-message";

type PasswordRule = {
  label: string;
  valid: boolean;
};

export default function RegistroPage() {
  const [state, formAction, pending] = useActionState(
    signUpPatientAction,
    INITIAL_AUTH_STATE,
  );

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const passwordRules = useMemo<PasswordRule[]>(
    () => [
      {
        label: "Al menos 8 caracteres",
        valid: password.length >= 8,
      },
      {
        label: "Contiene una letra",
        valid: /[A-Za-z]/.test(password),
      },
      {
        label: "Contiene un número",
        valid: /\d/.test(password),
      },
    ],
    [password],
  );

  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setClientError(null);

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      event.preventDefault();
      setClientError("Completa todos los campos obligatorios.");
      return;
    }

    if (password.length < 8) {
      event.preventDefault();
      setClientError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      event.preventDefault();
      setClientError("La contraseña debe incluir al menos una letra y un número.");
      return;
    }

    if (password !== confirmPassword) {
      event.preventDefault();
      setClientError("Las contraseñas no coinciden.");
    }
  }

  return (
    <section className="mx-auto flex min-h-[78vh] w-full max-w-6xl items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-2">
        <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 p-10 text-white">
          <div>
            <p className="mb-3 inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
              Registro de paciente
            </p>
            <h1 className="text-4xl font-bold leading-tight">
              Crea tu cuenta y agenda tus citas
            </h1>
            <p className="mt-4 max-w-md text-sm text-white/90">
              Regístrate para reservar, revisar y cancelar tus propias citas médicas
              desde una sola plataforma.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm font-semibold">Acceso personal</p>
              <p className="mt-1 text-sm text-white/85">
                Cada paciente gestiona únicamente sus propias citas.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm font-semibold">Proceso simple</p>
              <p className="mt-1 text-sm text-white/85">
                Regístrate, inicia sesión y reserva un horario disponible.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center bg-slate-50 p-5 sm:p-8">
          <div className="w-full max-w-md space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium text-sky-700">Nuevo paciente</p>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                Registro de cuenta
              </h2>
              <p className="text-sm text-slate-600">
                Crea tu cuenta para reservar y gestionar tus propias citas médicas.
              </p>
            </div>

            {clientError && <ErrorMessage message={clientError} />}
            {state.error && <ErrorMessage message={state.error} />}
            {state.message && <SuccessMessage message={state.message} />}

            <SectionCard className="border border-slate-200 bg-white shadow-sm">
              <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="full_name">Nombre completo</label>
                  <input
                    id="full_name"
                    name="full_name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Ingresa tu nombre completo"
                    autoComplete="name"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email">Correo electrónico</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="correo@ejemplo.com"
                    autoComplete="email"
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
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Crea una contraseña segura"
                    autoComplete="new-password"
                    required
                  />

                  <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-700">
                      Requisitos de contraseña
                    </p>

                    <ul className="space-y-1 text-xs">
                      {passwordRules.map((rule) => (
                        <li
                          key={rule.label}
                          className={rule.valid ? "text-emerald-700" : "text-slate-500"}
                        >
                          {rule.valid ? "✓" : "•"} {rule.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm_password">Confirmar contraseña</label>
                  <input
                    id="confirm_password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repite tu contraseña"
                    autoComplete="new-password"
                    required
                  />

                  {confirmPassword.length > 0 && (
                    <p
                      className={`mt-2 text-xs ${
                        passwordsMatch ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {passwordsMatch
                        ? "Las contraseñas coinciden."
                        : "Las contraseñas no coinciden."}
                    </p>
                  )}
                </div>

                <button type="submit" className="btn-primary w-full" disabled={pending}>
                  {pending ? "Creando cuenta..." : "Crear cuenta"}
                </button>
              </form>
            </SectionCard>

            <SectionCard className="border border-slate-200 bg-white shadow-sm">
              <p className="text-sm text-slate-700">
                ¿Ya tienes cuenta?{" "}
                <Link
                  className="font-semibold text-sky-700 hover:text-sky-600"
                  href="/login"
                >
                  Inicia sesión
                </Link>
              </p>
            </SectionCard>
          </div>
        </div>
      </div>
    </section>
  );
}