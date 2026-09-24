import { signSession, verifySession } from "./token";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { AppError, type Actor } from "./policy";
export interface IdentityProvider {
  subject(): Promise<string | null>;
}
const cookieName = "governance-session";
export function demoEnabled() {
  return (
    process.env.AUTH_MODE === "demo" && process.env.DEMO_AUTH_ENABLED === "true"
  );
}
function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32 || s.includes("REPLACE_"))
    throw new AppError(
      503,
      "Session configuration is incomplete. Run local setup.",
    );
  return s;
}
export async function issueSession(id: string) {
  const payload = `${id}.${Date.now() + 8 * 60 * 60 * 1000}`;
  const jar = await cookies();
  jar.set(cookieName, `${payload}.${signSession(payload, secret())}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
}
export async function endSession() {
  (await cookies()).delete(cookieName);
}
export const demoProvider: IdentityProvider = {
  async subject() {
    if (!demoEnabled()) return null;
    const token = (await cookies()).get(cookieName)?.value;
    if (!token) return null;
    return verifySession(token, secret());
  },
};
// An OIDC adapter must verify issuer, audience, signature, nonce and map its subject
// to a local User ID. Business services consume Actor and never inspect tokens.
export async function getActor(
  provider: IdentityProvider = demoProvider,
): Promise<Actor> {
  const id = await provider.subject();
  if (!id) throw new AppError(401, "Please sign in to continue.");
  const user = await db.user.findUnique({
    where: { id },
    include: { roles: true },
  });
  if (!user) throw new AppError(401, "This account is unavailable.");
  return {
    id: user.id,
    organizationId: user.organizationId,
    name: user.name,
    roles: user.roles.map((r) => r.role),
  };
}
export function verifyOrigin(request: Request) {
  const expected = process.env.APP_URL;
  if (!expected || request.headers.get("origin") !== new URL(expected).origin)
    throw new AppError(
      403,
      "This action must come from the application. Refresh and try again.",
    );
}
