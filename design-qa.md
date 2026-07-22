# 集装箱货箱比例与满舱视觉 QA

## Comparison target

- Source visual truth: `/var/folders/j9/0c_cr92n7lq8zk387c94gsn80000gn/T/codex-clipboard-d7cde502-983c-42f4-85fb-500c672f22eb.png`，`1070 × 1230`。
- Browser-rendered implementation: `/tmp/jabbar-order-analyzer-qa/packing-container-branded-1280.png`，`500 × 602`。
- Mobile implementation: `/tmp/jabbar-order-analyzer-qa/packing-container-branded-390.png`，`274 × 434`。
- In-app Browser interaction evidence: `/tmp/jabbar-container-perfect/in-app-calculator-74-8.png`，`906 × 920`。
- Full-view side-by-side comparison: `/tmp/jabbar-container-perfect/container-before-after-final-e.png`，`1000 × 652`。
- Focused first-cabinet comparison: `/tmp/jabbar-container-perfect/container-first-cabinet-focus-e.png`，`1520 × 380`。

## State and normalization

- Source and implementation show the same `74.888 m³` state: first cabinet `100%`, second cabinet about `10%`.
- Real workbook: `吕总2店565件.xlsx`，`565` cartons，`74.8881445148 m³`；precise allocation is `100% + 10.1296242865%`.
- Desktop CSS viewport: `1280 × 900`；mobile CSS viewport: `390 × 844`；device scale factor: `1`.
- Full comparison normalizes both sides to `500px` width. The focused comparison crops the same first-cabinet state and scales both regions to `760 × 380`.
- Final cargo asset: `assets/container-cargo-stack-20260722e.webp`，`2005 × 662`，`213,106 bytes`.
- Asset SHA-256: `f0b2574615a34fe19b5b17bf57bdf20172f095ddc3b61c78a0072d240b268383`.
- CSS uses the identical `2005 / 662` aspect ratio with `height:auto`、`object-fit:contain`、`opacity:1` and `transform:none`.

## Comparison history

### Iteration 1 — blocked

- [P1] The original dense cargo layer compressed the effective carton wall horizontally by about `25.8%`; cartons and logos looked tall and narrow.
- [P1] Too many columns made each carton and logo unreadable on mobile.
- Fix attempted: replace the old pallet cargo with a lower-density generated cargo wall and preserve the natural browser aspect ratio.

### Iteration 2 — blocked

- [P1] Browser stretching was removed, but the generated carton faces were still close to square and did not look physically natural.
- Fix attempted: regenerate wider cartons and bake perspective into the raster asset.

### Iteration 3 — blocked

- [P1] Cartons were wider, but the post-production perspective transform exaggerated the left/right width difference; the user still saw deformation.
- Fix: discard the transformed asset entirely. Generate a native-perspective carton scene with a long-lens, nearly orthographic camera instead of warping a flat grid.

### Iteration 4 — passed

- [P1 fixed] The final asset is a native mild-perspective `4 × 8` carton wall. Far and near cartons change size gradually; no carton is squeezed, stretched or melted.
- [P1 fixed] An interim stacking order placed the semi-opaque container interior over the cartons and made the cargo look translucent. The shell was restored below the solid cargo layer; final `opacity` is `1` and the cartons are visually opaque.
- [P2 fixed] Screenshot automation now waits for image decoding and two rendered frames, avoiding false empty-cabinet captures.
- Post-fix evidence: both the full comparison and focused comparison show natural carton proportions, readable Haoduobao logos, continuous four-level fill, and unchanged carton scale in the remainder cabinet.

## Required fidelity surfaces

- Fonts and typography: result heading, percentage, capacity, units and status labels retain the existing type scale, weight and monospaced numerals; no new wrapping or truncation was introduced.
- Spacing and layout rhythm: card padding, radii, inter-card spacing and result order are unchanged; the fix is restricted to the cargo layer and its intrinsic geometry.
- Colors and visual tokens: green container, orange full state, teal partial state and blue/red Haoduobao branding remain consistent; no new shadow or floating control was added.
- Image quality and asset fidelity: the final raster contains real carton texture and official brand marks, has a transparent compositing background, no pallet, no visible chroma spill in the browser, no CSS stretch and no frame overlap.
- Copy and content: `74.888 m³`、`100%`、`10%`、`40HQ` and the 10-language labels remain correct.
- Icons: this component adds no new icon; existing navigation and result controls are unchanged.
- Interaction and accessibility: the quick-calculator flow was exercised with `100 × 100 × 68 cm` and `110` cartons, producing `74.800 m³`, `100% + 10%`, enabled copy action and an inquiry link. Progressbar ARIA values match the calculated percentages, and reduced-motion disables the fill transition.
- Responsiveness: Chromium, WebKit, Firefox, desktop, `390px`, simulated Pixel 5, Galaxy S9+, Android WeChat WebView, iOS WeChat WKWebView and Arabic RTL have no horizontal overflow or relevant console errors. These are simulated environments, not claims of physical-device testing.

## Findings

- No remaining P0, P1 or P2 visual findings.
- P3: at very narrow widths the English line inside the carton logo naturally becomes small, but the blue Haoduobao mark, carton outline and load percentage remain clear.

## Implementation checklist

- [x] Remove the transformed/deformed cargo asset.
- [x] Use native mild perspective with four rows and eight columns.
- [x] Fill the full cabinet continuously from floor to ceiling and back to front.
- [x] Keep the second cabinet at the same carton scale and reveal only the remaining load width.
- [x] Keep every visible carton branded with the Haoduobao logo and remove pallets.
- [x] Verify the real Excel workbook, quick calculator interaction, 10 languages, RTL, desktop, mobile and browser matrix.
- [x] Wait for image decode and paint before visual capture.

final result: passed
