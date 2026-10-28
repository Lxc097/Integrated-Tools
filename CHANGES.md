# 变更记录

## 2026-10-28

- 本地模型不再一律请求 Ollama 的 `/api/generate`。Ollama 走 `/api/chat` 并使用 `llama3`；LM Studio 走自己的 `/v1/chat/completions`，模型名取当前已加载的模型。
- 在线请求改为提交 `apiModel`（例如 `gpt-5`、`claude-opus-5-5`、`glm-5.3`、`qwen3.7-max`），不再把界面内部 id 发给厂商。补充了密钥页已有、但模型列表缺失的 DeepSeek。
- 系统提示词会随任务发送。接口失败会抛出并记为失败，结果区不再收到无法渲染的对象。
- 未配置密钥时会直接提示，不再发空的 Authorization。开发服务器为在线接口增加了 Vite 代理。
- 「系统设置」的默认调用源会生效；日志保留天数会裁剪记录；日志时间改为 ISO，避免「今日调用」解析失败。模型池不再把已带单位的延迟显示成 `0.4sms`。设置下拉框不再套用任务输入框的高度。结果区的复制按钮改为现有样式。
- README 改为中文，写明安装、密钥和启动方式，并去掉指向 `D:/Integrated Tools` 的本地路径，适配器改为仓库内相对链接。`.gitignore` 忽略 `.env.*`，并增加 `.env.example`。地球验证脚本不再只查找 Windows 下的 Chrome。
- 去掉 `src/styles.css` 开头误入的 Markdown 代码围栏，避免样式表解析报错。模型面板里的地址和模型名不再被 CSS 首字母大写改掉。
