import { NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";
import { UserRole } from "@/lib/types";

const PUBLIC_ROUTES = new Set(["/login", "/registro"]);
const STAFF_ROUTES = new Set(["/especialidades", "/medicos", "/horarios", "/pacientes", "/citas"]);
const PATIENT_ROUTES = new Set(["/mi-citas"]);

function homeForRole(role: UserRole | null | undefined) {
  return role === "patient" ? "/mi-citas" : "/";
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request,
  });
  const supabase = createSupabaseMiddlewareClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);

  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
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

  if (isPublicRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = homeForRole(role);
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (role === "patient" && STAFF_ROUTES.has(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/mi-citas";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (role !== "patient" && PATIENT_ROUTES.has(pathname)) {
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
