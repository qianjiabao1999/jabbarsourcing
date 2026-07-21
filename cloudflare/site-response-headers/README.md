# Jabbar Sourcing site response headers

This Cloudflare Worker transparently fetches the existing origin response for
`www.jabbarsourcing.com/*`, keeps its status, status text, body stream, and
existing headers, then sets a small conservative security-header policy.

It also serves the same-origin `GET /api/consent-region` endpoint used by the
analytics consent controller. The endpoint prioritizes Cloudflare's
`request.cf.isEUCountry` signal, then reads the coarse `request.cf.country`
value at the edge, and returns only one of two modes:

- `strict`: EEA, United Kingdom, Switzerland, unknown location, Tor, or an
  invalid/missing country signal. Analytics stays off and the opt-in panel may
  appear automatically.
- `quiet-denied`: all other valid two-letter country codes. Analytics still
  stays off, but the panel does not interrupt the page. A visitor can make an
  explicit choice from the non-floating control on the website privacy page.

The JSON response does not contain the country code, IP address, city,
coordinates, region or timezone. It is not written to cookies, browser storage,
KV, a database, invocation logs or traces. Observability is intentionally
disabled for this full-site Worker so sampled request metadata cannot retain
the inferred country. `Sec-GPC: 1` is returned only as a boolean so the frontend
can keep analytics disabled when Global Privacy Control is active. The endpoint
is designed for same-origin use and does not grant cross-origin access. It uses
`Cache-Control`, `CDN-Cache-Control` and
`Cloudflare-CDN-Cache-Control` `no-store` directives, and preserves the site's
`geolocation=()` Permissions Policy because no browser GPS permission is used.
The Pages artifact also carries a static strict-mode response at the same path;
this Worker intercepts it before origin fetch and replaces it with the live
edge decision. Direct-origin access therefore fails closed instead of returning
a 404.

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

This is a conservative `www`-only policy. It does not establish HSTS coverage
for the apex hostname or other subdomains. That gap is documented and accepted
for the current deployment; expanding HSTS scope requires a separate review of
every HTTPS subdomain.

## Production record

The 2026-07-19 site audit records this Worker as deployed outside the repository
and active on the configured `www.jabbarsourcing.com/*` route. A live read-only
check on 2026-07-19 returned Cloudflare response headers and all five exact
managed values from this Worker on `https://www.jabbarsourcing.com/`.

On 2026-07-20 the site owner confirmed that the account is **Workers Paid** and
that the Worker intentionally covers every public path on the
`www.jabbarsourcing.com/*` route. The earlier Free-plan quota uncertainty is
closed. Static HTML and asset requests still pass through this Worker, so paid
billing status, route ownership, and a known-good deployment remain operational
dependencies.

This record does not authorize changing the route or production compatibility
date. Migrating the policy to Transform Rules is an optional future
optimization, not a required remediation.

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

## Deployment and verification procedure

The current deployment was performed out of band. For any later deployment:

1. Confirm the Workers Paid subscription remains active for the intended account.
2. Confirm in the Cloudflare dashboard that the existing route is still exactly
   `www.jabbarsourcing.com/*` and that no broader pattern conflicts with it.
3. Confirm `www.jabbarsourcing.com` still resolves to the intended Pages/origin
   service and that HTTPS is healthy.
4. Authenticate Wrangler with the intended Cloudflare account and run
   `npm run deploy:dry`.
5. Review the route and compatibility date in `wrangler.jsonc`. They are
   production constraints, not cleanup targets. The route intentionally covers only the
   `www` hostname.
6. When explicitly approved, run `npm run deploy` from this directory.

After deployment, test representative success, redirect, error, and asset
responses:

```bash
curl -sS -D - -o /dev/null https://www.jabbarsourcing.com/
curl -sS -D - -o /dev/null https://www.jabbarsourcing.com/en/
curl -sS -D - -o /dev/null https://www.jabbarsourcing.com/does-not-exist
curl -sS -D - https://www.jabbarsourcing.com/api/consent-region
curl -sS -D - -H 'Sec-GPC: 1' https://www.jabbarsourcing.com/api/consent-region
```

Also submit a real inquiry only when that end-to-end test has been separately
authorized; this Worker is intended to leave request methods and bodies intact.

When the consent frontend and this Worker change together, deploy the Worker
first and the static frontend second. The frontend treats a missing, slow,
non-200 or malformed endpoint response as `strict`, so either deployment order
fails closed and never enables analytics automatically.

For each representative response, verify status, `Cache-Control`, content type,
origin headers, and the five values in the table above. Record the deployment ID
shown by Wrangler or the dashboard so a specific prior deployment can be chosen
if rollback is needed.

## Operational risks and rollback

- The intentional `www.jabbarsourcing.com/*` full-site route processes every
  HTML and asset request on the `www` hostname. Workers Paid closes the former
  Free-plan daily-quota concern, but Worker runtime, billing/plan, or route
  failures can affect the whole `www` site; keep the documented route-disable
  rollback ready.
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
- IP-derived country signals can be wrong because of VPNs, proxies, Tor, mobile
  networks or travel. They are used only to decide whether an opt-in prompt may
  appear automatically, never to infer legal residence or grant consent.
- Invocation logs and traces are intentionally disabled because this Worker
  processes the full site and reads an inferred country signal. Re-enabling
  observability requires a privacy-retention review and an updated public notice.

To roll back the Worker behavior, first use the Cloudflare dashboard deployment
history to restore the last known-good deployment. If the Worker itself is the
failure, remove or disable only its `www.jabbarsourcing.com/*` route so requests
return directly to the existing origin. Re-run the three `curl` checks above and
confirm the origin status/body/cache behavior before declaring recovery.
If the security headers themselves must be reverted while keeping the route,
deploy a reviewed change that removes the corresponding `headers.set` calls.
