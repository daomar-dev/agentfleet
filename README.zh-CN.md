<p align="center">
  <img src="assets/icon.svg" alt="AgentFleet" width="150" />
</p>

<h1 align="center">AgentFleet</h1>

<p align="center">
  <strong>在你的所有设备上编排 AI 编码智能体。</strong>
</p>

<p align="center">
  提交一次提示词，让每台设备使用自己的本地 agent 独立执行，然后横向比较结果 — 不需要服务器、不需要 SSH 组网、不需要控制平面。
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@daomar/agentfleet"><img src="https://img.shields.io/npm/v/@daomar/agentfleet" alt="npm version" /></a>
  <a href="https://github.com/daomar-dev/agentfleet/actions"><img src="https://img.shields.io/github/actions/workflow/status/daomar-dev/agentfleet/release.yml" alt="build status" /></a>
  <a href="https://www.npmjs.com/package/@daomar/agentfleet"><img src="https://img.shields.io/npm/dm/@daomar/agentfleet" alt="npm downloads" /></a>
  <a href="https://github.com/daomar-dev/agentfleet/blob/main/LICENSE"><img src="https://img.shields.io/github/license/daomar-dev/agentfleet" alt="license" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">简体中文</a> ·
  <a href="https://agentfleet.daomar.dev/web/">在线仪表板</a> ·
  <a href="https://agentfleet.daomar.dev/donate.html">支持项目</a>
</p>

---

## 为 Agent 开发者而生

AgentFleet 专为使用 AI 编码智能体的开发者设计 — Claude Code、GitHub Copilot CLI、Cursor、Aider，或任何接受提示词并生成代码的命令行工具。如果你有不止一台机器，AgentFleet 可以让它们并行处理同一个任务，并返回独立的结果。

你可以用它来：

- **横向比较不同智能体** — 在一台机器上用 Claude Code、另一台上用 Copilot CLI 执行同一个提示词，然后比较输出质量。
- **并行探索复杂问题** — 让多台机器同时检查不同 clone、分支、配置或方案。
- **基准测试提示词** — 在不同模型、工具、硬件和仓库状态下评估同一个提示词。
- **让数据留在本地** — 任务和结果只通过你的 OneDrive 同步；AgentFleet 不运行托管后端。
- **适合防火墙内环境** — 不需要入站端口、隧道、SSH 堡垒机、队列或控制平面凭据。

## 快速开始

**一条命令启动。** 在每台要加入集群的机器上运行：

```bash
npx -y @daomar/agentfleet run
```

就这样。AgentFleet 会自动：
1. 检测你的 OneDrive 并初始化工作区（仅首次运行）。
2. 注册 `agentfleet` 快捷命令，之后可以直接使用。
3. 开始监听任务。

然后从任意一台机器提交任务：

```bash
agentfleet submit \
  --title "安全审查" \
  --working-dir /path/to/project \
  --prompt "审查这个仓库的认证、注入和密钥处理风险。请返回具体发现和修复建议。"
```

每台正在运行的机器都会接收同一个任务，使用本机配置的编码智能体执行，并把带主机名前缀的结果写回 OneDrive。

查看进度：

```bash
agentfleet status
```

更喜欢浏览器？打开 **[agentfleet.daomar.dev/web/](https://agentfleet.daomar.dev/web/)**，用拥有该 OneDrive 的 Microsoft 账户登录，即可提交任务、监控节点、查看结果。

## 智能体兼容性

AgentFleet 可以与任何接受提示词的命令行工具配合使用。默认智能体为 **Claude Code**：

| 智能体 | 命令模板 | 说明 |
|---|---|---|
| Claude Code | `claude -p {prompt}` | 默认，开箱即用 |
| GitHub Copilot CLI | `gh copilot suggest "{prompt}"` | 需要安装 `gh` CLI + Copilot 扩展 |
| Cursor | `cursor --prompt "{prompt}"` | 需要 Cursor CLI |
| Aider | `aider --message "{prompt}"` | 需要安装 aider |
| 自定义 | 任何包含 `{prompt}` 的命令 | 通过配置 `defaultAgentCommand` |

单次任务覆盖 agent：

```bash
agentfleet submit --prompt "修复登录 bug" --agent 'aider --message "{prompt}"'
```

或在 `~/.agentfleet/config.json` 中更改全局默认：

```json
{
  "defaultAgent": "claude-code",
  "defaultAgentCommand": "claude -p {prompt}"
}
```

## 具体使用案例

### 1. 多智能体代码审查

在多台机器上用不同本地 agent 命令执行同一个提示词。

```bash
agentfleet submit \
  --title "比较审查智能体" \
  --working-dir ~/src/product \
  --prompt "找出这个代码库中最重要的 10 个生产风险。按严重程度分组，并包含文件路径。"
```

你可以对比推理质量、误报率、补丁建议和覆盖范围。

### 2. 分布式重构预演

让多台机器指向不同 clone 或分支，然后独立尝试同一次迁移。

```bash
agentfleet submit \
  --title "React Hooks 迁移方案" \
  --working-dir ~/src/frontend \
  --prompt "规划并实施从 class component 到 function component + hooks 的安全迁移，保持变更易审查。"
```

### 3. 本地 agent prompt 基准测试

针对一个高价值提示词，在不同模型、工具或仓库状态的机器上重复运行。

```bash
agentfleet submit \
  --title "提示词基准测试" \
  --prompt "总结构建失败，识别根因，并提出最小修复方案。"
```

### 4. 防火墙内团队或实验室环境

使用已经能同步 OneDrive 的机器，不需要开放任何入站网络路径，也不需要额外审批、托管、打补丁或监控新的调度器。

## 工作原理

```text
机器 A                 机器 B                 机器 C
agentfleet run         agentfleet run         agentfleet submit
     │                      │                       │
     └──────────────┬───────┴──────────────┬────────┘
                    ▼                      ▼
             OneDrive / AgentFleet 共享工作区
                 tasks/  → 不可变任务 JSON
                 output/ → 每台机器独立结果文件
```

1. `agentfleet run` 检测 OneDrive 并初始化共享工作区（首次运行自动完成）。
2. `tasks/` 和 `output/` 由同步的 OneDrive 工作区承载。
3. `agentfleet submit` 写入不可变任务文件。
4. 每个 `agentfleet run` 进程发现新任务并使用本地编码智能体执行。
5. 结果文件带主机名前缀，多台机器不会互相覆盖。

## AgentFleet 与常见替代方案

| 能力 | AgentFleet | SSH 脚本 | Ansible | 云 CI |
|---|---:|---:|---:|---:|
| 中央服务器/控制平面 | 无 | 无，但要管理主机 | 控制节点 | 托管服务商 |
| 入站端口 | 无 | 通常需要 SSH | SSH | 不使用本地节点 |
| 支持任意本地 agent CLI | 是 | 手写胶水代码 | 自定义 Playbook | 自定义 Runner |
| 多机器结果对比 | 内置 | 手动 | 手动 | 依赖流水线 |
| OneDrive 用户的安装成本 | 一条命令 | 主机配置 | Inventory + SSH | 服务商配置 |
| 数据路径 | 你的 OneDrive | 你的网络 | 你的网络 | 云服务商 |

## CLI 参考

<details>
<summary><strong>运行</strong></summary>

```bash
# 启动任务监听（首次运行自动初始化）
npx -y @daomar/agentfleet run

# 首次运行后，快捷命令即可使用：
agentfleet run
```

选项：

- `--poll-interval <seconds>` — 轮询间隔，默认 `10`
- `--concurrency <number>` — 最大并发 agent 进程数，默认 `1`
- `--daemon` / `-d` — 后台守护进程模式
- `--log-file <path>` — 守护进程日志路径，默认 `~/.agentfleet/agentfleet.log`

</details>

<details>
<summary><strong>提交任务</strong></summary>

```bash
agentfleet submit --prompt "..." --title "..." --working-dir /path
```

选项：

- `--prompt <text>` — 给编码智能体的指令，必填
- `--title <text>` — 简短任务标题
- `--working-dir <path>` — 工作目录，默认当前目录
- `--agent <command>` — 覆盖智能体命令模板

</details>

<details>
<summary><strong>状态与停止</strong></summary>

```bash
agentfleet status              # 所有任务概览
agentfleet status <task-id>    # 查看指定任务详情
agentfleet stop                # 停止运行中的实例
```

</details>

<details>
<summary><strong>守护进程与自启动</strong></summary>

```bash
agentfleet run --daemon
agentfleet install    # 安装登录自启动
agentfleet uninstall  # 移除自启动
agentfleet stop
```

- **Windows：** 名为 `AgentFleet` 的计划任务，登录和唤醒时触发
- **macOS：** 名为 `dev.daomar.agentfleet` 的 LaunchAgent

</details>

<details>
<summary><strong>初始化（高级）</strong></summary>

通常 `run` 和 `submit` 会使用 OneDrive 自动初始化。如需手动控制：

```bash
agentfleet init                                    # 默认使用 OneDrive
agentfleet init --backend onedrive-business        # OneDrive 企业版
agentfleet init --backend local-folder --path /shared/fleet  # 本地文件夹
agentfleet init --force                            # 重新初始化
```

</details>

<details>
<summary><strong>工作区结构</strong></summary>

```text
~/.agentfleet/
├── config.json          # 本机配置，不同步
├── processed.json       # 本机已执行的任务 ID
├── agentfleet.pid       # 守护进程 PID 文件
├── agentfleet.log       # 守护进程/自启动日志
├── tasks/ → OneDrive    # 共享任务 JSON 文件
└── output/ → OneDrive   # 共享任务输出
    └── task-001/
        ├── DESKTOP-A-result.json
        ├── DESKTOP-A-stdout.log
        └── LAPTOP-B-result.json
```

前提条件：Node.js 18+、OneDrive 同步、Windows + PowerShell 或 macOS，以及至少一个编码智能体 CLI 或兼容的本地命令。

</details>

## Web 仪表板

托管在 **[agentfleet.daomar.dev/web/](https://agentfleet.daomar.dev/web/)** 的 GitHub Pages 应用是一个 PWA，可用于：

- 从桌面或移动端提交任务；
- 监控已注册节点和最近活动；
- 浏览任务历史和每台机器的结果；
- 通过 Microsoft Entra ID + PKCE 登录，并直接调用 Microsoft Graph。

页面支持英文和简体中文，并会根据浏览器语言自动切换。

## 安全模型

- **无入站连接：** 无隧道、无监听服务、无暴露 SSH 端口。
- **无 AgentFleet 后端：** 仪表板直接调用 Microsoft Graph。
- **无额外数据面：** 协调数据停留在用户自己的 OneDrive / Microsoft 365 环境中。
- **仓库无共享密钥：** 浏览器认证使用 Microsoft 委派权限。
- **本地执行明确可控：** 每台节点运行自己的本地 agent 命令。

## 支持项目

AgentFleet 是免费的开源项目。如果它节省了你的时间，或者启发了你的分布式智能体工作流：

1. ⭐ 给仓库点 Star，让更多开发者看到它。
2. 🍴 Fork 后适配你自己的 agent 技术栈。
3. 💬 通过 Issues/Discussions 分享真实的多机器场景。
4. ☕ 通过 **[PayPal / 微信支付](https://agentfleet.daomar.dev/donate.html)** 支持持续开发。

<table>
  <tr>
    <td align="center"><strong>PayPal</strong><br/>（国际用户）</td>
    <td align="center"><strong>微信支付</strong><br/>（国内用户）</td>
  </tr>
  <tr>
    <td align="center"><a href="https://paypal.me/chenxizhang2026"><img src="assets/paypal-donation.png" alt="PayPal 二维码" width="180" /></a></td>
    <td align="center"><img src="assets/wechat-donation.jpg" alt="微信支付二维码" width="180" /></td>
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

- [GitHub](https://github.com/daomar-dev/agentfleet) — 源码、Issues、讨论
- [npm](https://www.npmjs.com/package/@daomar/agentfleet) — npm 安装包
- [Web 仪表板](https://agentfleet.daomar.dev/web/) — 提交和监控任务
- [关于](https://agentfleet.daomar.dev/about.html) — 架构概览
- [贡献指南](CONTRIBUTING.md) — 开发环境
- [更新日志](CHANGELOG.md) — 版本记录

## 许可证

MIT
