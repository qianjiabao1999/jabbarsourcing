# 交接文档（更新于：2026-07-25，第十一轮 / 首页 SEO title 与导航可读性）

> 接手前先核对 `git status --short`、最近提交、线上版本和本文件。站主本地 `.claude/` 不入库、不触碰。

## 1. 当前目标

维护面向海外采购商的 10 语言 Jabbar Sourcing 静态站。本发布单元是一次小步修复：把十个语言版首页的裸品牌 `<title>` 换成关键词版（与各语言 og:title 同源文案、关键词前置），并修复 1280–1600px 主流桌面档导航字号倒挂（原 11px，比更窄的 961–1279 档 12px 还小）。

## 2. 已完成（带证据）

- 十语言首页 `<title>` 全部换为"本地化关键词 + 品牌"格式（如 en：`Yiwu Sourcing Agent in China – Free Quotes | Jabbar Sourcing`；zh：`义乌采购代理 · 验货质检 · 国际物流一站式｜Jabbar Sourcing`）。og:title 未动。
- 两处 QA 断言由固定值改为 `HOME_TITLES` 十语言映射（`scripts/check-ui-enhancements.mjs`、`scripts/qa-ui-enhancements.mjs`），并各加一条"禁止回退为裸品牌名"防回归断言；两份映射必须保持一致。
- 导航字号：1280–1600 断点 links 11→12.5px、pill/quote/language 11.5→12.5px；≥1600 clamp 下限 11.5→12.5px；≤560 pill 三处 11.5→12.5px；≤360 pill 11.5→12px（小屏少抬半档防挤）。961–1279 档维持 12px（防换行，有意不动）。
- CSS 版本 `apple-185→apple-186`：43 个 HTML 与 4 个脚本（两份 check、qa-ui、generate-website-privacy-policies）同步；`npm run build:css` 产物已重建，可重复构建校验通过。
- 验收：`npm test` 七件套绿；`qa:ui`（Chromium/WebKit、RTL、reduced-motion、no-JS、桌面+移动视口）绿；`qa:inquiry` 绿；`qa:analytics-consent` 全场景绿。1280×900 截图人工复核导航单行不换行。

## 3. 进行中

无未完成现场。本发布单元代码已就绪，待推送 `main` 并盯 Actions 全绿；上线后在线复核十语言 title 与 1280/375 两档导航。

## 4. 未开始（按优先级）

1. 站主 Cloudflare 面板两项（API 令牌无权限，需站主亲手，各约 3 分钟）：
   - AI 爬虫放行：线上 robots.txt 被 CF 托管段注入 `GPTBot/meta-externalagent Disallow /`，仓库源文件是干净的。如决定放开 AI 搜索收录：dash → jabbarsourcing.com → AI Crawl Control（或 Security → Bots）→ 关闭"托管 robots.txt"或按爬虫放行。
   - 缓存规则：Caching → Cache Rules 新建一条，匹配 `*.css *.js *.webp *.svg`，Edge TTL 30 天 + 浏览器 TTL 7 天（资源全带 `?v=` 版本串，失效靠换串，零风险）。
2. 页脚"公司订货网站"仍指 haoduobao123.com（站主拍板维持现状，何时切 haoduobaoerp.com 另议）。
3. `shipments.json` 真实数据、info@ 邮箱替换、GSC 收录：继续等站主。
4. 规划期条目不变：验货视频样例库、每月爆款清单、订单进度查询页、英文采购指南 + llms.txt。

## 5. 关键决策

- 首页 title 关键词前置、og:title 品牌前置：搜索结果与社交分享各取所长；两处 QA 断言映射化后，改 title 必须同步两份 `HOME_TITLES`。
- 询盘表单 quantity/budget **不加** `inputmode="numeric"`：placeholder 明确期待"1,000 pcs / one container / USD 5,000"等带单位自由文本，数字键盘会阻碍输入（体检建议第 6 项经核实后放弃）。
- 961–1279 档导航维持 12px：该档空间最紧（品牌文字已隐藏），抬字号有换行风险，且 12px 不是可读性洼地。
- D1（无浮动控件）、D2（Workers Paid）、D3（发运数据未到先隐藏）等既有决策不变。

## 6. 发布注意事项

- 页面加载的是 `styles.min.css?v=apple-186`；改 CSS 必须 `npm run build:css` 并提交 min 文件、同步升版本（HTML 43 处 + 脚本 4 处）。
- 本地 QA 服务器：`python3 -m http.server 4173 --bind 127.0.0.1`（README 约定）。桌面 app 内嵌预览起的服务器可能因沙箱读不到文件而全 404，勿用它跑 QA。
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
- 内部第八至十一轮任务书位于站主本地 `~/Downloads/`，不进公开仓库。
