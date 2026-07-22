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

---

# Jabbar 高清透明 Logo 与网址图标 QA

## Comparison target

- 联名 Logo 视觉真值：`/var/folders/j9/0c_cr92n7lq8zk387c94gsn80000gn/T/codex-clipboard-36f993d1-6a2c-4dd5-a4fd-a29a09ac1b57.png`，`986 × 450`；它记录了 180px 源图被放大后的模糊状态。
- 网址快捷图标视觉真值：`/Users/jabbar/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_svlu2ime3h3l12_c4b7/temp/RWTemp/2026-07/9e20f478899dc29eb19741386f9343c8/f932976e182e050a2e6d047406a0b5a8.jpg`，`1298 × 1920`；底部 Jabbar Sourcing 图标带白色方形底。
- 电脑端浏览器实现：`/tmp/jabbar-logo-page-desktop.png`，CSS viewport `1440 × 1000`，device scale factor `1`。
- 手机端浏览器实现：`/tmp/jabbar-logo-page-mobile.png`，CSS viewport `390 × 844`，device scale factor `1`。
- 同屏对比证据：`/tmp/jabbar-logo-qa/logo-before-after-comparison.png`，`1200 × 1040`。
- 最终高清资产：`assets/jabbar-sourcing-mark-transparent-hd.webp`，`512 × 512`，`87,068 bytes`，透明通道范围 `0–255`。

## State and normalization

- 联名卡保持原有 Jabbar × Haoduobao 布局、卡片尺寸、边框、圆角、间距和背景，仅替换 Jabbar 图像源。
- 桌面端 Jabbar 图实际渲染 `169.195 × 169.195 CSS px`；手机端实际渲染 `97.195 × 97.195 CSS px`。两者都从 512px 源图向下缩放，不再放大 180px 素材。
- 对比板将原始联名卡截图和浏览器实拍分别放在等宽面板中；网址图标同时用 64px 浏览器近似尺寸和 120px 边缘检查尺寸显示。
- 浏览器图标版本统一为 `jabbar-6`；联名高清图版本为 `brand-20260722hd1`。

## Comparison history

### Iteration 1 — blocked

- [P1] 10 语言首页联名卡和 404 页共用 `180 × 180` 有损透明 WebP；Retina 桌面实际需要约 338–380 个物理像素，发生明显上采样和文字边缘发虚。
- [P2] 浏览器快捷图标来自带白底的 512px PNG，出现在浅蓝色网址卡片上时形成突兀的白色方框。
- Fix attempted: 以现有 `assets/app-icon-512.png` 无损品牌源为真值，只清理连通的外围白底，不重画人物、地球、字体或品牌轮廓。

### Iteration 2 — passed

- [P1 fixed] 10 语言联名卡及 404 页改用独立 512px 高清透明 WebP；导航仍使用轻量 180px 资源，避免给每个页面增加不必要的下载体积。
- [P2 fixed] `32 / 64 / 180 / 192 / 512` PNG 与多尺寸 ICO 全部由同一透明 512px 主图生成，四角 alpha 均为 `0`，外围白色方框已移除。
- [P2 fixed] Web App Manifest 的图标用途改为 `any`，避免把透明 Logo 当成必须铺满背景的 maskable 图标再次裁切。
- Post-fix evidence: 电脑和手机浏览器截图中的人物、地球与 `JABBAR SOURCING TEAM` 边缘清晰，Logo 未裁切、未变形、未改变联名卡布局，控制台无 error/warning。

## Required fidelity surfaces

- Fonts and typography: 页面标题、导航、联名字号与行距未改；Logo 内 `JABBAR SOURCING TEAM` 使用原始品牌图中的字形，不由网页字体重建。
- Spacing and layout rhythm: 联名卡两侧尺寸、外框、内边距、圆角、`×` 位置及手机端换算尺寸全部保持不变。
- Colors and visual tokens: 海军蓝、白色、地球蓝以及好多宝蓝红色不变；未增加新阴影或浮动控件。
- Image quality and asset fidelity: 最终图来自现有无损 512px 品牌源，未采用会改变人物身份的生成版本；外围背景透明，内部白色文字、圆环和描边完整保留，无透明白边光晕。
- Copy and content: 公司名称、联名关系、页面文案和 Logo 内英文拼写均未改变。
- Icons: favicon、Apple Touch Icon、Web App Manifest 图标和 ICO 使用同一品牌图，缓存版本同步升级。
- Responsiveness: `1440 × 1000` 与 `390 × 844` 浏览器实拍均无裁切、变形或横向溢出；本次是自动化浏览器验证，不宣称真实设备快捷方式缓存已立即刷新。

## Findings

- No remaining P0, P1 or P2 visual findings.
- P3: 已安装到手机桌面的旧快捷方式可能继续持有系统级图标缓存；重新添加快捷方式或等待系统刷新后才会显示 `jabbar-6`。

## Implementation checklist

- [x] 保留原始 Jabbar 人物和品牌字样，不使用生成式重绘版本。
- [x] 去除只与外围背景连通的白色区域，保留 Logo 内所有白色内容。
- [x] 为 10 语言首页和 404 页提供独立 512px 高清透明 WebP。
- [x] 生成透明的 favicon、Apple Touch Icon、192px 和 512px Web App 图标及 ICO。
- [x] 升级全站图标缓存版本，并增加静态性能与部署产物守卫。
- [x] 完成电脑端、手机端、透明度、资源引用、控制台和全站静态回归验证。

final result: passed
