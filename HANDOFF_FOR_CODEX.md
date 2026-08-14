# 小红书解析落地到微信小程序 — codex 交接文档

> 目标：把"小红书笔记去水印/媒体解析"免费集成进微信小程序 `media-collector`，不依赖任何付费代理。
> 现状：**所有代码已写好**，你（codex）只需完成「部署 + 验证 + 微信业务域名配置」三件事。本文档末尾有决策分支。

---

## 0. 背景与架构（必读，避免走弯路）

- 服务端（腾讯云函数，数据中心 IP）直连小红书接口会被 **300015「浏览器运行环境异常」** 风控拦截，此路已死。
- 免费且可行的唯一路径：**让解析跑在用户侧**（手机微信 `web-view` 里，真实移动/边缘 IP，避开 300015）。
- 架构：
  1. 小程序检测到小红书链接 → `wx.navigateTo` 打开 `pages/xhs/xhs`（一个 `web-view`）。
  2. `web-view` 加载部署在 **Cloudflare Pages** 的 H5 解析页 `xhs-parser.html`（域名 `media-relay-pages.pages.dev`）。
  3. H5 用浏览器侧纯 JS 签名（`xhsSign.browser.js`） + 用户 `web_session`，**经同源中继 `/relay`** 调用小红书 `feed` 接口。
  4. 中继跑在 Cloudflare 边缘，出口是 **CF IP 而非数据中心 IP**——实测 CF 边缘对 XHS 未被 300015 封（无签名请求返回 405 而非 300015），这是本方案可行性的关键证据。
  5. H5 拿到媒体直链后，通过 `wx.miniProgram.postMessage` 回传小程序结果页展示/下载。

> **关键技巧**：H5 与中继**同源（都在 `media-relay-pages.pages.dev`）**，所以没有跨域 Cookie 墙；`web_session` 通过中继的 `x-upstream-cookie` 请求头转成真实 `Cookie` 发出去。

---

## 1. 已完成、无需重写的文件清单（已校验）

全部位于 `/Users/kililng/WorkBuddy/2026-08-07-18-01-51/media-collector/relay/pages-relay/`：

| 文件 | 作用 | 状态 |
|---|---|---|
| `functions/fetch.js` | Cloudflare Pages Functions 中继。已新增转发 `x-s/x-s-common/x-t` 签名头 + 透传 POST body，并回传 `access-control-allow-origin: *` 与 `x-final-url` | ✅ 已改好 |
| `dist/xhs-parser.html` | H5 解析页（含链接解析、签名、登录凭据输入、`video` 预览、微信回传桥） | ✅ 已建好 |
| `dist/xhsSign.browser.js` | 浏览器侧小红书 x-s 签名实现（纯 JS，内嵌 MD5，双导出 `module.exports` + `window.xhsSignBrowser`） | ✅ 已建好 |
| `dist/index.html` | 占位页（无关） | 不动 |
| `wrangler.toml` | Pages 项目配置（name=media-relay-pages, pages_build_output_dir=dist, RELAY_TOKEN 变量） | ✅ 就绪 |
| `verify_xhs_relay.js` | **部署后用来验证 300015 是否放行的脚本**（见步骤 2） | ✅ 已建好 |

小程序侧（位于 `media-collector/miniprogram/`，由用户用微信开发者工具上传，你无需改）：
- `pages/xhs/xhs.{js,wxml,json}` — web-view 中转页，收 H5 回传并跳结果页 ✅
- `app.json` — 已注册 `pages/xhs/xhs` ✅
- `pages/index/index.js` — 小红书链接已改走 `navigateTo` 到 xhs 页（第 178–183 行） ✅

---

## 2. codex 需要执行的步骤

### 前置 A：需要用户提供的凭证（你没法替用户弄，向用户索取）
1. **Cloudflare 账号 + `wrangler login`**：需用户在自己机器执行 `npx wrangler login`（会打开浏览器授权）。之后你才能 `wrangler pages deploy`。
2. **微信小程序 AppID + 小程序管理后台权限**：加「业务域名」需在 mp.weixin.qq.com 后台操作，且需用户登录。
3. **用户的小红书 `web_session`**（仅用于步骤 2 验证；运行期由用户自己在 H5 里填，不进服务器）：用户在电脑浏览器登录 xiaohongshu.com → 开发者工具 → Application → Cookies → 复制 `web_session` 的值。

> 如果用户的 `web_session` 已过期（报错 -101/-100），让他重新从浏览器抓一个最新的。

### 步骤 1：部署 Cloudflare Pages（relay + H5）
在 `/Users/kililng/WorkBuddy/2026-08-07-18-01-51/media-collector/relay/pages-relay/` 目录执行：
```bash
# 用户先完成 wrangler login（在其机器上）
npx wrangler login

# 部署 dist/ 为 Pages 站点（项目名与 wrangler.toml 一致）
npx wrangler pages deploy dist --project-name media-relay-pages
```
- 部署成功后，H5 解析页地址为 `https://media-relay-pages.pages.dev/xhs-parser.html`。
- 注意：若环境装的是 wrangler v4，旧式 `pages_build_output_dir` 在 `wrangler.toml` 仍被支持；若报错，改用命令显式指定目录即可（上面已指定）。
- `RELAY_TOKEN` 已在 `wrangler.toml` 的 `[vars]` 配置，也会作为 CF 环境变量注入；`fetch.js` 里有兜底默认值，可正常鉴权。

### 步骤 2：验证 300015 是否放行（**最关键，决定方案生死**）
部署后，在 `pages-relay/` 目录运行验证脚本（请求经 CF 中继出口，能真实判定 300015）：
```bash
cd /Users/kililng/WorkBuddy/2026-08-07-18-01-51/media-collector/relay/pages-relay
node verify_xhs_relay.js <用户给的web_session> <一条真实的小红书noteId>
```
- 例：`node verify_xhs_relay.js 040069bb01844f1d50577c264d384b55f517cd 6a6c55c80000000005030987`
- `noteId` 从真实笔记链接 `.../explore/item/<noteId>?xsec_token=...` 取；`xsec_token` 缺失会导致失败，尽量用带 token 的真实链接里的 noteId。
- **判读**：
  - 响应含 `"code":0` → ✅ 完全可用，免费集成打通。
  - 响应含 `300015` → ❌ CF 出口仍被风控，免费方案不可行（见第 4 节回退）。
  - 响应含 `-100`/`-101`/笔记不存在 等非 300015 错误 → ⚠️ IP 已通过（不是风控），只是 `web_session` 过期或 noteId 无效，换有效 session/noteId 即可，集成可行。
- 把验证结果（含响应前 600 字符）记录并回报用户。

### 步骤 3：微信小程序「业务域名」校验（需用户配合后台）
`web-view` 只能加载在微信后台「业务域名」白名单里的域名。
1. 用户登录 mp.weixin.qq.com → 开发 → 开发设置 → 业务域名 → 点击「下载校验文件」（得到一个 `XXXXXX.txt`）。
2. 用户把该 txt 文件名+内容发给 codex，codex 放进 `dist/` 根目录，重部署：
   ```bash
   # 把用户给的校验文件放到 dist 根
   cp /path/to/用户给的校验文件.txt dist/
   npx wrangler pages deploy dist --project-name media-relay-pages
   ```
3. 用户回到微信后台，点「保存」完成校验（后台会请求 `https://media-relay-pages.pages.dev/校验文件.txt` 验证存在）。

### 步骤 4：真机联调（主要由用户做，你提供指导）
- 用户用微信开发者工具打开 `media-collector/miniprogram`，上传/预览，手机扫码打开小程序。
- 小程序首页粘贴小红书笔记链接 → 自动跳 `pages/xhs/xhs` → web-view 打开 H5 → H5 首次填一次 `web_session`（存本机）→ 点「解析素材」→ 出现媒体预览 → 点「传回小程序」→ 回到结果页。

---

## 3. 决策分支（务必在步骤 2 后明确）
- **300015 被放行（code 0 / -100 / -101）→ 免费方案打通**：告知用户成功，后续只需用户偶尔更新 `web_session`。
- **仍 300015 → 免费方案不可行**：不要死磕。回退到「桌面油猴脚本提取直链 → 复制链接进小程序下载」的混合方式（油猴脚本 `xhs_tampermonkey.js` v1.5.0 已验证可用，在 `/Users/kililng/WorkBuddy/2026-08-07-18-01-51/xhs_tampermonkey.js`）。向用户说明：服务端/小程序内免费集成受限于小红书 IP 风控，无解；只能在用户自己浏览器侧（油猴）解析。

---

## 4. 已知限制（交付时告知用户）
- `web_session` 会过期，H5 需用户重新粘贴（存本机 localStorage，不上传）。
- 部分视频可能拿到的仍带水印版本（取决于小红书返回）；此问题在油猴侧同样存在，属平台限制。
- 微信业务域名校验文件需用户从后台下载（codex 无法登录用户后台），其余可 codex 代劳。
- 验证脚本从本地运行，但请求**经 CF 中继出口**发出，因此能真实反映 CF IP 是否被风控——这是有效测试，不是本地 IP 测试。

---

## 5. 关键常量（如需修改）
- 中继地址：`https://media-relay-pages.pages.dev`
- RELAY_TOKEN（中继鉴权）：`af58eb889fced9a76267dc01acf277a6daa369b63fd77d34`
- XHS 接口：`https://edith.xiaohongshu.com/api/sns/web/v1/feed`
- 小程序中转页 base：`https://media-relay-pages.pages.dev/xhs-parser.html`

---

## 6. 一句话给 codex
代码全齐，你只做三件：① `wrangler login` + `wrangler pages deploy dist`（用户先登录 CF）；② 部署后跑 `node verify_xhs_relay.js <session> <noteId>` 确认 300015 是否放行；③ 协助用户把微信业务域名校验文件放到 `dist/` 并重部署。若 300015 仍出现，方案判死刑，回退油猴。
