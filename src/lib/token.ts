import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/*
  Rotating, signed, single-use QR token (SPEC.md §5).

  The QR never carries attendance data — only this capsule:
      base64url(payload) . base64url(HMAC_SHA256(payload, SERVER_SECRET))
  where payload = sessionId . issuedAtEpochSeconds . nonce

  - HMAC proves the token came from our server (client can't forge it).
  - issuedAt + TTL make a forwarded screenshot expire.
  - nonce is recorded on use (UsedToken) so a token can't be replayed.
*/

export const TOKEN_TTL_SECONDS = 30; // grace over the ~20s screen refresh

function secret(): string {
  const s = process.env.SERVER_SECRET;
  if (!s) throw new Error("SERVER_SECRET is not set");
  return s;
}

const b64url = (buf: Buffer) => buf.toString("base64url");

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Issue a fresh token for a session. Call once per screen rotation. */
export function issueToken(sessionId: string): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const nonce = b64url(randomBytes(9));
  const payload = `${sessionId}.${issuedAt}.${nonce}`;
  return `${b64url(Buffer.from(payload))}.${sign(payload)}`;
}

export type VerifyResult =
  | { ok: true; sessionId: string; nonce: string; issuedAt: number }
  | { ok: false; reason: "malformed" | "bad-signature" | "expired" };

/** Verify signature + freshness. Does NOT check single-use — the caller records the nonce. */
export function verifyToken(raw: string): VerifyResult {
  const parts = raw.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };

  const [payloadB64, sig] = parts;
  let payload: string;
  try {
    payload = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return { ok: false, reason: "malformed" };
  }

  const expected = sign(payload);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return { ok: false, reason: "bad-signature" };
  }

  const [sessionId, issuedAtStr, nonce] = payload.split(".");
  const issuedAt = Number(issuedAtStr);
  if (!sessionId || !nonce || !Number.isFinite(issuedAt)) {
    return { ok: false, reason: "malformed" };
  }

  const age = Math.floor(Date.now() / 1000) - issuedAt;
  if (age > TOKEN_TTL_SECONDS || age < -5) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, sessionId, nonce, issuedAt };
}
