"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { signInAction } from "@/app/auth/actions";
import { INITIAL_AUTH_STATE } from "@/app/auth/form-state";
import { ErrorMessage } from "@/components/ui/error-message";
import { SectionCard } from "@/components/ui/section-card";
import { SuccessMessage } from "@/components/ui/success-message";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "";
  const [state, formAction, pending] = useActionState(signInAction, INITIAL_AUTH_STATE);

  return (
    <section className="mx-auto w-full max-w-md space-y-4">
      <SectionCard>
        <div className="space-y-2">
          <h1>Iniciar Sesion</h1>
          <p className="text-sm text-slate-600">
            Ingresa con tu cuenta para acceder a las funciones segun tu rol.
          </p>
        </div>
      </SectionCard>

      {state.error && <ErrorMessage message={state.error} />}
      {state.message && <SuccessMessage message={state.message} />}

      <SectionCard>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="next" value={nextPath} />

          <div>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>

          <div>
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </SectionCard>

      <SectionCard>
        <p className="text-sm text-slate-700">
          ¿No tienes cuenta?{" "}
          <Link className="font-semibold text-sky-700 hover:text-sky-600" href="/registro">
            Registrate como paciente
          </Link>
        </p>
      </SectionCard>
    </section>
  );
}
