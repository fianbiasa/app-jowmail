import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_HEX = process.env.ENCRYPTION_KEY || "";

function getKey(): Buffer {
  if (!KEY_HEX || KEY_HEX.length < 64) {
    // Fallback: derive 32-byte key from NEXTAUTH_SECRET
    const secret = process.env.NEXTAUTH_SECRET || "fallback-secret";
    const { createHash } = require("crypto");
    return createHash("sha256").update(secret).digest();
  }
  return Buffer.from(KEY_HEX, "hex");
}

export function encrypt(text: string): { encrypted: string; iv: string } {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");

  return {
    encrypted: encrypted + ":" + tag,
    iv: iv.toString("hex"),
  };
}

export function decrypt(encrypted: string, iv: string): string {
  const key = getKey();
  const ivBuffer = Buffer.from(iv, "hex");
  const [cipherText, tag] = encrypted.split(":");

  const decipher = createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(Buffer.from(tag, "hex"));

  let decrypted = decipher.update(cipherText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
