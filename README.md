# Multi-model Dispatch Console

本地多模型调度界面。用同一个输入框把任务发给本地模型（Ollama、LM Studio）或在线模型（OpenAI、Anthropic、智谱、阿里百炼、DeepSeek）。没有独立后端，请求由页面直接发出。

## 环境

- Node.js 20 或更新版本
- 本地模型：Ollama 监听 `http://localhost:11434`，或 LM Studio 的 OpenAI 兼容服务监听 `http://localhost:1234/v1`
- 在线模型：对应厂商的 API Key

## 安装

```bash
npm install
```

如果本机 npm 缓存目录没有写权限，可以改用：

```bash
npm install --cache .npm-cache
```

## 配置 API Key

有两种方式，页面里保存过的非空密钥优先。

1. 启动应用后打开「API 密钥」，填入并点保存。密钥写在本机 `localStorage`（`openai_key`、`anthropic_key`、`zhipu_key`、`dashscope_key`、`deepseek_key`），只在调用对应厂商时放进请求头。
2. 复制 `.env.example` 为 `.env`，填写 `VITE_` 开头的变量。修改后需要重新执行 `npm run dev` 或重新构建，Vite 才会读到新值。

不要提交 `.env`。仓库里没有写死的密钥。

## 启动

只看界面、并在开发服务器里调用接口：

```bash
npm run dev
```

浏览器打开 `http://127.0.0.1:5173/`。开发模式下，在线接口会经过 Vite 代理，避免浏览器 CORS 拦截。

桌面窗口：

```bash
npm run electron:dev
```

## 构建

```bash
npm run build
npm run preview
```

`npm run preview` 打开的是构建结果。普通浏览器里的在线请求仍可能被 CORS 拦住；打包后的 Electron 窗口关闭了 `webSecurity`，可以直接请求厂商接口。

Windows 安装包和便携版（只打 Windows，产物在 `release/`）：

```bash
npm run electron:build
```

## 模型请求

调度时实际提交的模型名是 `apiModel`，不是界面上的内部 id。

| 界面名称 | 接口模型 | 地址 |
| --- | --- | --- |
| Ollama / Llama 3 | `llama3` | `http://localhost:11434/api/chat` |
| LM Studio / Qwen | 读取已加载模型 | `http://localhost:1234/v1/chat/completions` |
| OpenAI GPT-5 | `gpt-5` | `https://api.openai.com/v1/chat/completions` |
| Claude Opus | `claude-opus-5-5` | `https://api.anthropic.com/v1/chat/completions` |
| Zhipu GLM | `glm-5.3` | `https://open.bigmodel.cn/api/paas/v4/chat/completions` |
| Qwen3.7 Max | `qwen3.7-max` | `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` |
| Qwen3.7 Plus | `qwen3.7-plus` | 同上 |
| DeepSeek Chat | `deepseek-chat` | `https://api.deepseek.com/v1/chat/completions` |

Ollama 需要已经拉取对应标签，例如 `ollama pull llama3`。系统提示词会和任务一起提交。调用失败会记入日志，不再当成成功。

「系统设置」里的默认调用源会立刻切换当前调用源，并在下次打开时保留。日志保留天数会在打开应用和修改设置时裁剪旧记录。

## 验证 3D 地球

先启动开发服务器，再在另一个终端执行：

```bash
npm run verify:globe
```

脚本使用本机 Chrome 或 Chromium。不在默认路径时设置 `CHROME_PATH`。开发地址不是 `http://127.0.0.1:5173/` 时设置 `APP_URL`。

## 说明

Electron 窗口目前开启 `nodeIntegration` 并关闭 `webSecurity`，这样打包后的页面才能直接请求各厂商接口。这是本地工具，不要在这个窗口里打开不受信任的页面。
