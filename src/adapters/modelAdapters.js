import { estimateTokens } from '../utils/token.js';

const devProxyPrefixes = {
  'https://api.openai.com': '/proxy/openai',
  'https://api.anthropic.com': '/proxy/anthropic',
  'https://open.bigmodel.cn': '/proxy/zhipu',
  'https://dashscope.aliyuncs.com': '/proxy/dashscope',
  'https://api.deepseek.com': '/proxy/deepseek',
};

function getApiKey(envName) {
  if (!envName) return '';
  const keyMap = {
    VITE_DASHSCOPE_API_KEY: 'dashscope_key',
    VITE_OPENAI_API_KEY: 'openai_key',
    VITE_ANTHROPIC_API_KEY: 'anthropic_key',
    VITE_ZHIPU_API_KEY: 'zhipu_key',
    VITE_DEEPSEEK_API_KEY: 'deepseek_key',
  };
  const localKey = keyMap[envName] || envName.toLowerCase();
  try {
    const lsValue = localStorage.getItem(localKey);
    if (lsValue) return lsValue;
  } catch {
    // 存储不可用时继续尝试环境变量
  }
  return import.meta.env[envName] || '';
}

function buildMessages(prompt, systemPrompt) {
  const messages = [];
  const system = systemPrompt?.trim();
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });
  return messages;
}

function messageText(message) {
  if (!message) return '';
  if (typeof message.content === 'string') return message.content;
  if (Array.isArray(message.content)) {
    return message.content
      .map((part) => (typeof part === 'string' ? part : part?.text || ''))
      .join('');
  }
  return '';
}

function usageTokens(usage, promptText, content) {
  const promptTokens = usage?.prompt_tokens ?? usage?.input_tokens;
  const completionTokens = usage?.completion_tokens ?? usage?.output_tokens;
  if (promptTokens == null && completionTokens == null) {
    const prompt = estimateTokens(promptText);
    const completion = estimateTokens(content);
    return {
      prompt,
      completion,
      total: prompt + completion,
      precision: 'estimated',
      note: '接口未返回用量，按字符估算',
    };
  }
  const prompt = promptTokens || 0;
  const completion = completionTokens || 0;
  return {
    prompt,
    completion,
    total: usage?.total_tokens || prompt + completion,
    precision: 'reported',
    note: '',
  };
}

function isOfflineError(error) {
  return /Failed to fetch|NetworkError|ECONNREFUSED|load failed/i.test(error?.message || '');
}

async function postJson(url, body, headers, offlineHint) {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (isOfflineError(error)) throw new Error(offlineHint);
    throw error;
  }

  if (!response.ok) {
    const errText = await response.text();
    const brief = errText.replace(/\s+/g, ' ').trim().slice(0, 400);
    throw new Error(`HTTP ${response.status}: ${brief || response.statusText}`);
  }

  return response.json();
}

// 开发服务器下改走 Vite 代理，浏览器才能访问这些在线接口。
function resolveBaseUrl(baseUrl) {
  const normalized = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  if (!import.meta.env.DEV) return normalized;
  for (const [origin, prefix] of Object.entries(devProxyPrefixes)) {
    if (normalized.startsWith(origin)) {
      return prefix + normalized.slice(origin.length);
    }
  }
  return normalized;
}

async function runChatCompletions({ baseUrl, apiModel, prompt, systemPrompt, apiKey, offlineHint }) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const data = await postJson(
    `${baseUrl}/chat/completions`,
    {
      model: apiModel,
      messages: buildMessages(prompt, systemPrompt),
      stream: false,
    },
    headers,
    offlineHint,
  );

  const content = messageText(data.choices?.[0]?.message);
  return {
    content,
    tokens: usageTokens(data.usage, `${systemPrompt || ''}\n${prompt}`, content),
  };
}

async function discoverLoadedModel(baseUrl) {
  let response;
  try {
    response = await fetch(`${baseUrl}/models`);
  } catch (error) {
    if (isOfflineError(error)) {
      throw new Error('无法连接 LM Studio。请先启动本地服务器（默认端口 1234）。');
    }
    throw error;
  }
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`无法读取本地模型列表：HTTP ${response.status} ${errText.slice(0, 200)}`);
  }
  const data = await response.json();
  const id = data?.data?.find((item) => item?.id)?.id;
  if (!id) throw new Error('LM Studio 未加载模型。请先加载一个模型后再执行。');
  return id;
}

const localOfflineHint = '无法连接本地模型服务。请确认 Ollama（默认 11434）或 LM Studio（默认 1234）已启动。';

const localAdapter = {
  async run({ model, prompt, systemPrompt }) {
    const baseUrl = resolveBaseUrl(model.baseUrl || 'http://localhost:11434');
    const openAICompat = baseUrl.endsWith('/v1');

    if (openAICompat) {
      const apiModel = model.apiModel || (await discoverLoadedModel(baseUrl));
      return runChatCompletions({
        baseUrl,
        apiModel,
        prompt,
        systemPrompt,
        apiKey: '',
        offlineHint: localOfflineHint,
      });
    }

    const apiModel = model.apiModel || model.id;
    const data = await postJson(
      `${baseUrl}/api/chat`,
      {
        model: apiModel,
        messages: buildMessages(prompt, systemPrompt),
        stream: false,
      },
      { 'Content-Type': 'application/json' },
      localOfflineHint,
    );

    if (data.error) {
      const message = typeof data.error === 'string' ? data.error : data.error.message;
      throw new Error(message || '本地模型返回错误');
    }

    const content = data.message?.content || data.response || '';
    const reported = data.prompt_eval_count != null || data.eval_count != null;
    if (!reported) {
      return {
        content,
        tokens: usageTokens(null, `${systemPrompt || ''}\n${prompt}`, content),
      };
    }

    const promptTokens = data.prompt_eval_count || 0;
    const completionTokens = data.eval_count || 0;
    return {
      content,
      tokens: {
        prompt: promptTokens,
        completion: completionTokens,
        total: promptTokens + completionTokens,
        precision: 'reported',
        note: '',
      },
    };
  },
};

const webOfflineHint = '无法连接在线模型接口。请检查网络和 API Key。';

const webAdapter = {
  async run({ model, prompt, systemPrompt }) {
    const apiKey = getApiKey(model.apiKeyEnv);
    if (!apiKey) {
      throw new Error(`未配置 API Key（${model.apiKeyEnv || '未知'}）。请在「API 密钥」页面保存，或写入 .env 后重启。`);
    }

    const baseUrl = resolveBaseUrl(model.baseUrl || '');
    if (!baseUrl) throw new Error('模型未配置 baseUrl。');

    return runChatCompletions({
      baseUrl,
      apiModel: model.apiModel || model.id,
      prompt,
      systemPrompt,
      apiKey,
      offlineHint: webOfflineHint,
    });
  },
};

const adapters = {
  local: localAdapter,
  web: webAdapter,
};

export function getModelAdapter(source) {
  return adapters[source] ?? webAdapter;
}
