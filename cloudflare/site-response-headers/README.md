# Jabbar Sourcing site response headers

This Cloudflare Worker transparently fetches the existing origin response for
`www.jabbarsourcing.com/*`, keeps its status, status text, body stream, and
existing headers, then sets a small conservative security-header policy.

It does not change the apex host (`jabbarsourcing.com`) and it does not add a
Content Security Policy.

## Headers

| Header | Value |
| --- | --- |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Disables accelerometer, camera, geolocation, gyroscope, magnetometer, microphone, payment, and USB access |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Strict-Transport-Security` | `max-age=31536000` |

HSTS deliberately omits both `includeSubDomains` and `preload`.

## Local verification

```bash
npm ci
npm run types:check
npm run typecheck
npm test
npm run deploy:dry
```

Use `npm run dev` for a local Worker session. Wrangler's local origin behavior
is not identical to the production zone route, so validate the deployed route
with response headers as described below.

## Deployment procedure

No deployment is performed by this directory setup.

Before the first deployment:

1. Confirm in the Cloudflare dashboard that no existing Worker route owns
   `www.jabbarsourcing.com/*` or a broader overlapping pattern.
2. Confirm `www.jabbarsourcing.com` still resolves to the intended Pages/origin
   service and that HTTPS is healthy.
3. Authenticate Wrangler with the intended Cloudflare account and run
   `npm run deploy:dry`.
4. Review the route in `wrangler.jsonc`. It intentionally covers only the
   `www` hostname.
5. When explicitly approved, run `npm run deploy` from this directory.

After deployment, test representative success, redirect, error, and asset
responses:

```bash
curl -sS -D - -o /dev/null https://www.jabbarsourcing.com/
curl -sS -D - -o /dev/null https://www.jabbarsourcing.com/en/
curl -sS -D - -o /dev/null https://www.jabbarsourcing.com/does-not-exist
```

Also submit a real inquiry only when that end-to-end test has been separately
authorized; this Worker is intended to leave request methods and bodies intact.

## Operational risks and rollback

- `X-Frame-Options: SAMEORIGIN` blocks legitimate embedding by other origins.
- The Permissions Policy disables device capabilities. Update it before adding
  a feature that genuinely needs one of those capabilities.
- Browsers remember HSTS for one year after receiving it over HTTPS. Removing
  the Worker does not immediately erase that browser state. To actively clear
  it, serve `Strict-Transport-Security: max-age=0` over HTTPS.
- A conflicting or broader Worker route can change routing precedence. Resolve
  route overlap before deployment.
- Origin fetch failures remain failures; the Worker does not use a fail-open
  exception path or synthesize a different origin response.
- The five managed headers replace any conflicting values from the origin. All
  other origin headers are retained.

To roll back the Worker behavior, remove or disable its route in Cloudflare.
If the security headers themselves must be reverted while keeping the route,
deploy a reviewed change that removes the corresponding `headers.set` calls.
