# Jabbar Sourcing inquiry API

Independent Cloudflare Worker for direct website inquiry submission.

It does not replace the normal contact links in the site footer. It sends validated website inquiries to the existing public contact mailbox:

`qianjiabao1999@gmail.com`

## Security contract

- Accepts only the 10 retained inquiry-page paths and locales.
- Requires the current privacy acknowledgement and notice version.
- Rejects unlisted browser origins.
- Caps JSON request bodies at 16 KiB, requires the exact JSON media type, and rejects unknown fields.
- Verifies Turnstile through the separately deployed stock Turnstile Spin Worker using a service binding.
- Checks Turnstile success, action, and hostname before email delivery.
- Applies a pre-Turnstile client-IP hash limit and a separate post-Turnstile contact hash limit without logging either value.
- Uses a SQLite-backed Durable Object keyed by the random submission UUID to suppress concurrent and repeated email delivery.
- Rejects a reused submission UUID when its normalized inquiry fingerprint differs.
- Recovers an interrupted `pending` submission after a 10-minute lease while preserving the original request ID.
- Gives every lease a separate claim ID so a stale Worker cannot overwrite a newer delivery state.
- Sends through a restricted Cloudflare Email binding to one Gmail destination.
- Does not persist inquiry bodies, names, contacts, tokens, or IP addresses in KV, D1, Durable Objects, or logs.
- Keeps only random request and lease-claim IDs, a SHA-256 fingerprint that includes the random submission ID, timestamps, and `pending`/`sent`/`failed` delivery state.
- Treats this state as expired after 24 hours and schedules an alarm to remove it; cleanup failures are explicitly rescheduled.
- Does not accept attachments.

The public website email remains `qianjiabao1999@gmail.com`. `inquiry@jabbarsourcing.com` is only the technical sender required by Cloudflare Email Service.

Email is an external side effect, so no Worker can guarantee perfect exactly-once delivery across every crash boundary. Retries keep the same request ID so a rare duplicate can be identified.

## Frontend identifiers

- `submissionId`: UUID v4 created once for the inquiry content. Reuse it only when retrying that same content.
- The Worker derives a separate UUID from the submission ID and Turnstile token for safe Siteverify retries; the browser does not supply that retry key.
- The submission ID does not replace the required privacy acknowledgement or Turnstile token.

## Required Cloudflare resources

Do not deploy until all prerequisites are ready:

1. Create the production Turnstile widget only for `jabbarsourcing.com` and `www.jabbarsourcing.com`.
2. Deploy the unmodified Turnstile Spin Worker as `turnstile-siteverify-jabbar-sourcing` and set its secret through `wrangler secret put`; never commit the secret.
3. Onboard the sender domain to Cloudflare Email Service and verify `qianjiabao1999@gmail.com` as an allowed destination.
4. Confirm Email Service permits the technical sender `inquiry@jabbarsourcing.com`.
5. Deploy this Worker only after the target service binding exists.

Do not add `localhost` or `127.0.0.1` to the production widget or Worker allowlists. Local browser testing must use Cloudflare's published test keys or a separate development widget and development configuration.

Wrangler OAuth can deploy the Worker without storing an API token. If an account API token is used instead, limit it to the intended Cloudflare account and include only Turnstile Edit, Workers Scripts Edit, and Email Sending Edit; store it outside the repository.

## Local validation

```bash
npm install
npm run types
npm run typecheck
npm test
npm run deploy:dry
```

The test suite uses the Cloudflare Workers Vitest pool, a real local Durable Object, and mock external bindings. It never sends a real email.

The Workers Rate Limiting bindings are coarse abuse controls rather than exact global counters. Add a Cloudflare WAF rate-limiting rule before public launch for an additional account-level edge control.

## Production deployment order

1. Deploy and validate the stock Turnstile Spin Worker.
2. Onboard and verify Email Service resources.
3. Run `npm run deploy:dry`.
4. Run `npm run deploy`.
5. Add the returned Worker endpoint and public Turnstile sitekey to all 10 inquiry pages.
6. Keep the normal footer contact links available without restoring the retired inquiry-page four-channel panel.
7. Run local and live Playwright tests before announcing the form as available.
