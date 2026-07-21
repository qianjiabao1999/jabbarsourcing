# 交接文档（更新于：2026-07-22，第十轮地理 Consent 发布单元）

> 接手前先核对 `git status --short`、最近提交、线上版本和本文件。站主本地 `.claude/` 不入库、不触碰。

## 1. 当前目标

维护面向海外采购商的 10 语言 Jabbar Sourcing 静态站。本发布单元完成基于 Cloudflare 粗粒度地区信号的分析同意策略、GPC 强制拒绝、跨浏览器矩阵和真实安卓检查入口；不使用浏览器 GPS，也不自动同意分析。

## 2. 已完成（带证据）

- 第九轮 16 项及第十轮既有修复已上线；`f1e4f31` 完成 consent 选择持久化、询盘度量和 10 语言正式隐私页。
- 地理 Consent：
  - EEA、英国、瑞士、Cloudflare EU 信号、未知位置、Tor 和识别异常使用 `strict`，分析保持关闭，选择面板可以自动出现。
  - 其他合法两字母国家代码使用 `quiet-denied`，分析同样默认关闭，但不自动弹窗；用户仍可在隐私页主动选择。
  - `/api/consent-region` 只返回 `{policy,gpc}`，不返回国家代码；三层 `no-store`，异常、超时和畸形响应全部严格降级。
  - 静态源站提供严格模式兜底，避免本地预览或 Worker 绕过时出现 404；线上由全站响应头 Worker 覆盖。
  - `Sec-GPC: 1` 与 `navigator.globalPrivacyControl` 都会覆盖历史授权、禁用 Allow 并阻止 GA4/Clarity。
  - 全站响应头 Worker 的 invocation logs/traces 已关闭，避免抽样运行日志保留推断国家。
- 10 语言隐私文本已披露 Cloudflare 粗粒度判断、静默拒绝、严格地区提示与 GPC；全站 Consent 资源版本为 `consent-20260722a`。
- 浏览器 QA：真实桌面 Firefox（1280 和 390 窄屏）以及模拟 Pixel 5、Galaxy S9+、Android 微信 UA、iOS 微信 WebKit 均通过；模拟配置不冒充真机。
- 真实安卓脚本使用 Playwright ADB；无设备时普通模式明确 `SKIP`，`REQUIRE_WECHAT=1` 强制模式会非零失败，不能假通过。
- 当前回归已通过：`npm test`、CSS 可重复构建、询盘、UI、Consent、浏览器矩阵、Excel 订单分析、失败恢复、装柜分配、询盘 Worker 与响应头 Worker 12/12 测试及 dry-run。未发送生产询盘。

## 3. 进行中

本发布单元完成后应依次发布响应头 Worker、推送 `main`、等待 GitHub Pages 成功，再在线核对地区端点、43 个 Consent 引用、40 个主要语言路由和安全响应头。

真实安卓品牌机与真实微信内置浏览器尚未执行，因为当前没有已授权 ADB 设备。自动化入口已经就绪，后续接机后运行第 7 节命令。

## 4. 后续事项

1. `shipments.json` 仍等待站主提供真实城市、柜量和时间；占位数据继续隐藏，勿自行伪造。
2. `info@` 企业邮箱完成后再按站主确认替换 Gmail；GSC 收录由站主控制台继续验证。
3. 导航 WhatsApp 仍为可选项，默认不做；D1 禁止浮动聊天、移动底条和浮动返回顶部。
4. 真机抽查重点：真实 Android Chrome、Samsung Internet、小米/Redmi WebView、Android 微信 X5/TBS、iOS 微信 WKWebView；核对 Consent 触摸、菜单、图库左右滑动、横竖屏和询盘输入避让。

## 5. 关键决策

- 全站固定 10 语言，日语正式放弃；三条防日语回归断言永久保留。
- D1：无浮动/常驻叠加控件；联系入口为吸顶导航 Free Quote 与正常页脚。
- D2：Cloudflare 账户为 Workers Paid；`www.jabbarsourcing.com/*` 全站 Worker 路由仍需保留回滚方案。
- 地区只改变“是否自动展示选择面板”，永远不自动授予分析同意；未知状态严格降级。
- GPC 为全局强制拒绝信号；不读取浏览器 GPS，不把国家代码发给页面或写入站点存储。
- D3：真实发运数据未提供前，最近发运组件保持隐藏。

## 6. 发布注意事项

- 先部署 `cloudflare/site-response-headers/`，再推送静态前端；前端即使先到，也会因静态兜底或请求异常保持严格关闭。
- 页面加载的是 `styles.min.css?v=apple-179`；改 CSS 必须 `npm run build:css` 并提交 min 文件、同步升版本。
- 不提交 `.claude/`、内部任务书、源码图库归档或其他非发布文件。
- 不重复发送生产询盘；只有站主再次明确授权时才做真实表单提交。

## 7. 验证方法

```bash
npm ci
python3 -m http.server 4173 --bind 127.0.0.1
npm test
npm run build:css
git diff --exit-code -- styles.min.css
npm run qa:inquiry
npm run qa:ui
npm run qa:analytics-consent
npm run qa:browser-matrix
npm run qa:calculator-order
npm run qa:order-resilience
npm run qa:container-allocation
npm run verify:worker
npm run verify:security-headers
```

真实安卓普通检查（无设备时明确 SKIP）：

```bash
npm run qa:android-device
```

把真实微信作为强制门禁（无 ADB 或无可调试微信 WebView 时失败）：

```bash
REQUIRE_WECHAT=1 npm run qa:android-device
```

## 8. 环境与外部依赖

- 远端：`https://github.com/qianjiabao1999/jabbarsourcing`；推送 `main` 触发 GitHub Pages。
- 本地：Node 24、Playwright Chromium/Firefox/WebKit。
- Worker：`cloudflare/inquiry-api/`（询盘、Turnstile、Email Service）和 `cloudflare/site-response-headers/`（全站安全响应头、地区 Consent 端点）。
- 内部第八/九/十轮任务书位于站主本地 `~/Downloads/`，不进公开仓库。
