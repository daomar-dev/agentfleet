<p align="center">
  <img src="assets/icon.svg" alt="AgentFleet" width="160" />
</p>

<h3 align="center">分布式智能体编排，无需控制平面。</h3>

<p align="center">
  将编码任务分发到所有机器 — 无需服务器、无需配置、无需基础设施。
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@daomar/agentfleet"><img src="https://img.shields.io/npm/v/@daomar/agentfleet" alt="npm version" /></a>
  <a href="https://github.com/daomar-dev/agentfleet/actions"><img src="https://img.shields.io/github/actions/workflow/status/daomar-dev/agentfleet/release.yml" alt="build status" /></a>
  <a href="https://www.npmjs.com/package/@daomar/agentfleet"><img src="https://img.shields.io/npm/dm/@daomar/agentfleet" alt="npm downloads" /></a>
  <a href="https://github.com/daomar-dev/agentfleet/blob/main/LICENSE"><img src="https://img.shields.io/github/license/daomar-dev/agentfleet" alt="license" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">简体中文</a>
</p>

---

<p align="center">
  <em>演示 GIF 即将推出 — 先看 <a href="#快速开始">快速开始</a> 立即体验</em>
</p>

<!-- TODO: 录制完成后替换为实际 demo GIF（任务 4.2）
<p align="center">
  <img src="assets/demo.gif" alt="AgentFleet 演示" width="720" />
</p>
-->

---

## 为什么选择 AgentFleet？

大多数分布式任务系统需要服务器、消息代理或云基础设施。AgentFleet 不需要这些 — 它使用 **OneDrive 同步** 作为协调层。

<table>
  <tr>
    <th></th>
    <th>AgentFleet</th>
    <th>SSH 脚本</th>
    <th>Ansible</th>
    <th>云 CI</th>
  </tr>
  <tr>
    <td><strong>基础设施</strong></td>
    <td>无（OneDrive）</td>
    <td>每台机器需 SSH 服务器</td>
    <td>控制节点 + SSH</td>
    <td>云服务商账户</td>
  </tr>
  <tr>
    <td><strong>网络</strong></td>
    <td>无需入站连接</td>
    <td>开放 SSH 端口</td>
    <td>开放 SSH 端口</td>
    <td>互联网访问</td>
  </tr>
  <tr>
    <td><strong>安全性</strong></td>
    <td>继承 M365 策略</td>
    <td>密钥管理</td>
    <td>密钥管理</td>
    <td>云 IAM</td>
  </tr>
  <tr>
    <td><strong>配置时间</strong></td>
    <td>< 1 分钟</td>
    <td>数小时</td>
    <td>数小时</td>
    <td>数分钟到数小时</td>
  </tr>
  <tr>
    <td><strong>AI 智能体支持</strong></td>
    <td>内置（任意 CLI 智能体）</td>
    <td>手动脚本</td>
    <td>自定义 Playbook</td>
    <td>自定义流水线</td>
  </tr>
  <tr>
    <td><strong>防火墙内可用</strong></td>
    <td>是</td>
    <td>否</td>
    <td>否</td>
    <td>视情况而定</td>
  </tr>
</table>

## 核心价值

**零服务器** — 无调度器、无消息代理、无数据库。OneDrive 是唯一的活动部件。

**零配置** — 运行一条命令即可启动。AgentFleet 自动检测 OneDrive 并完成所有设置。

**企业级安全** — 无隧道、无开放端口、数据不离开 Microsoft 365 租户。您的 IT 策略已涵盖一切。

## 快速开始

```bash
# 1. 在每台机器上启动 AgentFleet（自动检测 OneDrive）
npx -y @daomar/agentfleet run

# 2. 从任意机器提交任务
agentfleet submit --prompt "Add error handling to all API endpoints" --title "Error handling"

# 3. 结果会出现在每台机器上 — 查看结果
agentfleet status
```

就是这样。每台运行 `agentfleet run` 的机器都会获取任务，使用本地安装的编码智能体执行，并写回结果。

## 工作原理

```text
  机器 A                       机器 B                       机器 C
  ┌──────────┐                ┌──────────┐                ┌──────────┐
  │agentfleet│                │agentfleet│                │agentfleet│
  │   run    │                │   run    │                │   run    │
  └────┬─────┘                └────┬─────┘                └────┬─────┘
       │                           │                           │
       └───────────┐    ┌──────────┘    ┌──────────────────────┘
                   ▼    ▼              ▼
              ┌─────────────────────────────┐
              │     OneDrive 同步层          │
              │  ┌───────┐   ┌──────────┐  │
              │  │tasks/ │   │ output/  │  │
              │  └───────┘   └──────────┘  │
              └─────────────────────────────┘
```

1. 您的机器共享一个同步的 OneDrive 工作区。
2. AgentFleet 在 `~/.agentfleet/` 下提供稳定的本地路径。
3. 任何机器都可以在共享的 `tasks/` 目录中创建任务。
4. 每台运行 `agentfleet run` 的机器都会独立处理该任务。
5. 结果保存在 `output/` 中，使用主机名前缀的文件 — 不会冲突。

## 使用场景

### 多机器代码审查

在所有开发机器上同时运行相同的编码智能体提示。每台机器使用自己的智能体（Claude Code、GitHub Copilot CLI、Cursor 等）并写入独立结果，方便您对比输出。

```bash
agentfleet submit \
  --prompt "Review this codebase for security vulnerabilities and suggest fixes" \
  --title "Security audit" \
  --working-dir /path/to/project
```

### 分布式重构

将大型重构任务分发到多台机器，每台机器在自己本地的项目副本上工作。适用于拥有多个工作站或想并行尝试不同智能体配置的场景。

```bash
agentfleet submit \
  --prompt "Migrate all class components to functional components with hooks" \
  --title "React migration" \
  --working-dir /path/to/project
```

## Web 仪表板

基于浏览器的仪表板 **[agentfleet.daomar.dev](https://agentfleet.daomar.dev/)** 让您可以从任何设备提交任务、监控节点、查看结果 — 包括移动端（可安装为 PWA）。

## 安全与合规

- **无隧道** — 机器永远不会打开入站连接。无可攻击的入口。
- **无暴露端口** — 没有监听服务、没有攻击面。
- **无数据移动** — 数据存储在您自己的 OneDrive 中。永远不会离开 M365 租户边界。
- **无中央服务器** — 通过 OneDrive 同步协调，已获得 IT 审批。
- **Web 仪表板** — 使用 PKCE 的 Microsoft Entra ID 认证，仅委派权限。

## 详细文档

<details>
<summary><strong>安装选项</strong></summary>

### npx（推荐）

```bash
npx -y @daomar/agentfleet run
```

首次运行时，AgentFleet 会在 npm 全局目录中创建 `agentfleet` 快捷命令。

### 全局安装

```bash
npm install -g @daomar/agentfleet
agentfleet run
```

</details>

<details>
<summary><strong>CLI 参考</strong></summary>

### 运行

在当前机器上启动 AgentFleet：

```bash
agentfleet run
```

选项：
- `--poll-interval <seconds>` — 轮询间隔（默认：`10`）
- `--concurrency <number>` — 最大并发智能体进程数（默认：`1`）
- `--daemon` 或 `-d` — 作为后台守护进程运行
- `--log-file <path>` — 守护进程模式的日志文件路径（默认：`~/.agentfleet/agentfleet.log`）

### 守护进程模式

```bash
agentfleet run --daemon
```

生成分离的进程，将 PID 写入 `~/.agentfleet/agentfleet.pid`。同一时间只允许一个实例。

### 登录时自动启动

```bash
npx -y @daomar/agentfleet install    # 安装自启动
npx -y @daomar/agentfleet uninstall  # 卸载自启动
```

- **Windows：** 名为 `AgentFleet` 的计划任务，登录和唤醒时触发
- **macOS：** 名为 `dev.daomar.agentfleet` 的 LaunchAgent

### 提交任务

```bash
agentfleet submit --prompt "..." --title "..." --working-dir /path
```

选项：
- `--prompt <text>` — 给编码智能体的指令（必填）
- `--title <text>` — 简短的任务标题
- `--working-dir <path>` — 工作目录（默认：当前目录）
- `--agent <command>` — 覆盖智能体命令模板

### 查看状态

```bash
agentfleet status                        # 所有任务概览
agentfleet status task-20260402-abc123   # 单个任务详情
```

### 停止

```bash
agentfleet stop
```

</details>

<details>
<summary><strong>架构详情</strong></summary>

```text
~/.agentfleet/
├── config.json          # 本机配置（不同步）
├── processed.json       # 已在本机执行的任务 ID
├── agentfleet.pid       # PID 文件（运行时存在）
├── agentfleet.log       # 日志文件（守护进程和自动启动模式）
├── tasks/ → OneDrive    # 指向 <OneDrive>\AgentFleet\tasks 的符号链接
│   ├── task-001.json
│   └── task-002.json
└── output/ → OneDrive   # 指向 <OneDrive>\AgentFleet\output 的符号链接
    ├── task-001/
    │   ├── DESKTOP-A-result.json
    │   ├── DESKTOP-A-stdout.log
    │   └── LAPTOP-B-result.json
    └── task-002/
        └── ...
```

平台相关的自启动文件：
- **Windows：** `~/.agentfleet/start-agentfleet.vbs`
- **macOS：** `~/Library/LaunchAgents/dev.daomar.agentfleet.plist`

### 任务文件格式

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

任务文件一旦写入即不可变。只处理守护进程启动后到达的任务。

### 前提条件

- **Windows** 及 PowerShell，或 **macOS**
- **Node.js** >= 18
- **OneDrive** 已安装并同步
- 编码智能体 CLI（如 Claude Code、GitHub Copilot CLI、Cursor）

### OneDrive 检测

AgentFleet 会检查 OneDrive 商业版和个人版账户：
- 如果恰好有一个账户可用，自动使用。
- 如果两者都可用，使用第一个检测到的。
- 在 macOS 上，优先检查 `~/Library/CloudStorage/OneDrive*`，然后是 `~/OneDrive*`。

</details>

<details>
<summary><strong>Web 仪表板详情</strong></summary>

### 功能

- **提交任务** — 从任何浏览器向所有机器提交任务
- **监控节点** — 活跃机器、最后活动时间、任务数量
- **浏览任务历史** — 分页显示，带状态指标
- **查看结果** — 每台机器的退出码、耗时、时间戳
- **PWA** — 可安装在 iOS 和 Android 上

### 访问

在 [agentfleet.daomar.dev](https://agentfleet.daomar.dev/) 使用拥有 OneDrive 的 Microsoft 账户登录。

### 安全

- **认证：** Microsoft Entra ID 使用 PKCE — 浏览器中不存储密钥
- **令牌：** MSAL.js 在 `localStorage` 中管理令牌
- **权限：** `Files.Read`、`Files.ReadWrite`、`User.Read`（委派权限）
- **输入清理：** 从提示中剥离 Shell 元字符
- **CSP：** 通过 HTTP 头强制执行
- **无后端：** 浏览器直接调用 Microsoft Graph

### Entra ID 应用注册

| 属性 | 值 |
|---|---|
| 客户端 ID | `b94f9687-adcf-48ea-9861-c4ce4b5c01a0` |
| 租户 | `91dde955-43a9-40a9-a406-694cffb04f28`（多租户） |
| 登录受众 | Azure AD 和个人 Microsoft 账户 |
| 重定向 URI | `https://agentfleet.daomar.dev/`、`http://localhost:5173/` |
| 权限 | `Files.Read`、`Files.ReadWrite`、`User.Read`（委派权限） |

### 移动端安装（PWA）

**iOS：** Safari → 分享 → 添加到主屏幕  
**Android：** Chrome → ⋮ → 添加到主屏幕

### 本地开发

```bash
cd web
npm install
npm run dev        # 在 http://localhost:5173 启动开发服务器
npm run build      # 生产构建到 web/dist/
npm test           # 运行单元测试（Vitest）
```

</details>

<details>
<summary><strong>开发</strong></summary>

```bash
npm run build      # 构建 CLI
npm test           # 运行 CLI 测试
cd web && npm test # 运行 Web 测试
```

详见 [CONTRIBUTING.md](CONTRIBUTING.md) 了解完整的开发环境设置。

</details>

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=daomar-dev/agentfleet&type=Date)](https://star-history.com/#daomar-dev/agentfleet&Date)

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

## 链接

- [GitHub](https://github.com/daomar-dev/agentfleet) — 源代码、Issues、讨论
- [npm](https://www.npmjs.com/package/@daomar/agentfleet) — 通过 npm 安装
- [Web 仪表板](https://agentfleet.daomar.dev/) — 从任何浏览器提交任务
- [关于](https://agentfleet.daomar.dev/about.html) — 架构深入解析
- [贡献指南](CONTRIBUTING.md) — 开发环境设置与规范
- [更新日志](CHANGELOG.md) — 版本历史

## 许可证

ISC
