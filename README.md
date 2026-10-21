<p align="center">
  <img src="icons/icon128.png" width="96" alt="Viewport Mount 图标" />
</p>

<h1 align="center">Viewport Mount</h1>

<p align="center"><strong>响应式视口观察器</strong> —— 把任意网页放进真实设备视口，并排对比每个断点下的布局。</p>

<p align="center">
  <img alt="Manifest V3" src="https://img.shields.io/badge/Manifest-V3-4c8dff" />
  <img alt="Chrome 100+" src="https://img.shields.io/badge/Chrome-100%2B-4c8dff" />
  <img alt="No build step" src="https://img.shields.io/badge/build-none-6fd08c" />
</p>

Viewport Mount 是一个纯原生 JavaScript 的 Chrome 扩展（Manifest V3，无需构建）。它把目标页面以精确的设备 CSS 宽高渲染进多个 iframe，并排展示；也可以调用 Chrome DevTools 协议，把**当前标签页**直接模拟成指定设备视口。

---

## 功能特性

- **并排多视口**：任意组合设备，每个 iframe 以设备的精确宽高渲染，再等比缩放适配窗口，媒体查询断点判断与真实设备一致。
- **内置设备与断点**：iPhone / Pixel / Galaxy、iPad / Surface、MacBook、1080p / 2K / 带鱼屏 / 4K，以及 Tailwind（`sm`–`2xl`）和 Bootstrap（`sm`–`xxl`）断点。
- **自定义尺寸**：popup 和预览页均可添加 120×120 – 9999×9999 的自定义视口；自定义设备持久化保存、可随时删除。
- **缩放策略**：适应高度、适应宽度、25% / 50% / 75% / 100% / 150%。
- **同步滚动**：多个视口按滚动比例联动，方便逐段对比同一内容。
- **单视口操作**：直接修改宽高、旋转 90°、刷新、移除、在真实独立窗口中打开。
- **模拟当前标签页**：选中一个设备，即可通过 `Emulation.setDeviceMetricsOverride` 设置视口尺寸、DPR、移动端标志与触摸模拟；支持一键还原。
- **自动放行 iframe 嵌入**：预览标签页会移除被嵌入页面的 `X-Frame-Options` 与 CSP 响应头（仅对该预览标签页的 `sub_frame` 生效，关闭页面后清理）。
- **本地优先**：设备选择、自定义设备、预览会话只写入 `chrome.storage.local`，不向任何服务器发送数据。

## 安装

### 从 Release 安装（推荐）

1. 打开 [Releases](https://github.com/xolarvill/viewport-mount/releases)，下载最新的 `viewport-mount-vX.Y.Z.zip`。
2. 解压到任意**固定目录**（例如 `D:\Tools\viewport-mount`）。解压后的目录中应能直接看到 `manifest.json`。
3. 地址栏打开 `chrome://extensions`，打开右上角的「开发者模式」。
4. 点击「加载已解压的扩展程序」，选择上一步解压出的目录。
5. 将 Viewport Mount 固定到工具栏。

需要 **Chrome 100 或更高版本**。Edge、Brave 等 Chromium 浏览器同理。由于扩展未上架 Chrome Web Store，Chrome 会以开发者模式加载并显示相应提示，属正常现象。

> 首次使用「模拟到当前页」时，Chrome 顶部会出现“Viewport Mount started debugging this browser”的提示条，这是扩展使用 `debugger` 权限的正常行为。

### 从源码安装

```bash
git clone https://github.com/xolarvill/viewport-mount.git
```

然后在 `chrome://extensions` 中以「加载已解压的扩展程序」选择仓库根目录即可；修改代码后点击扩展卡片上的刷新按钮生效，无需构建。

## 使用

### 并排预览

1. 点击工具栏中的 Viewport Mount 图标。popup 会自动填入当前标签页的地址（`chrome://` 等浏览器内部页面除外）。
2. 在地址栏输入网址，支持省略协议：`localhost` 和 IP 地址自动补 `http://`，其余补 `https://`。也可以点击 `↺` 重新拾取当前标签页地址。
3. 点选要对比的设备。若一个都不选，预览页会使用默认组合 **iPhone 15**、**iPad Air**、**Tailwind lg 1024**。
4. 点击「并排预览」。预览页支持：
   - 顶部地址栏随时把新网址加载到全部视口；`↻` 刷新全部视口。
   - 「缩放」：适应高度 / 适应宽度 / 25%–150%。
   - 「同步滚动」：勾选后各视口按滚动比例联动。
   - 「＋ 添加设备」：增删预设设备或添加自定义尺寸。
   - 每个视口头部：修改宽高、`⟳` 旋转 90°、`↻` 刷新、`⧉` 在真实窗口打开、`✕` 移除。
   - 「真实窗口打开」：为当前每个视口各创建一个独立浏览器窗口。
5. 网址、设备、缩放和同步滚动状态会自动保存，下次打开预览页时恢复。

### 模拟到当前标签页

1. 在 popup 中**只选择一个设备**，此时「模拟到当前页」按钮可用。
2. 点击后，扩展通过 Chrome DevTools 协议对当前标签页应用视口尺寸、DPR、移动端标志、屏幕方向与触摸模拟。
3. 点击「还原」清除模拟并断开调试器。

注意：模拟期间不能对同一标签页打开 DevTools；若提示“另一个调试器正在运行”，先关闭该标签页的 DevTools 再试。DevTools 协议不会修改 User-Agent，依赖 UA 判断的服务端逻辑不会变化。

### 自定义设备

- popup 底部输入宽高后点击「添加自定义」，自定义设备会出现在「自定义」分组中，点击 chip 上的 `✕` 可删除。
- 预览页点击「＋ 添加设备」，在弹层底部输入宽高；新视口直接加入舞台，可用视口头部的 `✕` 移除。
- 尺寸会被限制在 120–9999。

## 工作原理

- `preview.html` 为每个设备创建一个 `<iframe>`，iframe 的 CSS 宽高等于设备宽高；外层 `.scaler` 使用 `transform: scale()` 做纯视觉缩放。因此媒体查询在**精确的目标宽度**下求值，而不是在缩放后的宽度下。
- 预览标签页创建时，扩展通过 `declarativeNetRequest` 的 **session rule** 移除该标签页内 `sub_frame` 响应的 `X-Frame-Options`、`frame-options`、`Content-Security-Policy`、`Content-Security-Policy-Report-Only` 头，让原本禁止嵌入的站点也能被预览。规则 ID 为 `9000 + tabId % 1000000`，在标签页关闭、预览页卸载或检测到失效规则时清理。
- 同步滚动开启后，`content.js` 按需注入预览页的直接子 iframe，通过 `postMessage` 把各视口的滚动比例上报给预览页，再广播给其他视口。
- 「模拟到当前页」通过 `chrome.debugger` 发送 `Emulation.setDeviceMetricsOverride`、`Emulation.setTouchEmulationEnabled`；还原时发送 `Emulation.clearDeviceMetricsOverride` 并 `detach`。

## 权限说明

| 权限 | 用途 |
| --- | --- |
| `storage` | 保存设备选择、自定义设备、预览会话 |
| `scripting` | 开启同步滚动时注入 `content.js` |
| `webNavigation` | 枚举预览标签页中的 iframe，确定注入目标 |
| `debugger` | 对当前标签页模拟设备视口 |
| `declarativeNetRequestWithHostAccess` | 为预览标签页移除阻止 iframe 嵌入的响应头 |
| `host_permissions: <all_urls>` | 允许任意站点在预览 iframe 中加载，并支持脚本注入 |

所有逻辑均在本地运行，扩展不包含任何网络上报代码。

## 已知限制

- 通过 JavaScript 检测 `window.top`、主动 frame-busting 的站点，即使移除响应头也可能拒绝在 iframe 中渲染。
- `chrome://` 页面、Chrome Web Store、部分 OAuth / 登录页无法作为预览目标。
- 同步滚动依赖脚本注入，浏览器禁止注入的页面（如 Web Store）无法参与同步。
- 预览模式按 **CSS 像素宽度** 验证布局，不模拟 DPR、触摸或移动端 UA；需要这些能力时请使用「模拟到当前页」。
- 视口模拟基于调试协议，不能与 DevTools 同时使用；「还原」只作用于当前活动标签页。
- 扩展未上架 Chrome Web Store，只能以开发者模式加载。无痕模式需在扩展详情中手动允许。

## 项目结构

```
viewport-mount/
├── manifest.json        # MV3 清单（权限、图标、popup）
├── popup.html           # 工具栏弹窗：URL、设备选择、动作按钮
├── popup.css
├── popup.js
├── preview.html         # 并排预览页
├── preview.css
├── preview.js           # 视口渲染、缩放、DNR 放行、调试协议模拟
├── presets.js           # 设备 / 断点预设，popup 与预览页共用
├── content.js           # 同步滚动桥（按需注入 iframe）
└── icons/               # 16 / 32 / 48 / 128 图标
```

## 开发

项目没有构建步骤和第三方依赖，直接编辑文件、在 `chrome://extensions` 中刷新即可。

- 新增设备或断点：编辑 `presets.js` 的 `VM_PRESETS`；`VM_DEFAULT_IDS` 决定预览页的默认设备。
- 打包发布文件（Windows PowerShell）：

```powershell
Compress-Archive -Path manifest.json,popup.html,popup.css,popup.js,preview.html,preview.css,preview.js,presets.js,content.js,icons -DestinationPath dist/viewport-mount-v1.0.0.zip
```

ZIP 根目录即扩展根目录，解压后可直接「加载已解压的扩展程序」。

## 版本

- **1.0.0** —— 首个公开版本：并排多视口预览、设备与断点预设、自定义尺寸、缩放、同步滚动、真实窗口打开、当前标签页视口模拟与还原。
