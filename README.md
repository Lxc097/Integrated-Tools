# 多模型智能调度控制台

本地界面，把一段任务发给 Ollama、LM Studio，或 OpenAI、Anthropic、智谱、阿里百炼、DeepSeek。没有单独的后端，页面直接请求模型。调用逻辑在 [src/adapters/modelAdapters.js](src/adapters/modelAdapters.js)，各模型的接口名在 [src/data/models.js](src/data/models.js) 的 `apiModel`。

需要 Node.js 20 或更新版本。

```bash
npm install
npm run dev
```

浏览器打开 http://127.0.0.1:5173/ 。桌面窗口用 `npm run electron:dev`。`npm run build` 只生成页面，`npm run electron:build` 打 Windows 安装包，产物在 `release/`。`npm run preview` 适合看构建结果；普通浏览器里的在线请求可能被 CORS 拦住。开发服务器会把这些请求转到 Vite 代理。打包后的 Electron 窗口关闭了 `webSecurity`，可以直接请求厂商，同时开着 `nodeIntegration`，不要在这个窗口里打开不受信任的页面。

密钥有两种填法，页面里保存过的非空值优先。打开「API 密钥」保存后，写在本机 localStorage。也可以把 `.env.example` 复制为 `.env`，填写 `VITE_OPENAI_API_KEY`、`VITE_ANTHROPIC_API_KEY`、`VITE_ZHIPU_API_KEY`、`VITE_DASHSCOPE_API_KEY`、`VITE_DEEPSEEK_API_KEY`。改完 `.env` 要重新启动或重新构建。不要提交 `.env`。

Ollama 默认连 `http://localhost:11434`，模型名是 `llama3`，需要先 `ollama pull llama3`。LM Studio 默认连 `http://localhost:1234/v1`，用当前已经加载的模型。系统提示词会和任务一起提交。

地球位置用 `npm run verify:globe` 检查，脚本找本机 Chrome。不在默认路径时设置 `CHROME_PATH`。

这次改动记在 [CHANGES.md](CHANGES.md)。
