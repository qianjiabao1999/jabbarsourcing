# 交接文档（更新于：2026-08-14，第十三轮 / 第三轮体检 41 条全量修复批）

> 接手前先核对 `git status --short`、最近提交、线上版本和本文件。站主本地 `.claude/` 不入库、不触碰。

## 1. 当前目标

【第十三轮·全量修复批 2026-08-14】第三轮体检可执行项一次做完,四批施工:
- 批1 询盘 JS:加载与四条失败路径均不再自动滚走(setStatus skipScroll);等待期即附 WhatsApp 出路;30s 超时经断言判定为有意设计予以保留;JS 版本 inquiry-20260814a。
- 批2 CSS 十二处(apple-188):窄屏语言菜单固定居中面板、删 961-1279 CTA 绝对居中、渐变尾/评价标题改冷色、数据卡五卡统一、hyphens manual、430 档 pill 12px、菜单项 14px+aria-current ✓、移动吸顶 0.97+blur、隐私链接触控扩展、筛选态藏重复徽章(用现成 is-social-filtered,JS 未动)。
- 批3 十语言 17 子项:2008/2021 口径统一(公司 2008 成立+团队 2021 服务海外)、FAQ 尾 CTA 注入(faq-quote-cta,home JS)、询盘 3 信任要点×10、指南内链×3(en 首页 FAQ 尾/页脚×4/询盘提示)、评价标题改「真实到访与评价」口径×10、第 4 卡统一 100+、ar bdi/URL 框 dir=auto/Phone 8 语言/es 千分位与占位/金额本地化 ru·tr·ar·es、按钮去 directly×10、aria-current×19、color-scheme×44。地址公司名前置与 12s 超时两项与既有断言冲突已回滚(尊重既有设计)。
- 批4 英文指南扩充 415→1136 词八节+实拍图+主站牌头(Home/CBM Tool/Free Quote)。
- 验收:七件套+qa:ui+qa:inquiry 全绿;sitemap 43 页 lastmod→2026-08-14(QA 三张期望表同步);五代理终验 5/5(期间抓到失败路径漏传 skipScroll 的真漏洞并补验)。
- 断言联动记录:HOME_TITLES 不变;数字卡快照期望改「全球 100+」;faq CTA 独立类名避免 Playwright 歧义。
- 未做(需站主):FAQ 样品/售后两问口径、社媒瘦身方案、About 信任区、ar 第五卡东阿数字(待拍板)。

【上一轮 2026-08-12】
【2026-08-12】站主提供真实素材：Maria R. 占位评价卡（巴西/USD 58,000/编写引语）十语言替换为英国客户 Matilde 实拍卡（🇬🇧/USD 15,000/到访实拍图三档 webp/boyner 句式事实文案）。卡片保持普通 testimonial-card 类型（不挂 --proof，boyner 专属断言零侵入），金额行保留满足 num-mono [1,0,1] 分布；新图命名避开 testimonial-maria.webp 防回归清单。sitemap 十首页 lastmod → 2026-08-12（QA 期望表同步）。


【第十二轮·收官批】新增英文采购指南 `/en/yiwu-sourcing-guide.html`（legal-page 模板、Article JSON-LD、正文口径逐字对齐站内 FAQ；发布链五处同步：deploy.yml include+en 特判 5 文件+HTML 总数 45、sitemap 43 URL+QA 期望集合、llms.txt）。llms.txt 口径修正：报价 72h→24–48h、付款补 T/T（与 FAQ 一致）。GSC 提交因 Chrome 扩展未连待站主；info@ 需加 MX 记录触 DNS 红线待站主；shipments.json 待站主数据。

【第十二轮·首批】承接 AI 爬虫放行：修复 Lighthouse Agentic Browsing 失分项（38 张社媒卡 aria-label 与可见文本 mismatch，十语言共 380 处，删除属性让内文接管无障碍名）；新增 llms.txt（业务数字与 FAQ 逐字一致，deploy.yml 白名单+必需文件两处已同步）；sitemap 十个首页 lastmod bump 至 2026-07-26（QA 的 EXPECTED_LANGUAGE_MATRIX_LASTMOD.home 同步）。验收：npm test 七件套绿、qa:ui 绿、Prepare 步骤本地复现退出码 0 且 llms.txt 确认进产物。首包上线后 Lighthouse Agentic 50→67；补丁包继续清理页脚 6 类链接（地图+五个联系方式）的 aria-label——axe 对多子元素文本无空格拼接导致带空格的 label 判 mismatch，删除后名字由内容接管；CSS 的 14 处 [aria-label*="Gmail"] 选择器改为 .contact-gmail 类名（apple-187），qa-ui 的同款选择器同步。

【第十一轮原文】
维护面向海外采购商的 10 语言 Jabbar Sourcing 静态站。本发布单元是一次小步修复：把十个语言版首页的裸品牌 `<title>` 换成关键词版（与各语言 og:title 同源文案、关键词前置），并修复 1280–1600px 主流桌面档导航字号倒挂（原 11px，比更窄的 961–1279 档 12px 还小）。

## 2. 已完成（带证据）

- 十语言首页 `<title>` 全部换为"本地化关键词 + 品牌"格式（如 en：`Yiwu Sourcing Agent in China – Free Quotes | Jabbar Sourcing`；zh：`义乌采购代理 · 验货质检 · 国际物流一站式｜Jabbar Sourcing`）。og:title 未动。
- 两处 QA 断言由固定值改为 `HOME_TITLES` 十语言映射（`scripts/check-ui-enhancements.mjs`、`scripts/qa-ui-enhancements.mjs`），并各加一条"禁止回退为裸品牌名"防回归断言；两份映射必须保持一致。
- 导航字号：1280–1600 断点 links 11→12.5px、pill/quote/language 11.5→12.5px；≥1600 clamp 下限 11.5→12.5px；≤560 pill 三处 11.5→12.5px；≤360 pill 11.5→12px（小屏少抬半档防挤）。961–1279 档维持 12px（防换行，有意不动）。
- CSS 版本 `apple-185→apple-186`：43 个 HTML 与 4 个脚本（两份 check、qa-ui、generate-website-privacy-policies）同步；`npm run build:css` 产物已重建，可重复构建校验通过。
- 验收：`npm test` 七件套绿；`qa:ui`（Chromium/WebKit、RTL、reduced-motion、no-JS、桌面+移动视口）绿；`qa:inquiry` 绿；`qa:analytics-consent` 全场景绿。1280×900 截图人工复核导航单行不换行。

## 3. 进行中

`072e8dc`（第十一轮）已推送但 Actions 红——排查发现**并非本轮引入**：main 自 2026-07-22 `b9f6049` 起连续三次部署失败，线上一直停在 `4ec1edb`（07-22）。根因：`b9f6049` 删除了站点验证文件 `1731ed149abf68908090297af19fab14.txt`，但 deploy.yml 的 rsync 白名单、required_root_files 断言和内容 sha 校验三处引用未同步删除，"Prepare static site artifact" 步骤 `test -f` 失败（bash -e 无输出退出）。已删除三处引用并在干净检出上复现通过，随本提交推送；上线后在线复核十语言 title 与 1280/375 两档导航。

## 4. 未开始（按优先级）

1. ~~站主 Cloudflare 面板两项~~ **已完成（2026-07-26，站主授权经浏览器操作）**：
   - AI 爬虫放行：关闭旧版 "Block AI bots"（scope 原为"仅广告页"，实际未拦截流量但注入 robots.txt 并锁死行级开关）+ 关闭 AI Crawl Control 的 "Managed robots.txt"。线上 robots.txt 已恢复仓库源文件内容（无 GPTBot/meta Disallow）；新版 AI bot policies 三档（Search/Agent/Training）均为 Allow；行级封锁全部清零。
   - 缓存规则：既有规则"Cache assets for 1 month"原本**只标了缓存资格、没配任何 TTL**（走 CF 默认 4h）。已补全：表达式扩为 `assets/* + *.css/*.js/*.webp/*.svg`、Edge TTL 1 个月（忽略 cache-control）、浏览器 TTL 7 天。实测 `styles.min.css` 与 assets JS 均 `cf-cache-status: HIT`、`cache-control: max-age=604800`。
2. 页脚"公司订货网站"仍指 haoduobao123.com（站主拍板维持现状，何时切 haoduobaoerp.com 另议）。
3. `shipments.json` 真实数据、info@ 邮箱替换、GSC 收录：继续等站主。
4. 规划期条目不变：验货视频样例库、每月爆款清单、订单进度查询页、英文采购指南 + llms.txt。

## 5. 关键决策

- 首页 title 关键词前置、og:title 品牌前置：搜索结果与社交分享各取所长；两处 QA 断言映射化后，改 title 必须同步两份 `HOME_TITLES`。
- 询盘表单 quantity/budget **不加** `inputmode="numeric"`：placeholder 明确期待"1,000 pcs / one container / USD 5,000"等带单位自由文本，数字键盘会阻碍输入（体检建议第 6 项经核实后放弃）。
- 961–1279 档导航维持 12px：该档空间最紧（品牌文字已隐藏），抬字号有换行风险，且 12px 不是可读性洼地。
- D1（无浮动控件）、D2（Workers Paid）、D3（发运数据未到先隐藏）等既有决策不变。

## 5.5 踩过的坑（本轮新增）

- **删除发布物文件时，deploy.yml 的同步义务与新增同样存在**：白名单 include、required_root_files、内容校验三处都要清；漏一处 CI 就在 "Prepare static site artifact" 无输出退 1（bash -e + test 不回显）。排查这类失败直接 `bash -ex` 本地复现该步骤看最后一条命令。
- 复现 CI 脚本时勿用管道套退出码（`bash -e x.sh | tail` 的 `$?` 是 tail 的）；用 `bash -e x.sh > log; echo $?`。

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
