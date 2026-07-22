# Excel 文件删除与好多宝品牌货箱设计 QA

## Comparison target

- 单文件删除参考：`/var/folders/j9/0c_cr92n7lq8zk387c94gsn80000gn/T/codex-clipboard-ea82850a-edfc-4a89-8719-22a18c24b194.png`
- 原装柜参考（需要去木托盘）：`/var/folders/j9/0c_cr92n7lq8zk387c94gsn80000gn/T/codex-clipboard-ee4f912d-05b8-4879-bc6d-4719d39af00c.png`
- 好多宝法定品牌 Logo：`/Users/jabbar/Desktop/微信图片_2026-07-18_061544_511.jpg`
- 当前实现：
  - `/tmp/jabbar-order-analyzer-qa/packing-file-delete-desktop-1280.png`
  - `/tmp/jabbar-order-analyzer-qa/packing-file-delete-mobile-390.png`
  - `/tmp/jabbar-order-analyzer-qa/packing-container-branded-1280.png`
  - `/tmp/jabbar-order-analyzer-qa/multi-file-collection-mobile-390.png`
- 同图对比证据：
  - `/tmp/file-delete-comparison.png`
  - `/tmp/container-branded-comparison.png`

## State and viewport

- 真实工作簿：`吕总2店565件.xlsx`。
- 桌面视口：`1280 × 900`；手机视口：`390 × 844`。
- 真实结果：`565` 箱、总体积 `74.8881445148 m³`。
- 装柜分配：第一柜 `100%`，第二柜 `10.1296242865%`，没有平均分摊到两个柜。
- 货物素材：`1280 × 372` WebP，使用与素材一致的 `1280 / 372` 货舱比例和 `object-fit: contain`，无横向拉伸。

## Full-view comparison evidence

`/tmp/file-delete-comparison.png` 将用户参考与实现并排：单文件卡右侧是独立、无阴影、红色语义的垃圾桶按钮；文件卡保持主点击区域，删除目标不少于 `44px`。桌面和手机都保持右侧排列，没有裁切或横向溢出。

`/tmp/container-branded-comparison.png` 将旧木托盘货箱、法定 Logo 和当前实现放在同一张图中：当前货物已取消木托盘，纸箱紧密落地堆叠；每个可见正面纸箱都带蓝红好多宝 Logo。满柜保持整幅货物图不变形，余量柜只裁切可见宽度，不缩放箱子。

## Required fidelity surfaces

- 删除控件：桌面和 `390px` 手机均为独立垃圾桶按钮，`aria-label`/`title` 含文件名，支持键盘，删除最后一个文件后焦点返回上传控件。
- 品牌素材：保留好多宝蓝色中文字与蓝红英文标识；没有重新使用木托盘。
- 装载真实性：第一柜端到端填满；第二柜从左侧显示实际剩余装载量，空舱清晰可见。
- 视觉稳定性：货舱和货物素材比例一致，`100%` 与 `10%` 状态下箱体尺寸不变；只改变裁切宽度。
- 设计系统：沿用现有蓝绿、橙色满载状态、圆角和无阴影规则，没有引入新的浮动控件。
- 响应式：桌面、Chromium/WebKit/Firefox 手机、模拟 Android 微信 WebView、iOS 微信 WKWebView 和阿语 RTL 均无横向溢出。

## Findings

- 无 P0、P1、P2 视觉问题。
- P3：在小尺寸装柜卡中，单个纸箱上的英文标识会自然变小，但“好多宝”中文仍清晰形成品牌识别；这是一次显示几十个真实箱面的密度取舍，不影响装载比例判断。

## Implementation checklist

- [x] 每个文件卡拥有独立删除按钮，桌面和手机一致。
- [x] 删除任意文件后重算剩余汇总；删除最后一个文件后可立即重新上传。
- [x] 去除木托盘并保持纸箱紧密填充。
- [x] 每个可见纸箱带好多宝 Logo。
- [x] 第一柜 100% 后才计算第二柜剩余量。
- [x] 货物图在满载、部分装载和 RTL 中不变形。
- [x] 真实 Excel、10 语种、桌面/手机/微信模拟环境和控制台回归通过。

final result: passed
