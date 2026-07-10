# Jabbar Sourcing AI Purchasing Assistant

Cloudflare Workers AI backend for the Jabbar Sourcing website chat widget.

## What It Does

- Answers in the language used by the buyer's latest message.
- Collects product, quantity, target market, budget, specs/photos, and deadline.
- Produces a short, plain-text WhatsApp-ready sourcing inquiry summary.
- Refuses unrelated requests and role/prompt override attempts.
- Removes Markdown asterisks before sending replies to the website.
- Uses Cloudflare Workers AI through the native `AI` binding.

## Deploy

Cloudflare requires the account email to be verified before Workers can be deployed. If `npx wrangler deploy`
returns error `10034`, verify the Cloudflare account email first, then rerun the deploy command.

1. Log in once:

   ```bash
   npx wrangler login
   ```

2. Deploy:

   ```bash
   cd cloudflare/ai-sourcing-assistant
   npx wrangler deploy
   ```

3. Copy the deployed Worker URL, for example:

   ```text
   https://jabbar-sourcing-ai-assistant.<your-subdomain>.workers.dev
   ```

4. Add this endpoint to the website before loading `assets/ai-sourcing-assistant.js`:

   ```html
   <script>
     window.JABBAR_AI_ASSISTANT_ENDPOINT = "https://jabbar-sourcing-ai-assistant.<your-subdomain>.workers.dev";
   </script>
   <script src="/assets/ai-sourcing-assistant.js" defer></script>
   ```

## Cloudflare Settings

The Worker requires this binding in `wrangler.jsonc`:

```json
{
  "ai": {
    "binding": "AI"
  }
}
```

Default model:

```text
@cf/meta/llama-3.1-8b-instruct-fp8
```

You can change `AI_MODEL` in `wrangler.jsonc` without editing `worker.js`.
Model calls are capped at 12 seconds. If Workers AI is unavailable or exceeds that limit, the Worker returns a localized WhatsApp fallback instead of leaving the visitor waiting.
