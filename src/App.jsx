import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  LayoutDashboard, Key, Cpu, FileText, BarChart3, Settings, Shield, Menu, X,
  PlusCircle, MessageSquare, Zap, Brain, User, Send, Copy, Paperclip, Trash2, Check,
  Sparkles
} from 'lucide-react';
import { CosmicBackdrop } from './components/CosmicBackdrop';
import { HolographicGlobe } from './components/HolographicGlobe';
import { Sidebar } from './components/Sidebar';
import { models } from './data/models';

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 2.5);
}

const generateId = () => Math.random().toString(36).substring(2, 10);

function getSmartRecommendation(text) {
  const candidates = models.filter(m => {
    if (m.category === 'embedding') return false;
    return true;
  });

  const lower = text.toLowerCase();
  let scored = candidates.map(m => {
    let score = 0;
    const name = m.name.toLowerCase();
    const vendor = (m.vendor || '').toLowerCase();
    const combined = name + ' ' + vendor;

    // 编程/代码相关
    if (/代码|编程|debug|调试|算法|function|code|python|javascript|java|react|vue/.test(lower)) {
      if (/claude|deepseek|copilot/.test(combined)) score += 5;
      if (/gpt|openai/.test(combined)) score += 3;
    }
    // 翻译/多语言
    if (/翻译|translate|英文|中文|日语|法语/.test(lower)) {
      if (/qwen|gpt|claude/.test(combined)) score += 5;
    }
    // 数学/逻辑
    if (/数学|计算|公式|math|逻辑|推理/.test(lower)) {
      if (/deepseek|gpt|claude/.test(combined)) score += 4;
    }
    // 创意写作
    if (/写作|文章|小说|创意|故事|诗/.test(lower)) {
      if (/claude|gpt|qwen/.test(combined)) score += 4;
    }
    // 分析/总结
    if (/分析|总结|报告|review|summary/.test(lower)) {
      if (/claude|gpt/.test(combined)) score += 3;
    }
    // 通用兜底
    if (/gpt|claude/.test(combined)) score += 2;
    if (/deepseek|qwen/.test(combined)) score += 1;

    // 优先选择大上下文模型
    if (m.maxContextTokens >= 32000) score += 1;
    if (m.maxContextTokens >= 128000) score += 1;

    return { model: m, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top3 = scored.slice(0, 3).map(s => s.model);
  if (top3.length === 0) return [models[0]];
  return top3;
}

export default function App() {
  // Navigation & UI
  const [page, setPage] = useState('dispatch');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState(() => {
    try {
      const stored = localStorage.getItem('console_sessions');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [
      {
        id: generateId(),
        name: '新会话',
        createdAt: Date.now(),
        messages: [],
      },
    ];
  });

  const [currentSessionId, setCurrentSessionId] = useState(() => {
    try {
      const stored = localStorage.getItem('console_current_session');
      return stored || '';
    } catch (_) {
      return '';
    }
  });

  // Dispatch state
  const [task, setTask] = useState('');
  const [selectedModel, setSelectedModel] = useState(() => {
    try {
      return localStorage.getItem('console_model') || models[0]?.id || 'gpt-4o';
    } catch (_) {
      return models[0]?.id || 'gpt-4o';
    }
  });
  const [source, setSource] = useState('local');
  const [isRunning, setIsRunning] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Smart mode state
  const [smartPending, setSmartPending] = useState(false);
  const [smartRecommendations, setSmartRecommendations] = useState([]);
  const [smartRecIndex, setSmartRecIndex] = useState(0);
  const [smartUserMsg, setSmartUserMsg] = useState(null);

  // Persist sessions
  useEffect(() => {
    localStorage.setItem('console_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('console_current_session', currentSessionId);
  }, [currentSessionId]);

  // Ensure currentSessionId is valid
  useEffect(() => {
    if (!currentSessionId || !sessions.find(s => s.id === currentSessionId)) {
      const firstId = sessions[0]?.id || '';
      setCurrentSessionId(firstId);
    }
  }, [sessions, currentSessionId]);

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages, isRunning, smartPending]);

  // Session CRUD
  const createSession = () => {
    const newSession = {
      id: generateId(),
      name: '新会话',
      createdAt: Date.now(),
      messages: [],
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const switchSession = (id) => {
    setCurrentSessionId(id);
    setMobileMenuOpen(false);
    // Reset smart state on session switch
    setSmartPending(false);
    setSmartRecommendations([]);
    setSmartRecIndex(0);
    setSmartUserMsg(null);
  };

  const deleteSession = (id) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      if (id === currentSessionId && next.length > 0) {
        setCurrentSessionId(next[0].id);
      }
      return next;
    });
  };

  const renameSession = (id, newName) => {
    setSessions(prev =>
      prev.map(s => (s.id === id ? { ...s, name: newName } : s))
    );
  };

  // Simulate API call (shared between normal and smart-confirm flows)
  const executeApiCall = async (newMessages, modelId, sourceMode) => {
    setIsRunning(true);
    try {
      const modelName = models.find(m => m.id === modelId)?.name || modelId;
      const sourceLabel = sourceMode === 'local' ? '本地' : sourceMode === 'web' ? '云端' : '智能';
      const assistantContent = `# 来自 ${modelName} 的响应\n\n已收到您的任务，当前连接模式：**${sourceLabel}**。\n\n这是一份模拟响应，实际部署时请替换为真实 API。\n\n> 提示：可通过左侧「API 密钥」页配置您的模型密钥。`;

      await new Promise(resolve => setTimeout(resolve, 1500));

      const assistantMsg = {
        role: 'assistant',
        content: assistantContent,
        timestamp: Date.now(),
      };

      const finalMessages = [...newMessages, assistantMsg];
      updateSessionMessages(finalMessages);
    } catch (err) {
      const errorMsg = {
        role: 'assistant',
        content: `**错误**：${err.message || '未知错误'}`,
        timestamp: Date.now(),
      };
      updateSessionMessages([...newMessages, errorMsg]);
    } finally {
      setIsRunning(false);
    }
  };

  // Dispatch: run task
  const runTask = async () => {
    if (!task.trim() || isRunning || smartPending) return;

    const userMsg = {
      role: 'user',
      content: task,
      timestamp: Date.now(),
    };

    // Auto-rename session
    if (currentSession?.name === '新会话' || !currentSession?.messages?.length) {
      const shortName = task.slice(0, 30) + (task.length > 30 ? '...' : '');
      setSessions(prev =>
        prev.map(s => (s.id === currentSessionId ? { ...s, name: shortName } : s))
      );
    }

    const currentMessages = currentSession?.messages || [];

    if (source === 'smart') {
      // Smart mode: add user message, then show recommendations
      const newMessages = [...currentMessages, userMsg];
      updateSessionMessages(newMessages);

      const recommendations = getSmartRecommendation(task);
      setSmartPending(true);
      setSmartRecommendations(recommendations);
      setSmartRecIndex(0);
      setSmartUserMsg(userMsg);
      setTask('');
    } else {
      // Normal mode: add user message and execute
      const newMessages = [...currentMessages, userMsg];
      updateSessionMessages(newMessages);
      setTask('');
      await executeApiCall(newMessages, selectedModel, source);
    }
  };

  // Smart mode: confirm model
  const handleSmartConfirm = () => {
    if (smartRecommendations.length === 0) return;

    const confirmedModel = smartRecommendations[smartRecIndex];
    const currentMessages = currentSession?.messages || [];

    // Reset smart state
    setSmartPending(false);
    setSmartRecommendations([]);
    setSmartRecIndex(0);
    setSmartUserMsg(null);

    // Execute with confirmed model (user message already in chat)
    executeApiCall(currentMessages, confirmedModel.id, 'smart');
  };

  // Smart mode: change to next recommendation
  const handleSmartChange = () => {
    if (smartRecIndex + 1 >= smartRecommendations.length) {
      // No more recommendations — cycle back to first
      setSmartRecIndex(0);
    } else {
      setSmartRecIndex(prev => prev + 1);
    }
  };

  // Smart mode: cancel and revert
  const handleSmartCancel = () => {
    // Remove the user message that was added
    if (smartUserMsg) {
      const currentMessages = currentSession?.messages || [];
      const filtered = currentMessages.filter(m => m.timestamp !== smartUserMsg.timestamp);
      updateSessionMessages(filtered);
    }

    // Reset smart state
    setSmartPending(false);
    setSmartRecommendations([]);
    setSmartRecIndex(0);
    setSmartUserMsg(null);
  };

  const updateSessionMessages = (messages) => {
    setSessions(prev =>
      prev.map(s => (s.id === currentSessionId ? { ...s, messages } : s))
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      runTask();
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const handleSourceChange = (newSource) => {
    setSource(newSource);
    // Reset smart state if switching away from smart
    if (newSource !== 'smart' && smartPending) {
      handleSmartCancel();
    }
  };

  const currentModelObj = models.find(m => m.id === selectedModel);
  const maxTokens = currentModelObj?.maxContextTokens || 8192;
  const allMessages = currentSession?.messages || [];
  const allText = allMessages.map(m => m.content).join(' ');
  const usedTokens = estimateTokens(allText);
  const usagePct = Math.min(100, Math.round((usedTokens / maxTokens) * 100));
  const contextClass = usagePct > 80 ? 'danger' : usagePct > 50 ? 'warn' : 'safe';

  const getPlaceholder = () => {
    if (source === 'smart') return '描述您的需求，AI 将智能匹配最佳模型...';
    return '输入任务描述...';
  };

  // ============ RENDER ============
  const renderPage = () => {
    switch (page) {
      case 'dispatch':
        return (
          <section className="page-enter chat-layout">
            {/* Message area */}
            <div className="chat-messages">
              {(!currentSession?.messages || currentSession.messages.length === 0) && !isRunning && !smartPending && (
                <div className="chat-empty">
                  <div className="chat-empty-icon">
                    <Zap size={40} />
                  </div>
                  <h3>多模型智能调度</h3>
                  <p>选择一个模型，在下方输入任务开始对话</p>
                </div>
              )}

              {currentSession?.messages?.map((msg, i) => (
                <div key={i} className={`msg-row ${msg.role}`}>
                  <div className="msg-avatar">
                    {msg.role === 'user' ? <User size={18} /> : <Brain size={18} />}
                  </div>
                  <div className="msg-bubble">
                    <div className="msg-content">
                      {msg.role === 'assistant' ? (
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                    <div className="msg-time">
                      {new Date(msg.timestamp).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    {msg.role === 'assistant' && (
                      <button
                        className="msg-copy-btn"
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content);
                        }}
                        title="复制"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Smart recommendation card */}
              {smartPending && smartRecommendations.length > 0 && (
                <div className="msg-row assistant">
                  <div className="msg-avatar">
                    <Sparkles className="text-purple-300" size={18} />
                  </div>
                  <div className="msg-bubble smart-rec-bubble">
                    <div className="smart-rec-header">
                      <span className="smart-rec-icon">
                        <Sparkles size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                        AI 智能推荐
                      </span>
                      <span className="smart-rec-badge">智能模式</span>
                    </div>
                    <div className="smart-rec-body">
                      <strong>{smartRecommendations[smartRecIndex].name}</strong>
                      <span className="smart-rec-provider">
                        {smartRecommendations[smartRecIndex].vendor} · {smartRecommendations[smartRecIndex].maxContextTokens?.toLocaleString()} tokens
                      </span>
                      <p>根据您的需求智能匹配的最佳模型</p>
                    </div>
                    <div className="smart-rec-meta">
                      <span>推荐 {smartRecIndex + 1} / {smartRecommendations.length}</span>
                    </div>
                    <div className="smart-rec-actions">
                      <button onClick={handleSmartConfirm}>使用此模型</button>
                      <button onClick={handleSmartChange}>换一个</button>
                      <button onClick={handleSmartCancel}>取消</button>
                    </div>
                  </div>
                </div>
              )}

              {isRunning && (
                <div className="msg-row assistant">
                  <div className="msg-avatar">
                    <Brain size={18} />
                  </div>
                  <div className="msg-bubble">
                    <div className="typing-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="chat-input-bar">
              {/* Context usage bar */}
              {currentSession?.messages?.length > 0 && (
                <div className="context-bar">
                  <div
                    className={`context-fill ${contextClass}`}
                    style={{ width: `${usagePct}%` }}
                  />
                  <span className="context-text">
                    {usedTokens} / {maxTokens} tokens ({usagePct}%)
                  </span>
                </div>
              )}

              {/* Source toggle */}
              <div className="chat-source-toggle">
                <button
                  className={`chat-source-opt ${source === 'local' ? 'active' : ''}`}
                  onClick={() => handleSourceChange('local')}
                >
                  本地
                </button>
                <button
                  className={`chat-source-opt ${source === 'web' ? 'active' : ''}`}
                  onClick={() => handleSourceChange('web')}
                >
                  云端
                </button>
                <button
                  className={`chat-source-opt smart-source-opt ${source === 'smart' ? 'active' : ''}`}
                  onClick={() => handleSourceChange('smart')}
                >
                  <Sparkles size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                  智能
                </button>

                <button
                  className="chat-file-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="上传文件"
                >
                  <Paperclip size={14} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden-input"
                  onChange={handleFileUpload}
                />
              </div>

              {/* Attached files preview */}
              {attachedFiles.length > 0 && (
                <div className="chat-files-preview">
                  {attachedFiles.map((f, i) => (
                    <span key={i} className="file-chip">
                      {f.name}
                      <button onClick={() => setAttachedFiles(prev => prev.filter((_, j) => j !== i))}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Input row */}
              <div className="input-row">
                <select
                  value={selectedModel}
                  onChange={e => {
                    setSelectedModel(e.target.value);
                    localStorage.setItem('console_model', e.target.value);
                  }}
                  className="model-select"
                  disabled={source === 'smart'}
                >
                  {models.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>

                <textarea
                  ref={textareaRef}
                  value={task}
                  onChange={e => setTask(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={getPlaceholder()}
                  rows={1}
                  className="chat-textarea"
                  disabled={isRunning || smartPending}
                />

                <button
                  onClick={runTask}
                  disabled={isRunning || !task.trim() || smartPending}
                  className="chat-send-btn"
                  title="发送"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </section>
        );

      // ===== Other pages (unchanged) =====
      case 'models':
        const modelCategories = {};
        models.forEach(m => {
          const cat = m.category || 'other';
          if (!modelCategories[cat]) modelCategories[cat] = [];
          modelCategories[cat].push(m);
        });

        return (
          <section className="page-enter content-wrap py-6">
            <h1 className="mb-6">模型池</h1>
            {Object.entries(modelCategories).map(([cat, catModels]) => (
              <div key={cat} className="mb-8">
                <h2 className="mb-4 capitalize text-blue-300">{cat === 'llm' ? '大语言模型' : cat === 'vision' ? '视觉模型' : cat === 'embedding' ? '嵌入模型' : cat}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {catModels.map(m => (
                    <div key={m.id} className="panel p-5 flex items-start gap-4">
                      <div className="model-avatar shrink-0"><Cpu size={22} /></div>
                      <div>
                        <strong className="block text-white">{m.name}</strong>
                        <span className="text-xs text-gray-400">{m.vendor} · {m.maxContextTokens?.toLocaleString()} tokens</span>
                        <p className="text-sm text-gray-300 mt-2">{m.description || '高性能模型'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        );

      case 'apikeys':
        return (
          <section className="page-enter content-wrap py-6">
            <h1 className="mb-6">API 密钥管理</h1>
            <div className="panel p-6">
              <p className="text-gray-400">配置各模型提供商的 API 密钥，密钥将安全存储于本地。</p>
              <div className="mt-4 space-y-3">
                {['OpenAI', 'Anthropic', 'Google', 'DeepSeek', 'Moonshot', 'Zhipu', 'Qwen', 'Groq', 'Together'].map(p => (
                  <div key={p} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <Shield size={18} className="text-gray-500" />
                    <span className="flex-1 text-white">{p}</span>
                    <input type="password" placeholder="sk-..." className="bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm w-64 outline-none focus:border-blue-500" />
                    <button className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition">保存</button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'logs':
        return (
          <section className="page-enter content-wrap py-6">
            <h1 className="mb-6">调用日志</h1>
            <div className="panel p-0 overflow-x-auto">
              <table className="log-table w-full">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>模型</th>
                    <th>状态</th>
                    <th>Tokens</th>
                    <th>耗时</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td colSpan={5} className="text-center py-12 text-gray-500">暂无调用记录</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        );

      case 'analytics':
        return (
          <section className="page-enter content-wrap py-6">
            <h1 className="mb-6">性能分析</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="panel p-5">
                <span className="text-gray-400 text-sm">总调用次数</span>
                <strong className="block text-2xl mt-2">0</strong>
              </div>
              <div className="panel p-5">
                <span className="text-gray-400 text-sm">总 Token 用量</span>
                <strong className="block text-2xl mt-2">0</strong>
              </div>
              <div className="panel p-5">
                <span className="text-gray-400 text-sm">平均响应时间</span>
                <strong className="block text-2xl mt-2">--</strong>
              </div>
            </div>
          </section>
        );

      case 'settings':
        return (
          <section className="page-enter content-wrap py-6">
            <h1 className="mb-6">系统设置</h1>
            <div className="panel p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <strong className="block text-white">黑暗模式</strong>
                  <span className="text-sm text-gray-400">始终启用深色主题</span>
                </div>
                <div className="w-10 h-5 rounded-full bg-blue-600 relative cursor-pointer">
                  <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <strong className="block text-white">自动保存</strong>
                  <span className="text-sm text-gray-400">自动保存会话历史</span>
                </div>
                <div className="w-10 h-5 rounded-full bg-blue-600 relative cursor-pointer">
                  <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white" />
                </div>
              </div>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="app-shell">
      <CosmicBackdrop />
      <HolographicGlobe />

      {/* Mobile hamburger */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <Sidebar
          page={page}
          setPage={p => { setPage(p); setMobileMenuOpen(false); }}
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSwitchSession={switchSession}
          onCreateSession={createSession}
          onDeleteSession={deleteSession}
          onRenameSession={renameSession}
        />
      </aside>

      {/* Main */}
      <main className="main-area">
        {renderPage()}
      </main>
    </div>
  );
}