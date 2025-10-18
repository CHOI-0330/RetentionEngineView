import { NextResponse, type NextRequest } from "next/server";

import { SupabaseMentorDashboardGateway } from "../../../../src/interfaceAdapters/gateways/supabase";
import { SupabaseAuthGateway } from "../../../../src/interfaceAdapters/gateways/supabase/authGateway";

type MentorDashboardAction = "listStudentSummaries" | "submitFeedbackQuality";

export async function POST(request: NextRequest) {
  const { action, payload } = (await request.json()) as {
    action: MentorDashboardAction;
    payload: unknown;
  };

  const gateway = new SupabaseMentorDashboardGateway();
  const authGateway = new SupabaseAuthGateway();

  const accessToken = request.cookies.get("auth_access_token")?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let authUser;
  try {
    authUser = await authGateway.getUserFromAccessToken(accessToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  try {
    switch (action) {
      case "listStudentSummaries": {
        if (authUser.role !== "MENTOR") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const summaries = await gateway.listStudentSummaries(payload as { mentorId: string });
        return NextResponse.json({ data: summaries });
      }
      case "submitFeedbackQuality": {
        if (authUser.role !== "MENTOR") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        await gateway.submitFeedbackQuality(payload as {
          mentorId: string;
          studentId: string;
          isPositive: boolean;
        });
        return NextResponse.json({ data: { ok: true } });
      }
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
