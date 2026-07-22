# 集装箱货箱比例与满舱视觉 QA

## Comparison target

- 用户指出变形的参考图：`/var/folders/j9/0c_cr92n7lq8zk387c94gsn80000gn/T/codex-clipboard-d7cde502-983c-42f4-85fb-500c672f22eb.png`。
- 最终浏览器实现：`/tmp/jabbar-container-allocation-qa/container-allocation-110-percent.png`。
- 同视图并排对比：`/tmp/jabbar-container-fix/container-before-after-comparison-d.png`。
- 真实工作簿结果：`/tmp/jabbar-order-analyzer-qa/packing-container-branded-1280.png`。

## Verified state

- 真实工作簿：`吕总2店565件.xlsx`，`565` 箱、`74.8881445148 m³`。
- 装柜分配：第一柜 `100%`；第二柜 `10.1296242865%`，不平均分摊。
- 最终货箱素材：`assets/container-cargo-stack-20260722d.webp`，`1056 × 342`，`50,556 bytes`。
- SHA-256：`c047d896a74b9b6707b0fd1ee77c59c86894a32db112530b2283f85de6a66d71`。
- 浏览器渲染宽高比与素材天然宽高比一致；`object-fit: contain`、`height: auto`、`opacity: 1`、`transform: none`。

## Comparison history

### Iteration 1 — blocked

- 原素材把有效货箱内容横向压窄约 `25.8%`，单箱和好多宝 Logo 呈瘦高形。
- 柜口与货物透视不一致，满柜仍留下不自然空隙。
- 一排纸箱数量过多，手机端品牌标识缩成色块。

### Iteration 2 — blocked

- 浏览器不再二次拉伸，但货箱本身仍接近方形；用户明确判定“还是变形了”。
- 自动截图只等待图片下载，没有等待异步解码，可能短暂截到空柜，不能作为视觉通过证据。

### Iteration 3 — passed

- 重做为四层宽箱；右侧近景纸箱明显宽于高度，左侧随集装箱纵深自然收窄。
- 透视直接写入透明货物素材，CSS 不再做第二次透视、拉伸或梯形裁切。
- 满柜从上到下、从后端到前端连续填满；余量柜复用同一尺寸货箱，只裁切约 `10%` 的装载长度。
- 去除木托盘，每个可见箱面保留好多宝 Logo；降低透明感，货物保持实体不透明。
- QA 在图片完成异步解码并绘制两帧后截图，避免空柜假象。

## Required fidelity surfaces

- Fonts and typography: 标题、百分比、容量和状态标签沿用现有字重与等宽数字；没有新增截断。
- Spacing and layout rhythm: 卡片间距、圆角和内容顺序不变；只校正柜口内部图层。
- Colors and visual tokens: 保留绿色柜体、橙色满载、青绿色余量与好多宝蓝红 Logo；无新增阴影。
- Image quality: 纸箱轮廓清楚，箱面不横向压扁，透明边缘不覆盖柜门和框架。
- Copy and content: `74.888 m³`、`100%`、`10%`、`40HQ` 和 10 语言文案保持正确。
- Interaction and accessibility: 始终先装满当前柜再新增余量柜；ARIA 百分比与计算结果一致；reduced-motion 下关闭过渡。
- Responsiveness: Chromium、WebKit、Firefox、桌面、`390px`、模拟 Pixel/Galaxy、Android/iOS 微信 WebView 和阿语 RTL 均无横向溢出；模拟测试不等同真实品牌机或真实微信客户端真机测试。

## Findings

- 无剩余 P0、P1、P2 视觉问题。
- P3：极窄屏幕下箱面英文标识会自然缩小，但宽箱轮廓、好多宝蓝色识别和装载比例仍清楚。

## Implementation checklist

- [x] 去除旧素材中的横向压缩。
- [x] 满柜上下、前后连续填满并匹配柜体透视。
- [x] 第二柜保持原尺寸纸箱，只按余量裁切。
- [x] 货箱保持实体感，不使用木托盘。
- [x] 每个可见箱面保留好多宝 Logo。
- [x] 真实 Excel、10 语言、RTL、桌面、手机与浏览器矩阵复测。
- [x] 截图前等待图片解码和浏览器绘制。

final result: passed
