import { estimateTokens } from '../utils/token.js';

function getApiKey(envName) {
  if (!envName) return '';
  const keyMap = {
    'VITE_DASHSCOPE_API_KEY': 'dashscope_key',
    'VITE_OPENAI_API_KEY': 'openai_key',
    'VITE_ANTHROPIC_API_KEY': 'anthropic_key',
    'VITE_ZHIPU_API_KEY': 'zhipu_key',
    'VITE_DEEPSEEK_API_KEY': 'deepseek_key',
  };
  const localKey = keyMap[envName] || envName.toLowerCase();
  const lsValue = localStorage.getItem(localKey);
  if (lsValue !== null && lsValue !== '') {
    return lsValue;
  }
  return import.meta.env[envName] || '';
}

const localAdapter = {
  async run({ model, prompt }) {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.id,
          prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const promptTokens = data.prompt_eval_count || estimateTokens(prompt);
      const completionTokens = data.eval_count || 0;

      return {
        content: data.response || '',
        tokens: {
          prompt: promptTokens,
          completion: completionTokens,
          total: promptTokens + completionTokens,
          precision: 'reported',
        },
      };
    } catch (error) {
      return {
        content: `本地模型调用失败: ${error.message}\n\n请确保 Ollama 或 LM Studio 正在运行。`,
        tokens: { prompt: 0, completion: 0, total: 0, precision: 'reported' },
      };
    }
  },
};

const webAdapter = {
  async run({ model, prompt }) {
    try {
      const apiKey = getApiKey(model.apiKeyEnv);
      const baseUrl = model.baseUrl.endsWith('/')
        ? model.baseUrl.slice(0, -1)
        : model.baseUrl;

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model.id,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const usage = data.usage || {};

      return {
        content,
        tokens: {
          prompt: usage.prompt_tokens || 0,
          completion: usage.completion_tokens || 0,
          total: usage.total_tokens || 0,
          precision: 'reported',
        },
      };
    } catch (error) {
      return {
        content: `在线模型调用失败: ${error.message}\n\n请检查 API Key 是否已在"API 密钥"页面配置。`,
        tokens: { prompt: 0, completion: 0, total: 0, precision: 'reported' },
      };
    }
  },
};

const adapters = {
  local: localAdapter,
  web: webAdapter,
};

export function getModelAdapter(source) {
  return adapters[source] ?? webAdapter;
}
