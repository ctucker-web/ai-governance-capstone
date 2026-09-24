import { NextResponse } from "next/server";
import { getActor, verifyOrigin } from "@/modules/auth/session";
import { execute, getWorkspace } from "@/modules/workflow/service";
import { errorResponse } from "@/lib/http";
import { AppError } from "@/modules/auth/policy";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return NextResponse.json(await getWorkspace(await getActor()), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const actor = await getActor();
    const text = await request.text();
    if (text.length > 100000)
      throw new AppError(
        413,
        "This request is too large. Use metadata rather than source documents.",
      );
    return NextResponse.json(await execute(actor, JSON.parse(text)));
  } catch (e) {
    return errorResponse(e);
  }
}
