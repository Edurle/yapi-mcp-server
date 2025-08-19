# YApi-MCP-Server

一个将 YApi 接口查询能力通过 Model Context Protocol（MCP）对外暴露为工具（tools）的服务端实现。可在支持 MCP 的智能体/IDE/助手中查询 YApi 的接口目录、接口详情、搜索接口、以及进行缓存管理，支持 stdio 与可流式的 HTTP 两种运行方式。

- 运行环境：Node.js（ESM）
- 语言：TypeScript
- 传输方式：Stdio、Streamable HTTP（/mcp）
- 版本：0.1.0

## 功能亮点

- 查询接口目录与列表：按项目获取接口分类与接口清单（`get_interface_list`）。
- 查询接口详情：根据接口 ID 获取完整定义（`get_interface_detail`），支持解析 req/res JSON 内容。
- 批量查询详情：一次请求获取多个接口详情（`batch_get_interface_details`）。
- 按目录名称筛选：根据目录名称（支持部分匹配）获取该目录下所有接口（`get_interfaces_by_category`）。
- 关键词搜索：在项目内按标题、路径、方法搜索接口（`search_interfaces`）。
- 预加载与缓存：预加载项目所有接口到本地缓存（`preload_interface_data`），内置可配置缓存（TTL、容量、开关），并提供统计与清理能力（`get_cache_stats`、`clear_*`）。
- 便捷配置：通过命令行参数传入 YApi 地址与 Cookie，支持缓存策略参数。

## 适用场景

- 在支持 MCP 的 AI 助手（如本地/IDE 插件/Agent）中，实时查询并利用组织内 YApi 文档。
- 让智能体具备“按关键字/目录检索接口并读取字段定义”的能力。
- 对频繁访问的接口进行缓存/预热，减少 YApi 压力与响应时间。

---

## 快速开始

### 前置条件

- 安装 Node.js（建议 v18+）。
- 可访问的 YApi 实例地址（baseURL）。
- 有效的认证 Cookie（YApi 登录后的 Cookie 字符串）。

> 注意：Cookie 属于敏感信息，请谨慎保管，不要提交到版本库。

### 安装

方式一：克隆并本地构建

```bash
# 克隆并安装依赖
npm install

# 构建产物到 dist/
npm run build
```

方式二：全局安装为命令（本地目录）

```bash
# 在项目根目录将当前包以全局方式安装
npm i -g .
```

安装后可使用命令 `yapi-mcp-server`（来自 package.json 的 bin 配置）。

### 配置参数（命令行）

必填参数：
- `--baseURL` 或 `-u`：YApi 基础地址，例如 `https://yapi.example.com`
- `--cookie` 或 `-c`：认证 Cookie 字符串

缓存相关（可选）：
- `--cache-ttl` 或 `-t`：缓存过期时间（分钟，默认 5）
- `--cache-size` 或 `-s`：最大缓存条目数（默认 100）
- `--no-cache`：禁用缓存
- `--enable-cache`：启用缓存（默认）

其他参数：
- `--<key> <value>`：可携带任意自定义参数（将记录在日志中，供扩展使用）。

### 运行方式

1) Stdio 模式（推荐给桌面类/IDE 内嵌的 MCP 客户端）

```bash
# 构建后
node ./dist/index.js \
  -u https://yapi.example.com \
  -c "session=abc123; other=xyz" \
  --cache-ttl 10 --cache-size 200

# 或已全局安装
yapi-mcp-server -u https://yapi.example.com -c "session=abc123"

# npm script（等价于 node ./dist/index.js）
npm start -- -u https://yapi.example.com -c "session=abc123"
```

2) Streamable HTTP 模式（用于通过 HTTP 与 MCP 客户端通信）

```bash
# 默认端口 3088，可通过环境变量 PORT 覆盖
PORT=3088 node ./dist/streamableHttp.js -u https://yapi.example.com -c "session=abc123"

# npm script
npm run start:streamableHttp -- -u https://yapi.example.com -c "session=abc123"
```

HTTP 模式暴露 `POST /mcp` 路由，遵循 MCP 的 HTTP 传输协议，供 MCP 兼容客户端调用。

---

## 可用工具（Tools）

以下工具均通过 MCP 暴露，名称即为工具标识：

- `get_interface_list`
  - 描述：获取指定项目的接口目录与接口列表
  - 入参：`project_id: number`
  - 返回：按目录分组的接口清单

- `get_interface_detail`
  - 描述：获取指定接口的详细信息
  - 入参：`interface_id: number`
  - 返回：接口基础信息、请求信息（headers/query/params/body）、响应信息等（部分 JSON 将被安全解析）

- `batch_get_interface_details`
  - 描述：批量获取多个接口的详情
  - 入参：`interface_ids: number[]`

- `get_interfaces_by_category`
  - 描述：根据目录名称（支持部分匹配）获取该目录下的接口列表
  - 入参：`project_id: number`, `category_name: string`

- `search_interfaces`
  - 描述：在项目内按标题、路径、方法关键字搜索
  - 入参：`project_id: number`, `query: string`, `method?: string`

- `preload_interface_data`
  - 描述：预加载指定项目的所有接口详情到缓存
  - 入参：`project_id: number`

- `get_cache_stats`
  - 描述：获取缓存统计信息（启用状态、容量、TTL、Key 列表、使用率等）

- `clear_project_cache`
  - 描述：清除某个项目的接口列表缓存
  - 入参：`project_id: number`

- `clear_interface_cache`
  - 描述：清除某个接口的详情缓存
  - 入参：`interface_id: number`

- `clear_all_cache`
  - 描述：清空所有缓存

> 所有工具的入参/出参均为标准 JSON，可直接被 MCP 客户端消费。

---

## 使用示例

以“获取项目接口列表”为例：

- 工具：`get_interface_list`
- 入参：`{ "project_id": 123 }`
- 典型返回（节选）：

```json
[
  {
    "category_id": 10,
    "category_name": "用户模块",
    "description": "用户相关接口",
    "interfaces": [
      { "id": 1001, "title": "获取用户信息", "method": "GET", "path": "/user/info", "status": "done", "tags": [] },
      { "id": 1002, "title": "更新用户信息", "method": "POST", "path": "/user/update", "status": "done", "tags": ["important"] }
    ]
  }
]
```

再如“获取接口详情”：

- 工具：`get_interface_detail`
- 入参：`{ "interface_id": 1001 }`
- 典型返回（节选）：

```json
{
  "id": 1001,
  "title": "获取用户信息",
  "method": "GET",
  "path": "/user/info",
  "request": {
    "headers": [ { "name": "Authorization", "required": "1" } ],
    "query": [ { "name": "id", "required": "1" } ],
    "params": [],
    "body_type": "json"
  },
  "response": {
    "body_type": "json",
    "body": { "code": 0, "data": { "id": 1, "name": "Tom" } }
  }
}
```

> 实际字段以 YApi 返回为准，服务端会尽量将 `req_body_other`、`res_body` 等字段进行安全 JSON 解析。

---

## 缓存机制说明

- 默认启用缓存，TTL=5 分钟，最大 100 条。
- 缓存键按方法与参数生成，分别缓存：项目接口列表、接口详情等。
- 可通过 `get_cache_stats` 查看统计，通过 `clear_*` 系列工具进行清理。
- `preload_interface_data` 会：
  1. 拉取项目接口清单
  2. 分批获取所有接口详情并写入缓存（默认并发分批大小为 5）

---

## 与 YApi 的交互

- 列表接口：`GET /api/interface/list_menu?project_id=...`
- 详情接口：`GET /api/interface/get?id=...`

需要在请求头中携带 Cookie 进行认证（启动时通过命令行传入）。

---

## 开发与调试

```bash
# 持续编译（监听）
npm run watch

# 构建
npm run build

# 启动（stdio）
npm start -- -u https://yapi.example.com -c "session=abc123"

# 启动（HTTP）
npm run start:streamableHttp -- -u https://yapi.example.com -c "session=abc123"
```

项目结构：

- `src/index.ts`：Stdio 入口
- `src/streamableHttp.ts`：HTTP 服务入口（`POST /mcp`）
- `src/server.ts`：定义并注册 MCP 工具
- `src/request.ts`：Axios 客户端、配置解析、缓存实现与具体请求逻辑

---

## 许可证

MIT