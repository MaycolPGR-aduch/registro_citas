"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpPatientAction } from "@/app/auth/actions";
import { INITIAL_AUTH_STATE } from "@/app/auth/form-state";
import { ErrorMessage } from "@/components/ui/error-message";
import { SectionCard } from "@/components/ui/section-card";
import { SuccessMessage } from "@/components/ui/success-message";

export default function RegistroPage() {
  const [state, formAction, pending] = useActionState(signUpPatientAction, INITIAL_AUTH_STATE);

  return (
    <section className="mx-auto w-full max-w-md space-y-4">
      <SectionCard>
        <div className="space-y-2">
          <h1>Registro de Paciente</h1>
          <p className="text-sm text-slate-600">
            Crea tu cuenta para reservar y gestionar tus propias citas medicas.
          </p>
        </div>
      </SectionCard>

      {state.error && <ErrorMessage message={state.error} />}
      {state.message && <SuccessMessage message={state.message} />}

      <SectionCard>
        <form action={formAction} className="space-y-3">
          <div>
            <label htmlFor="full_name">Nombre completo</label>
            <input id="full_name" name="full_name" required />
          </div>

          <div>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>

          <div>
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>
      </SectionCard>

      <SectionCard>
        <p className="text-sm text-slate-700">
          ¿Ya tienes cuenta?{" "}
          <Link className="font-semibold text-sky-700 hover:text-sky-600" href="/login">
            Inicia sesion
          </Link>
        </p>
      </SectionCard>
    </section>
  );
}
