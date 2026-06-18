# 域名购买与 GitHub Pages 上线步骤

## 1. 购买域名

建议购买：`jabbarsourcing.com`

2026-06-18 查询 `.com` 注册局 RDAP 时返回 404，表示当时没有已注册记录，但域名状态随时可能变化，付款页面显示的结果才是最终结果。

可选择 Cloudflare Registrar、Namecheap、Porkbun 等注册商。购买时：

- 只购买域名即可，不需要购买虚拟主机或建站套餐
- 开启自动续费和双重验证
- 域名持有人资料使用真实可接收通知的邮箱
- 如果注册商提供隐私保护，建议开启

## 2. 新建 GitHub 仓库

1. 登录 GitHub，点击 **New repository**。
2. 仓库名填写 `jabbarsourcing`。
3. 选择 **Public**。
4. 不要勾选自动生成 README，因为本项目已经有 README。
5. 创建后，在本项目目录执行：

```bash
git add .
git commit -m "Build Jabbar Sourcing website"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/jabbarsourcing.git
git push -u origin main
```

将 `YOUR_GITHUB_USERNAME` 替换为你的 GitHub 用户名。

## 3. 开启 GitHub Pages

1. 打开 GitHub 仓库的 **Settings → Pages**。
2. 在 **Build and deployment** 中选择 **Deploy from a branch**。
3. Branch 选择 `main`，目录选择 `/(root)`，点击 **Save**。
4. 等待 GitHub 完成首次发布。

未绑定域名前，临时地址为：

```text
https://YOUR_GITHUB_USERNAME.github.io/jabbarsourcing/
```

## 4. 在域名注册商配置 DNS

为根域名添加以下 4 条 A 记录：

| 类型 | 主机记录 | 值 |
| --- | --- | --- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |

再添加一条 `www` 记录：

| 类型 | 主机记录 | 值 |
| --- | --- | --- |
| CNAME | `www` | `YOUR_GITHUB_USERNAME.github.io` |

注意：

- 不要在 CNAME 目标末尾填写仓库名
- 删除与 `@` 或 `www` 冲突的旧 A、AAAA、CNAME 或 URL 转发记录
- 如果使用 Cloudflare DNS，首次配置可将代理状态设为 **DNS only**，等 GitHub HTTPS 正常后再决定是否开启代理
- DNS 通常几分钟到数小时生效，少数情况需要更久

## 5. 在 GitHub 绑定域名

1. 回到仓库 **Settings → Pages**。
2. Custom domain 填写 `jabbarsourcing.com`，点击 **Save**。
3. 等待 DNS check successful。
4. 勾选 **Enforce HTTPS**。

本项目根目录包含 `CNAME.example` 模板。购买域名后，将它复制为 `CNAME` 并再次推送，内容为 `jabbarsourcing.com`。

如果 GitHub 在首次发布时暂时提示 DNS 检查失败，不要反复删除和添加域名；先等待 DNS 记录传播后再重新检查。

## 6. 建议的额外设置

- 在 GitHub 的 Pages 页面完成域名验证，降低域名被其他仓库占用的风险
- 开通 `hello@jabbarsourcing.com` 企业邮箱后测试询盘按钮
- 将真实邮箱设置为 SPF、DKIM 和 DMARC，避免客户邮件进入垃圾箱
- 上线后分别测试 `https://jabbarsourcing.com` 和 `https://www.jabbarsourcing.com`

## 官方说明

- GitHub Pages 自定义域名：<https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site>
- GitHub Pages 域名验证：<https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages>
- Cloudflare Registrar：<https://www.cloudflare.com/products/registrar/>
