# 交接文档(更新于:2026-07-22,交接体系建立,第十轮进行中)

> 本文档为交接体系建立时的首份预填版;首次开工请先核对第 3 节,之后由当班 AI 覆盖重写。

## 1. 当前目标

第十轮 UI/链路修复,任务书为站主本地内部文档(不在本公开仓库,见第 8 节),已执行过半。主线 = 询盘链路韧性、consent 摩擦收敛、小屏 CTA 字号治理。

## 2. 已完成(带证据)

- **第九轮 16 项全部验收通过**(分段小计、小数逗号、RTL SVG、渐变兜底 12 处等),npm test 绿。
- 第十轮已落地部分:P0-1、P0-2(9.5px CTA,三轮悬案已修)、P1-1~P1-4、P1-7 部分——对应提交至 `f5f89df` 前后;其后 `bc4a62c`(反浮动契约断言)、`922a9a1`(404 恢复对齐 D1)、`f1e4f31`(consent 选择持久化 + 询盘量度,58 文件,2026-07-22 已推送上线)继续推进。
- 更早里程碑:SEO 基建、信任条+FAQ、UI 重构、性能优化(首页 1153KB→61KB)、估算器+AI 采购助理、consent 管理、Turnstile 全询盘页、安全响应头 Worker。

## 3. 进行中

无未提交半成品:第十轮此前约 58 文件的现场(全部语言询盘页/隐私页、consent 脚本、询盘 Worker、QA 脚本)已由 Codex 于 2026-07-22 提交为 `f1e4f31` 并推送。工作区仅剩未跟踪的 `.claude/` 本地配置目录(不入库)。

**下一步具体动作**:由 Codex 会话对照任务书核销 `f1e4f31` 覆盖的条目,继续第 4 节余项。

## 4. 未开始(按优先级,编号见站主本地任务书)

1. P0-3(consent 摩擦收敛)、P0-4(导航 WhatsApp,依赖 D1,默认不做)。
2. P1-5、P1-6;P2/P3 全部。
3. 站主操作项:info@ 邮箱转发建好后替换全站 Gmail(8 处);GSC 收录;`shipments.json` 填真实数据(占位中,首页最近发运栏隐藏)。
4. 规划期未启动:验货视频样例库;每月爆款清单 PDF;订单进度查询页;英文采购指南 + llms.txt。

## 5. 关键决策及理由

- **极简界面原则**(2026-07-19 站主拍板):无任何浮动控件,详见 AGENTS.md 第 3 节——验收时勿把组件缺失当回归。
- **Cloudflare 账号为 Workers Paid**:site-response-headers Worker 走全站路由无配额风险。
- **日语版正式放弃**:全站按 10 语言执行,防 ja 断言勿删。
- 转化面三连删(浮动钮/底部条/返回顶部)为**有意**,连带作废计算器移动条。

## 6. 踩过的坑

见 AGENTS.md 第 8 节(渐变兜底、新语言同步、类名拼写、动画白屏)。另:9.5px CTA 曾连续三轮漏修,教训 = 小屏断点(561–620px)与 404 页容易漏出验收视野,验收清单已含。

## 7. 验证方法

```bash
npm ci                    # 换机后首次
npm test                  # 全量静态检查
npm run qa:inquiry        # 动过询盘链路时
npm run qa:analytics-consent
npm run qa:ui
python3 -m http.server 4173   # 本地预览 http://127.0.0.1:4173/
```

改样式后:`npm run build:css` 并提交 styles.min.css(CI 校验无 diff)。

## 8. 环境与外部依赖

- git 远端:`https://github.com/qianjiabao1999/jabbarsourcing`(公开仓库,push main 即上线,纪律见 AGENTS.md 第 4 节)。
- 本地依赖:Node 24、npm ci、Playwright(chromium + webkit)。
- 两个 Cloudflare Worker:`cloudflare/inquiry-api/`(询盘+Turnstile 服务端校验)、`cloudflare/site-response-headers/`(安全响应头);部署凭据在各机本地,不进仓库。
- **内部任务书(第八/九/十轮)在站主本地 `~/Downloads/` 下**,不进本公开仓库;跨机需要时由站主另行同步(见站主与 AI 的私有渠道约定)。
