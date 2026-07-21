# 3D 集装箱可视化设计 QA

## Comparison target

- Source visual truth: `/var/folders/j9/0c_cr92n7lq8zk387c94gsn80000gn/T/codex-clipboard-23e1a52e-8e67-4566-b374-389cef521fc0.png`
- Implementation screenshots:
  - `/tmp/jabbar-order-analyzer-qa/packing-container-first-1280.png`
  - `/tmp/jabbar-order-analyzer-qa/packing-container-second-1280.png`
- Combined comparison evidence: `/tmp/container-comparison.png`
- State: original workbook total volume `74.8881445148 m³`; two 40HQ containers at `100%` and `10.1296242865%`.

## Viewport and normalization

- Browser viewport: desktop `1280px` wide, Playwright default device scale factor `1`.
- Source intrinsic pixels: `1040 × 510`; its original CSS size and source density are unavailable.
- Implementation card pixels: `466 × 243` per card; two cards stacked to `466 × 486`.
- Comparison normalization: source scaled proportionally to `466px` wide and centered on a `466 × 486` white canvas; implementation retained at captured 1:1 pixels. The combined image is `932 × 486`.
- The source is a compact flat summary while the requested implementation intentionally uses taller realistic container cards, so vertical density is not treated as a fidelity mismatch.

## Full-view comparison evidence

`/tmp/container-comparison.png` shows the complete source component and the complete two-card implementation in one image. The implementation preserves the source information hierarchy—container number, percentage, full-first allocation, total capacity context—while replacing abstract bars with a realistic open-side 40HQ view. No clipping, overlap, horizontal overflow, or residual shadow is visible.

## Focused region evidence

The two individual card screenshots are the focused evidence. The first card visibly fills the cargo bay end to end and uses the orange full state. The second card visibly fills only the left `10%` portion and leaves the rest of the container empty. Text, status pill, shell, and cargo remain readable at the captured size. No additional crop was needed because each focused screenshot contains exactly one complete card.

## Required fidelity surfaces

- Fonts and typography: existing site sans-serif and monospaced numeric stacks are retained; `100%` and `10%` have clear hierarchy and do not wrap.
- Spacing and layout rhythm: card padding, rounded border, scene spacing, footer alignment, and the gap between cards are consistent; no outer box shadow was introduced.
- Colors and visual tokens: teal remains the primary brand/state color and orange is reserved for the full-container state; pale blue scene backgrounds match the calculator surface.
- Image quality and asset fidelity: real raster WebP shell and cargo assets are used, with transparent edges and natural width `1280px`; there are no handcrafted SVG or CSS-art substitutes.
- Copy and content: 40HQ identity, per-container capacity, exact allocation order, localized unit text, percentage, and loaded/full state are preserved.

## Findings

- No actionable P0, P1, or P2 visual mismatch remains.
- P3: the realistic cards use more vertical space than the former bar chart. This is an intentional tradeoff for clearer loading visualization; responsive CSS collapses the grid to one column without horizontal overflow.

## Comparison history

- Initial comparison: no P0/P1/P2 mismatch was found. The generated shell/cargo assets, full-first allocation, spacing, typography, colors, and responsive container bounds were all acceptable, so no blocking visual-fix iteration was required.
- Automated follow-up: Chromium and WebKit checks confirmed desktop/mobile layout, RTL, ARIA progress values, exact allocation data, asset loading, and zero language-selector shadow.

## Implementation checklist

- [x] Preserve `68 m³` 40HQ capacity and full-first allocation.
- [x] Render one full container before the remainder container.
- [x] Use real image assets with accessible progress semantics.
- [x] Keep desktop, mobile, RTL, reduced-motion, and no-JS checks green.
- [x] Remove parent, hover, and summary shadows from the language selector.

final result: passed
