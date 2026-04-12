import { createHmac, timingSafeEqual } from "crypto";

/**
 * Signs/verifies a stateless unsubscribe token so users can opt out of
 * retention campaigns by clicking a link in an email, without needing to
 * be logged in.
 *
 * Format: base64url(userId):base64url(hmac_sha256(userId, secret))
 *
 * We don't include an expiry — unsubscribe links should stay valid
 * indefinitely (per common anti-spam practice).
 */

function getSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET (or NEXTAUTH_SECRET) must be set to sign unsubscribe tokens"
    );
  }
  return secret;
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function sign(userId: string): string {
  return b64url(createHmac("sha256", getSecret()).update(userId).digest());
}

export function createUnsubscribeToken(userId: string): string {
  return `${b64url(userId)}.${sign(userId)}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  try {
    const userId = b64urlDecode(parts[0]).toString("utf8");
    const expected = sign(userId);
    const given = parts[1];
    const expectedBuf = Buffer.from(expected);
    const givenBuf = Buffer.from(given);
    if (expectedBuf.length !== givenBuf.length) return null;
    return timingSafeEqual(expectedBuf, givenBuf) ? userId : null;
  } catch {
    return null;
  }
}
