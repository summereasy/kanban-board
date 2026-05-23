# Kanban Board 开发路线图

## 背景

参考 Skate + Mattermost Boards 的工作流，让 AI Coding Agent（Claude Code / pi）能自主从看板取任务、执行、记录、等待验收。

核心理念：**看板是人和 Agent 的共享白板**。人在 Web UI 规划，Agent 在终端执行。

---

## Agent 工作流

```
人: 在 Web UI 创建/整理任务，设置优先级
     │
     ▼
人: 打开 coding agent，说 "next task"
     │
     ▼
Agent: 调 kanban next → 拿到最高优先级的待办任务
     │
     ▼
Agent: 读任务 title + description + comments → 理解上下文
     │
     ▼
Agent: 改代码（跟平时一样）
     │
     ▼
Agent: kanban comment "改了 X、Y、Z，原因…"
Agent: kanban done → 卡片进入 Review
     │
     ▼
人: 在 Web UI 查看 Review 列
  - 满意 → 拖到 Done
  - 不满意 → 拖回 In Progress，留 comment "这里还有问题"
     │
     ▼
人: 下次 "next task"，Agent 读到 feedback comment，继续改
```

---

## 人（用户）的工作流

1. 打开 Web UI，一眼看到所有项目状态
2. 拖卡片调整状态、优先级
3. 在卡片上留 comment 给 Agent 反馈
4. 开 Agent 说 "next task"，Agent 自己取任务干活
5. 回来看 Web UI，验收，循环

人不需要：
- 在 Agent 对话里解释上下文（看板上都有）
- 记着还有什么没做（看板就是清单）
- 手动记录做了什么（Agent 自己留 comment、更新状态）

---

## 看板列（推荐流程）

```
Backlog → To Do → In Progress → Review → Done
(想法池)  (确认要做)  (正在干)     (等你验收)  (完成)
```

Agent 做完进 Review，不直接进 Done。人验收通过才进 Done，不通过拖回来。

---

## 要开发的功能

### 0. ID 格式改为 nanoid 8 位

- **Project ID 和 Card ID（任务 ID）** 都用 nanoid 生成 8 字符 ID（如 `IrWaRuOp`），替代现在的 UUID
- 更短、更易读、CLI 和 Web UI 都更友好
- 8 位 nanoid 的空间是 64^8 ≈ 281 万亿，个人项目三五十个 ID，碰撞概率约等于零
- 代码层面仍然做唯一性检查（生成后比对已有 ID，冲突则重新生成），万无一失
- 需要数据迁移：旧 UUID → 新 nanoid
- 涉及: server（生成逻辑 + 唯一性检查）+ db.json 迁移 + 所有 workspace types

### 1. 数据模型扩展

#### Card 加 `priority` 字段

- 类型: `"high"` | `"medium"` | `"low"`（或 1/2/3 数字）
- 用途: `kanban next` 按优先级自动选任务
- 涉及: 三个 workspace 的 types.ts + server routes

#### Card 加 `comments` 字段

- 类型: `Comment[]`，每条 comment 包含 `{ id, text, author, createdAt }`
- author 区分 "agent" / "user"，或者用签名如 `-- pi (claude-opus-4)`
- 用途:
  - Agent 做完留摘要："删了 evaluator.py 942-1153 行重复代码"
  - 人留反馈："这里还有 bug，xx 情况下会 crash"
  - Agent 下次读到 feedback 知道要返工
- 涉及: types.ts + server routes + CLI + Client UI

### 2. 本地状态文件 `.kanban`

- 放在项目 repo 根目录，**提交到 git**（PROJECT_ID 是项目级配置，所有 worktree 共享）
- 只存 `PROJECT_ID`，不存 ACTIVE_TASK
- ACTIVE_TASK 是会话级状态，Agent 在自己 session 里管理，做完就没了
- CLI 启动时向上遍历目录找 `.kanban`，类似 package.json 的查找方式
- **给 CLI 用的**，不是给 Agent 用的——Agent 调 CLI 时不需要传 project ID

```
# .kanban 示例（提交到 git）
PROJECT_ID=IrWaRuOp
```

### 3. CLI 新命令

| 命令 | 作用 | 备注 |
|---|---|---|
| `kanban init` | 交互式选择项目，写入 `.kanban` | 对应 `skate local-init` |
| `kanban state` | 显示当前项目、活跃任务、各列卡片数 | Agent 启动时读上下文 |
| `kanban next` | 取最高优先级待办任务，移到 In Progress | Agent 核心命令，task ID 由 Agent session 管理 |
| `kanban done` | 完成 ACTIVE_TASK（移到 Review） | Agent 做完调用 |
| `kanban comment <text>` | 给 ACTIVE_TASK 加 comment | 不用传 task ID |

现有命令 `kanban cards create/update/move/delete` 保持不变，但加上 `.kanban` 后 project ID 可选（有本地状态时省略）。

### 4. MCP Server

- 把 CLI 操作暴露为 MCP 工具（stdio 传输）
- Agent 通过 MCP 直接调用，不用拼 shell 命令
- 工具示例: `kanban_next`, `kanban_done`, `kanban_comment`, `kanban_state`
- MCP Server 的 `initialize` 返回 instructions，指向 skill 文件

### 5. Skill 文件

- `SKILL.md`，规定 Agent 启动后的行为规范
- 内容:
  - 启动时先 `kanban state`，看整体状态
  - 有 ACTIVE_TASK → 读 comments，看是否有反馈需要返工
  - 没有 ACTIVE_TASK → `kanban next` 取任务
  - 工作完 → `kanban comment` 留摘要 + `kanban done`
  - `kanban next` 为空 → 停下来，告诉用户没任务了
- 每条 comment 附带签名: `-- pi (claude-opus-4)`

### 6. Client UI 更新

- 卡片显示 priority 标识（🔥 High / Medium / Low）
- 卡片详情页显示 comment 列表
- 支持在 Web UI 上添加 comment
- Review 列视觉区分（比如黄色高亮）

---

## 开发顺序建议

1. **数据模型** — priority + comments（三个 workspace types + server routes）
2. **`.kanban` + `kanban init`** — 本地状态文件
3. **`kanban state` / `kanban next` / `kanban done` / `kanban comment`** — Agent 核心命令
4. **Client UI** — 显示 priority、comments
5. **MCP Server** — 包装 CLI 为 MCP 工具
6. **Skill 文件** — Agent 行为规范

4/5/6 顺序可调换，1/2/3 是基础。
