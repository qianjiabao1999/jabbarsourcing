# Jabbar Sourcing AI Purchasing Assistant

Cloudflare Workers AI backend for the Jabbar Sourcing website chat widget.

## What It Does

- Answers sourcing questions in the current website language.
- Collects product, quantity, target market, budget, specs/photos, and deadline.
- Produces a WhatsApp-ready sourcing inquiry summary.
- Uses Cloudflare Workers AI through the native `AI` binding.

## Deploy

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
@cf/deepseek-ai/deepseek-r1-distill-qwen-32b
```

You can change `AI_MODEL` in `wrangler.jsonc` without editing `worker.js`.

