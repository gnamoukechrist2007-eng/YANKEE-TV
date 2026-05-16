import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";

function key(): Buffer {
  const hex = process.env.IPTV_ENC_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("IPTV_ENC_KEY must be 32 bytes (64 hex chars). Generate via: openssl rand -hex 32");
  }
  return Buffer.from(hex, "hex");
}

export function encrypt(plaintext: string): { ciphertext: Buffer; iv: Buffer; tag: Buffer } {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext, iv, tag };
}

export function decrypt(ciphertext: Buffer, iv: Buffer, tag: Buffer): string {
  const decipher = createDecipheriv(ALGO, key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
