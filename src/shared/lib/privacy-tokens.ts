import { SignJWT, jwtVerify } from "jose";

const PRIVACY_TOKEN_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "fallback-secret"
);

export async function signPrivacyToken(payload: { budgetId: string; membershipId: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(PRIVACY_TOKEN_SECRET);
}

export async function verifyPrivacyToken(token: string) {
  const { payload } = await jwtVerify(token, PRIVACY_TOKEN_SECRET);
  return payload as { budgetId: string; membershipId: string };
}
