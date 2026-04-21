import { NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";
import { UserRole } from "@/lib/types";

const PUBLIC_ROUTES = ["/login", "/registro"];

// Rutas solo para staff
const STAFF_ONLY_ROUTES = [
  "/especialidades",
  "/medicos",
  "/horarios",
  "/pacientes",
  "/citas",
];

// Rutas permitidas para paciente
const PATIENT_ROUTES = ["/mi-citas", "/citas/nueva"];

// Rutas compartidas
const SHARED_AUTH_ROUTES = ["/citas/nueva"];

function resolveHomePath(role: UserRole | null | undefined) {
  return role === "patient" ? "/mi-citas" : "/";
}

function matchesExactOrChild(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function matchesAny(pathname: string, routes: string[]) {
  return routes.some((route) => matchesExactOrChild(pathname, route));
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createSupabaseMiddlewareClient(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  const isPublicRoute = matchesAny(pathname, PUBLIC_ROUTES);
  const isSharedAuthRoute = matchesAny(pathname, SHARED_AUTH_ROUTES);
  const isStaffOnlyRoute = matchesAny(pathname, STAFF_ONLY_ROUTES);
  const isPatientRoute = matchesAny(pathname, PATIENT_ROUTES);

  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${search ?? ""}`);
    return NextResponse.redirect(loginUrl);
  }

  if (!user) {
    return response;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role ?? null) as UserRole | null;
  const homePath = resolveHomePath(role);

  if (isPublicRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = homePath;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  // Rutas compartidas: staff y paciente autenticado pueden entrar
  if (isSharedAuthRoute) {
    return response;
  }

  if (role === "patient" && isStaffOnlyRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/mi-citas";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (role !== "patient" && isPatientRoute && pathname !== "/citas/nueva") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (role === "patient" && pathname === "/") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/mi-citas";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};