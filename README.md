# Jabbar Sourcing

Jabbar Sourcing 的英文品牌官网，针对海外进口商、电商品牌和中小企业设计。

## 本地预览

```bash
python3 -m http.server 4173
```

然后访问 `http://127.0.0.1:4173`。

## 发布

网站是纯静态页面，不需要安装依赖或运行构建命令，可直接发布到 GitHub Pages。
完整操作步骤见 [DEPLOY.md](DEPLOY.md)。

## 上线前需要替换

- 确认并购买 `jabbarsourcing.com`
- 开通 `hello@jabbarsourcing.com` 企业邮箱
- 将网站服务内容、产品品类和承诺调整为真实业务信息
- 有 WhatsApp 号码后，可增加悬浮联系按钮
- 有真实工厂、团队和质检照片后，可替换示意主视觉

## 文件

- `index.html`：网站内容与 SEO 信息
- `styles.css`：视觉设计和响应式布局
- `script.js`：手机菜单、滚动动效和询盘邮件
- `CNAME`：GitHub Pages 自定义域名配置
- `.nojekyll`：关闭 Jekyll 处理
