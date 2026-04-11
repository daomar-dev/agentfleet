<p align="center">
  <img src="assets/icon.svg" alt="AgentFleet 图标" width="160" />
</p>

[English](README.md) | [简体中文](README.zh-CN.md)

# AgentFleet

> 分布式智能体编排，无需控制平面。

AgentFleet 是一个基于 OneDrive 同步构建的去中心化、多机器编码智能体编排工具。任何已注册的机器都可以分发工作，每台机器都可以执行任务。没有中央调度器、代理或控制平面需要维护。

## 概述

AgentFleet 让您可以将编码任务同时分发到所有机器上。从任意机器提交任务，所有运行 AgentFleet 的机器都会看到同一个任务，使用本地安装的编码智能体独立执行，并将机器级别的结果写回。

**工作原理：**
1. 您的机器共享一个同步的 OneDrive 工作区。
2. AgentFleet 在 `~/.agentfleet/` 下提供稳定的本地路径。
3. 任何机器都可以在共享的 `tasks/` 目录中创建任务。
4. 每台运行 `agentfleet run` 的机器都会独立处理该任务。
5. 结果保存在共享的 `output/` 目录中，使用主机名前缀的文件以避免冲突。

无需服务器、数据库或控制平面——仅通过同步实现分布式协调。

## 前提条件

- **Windows** 及 PowerShell，或 **macOS**
- **Node.js** >= 18
- **OneDrive** 已安装并同步，使用个人账户、商业账户或两者兼有
- 编码智能体 CLI（例如 GitHub Copilot CLI 或 Claude Code）

## 安装

```bash
npx -y @daomar/agentfleet run
```

首次运行时，AgentFleet 会自动在 npm 全局目录中创建 `agentfleet` 和 `dma` 快捷命令，因此您可以直接使用任一命令，无需重启终端即可生效。如果您已通过 `npm install -g @daomar/agentfleet` 全局安装，将跳过快捷方式创建。

或全局安装：

```bash
npm install -g @daomar/agentfleet
agentfleet run
```

## 使用方法

### 运行

在当前机器上启动 AgentFleet。首次使用时，它会自动检测 OneDrive 并创建必要的符号链接和配置。后续运行时，它会加载现有配置并启动任务监视器。只有在 AgentFleet 启动**之后**到达的任务才会被处理——已有的任务永远不会被重放，即使在重启或新机器上也是如此。

```bash
agentfleet run
```

选项：
- `--poll-interval <seconds>` — 轮询间隔（默认：`10`）
- `--concurrency <number>` — 最大并发智能体进程数（默认：`1`）
- `--daemon` 或 `-d` — 作为后台守护进程运行（与终端分离）
- `--log-file <path>` — 作为守护进程运行时的日志文件路径（默认：`~/.agentfleet/agentfleet.log`）

#### 守护进程模式

在后台运行 AgentFleet，使其在关闭终端后继续运行：

```bash
agentfleet run --daemon
```

这将生成一个分离的进程，将其 PID 写入 `~/.agentfleet/agentfleet.pid`，并将所有输出重定向到 `~/.agentfleet/agentfleet.log`。同一时间只允许一个守护进程实例。

使用自定义日志文件：

```bash
agentfleet run --daemon --log-file /tmp/agentfleet.log
```

> **注意：** 同一时间只允许一个 AgentFleet 实例运行，无论是前台模式、守护进程模式还是自动启动模式。

#### 登录时自动启动

对于需要 AgentFleet 常驻运行的机器，设置登录时自动启动：

```bash
npx -y @daomar/agentfleet install
```

这会安装与当前平台对应的登录自启动项，并使用最新发布版本运行 `npx -y @daomar/agentfleet run -d`。安装后守护进程会立即启动。在受支持的平台上无需管理员权限。

- **Windows：** 安装名为 `AgentFleet` 的计划任务，在登录时启动，并会在系统从睡眠或休眠唤醒后再次触发。
- **macOS：** 安装名为 `dev.daomar.agentfleet` 的 LaunchAgent，在登录时启动，并在安装后立即拉起守护进程。

**卸载自动启动：**

```bash
npx -y @daomar/agentfleet uninstall
```

这将停止正在运行的实例并删除当前平台上的自启动项。

### 停止

停止正在运行的 AgentFleet 实例：

```bash
agentfleet stop
```

这会向运行中的进程发送 SIGTERM 信号并清理 PID 文件。适用于所有运行模式（前台、守护进程、自动启动）。如果配置了自动启动，AgentFleet 将在下次登录时重新启动；在 Windows 的计划任务模式下，还会在从睡眠或休眠唤醒后重新触发。

AgentFleet 会检查 OneDrive 商业版和个人版账户。

- 如果恰好有一个支持的账户可用，AgentFleet 会自动使用它。
- 如果个人版和商业版 OneDrive 同时可用，AgentFleet 会选择第一个检测到的。
- 在 macOS 上，会优先检查 `~/Library/CloudStorage/OneDrive*`，然后回退到旧版 `~/OneDrive*` 路径。

这将创建 `~/.agentfleet/` 并将其 `tasks/` 和 `output/` 目录指向您选定的 OneDrive 工作区中的 `AgentFleet/`。

### 提交任务

创建一个所有已注册机器都将执行的任务：

```bash
agentfleet submit --prompt "Add error handling to all API endpoints" --title "Error handling" --working-dir "C:\work\myproject"
```

选项：
- `--prompt <text>` — 给编码智能体的指令（必填）
- `--title <text>` — 简短的任务标题
- `--working-dir <path>` — 智能体的工作目录（默认：当前目录）
- `--agent <command>` — 覆盖默认的智能体命令模板

### 查看状态

显示版本信息、运行中的 AgentFleet 进程信息（PID、模式、日志文件），并列出所有任务及其各机器的结果：

```bash
agentfleet status
```

状态输出显示：
- **版本**：当前版本和 npm 上的最新版本（如果过时会提示升级）
- **进程信息**：PID、运行模式（前台 / 守护进程 / 登录时自动启动）、日志文件位置
- **任务**：所有任务及每台机器的执行结果

查看特定任务的详细信息：

```bash
agentfleet status task-20260402120000-abc123
```

## 架构

```text
~/.agentfleet/
├── config.json          # 本机配置（不同步）
├── processed.json       # 已在本机执行的任务 ID
├── agentfleet.pid           # PID 文件（任何模式运行时存在）
├── agentfleet.log           # 日志文件（守护进程和自动启动模式）
├── tasks/ → OneDrive    # 指向选定的 <OneDrive>\AgentFleet\tasks 的符号链接
│   ├── task-001.json
│   └── task-002.json
└── output/ → OneDrive   # 指向选定的 <OneDrive>\AgentFleet\output 的符号链接
    ├── task-001/
    │   ├── DESKTOP-A-result.json
    │   ├── DESKTOP-A-stdout.log
    │   ├── LAPTOP-B-result.json
    │   └── LAPTOP-B-stdout.log
    └── task-002/
        └── ...
```

平台相关的自启动文件位于 `~/.agentfleet/` 之外：
- **Windows：** `~/.agentfleet/start-agentfleet.vbs`
- **macOS：** `~/Library/LaunchAgents/dev.daomar.agentfleet.plist`

## 安全与合规

AgentFleet 采用零基础设施安全模型设计：

- **无隧道** — 机器永远不会打开入站连接或隧道。外部没有任何可攻击的入口。
- **无暴露端口** — 没有监听服务、没有开放端口、没有攻击面。每台机器仅通过 OneDrive 现有的、已认证的通道同步文件。
- **无数据移动** — AgentFleet 不传输、复制或中转任何数据。任务文件和结果存储在用户自己的 OneDrive（商业版或个人版）中。数据永远不会离开 Microsoft 365 租户边界。
- **无中央服务器** — 没有 AgentFleet 后端、代理或控制平面。协调完全通过 OneDrive 同步完成，该同步已获得您组织 IT 策略的批准和管理。

这种架构意味着 AgentFleet 继承了您现有 OneDrive 和 Microsoft 365 环境的安全性、合规性和数据驻留保证——无需额外审计、安全加固或维护。

## 任务文件格式

```json
{
  "id": "task-20260402120000-abc123",
  "title": "Add error handling",
  "prompt": "Add try-catch blocks to all API route handlers...",
  "workingDirectory": "C:\\work\\myproject",
  "createdAt": "2026-04-02T12:00:00Z",
  "createdBy": "DESKTOP-A"
}
```

任务文件一旦写入即不可变。AgentFleet 只处理守护进程启动后到达的任务——旧任务永远不会被重放，确保安全重启和新机器接入。

## 开发

构建 CLI：

```bash
npm run build
```

运行自动化测试套件：

```bash
npm test
```

测试套件涵盖任务监视器启动行为、快捷方式注册、Windows 计划任务与 macOS LaunchAgent 的自启动行为、守护进程管理、run/install/stop/uninstall 命令、CLI 品牌标识、引导程序、OneDrive 检测、提供者选择、结果写入和旧工作区迁移。

## Web 仪表板

基于浏览器的仪表板可在 **[https://agentfleet.daomar.dev/](https://agentfleet.daomar.dev/)** 访问。

### 功能

- **提交任务** — 从任何浏览器同时向所有 AgentFleet 机器提交任务
- **监控节点** — 查看哪些机器处于活跃状态、最后活动时间和任务数量
- **浏览任务历史** — 分页显示所有已提交任务及其状态指标
- **查看任务结果** — 每台机器的结果，包括退出码、耗时和时间戳
- **移动端友好** — 渐进式 Web 应用（PWA），可安装在 iOS 和 Android 上

### 访问

在浏览器中打开 **[https://agentfleet.daomar.dev/](https://agentfleet.daomar.dev/)**，使用拥有 AgentFleet 所在 OneDrive 的 Microsoft 账户登录。

> **重要：** 请使用与您机器 OneDrive 同步**相同的 Microsoft 账户**登录。如果您的 OneDrive 关联的是 `user@example.com`，请使用该账户登录。

### 安全模型

- **认证：** Microsoft Entra ID 使用 PKCE 授权码流——浏览器中不存储任何密钥
- **令牌存储：** MSAL.js 在 `localStorage` 中管理令牌，以实现跨浏览器会话和 PWA 重新打开的持久登录
- **权限：** `Files.Read`、`Files.ReadWrite` 和 `User.Read`（委派权限——仅可访问已登录用户的文件）
- **输入清理：** 提交前会从任务提示中剥离 Shell 元字符；UI 中不暴露 `workingDirectory` 字段；高级用户可指定可选的智能体命令
- **内容安全策略：** 通过 HTTP 头强制执行；将脚本、样式和连接限制为仅受信来源
- **无后端：** 所有 API 调用直接从浏览器发送到 Microsoft Graph——不涉及 AgentFleet 服务器

### 移动端安装（PWA）

**iOS (Safari)：** 打开 [https://agentfleet.daomar.dev/](https://agentfleet.daomar.dev/) → 点击**分享**按钮 → **添加到主屏幕**

**Android (Chrome)：** 打开 [https://agentfleet.daomar.dev/](https://agentfleet.daomar.dev/) → 点击 **⋮** 菜单 → **添加到主屏幕**（或等待安装提示）

### Entra ID 应用注册

Web 仪表板使用预注册的 Microsoft Entra ID 应用：

| 属性 | 值 |
|---|---|
| 客户端 ID | `b94f9687-adcf-48ea-9861-c4ce4b5c01a0` |
| 租户 | `91dde955-43a9-40a9-a406-694cffb04f28`（多租户） |
| 登录受众 | Azure AD 和个人 Microsoft 账户 |
| 重定向 URI | `https://agentfleet.daomar.dev/`、`http://localhost:5173/` |
| 权限 | `Files.Read`、`Files.ReadWrite`、`User.Read`（委派权限） |

如需自托管仪表板，请注册您自己的 Entra ID 应用并使用您的 `clientId` 更新 `web/public/config.js`。请参阅 [Microsoft 文档](https://learn.microsoft.com/zh-cn/entra/identity-platform/quickstart-register-app)了解应用注册步骤。

### 本地开发

```bash
cd web
npm install
npm run dev        # 在 http://localhost:5173 启动开发服务器
npm run build      # 生产构建到 web/dist/
npm test           # 运行单元测试（Vitest）
```

## 支持

AgentFleet 是免费的开源项目。如果它对您的工作有帮助，欢迎支持本项目：

<table>
  <tr>
    <td align="center"><strong>PayPal</strong><br/>（国际用户）</td>
    <td align="center"><strong>微信支付</strong><br/>（国内用户）</td>
  </tr>
  <tr>
    <td align="center"><a href="https://paypal.me/chenxizhang2026"><img src="assets/paypal-donation.png" alt="PayPal 二维码" width="200" /></a></td>
    <td align="center"><img src="assets/wechat-donation.jpg" alt="微信支付二维码" width="200" /></td>
  </tr>
</table>

### 赞助者

<table>
  <tr>
    <td align="center" valign="top" width="128">
      <a href="https://github.com/hjunxu" title="@hjunxu">
        <img src="https://github.com/hjunxu.png?size=96" alt="@hjunxu" width="64" height="64" /><br />
        <sub><strong>hjunxu</strong></sub>
      </a>
    </td>
  </tr>
</table>

所有赞赏者将在此页面获得致谢。

## 许可证

ISC
