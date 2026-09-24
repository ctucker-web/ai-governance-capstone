import { createHmac, timingSafeEqual } from "node:crypto";

export function signSession(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifySession(
  token: string,
  secret: string,
  now = Date.now(),
): string | null {
  const [id, expiry, mac, ...rest] = token.split(".");
  if (
    rest.length ||
    !id ||
    !expiry ||
    !mac ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id,
    ) ||
    !/^\d{1,16}$/.test(expiry) ||
    !Number.isSafeInteger(Number(expiry)) ||
    Number(expiry) <= now ||
    !/^[0-9a-f]{64}$/.test(mac)
  )
    return null;
  const expected = signSession(`${id}.${expiry}`, secret);
  return timingSafeEqual(Buffer.from(mac, "hex"), Buffer.from(expected, "hex"))
    ? id
    : null;
}
