import { ApiFailure } from "@/lib/types";

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => null)) as T | ApiFailure | null;

  if (!response.ok) {
    const fallback = `Error HTTP ${response.status}`;
    if (payload && typeof payload === "object" && "error" in payload && payload.error) {
      throw new Error(payload.error);
    }
    throw new Error(fallback);
  }

  if (!payload) {
    throw new Error("Respuesta vacía del servidor.");
  }

  return payload as T;
}
