# Jabbar Sourcing

Static GitHub Pages website for `www.jabbarsourcing.com`.

## What This Site Includes

- Multilingual landing pages for Jabbar Sourcing
- Direct sourcing inquiry submission through Cloudflare Turnstile and Workers
- A temporary WhatsApp fallback only when the inquiry security check fails to load or run
- WebP image assets for faster loading
- `robots.txt` and `sitemap.xml` for Google Search Console
- SEO title, meta description, Open Graph tags, and canonical URLs on the main pages
- GitHub Actions workflow for automatic Pages deployment

## Local Preview

```bash
python3 -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173/
```

## Deployment

The public website is static and does not need WordPress or a site database. Direct inquiry delivery is handled by the independent Cloudflare Worker in `cloudflare/inquiry-api/`.

GitHub Pages options:

- Recommended: **Settings -> Pages -> Build and deployment -> GitHub Actions**
- Alternative: deploy from the `main` branch root

The included workflow is:

```text
.github/workflows/deploy.yml
```

## SEO Checklist

After deployment:

1. Open Google Search Console.
2. Add `https://www.jabbarsourcing.com/` as a property.
3. Submit:

```text
https://www.jabbarsourcing.com/sitemap.xml
```

4. Test:

```text
https://www.jabbarsourcing.com/robots.txt
https://www.jabbarsourcing.com/sitemap.xml
```

5. Use URL Inspection in Search Console for the home page and request indexing.

## HTTPS

In GitHub:

```text
Settings -> Pages -> Enforce HTTPS
```

For the custom domain, keep DNS pointed to GitHub Pages and confirm `www` works and the apex domain redirects back to it:

```text
https://www.jabbarsourcing.com
https://jabbarsourcing.com
```

## Cloudflare Speed Settings

GitHub Pages already uses a CDN. If Cloudflare is added, enable:

- Brotli
- Auto Minify for HTML, CSS, and JavaScript
- HTTPS redirect
- Cache static assets

Set Cloudflare proxy only after GitHub Pages HTTPS is working.

## Inquiry Form

Current form behavior:

- Direct submit: validates Turnstile in a Cloudflare Worker and sends the inquiry to `qianjiabao1999@gmail.com`
- Turnstile failure: shows one contextual, temporary WhatsApp fallback link so the buyer can still send the inquiry
- Normal, pending, validation, rate-limit, and delivery states do not show the WhatsApp fallback
- Calculator transfer: prefilled calculator results show a visible, dismissible confirmation on the inquiry form

The public contact mailbox remains `qianjiabao1999@gmail.com`. `inquiry@jabbarsourcing.com` is only the technical sender used by the Worker Email binding.

Frontend checks:

```bash
npm run test:inquiry-frontend
python3 -m http.server 4173
npm run qa:inquiry
```

Analytics stays disabled until an explicit Allow choice. The full-site response
Worker exposes a same-origin, non-cached `/api/consent-region` result so EEA,
United Kingdom, Switzerland, unknown and Tor traffic can receive the automatic
opt-in prompt while other regions remain quietly denied. Global Privacy Control
keeps analytics disabled in every region. The page never requests browser GPS
permission and never stores the inferred country.

The published static origin includes `/api/consent-region` as a strict-mode
fallback. Cloudflare overrides that exact path at the edge; if the Worker is
missing or bypassed, the fallback still keeps analytics off and avoids a noisy
404 in local static previews.

Cross-browser and device-profile checks:

```bash
python3 -m http.server 4173
npm run qa:browser-matrix
npm run qa:android-device
```

`qa:browser-matrix` covers real desktop Firefox plus simulated Pixel, Galaxy and
WeChat browser profiles. It does not claim real-device coverage.
`qa:android-device` uses Playwright's experimental ADB connection and prints an
explicit `SKIP` when no authorized Android device or debuggable WeChat WebView
is available.

Do not embed Tawk.to or another persistent floating chat launcher. Decision D1
reserves persistent direct-contact entry points for the sticky navigation Free
Quote action and the normal footer contact links.

## Archived UI decisions

Decision D1 is closed as **confirmed deletion, do not restore**. The following
interfaces were intentionally removed and must not return through a later UI
cleanup or enhancement pass:

- floating contact controls
- the mobile bottom conversion bar
- the country flag ticker and its pause control
- the inquiry page's four-channel send panel
- every back-to-top control

The only permitted contact-entry exception is a temporary WhatsApp fallback shown
after Turnstile itself fails to load or run. It is not a floating control and it
must disappear when the security check recovers or the form enters another
state.

The footer language selector is the only retained footer utility. It stays
inline in the page footer and keeps buyers on the equivalent home, inquiry,
calculator, or website privacy-policy surface whenever that localized surface
exists. Back-to-top controls are retired rather than reintroduced in another
non-floating form.

## JavaScript performance budgets

`npm run test:asset-budgets` enforces compressed limits rather than allowing the
shared script to grow around the latest implementation. The shared
`site-enhancements.js` budget is 15 KiB gzip. Homepage-only shipment behavior
lives in `site-home-enhancements.js` with a 4 KiB budget, while inline footer
utilities live in `site-footer-tools.js` with a 3 KiB budget. Split another
page-specific responsibility before raising any of these limits.

## Image Optimization

`cwebp` is installed locally through Homebrew:

```bash
brew install webp
```

Generate WebP files:

```bash
find assets -type f \( -iname '*.jpg' -o -iname '*.png' \) -print0 | while IFS= read -r -d '' img; do
  base="${img%.*}"
  ext="${img##*.}"
  out="${base}.webp"
  if [ -e "$out" ] && [ "$ext" != "png" ]; then out="${img}.webp"; fi
  cwebp -quiet -q 82 -m 6 -metadata none "$img" -o "$out"
done
```

## Important Files

- `index.html`: Chinese/default home page
- `en/index.html`: English home page
- `inquiry/index.html`: default quote form
- `assets/inquiry-form.js`: shared direct-submit and Turnstile client logic
- `cloudflare/inquiry-api/`: direct inquiry Cloudflare Worker
- `styles.css`: shared design and responsive source styles
- `styles.min.css`: minified CSS served by the HTML pages
- `robots.txt`: crawler rules
- `sitemap.xml`: URLs for Google
- `CNAME`: custom domain
- `_config.yml`: site metadata for GitHub Pages/Jekyll-compatible tooling
- `.nojekyll`: serve files as static assets without Jekyll processing
