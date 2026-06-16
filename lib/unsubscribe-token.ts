import { createHmac } from "crypto";

const secret = process.env.UNSUBSCRIBE_SECRET || "jowmail-unsubscribe-secret";

function sign(subscriberId: string): string {
  return createHmac("sha256", secret).update(subscriberId).digest("hex");
}

export function generateUnsubscribeToken(subscriberId: string): string {
  const sig = sign(subscriberId);
  const payload = Buffer.from(subscriberId).toString("base64url");
  return `${payload}.${sig}`;
}

export function verifyUnsubscribeToken(
  token: string
): { valid: true; subscriberId: string } | { valid: false } {
  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false };

  const [encodedId, sig] = parts;
  let subscriberId: string;
  try {
    subscriberId = Buffer.from(encodedId, "base64url").toString("utf8");
  } catch {
    return { valid: false };
  }

  const expectedSig = sign(subscriberId);
  if (sig !== expectedSig) return { valid: false };

  return { valid: true, subscriberId };
}
