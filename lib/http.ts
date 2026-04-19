import { NextResponse } from "next/server";

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function errorResponse(status: number, error: string, details?: string) {
  return NextResponse.json(
    {
      error,
      ...(details ? { details } : {}),
    },
    { status },
  );
}
