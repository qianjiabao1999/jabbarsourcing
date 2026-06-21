# Jabbar Sourcing

Static GitHub Pages website for `www.jabbarsourcing.com`.

## What This Site Includes

- Multilingual landing pages for Jabbar Sourcing
- Static sourcing request forms that open WhatsApp, Gmail, or WeChat copy flow
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

This is a pure static site. It does not need WordPress, plugins, a database, or a build step.

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

For the custom domain, keep DNS pointed to GitHub Pages and confirm both URLs work:

```text
https://jabbarsourcing.com
https://www.jabbarsourcing.com
```

## Cloudflare Speed Settings

GitHub Pages already uses a CDN. If Cloudflare is added, enable:

- Brotli
- Auto Minify for HTML, CSS, and JavaScript
- HTTPS redirect
- Cache static assets

Set Cloudflare proxy only after GitHub Pages HTTPS is working.

## Contact Form Options

Current static form behavior:

- WhatsApp: opens `wa.me`
- Gmail: opens a prefilled compose window
- WeChat: copies the request text and asks the buyer to add the WeChat ID

To use Formspree:

1. Create a form at `https://formspree.io`.
2. Add the Formspree endpoint to the inquiry form.
3. Test that submissions arrive in email.

To use Tawk.to:

1. Create a Tawk.to property.
2. Add the provided embed snippet before `</body>` in the HTML pages where chat should appear.

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
- `styles.css`: shared design and responsive source styles
- `styles.min.css`: minified CSS served by the HTML pages
- `robots.txt`: crawler rules
- `sitemap.xml`: URLs for Google
- `CNAME`: custom domain
- `_config.yml`: site metadata for GitHub Pages/Jekyll-compatible tooling
- `.nojekyll`: serve files as static assets without Jekyll processing
