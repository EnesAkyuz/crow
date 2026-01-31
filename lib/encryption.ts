import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

/**
 * Derive a 256-bit key from the API secret using SHA-256
 */
function deriveKey(apiSecret: string): Buffer {
  return createHash("sha256").update(apiSecret).digest();
}

/**
 * Encrypt data using AES-256-GCM with the tenant's API secret
 * Returns: iv:authTag:ciphertext (all base64)
 */
export function encryptWithKey(
  data: Record<string, unknown>,
  apiSecret: string,
): string {
  const key = deriveKey(apiSecret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const jsonData = JSON.stringify(data);
  let encrypted = cipher.update(jsonData, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
}

/**
 * Decrypt data using AES-256-GCM with the tenant's API secret
 */
export function decryptWithKey(
  encryptedData: string,
  apiSecret: string,
): Record<string, unknown> {
  const key = deriveKey(apiSecret);
  const parts = encryptedData.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const [ivBase64, authTagBase64, ciphertext] = parts;
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return JSON.parse(decrypted);
}

/**
 * Generate a secure API key (32 bytes = 256 bits, hex encoded)
 */
export function generateApiKey(): string {
  return `crow_${randomBytes(32).toString("hex")}`;
}

/**
 * Hash an API key for storage (we never store the actual key)
 */
export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

/**
 * Get the prefix of an API key for identification
 */
export function getApiKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 12); // "crow_" + first 7 chars
}

/**
 * Legacy decrypt (for existing base64 data during migration)
 */
export function decryptLegacy(encrypted: string): Record<string, unknown> {
  try {
    const json = Buffer.from(encrypted, "base64").toString("utf-8");
    return JSON.parse(json);
  } catch {
    throw new Error("Failed to decrypt legacy data");
  }
}

/**
 * Check if data is in the new encrypted format
 */
export function isNewEncryptionFormat(data: string): boolean {
  const parts = data.split(":");
  return parts.length === 3;
}
