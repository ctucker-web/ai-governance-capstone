import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "../../src/modules/auth/token";

describe("signed demo sessions", () => {
  const secret = randomBytes(48).toString("hex");
  const id = "00000000-0000-4000-8000-000000000011";
  const payload = `${id}.2000`;
  const token = `${payload}.${signSession(payload, secret)}`;
  it("accepts a valid unexpired identity", () =>
    expect(verifySession(token, secret, 1000)).toBe(id));
  it("rejects expiry at the exact deadline", () =>
    expect(verifySession(token, secret, 2000)).toBeNull());
  it("rejects a changed identity", () =>
    expect(
      verifySession(token.replace(id, id.replace(/11$/, "12")), secret, 1000),
    ).toBeNull());
  it("rejects a changed expiry", () =>
    expect(
      verifySession(token.replace("2000", "3000"), secret, 1000),
    ).toBeNull());
  it("rejects a different signing key", () =>
    expect(
      verifySession(token, randomBytes(48).toString("hex"), 1000),
    ).toBeNull());
  it.each([
    "",
    "forged",
    `${payload}.${"é".repeat(64)}`,
    `${payload}.${"0".repeat(64)}`,
    `${token}.extra`,
    `invalid.2000.${signSession("invalid.2000", secret)}`,
  ])("returns no identity for malformed token %s", (value) =>
    expect(verifySession(value, secret, 1000)).toBeNull(),
  );
});
