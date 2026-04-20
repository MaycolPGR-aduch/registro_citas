import { requireAuth } from "@/lib/auth/session";
import { successResponse } from "@/lib/http";

export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  return successResponse({
    user_id: authResult.context.user.id,
    role: authResult.context.profile.role,
    profile: authResult.context.profile,
    patient_id: authResult.context.patientId,
  });
}
