/**
 * Cookie parsing utilities for extracting expiration dates
 * Handles JWT tokens and standard cookie attributes
 */

interface ParsedCookieInfo {
  expiresAt: Date | null;
  isExpired: boolean;
  source: "jwt" | "expires-attr" | "max-age-attr" | "manual" | null;
  tokenName?: string;
}

/**
 * Decode a JWT token payload (without verification)
 * JWTs are base64url encoded: header.payload.signature
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Base64url to base64
    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    // Pad with = if needed
    while (payload.length % 4) {
      payload += "=";
    }

    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Check if a string looks like a JWT token
 */
function isJwtToken(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 3) return false;

  // Check if parts are base64url encoded
  const base64urlRegex = /^[A-Za-z0-9_-]+$/;
  return parts.every((part) => base64urlRegex.test(part));
}

/**
 * Parse a cookie string and extract expiration information
 * Handles formats like:
 * - auth-token=eyJhbGciOiJIUzI1NiIs...; session_id=abc123
 * - token=value; Expires=Wed, 09 Jun 2021 10:18:14 GMT
 * - token=value; Max-Age=3600
 */
export function parseCookieExpiration(cookieString: string): ParsedCookieInfo {
  const result: ParsedCookieInfo = {
    expiresAt: null,
    isExpired: false,
    source: null,
  };

  if (!cookieString || !cookieString.trim()) {
    return result;
  }

  const now = new Date();

  // Split by semicolon to get individual parts
  const parts = cookieString.split(";").map((p) => p.trim());

  // Check for Expires attribute
  const expiresMatch = parts.find((p) =>
    p.toLowerCase().startsWith("expires="),
  );
  if (expiresMatch) {
    const expiresValue = expiresMatch.substring(8).trim();
    const expiresDate = new Date(expiresValue);
    if (!Number.isNaN(expiresDate.getTime())) {
      result.expiresAt = expiresDate;
      result.isExpired = expiresDate < now;
      result.source = "expires-attr";
      return result;
    }
  }

  // Check for Max-Age attribute
  const maxAgeMatch = parts.find((p) => p.toLowerCase().startsWith("max-age="));
  if (maxAgeMatch) {
    const maxAgeValue = Number.parseInt(maxAgeMatch.substring(8).trim(), 10);
    if (!Number.isNaN(maxAgeValue)) {
      const expiresDate = new Date(now.getTime() + maxAgeValue * 1000);
      result.expiresAt = expiresDate;
      result.isExpired = maxAgeValue <= 0;
      result.source = "max-age-attr";
      return result;
    }
  }

  // Look for JWT tokens in cookie values
  for (const part of parts) {
    const [name, ...valueParts] = part.split("=");
    const value = valueParts.join("="); // Rejoin in case value contains =

    if (value && isJwtToken(value)) {
      const payload = decodeJwtPayload(value);
      if (payload?.exp && typeof payload.exp === "number") {
        // JWT exp is in seconds since epoch
        const expiresDate = new Date(payload.exp * 1000);
        result.expiresAt = expiresDate;
        result.isExpired = expiresDate < now;
        result.source = "jwt";
        result.tokenName = name;
        return result;
      }
    }
  }

  return result;
}

/**
 * Format expiration info for display
 */
export function formatExpirationInfo(info: ParsedCookieInfo): string {
  if (!info.expiresAt) {
    return "Could not detect expiration. Please set manually.";
  }

  const now = new Date();
  const diffMs = info.expiresAt.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  let timeStr: string;
  if (info.isExpired) {
    timeStr = "EXPIRED";
  } else if (diffDays > 0) {
    timeStr = `${diffDays} day${diffDays > 1 ? "s" : ""} remaining`;
  } else if (diffHours > 0) {
    timeStr = `${diffHours} hour${diffHours > 1 ? "s" : ""} remaining`;
  } else {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    timeStr = `${diffMins} minute${diffMins > 1 ? "s" : ""} remaining`;
  }

  const sourceLabel =
    info.source === "jwt"
      ? `JWT token${info.tokenName ? ` (${info.tokenName})` : ""}`
      : info.source === "expires-attr"
        ? "Expires attribute"
        : info.source === "max-age-attr"
          ? "Max-Age attribute"
          : "Unknown";

  return `${timeStr} • Detected from ${sourceLabel}`;
}

/**
 * Get suggested expiration date from cookie, or null if not detectable
 */
export function getSuggestedExpiration(cookieString: string): string | null {
  const info = parseCookieExpiration(cookieString);
  if (info.expiresAt && !info.isExpired) {
    // Return ISO string for datetime-local input
    return info.expiresAt.toISOString().slice(0, 16);
  }
  return null;
}
