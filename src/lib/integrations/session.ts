import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { Provider } from "./config.ts";
export type ConnectionTokens = { access: string; refresh?: string; expiresAt: number; scope: string; issuedAt: number };
export type OAuthFlow = { state: string; verifier: string; redirect: string; expiresAt: number; native: boolean };
export const cookieName = (provider: Provider, type: "flow" | "tokens") => `vyra_${provider}_${type}`;
function key() {
  const secret = process.env.VYRA_CONNECTION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Verbindungsschlüssel fehlt.");
  return createHash("sha256").update(secret).digest();
}
export function seal(value: unknown, context: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(context));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  const result = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
  if (result.length > 3600) throw new Error("Die Verbindung ist für diesen Sitzungsspeicher zu groß.");
  return result;
}
export function unseal<T>(value: string | undefined, context: string): T | null {
  try {
    if (!value || value.length > 3600) return null;
    const bytes = Buffer.from(value, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(), bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(context));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString()) as T;
  } catch { return null; }
}
export function readConnection(value: string | undefined, provider: Provider) {
  const result = unseal<ConnectionTokens>(value, cookieName(provider, "tokens"));
  if (!result || typeof result.access !== "string" || !result.access || !Number.isFinite(result.expiresAt) ||
      typeof result.scope !== "string" || !Number.isFinite(result.issuedAt) || result.issuedAt > Date.now() ||
      Date.now() - result.issuedAt > 30 * 86400000 || (result.refresh !== undefined && typeof result.refresh !== "string")) return null;
  return result;
}
