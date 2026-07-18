export const SECURITY_HEADERS = Object.freeze({
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  "X-Frame-Options": "SAMEORIGIN",
  "Strict-Transport-Security": "max-age=31536000",
});

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
    const originResponse = await fetch(request);
    return withSecurityHeaders(originResponse);
  },
} satisfies ExportedHandler;
