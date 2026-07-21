export const SECURITY_HEADERS = Object.freeze({
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  "X-Frame-Options": "SAMEORIGIN",
  "Strict-Transport-Security": "max-age=31536000",
});

export const CONSENT_REGION_PATH = "/api/consent-region";

const STRICT_CONSENT_COUNTRIES = new Set([
  // European Union
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE",
  "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT",
  "RO", "SK", "SI", "ES", "SE",
  // EEA extensions, United Kingdom and Switzerland
  "IS", "LI", "NO", "GB", "CH",
]);

export type ConsentRegionPolicy = "strict" | "quiet-denied";

/**
 * Uses Cloudflare's EU flag plus coarse country code to select the experience.
 * Unknown, Tor and malformed values fail closed to the explicit opt-in flow.
 */
export function consentRegionPolicy(
  country: string | undefined,
  isEuCountry = false,
): ConsentRegionPolicy {
  if (isEuCountry) return "strict";
  const normalized = country?.trim().toUpperCase();
  if (!normalized || normalized === "XX" || normalized === "T1") return "strict";
  if (!/^[A-Z]{2}$/.test(normalized)) return "strict";
  return STRICT_CONSENT_COUNTRIES.has(normalized) ? "strict" : "quiet-denied";
}

export function hasGlobalPrivacyControl(request: Request): boolean {
  return request.headers.get("Sec-GPC")?.trim() === "1";
}

export function consentRegionResponse(
  country: string | undefined,
  gpc: boolean,
  method = "GET",
  isEuCountry = false,
): Response {
  const headers = new Headers({
    "Cache-Control": "no-store, max-age=0",
    "CDN-Cache-Control": "no-store",
    "Cloudflare-CDN-Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Pragma": "no-cache",
    "X-Robots-Tag": "noindex, nofollow",
  });

  if (method !== "GET" && method !== "HEAD") {
    headers.set("Allow", "GET, HEAD");
    return withSecurityHeaders(new Response(
      JSON.stringify({ error: "method_not_allowed" }),
      { status: 405, headers },
    ));
  }

  const body = method === "HEAD"
    ? null
    : JSON.stringify({ policy: consentRegionPolicy(country, isEuCountry), gpc });

  return withSecurityHeaders(new Response(body, { status: 200, headers }));
}

/**
 * Returns a streaming copy of an origin response with the site's conservative
 * security policy applied. The origin response itself is not mutated.
 */
export function withSecurityHeaders(originResponse: Response): Response {
  const response = new Response(originResponse.body, originResponse);

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }

  return response;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === CONSENT_REGION_PATH) {
      const country = typeof request.cf?.country === "string"
        ? request.cf.country
        : undefined;
      return consentRegionResponse(
        country,
        hasGlobalPrivacyControl(request),
        request.method,
        request.cf?.isEUCountry === "1",
      );
    }

    const originResponse = await fetch(request);
    return withSecurityHeaders(originResponse);
  },
} satisfies ExportedHandler;
