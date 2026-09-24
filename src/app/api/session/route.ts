import { NextResponse } from "next/server";
import { z } from "zod";
import { demoUsers } from "@/modules/auth/demo-users";
import {
  demoEnabled,
  endSession,
  issueSession,
  verifyOrigin,
} from "@/modules/auth/session";
import { AppError } from "@/modules/auth/policy";
import { errorResponse } from "@/lib/http";
export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    if (!demoEnabled()) throw new AppError(403, "Demo sign-in is disabled.");
    const { id } = z.object({ id: z.uuid() }).parse(await request.json());
    if (!demoUsers.some((u) => u.id === id))
      throw new AppError(403, "Choose an available demonstration account.");
    await issueSession(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(request: Request) {
  try {
    verifyOrigin(request);
    await endSession();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
