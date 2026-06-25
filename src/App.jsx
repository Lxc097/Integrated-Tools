import React, { useMemo, useState, useRef } from 'react';
import { Activity, BadgeCheck, Cpu, Gauge, Plus, Trash2, Download, Clock, CheckCircle2, XCircle, Save, Check, Upload } from 'lucide-react';
import { ModelPanel } from './components/ModelPanel.jsx';
import { ResultPanel } from './components/ResultPanel.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { MetricCard } from './components/MetricCard.jsx';
import { TaskPanel } from './components/TaskPanel.jsx';
import { CosmicBackdrop } from './components/CosmicBackdrop.jsx';
import { getModelAdapter } from './adapters/modelAdapters.js';
import { initialResult, models, sourceOptions } from './data/models.js';

const defaultSource = 'local';

const pageMap = {
  '调度台': 'dispatch',
  '模型池': 'models',
  'API 密钥': 'apikeys',
  '调用日志': 'logs',
  '性能分析': 'analytics',
  '系统设置': 'settings',
};

const globalStyles = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(15px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .page-enter {
    animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .btn-interactive {
    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  }
  .btn-interactive:hover {
    transform: scale(1.02);
  }
  .bar-gradient {
    background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899);
    border-radius: 4px;
    transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .metric-value, .metric-num {
    transition: all 0.3s ease;
    display: inline-block;
  }
  .log-table {
    width: 100%;
    border-collapse: collapse;
  }
  .log-table th, .log-table td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    font-size: 14px;
  }
  .log-table th {
    color: #94a3b8;
    font-weight: 500;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .log-table tr:hover td {
    background: rgba(255,255,255,0.02);
  }
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
  }
  .status-success { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
  .status-failed { background: rgba(239, 68, 68, 0.15); color: #f87171; }
  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.05);
    color: #e2e8f0;
    cursor: pointer;
  }
  .action-btn:hover {
    background: rgba(255,255,255,0.1);
  }
  .action-btn.danger {
    border-color: rgba(239, 68, 68, 0.3);
    color: #f87171;
  }
  .action-btn.danger:hover {
    background: rgba(239, 68, 68, 0.1);
  }
  .apikey-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .apikey-row:last-child {
    border-bottom: none;
  }
  .apikey-label {
    min-width: 200px;
    font-size: 13px;
    color: #94a3b8;
    font-family: monospace;
    flex-shrink: 0;
  }
  .apikey-input {
    flex: 1;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.05);
    color: #e2e8f0;
    font-size: 14px;
    font-family: monospace;
    outline: none;
    transition: border-color 0.2s;
  }
  .apikey-input:focus {
    border-color: rgba(59, 130, 246, 0.5);
  }
  .apikey-save-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.05);
    color: #e2e8f0;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.2s;
  }
  .apikey-save-btn:hover {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.4);
  }
  .apikey-save-btn.saved {
    background: rgba(34, 197, 94, 0.2);
    border-color: rgba(34, 197, 94, 0.4);
    color: #4ade80;
  }
`;

// 提取为独立的 React 组件，以保证 useState 在组件顶层合法调用
function ApiKeyManager() {
  const apiKeyFields = [
    { key: 'dashscope_key', label: '阿里百炼 / 千问 (DashScope)', placeholder: 'sk-...' },
    { key: 'openai_key', label: 'OpenAI', placeholder: 'sk-...' },
    { key: 'anthropic_key', label: 'Anthropic / Claude', placeholder: 'sk-ant-...' },
    { key: 'zhipu_key', label: '智谱 AI (GLM)', placeholder: '输入你的 API Key' },
    { key: 'deepseek_key', label: 'DeepSeek', placeholder: 'sk-...' },
  ];

  const [apiKeys, setApiKeys] = useState(() => {
    const initial = {};
    apiKeyFields.forEach(f => { initial[f.key] = localStorage.getItem(f.key) || ''; });
    return initial;
  });
  
  const [savedMsg, setSavedMsg] = useState('');

  const handleSave = (key) => {
    localStorage.setItem(key, apiKeys[key]);
    setSavedMsg(key + ' 已保存');
    setTimeout(() => setSavedMsg(''), 2000);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '20px auto', padding: '20px' }}>
      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px', color: '#e2e8f0' }}>API 密钥管理</div>
      {apiKeyFields.map(field => (
        <div key={field.key} style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '6px', color: '#94a3b8' }}>{field.label}</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="password"
              className="apikey-input"
              placeholder={field.placeholder}
              value={apiKeys[field.key]}
              onChange={e => setApiKeys(p => ({ ...p, [field.key]: e.target.value }))}
            />
            <button
              className="apikey-save-btn"
              onClick={() => handleSave(field.key)}
              title="Save"
            >
              <Save size={16} />
            </button>
          </div>
        </div>
      ))}
      {savedMsg && <div style={{ color: '#4ade80', marginTop: '12px', fontWeight: 500 }}>{savedMsg}</div>}
    </div>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState('dispatch');
  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [source, setSource] = useState(defaultSource);
  const [selectedModel, setSelectedModel] = useState(
    models.find((item) => item.source === defaultSource)?.id ?? models[0].id,
  );
  const [result, setResult] = useState(initialResult);
  const [tokenUsage, setTokenUsage] = useState({
    prompt: 0,
    completion: 0,
    total: 0,
    precision: 'idle',
    note: '',
  });
  const [isRunning, setIsRunning] = useState(false);

  // 将 dispatch 页面所需的 Ref 和 Handler 提升到 App 组件顶层
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setPrompt(prev => (prev ? prev + '\n\n--- 文件内容: ' + file.name + ' ---\n' + text : text));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const [logHistory, setLogHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('dispatch_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [defaultSourceSetting, setDefaultSourceSetting] = useState(() => {
    return localStorage.getItem('dispatch_default_source') || 'local';
  });

  const [logRetentionDays, setLogRetentionDays] = useState(() => {
    return localStorage.getItem('dispatch_log_retention') || '30';
  });

  const availableModels = useMemo(
    () => models.filter((item) => item.source === source),
    [source],
  );

  const model = useMemo(
    () => availableModels.find((item) => item.id === selectedModel) ?? availableModels[0],
    [availableModels, selectedModel],
  );

  const analyticsData = useMemo(() => {
    const modelCounts = {};
    let totalTokens = 0;
    let totalLatency = 0;
    let successCount = 0;
    const today = new Date().toDateString();
    let todayCount = 0;

    logHistory.forEach(log => {
      modelCounts[log.model] = (modelCounts[log.model] || 0) + 1;
      totalTokens += log.totalTokens || 0;
      totalLatency += log.latency || 0;
      if (log.status === 'success') successCount++;
      if (new Date(log.time).toDateString() === today) todayCount++;
    });

    const maxCount = Math.max(...Object.values(modelCounts), 1);

    return {
      modelCounts,
      maxCount,
      totalTokens,
      avgLatency: logHistory.length ? Math.round(totalLatency / logHistory.length) : 0,
      successRate: logHistory.length ? Math.round((successCount / logHistory.length) * 100) : 0,
      todayCount,
    };
  }, [logHistory]);

  const addLog = (log) => {
    setLogHistory(prev => {
      const next = [log, ...prev].slice(0, 200);
      localStorage.setItem('dispatch_logs', JSON.stringify(next));
      return next;
    });
  };

  const handleSourceChange = (nextSource) => {
    const nextModels = models.filter((item) => item.source === nextSource);
    setSource(nextSource);
    setSelectedModel(nextModels[0]?.id ?? '');
    setTokenUsage({
      prompt: 0,
      completion: 0,
      total: 0,
      precision: 'idle',
      note: '',
    });
  };

  const runTask = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isRunning || !model) return;

    setIsRunning(true);
    const startTime = Date.now();
    let status = 'success';
    let responseTokens = { prompt: 0, completion: 0, total: 0, precision: 'idle', note: '' };
    
    try {
      const adapter = getModelAdapter(source);
      const response = await adapter.run({ model, prompt: trimmed });
      responseTokens = response.tokens;
      setResult(response.content);
    } catch (err) {
      status = 'failed';
      setResult({ error: err.message || '调用失败' });
    } finally {
      const latency = Date.now() - startTime;
      setTokenUsage(responseTokens);
      setIsRunning(false);
      
      addLog({
        id: Date.now().toString(),
        time: new Date().toLocaleString(),
        model: model.name,
        source: source,
        prompt: trimmed.length > 80 ? trimmed.slice(0, 80) + '...' : trimmed,
        promptTokens: responseTokens.prompt,
        completionTokens: responseTokens.completion,
        totalTokens: responseTokens.total,
        latency,
        status,
      });
    }
  };

  const clearLogs = () => {
    setLogHistory([]);
    localStorage.removeItem('dispatch_logs');
  };

  const exportLogs = () => {
    const blob = new Blob([JSON.stringify(logHistory, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dispatch_logs_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderPageContent = () => {
    switch (activePage) {
      case 'dispatch':
        return (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">Multi-model Dispatch</p>
                <h1>多模型智能调度控制台</h1>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="icon-button btn-interactive"
                  aria-label="上传文件"
                  title="上传文件到任务内容"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={18} />
                </button>
                <button className="icon-button btn-interactive" aria-label="添加模型">
                  <Plus size={18} />
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                accept=".txt,.md,.json,.csv,.py,.js,.jsx,.ts,.tsx,.html,.css,.xml,.yaml,.yml,.log,.env,.cfg,.ini"
                onChange={handleFileUpload}
              />
            </header>

            <section className="status-strip" aria-label="运行状态">
              <MetricCard
                icon={Gauge}
                label="Prompt Tokens"
                value={tokenUsage.prompt.toLocaleString()}
                accent="blue"
              />
              <MetricCard
                icon={Activity}
                label="Completion Tokens"
                value={tokenUsage.completion.toLocaleString()}
                accent="green"
              />
              <MetricCard
                icon={Cpu}
                label="Total Tokens"
                value={tokenUsage.total.toLocaleString()}
                accent="violet"
              />
              <MetricCard
                icon={BadgeCheck}
                label="Token Mode"
                value={tokenUsage.precision}
                accent="amber"
              />
            </section>

            <section className="workspace-grid">
              <TaskPanel
                prompt={prompt}
                systemPrompt={systemPrompt}
                source={source}
                sourceOptions={sourceOptions}
                selectedModel={selectedModel}
                model={model}
                models={availableModels}
                isRunning={isRunning}
                onSourceChange={handleSourceChange}
                onPromptChange={setPrompt}
                onSystemPromptChange={setSystemPrompt}
                onModelChange={setSelectedModel}
                onRunTask={runTask}
              />
              <ModelPanel model={model} sourceOptions={sourceOptions} tokenUsage={tokenUsage} />
            </section>

            <ResultPanel result={result} />
          </>
        );

      case 'models':
        return (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">Model Pool</p>
                <h1>模型池</h1>
              </div>
            </header>
            <section className="workspace-grid">
              {models.map((m) => (
                <div key={m.id} className="panel task-panel">
                  <div className="panel-heading">
                    <div>
                      <p className="section-kicker">Model</p>
                      <h2>{m.name}</h2>
                    </div>
                    <span className={`model-state ${m.status ?? 'idle'}`}>{m.status ?? 'idle'}</span>
                  </div>
                  <div className="source-block">
                    <span className="field-label">厂商</span>
                    <span>{m.vendor ?? '-'}</span>
                  </div>
                  <div className="source-block">
                    <span className="field-label">来源</span>
                    <span>{m.source}</span>
                  </div>
                  <div className="source-block">
                    <span className="field-label">延迟</span>
                    <span>{m.latency !== undefined && m.latency !== null ? `${m.latency}ms` : '-'}</span>
                  </div>
                </div>
              ))}
            </section>
          </>
        );

      case 'apikeys':
        return (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">API Keys</p>
                <h1>API 密钥管理</h1>
              </div>
            </header>
            <ApiKeyManager />
          </>
        );

      case 'logs':
        return (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">Logs</p>
                <h1>调用日志</h1>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="action-btn btn-interactive" onClick={exportLogs}>
                  <Download size={16} /> 导出 JSON
                </button>
                <button className="action-btn danger btn-interactive" onClick={clearLogs}>
                  <Trash2 size={16} /> 清空
                </button>
              </div>
            </header>
            <section className="panel task-panel" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} style={{ color: '#94a3b8' }} />
                <h2 style={{ fontSize: '16px', margin: 0 }}>最近 200 条记录</h2>
              </div>
              <div style={{ overflowX: 'auto', padding: '16px 0' }}>
                {logHistory.length === 0 ? (
                  <p style={{ padding: '24px', color: '#94a3b8', textAlign: 'center' }}>暂无调用日志</p>
                ) : (
                  <table className="log-table">
                    <thead>
                      <tr>
                        <th>时间</th>
                        <th>模型</th>
                        <th>来源</th>
                        <th>Tokens</th>
                        <th>延迟</th>
                        <th>状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logHistory.map(log => (
                        <tr key={log.id}>
                          <td style={{ whiteSpace: 'nowrap' }}>{log.time}</td>
                          <td>{log.model}</td>
                          <td>{log.source}</td>
                          <td>{log.totalTokens}</td>
                          <td>{log.latency}ms</td>
                          <td>
                            <span className={`status-badge ${log.status === 'success' ? 'status-success' : 'status-failed'}`}>
                              {log.status === 'success' ? <CheckCircle2 size={14}/> : <XCircle size={14}/>}
                              {log.status === 'success' ? '成功' : '失败'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </>
        );

      case 'analytics':
        return (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">Analytics</p>
                <h1>性能分析</h1>
              </div>
            </header>
            
            <section className="status-strip" aria-label="核心指标">
              <MetricCard icon={Cpu} label="总 Token" value={analyticsData.totalTokens.toLocaleString()} accent="blue" />
              <MetricCard icon={Gauge} label="平均延迟" value={`${analyticsData.avgLatency}ms`} accent="green" />
              <MetricCard icon={BadgeCheck} label="成功率" value={`${analyticsData.successRate}%`} accent="violet" />
              <MetricCard icon={Activity} label="今日调用" value={analyticsData.todayCount.toLocaleString()} accent="amber" />
            </section>

            <section className="panel task-panel">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">Distribution</p>
                  <h2>各模型调用次数</h2>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                {Object.keys(analyticsData.modelCounts).length === 0 ? (
                  <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>暂无调用数据</p>
                ) : (
                  Object.entries(analyticsData.modelCounts).map(([modelName, count]) => (
                    <div key={modelName}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
                        <span style={{ fontWeight: 500 }}>{modelName}</span>
                        <span style={{ color: '#94a3b8' }}>{count} 次</span>
                      </div>
                      <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden' }}>
                        <div 
                          className="bar-gradient" 
                          style={{ width: `${(count / analyticsData.maxCount) * 100}%`, height: '100%' }} 
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        );

      case 'settings':
        return (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">Settings</p>
                <h1>系统设置</h1>
              </div>
            </header>
            <section className="workspace-grid">
              <div className="panel task-panel">
                <div className="panel-heading">
                  <div>
                    <p className="section-kicker">Configuration</p>
                    <h2>系统配置</h2>
                  </div>
                </div>
                <div className="source-block">
                  <span className="field-label">默认调用源</span>
                  <select 
                    className="prompt-input" 
                    value={defaultSourceSetting} 
                    onChange={(e) => {
                      setDefaultSourceSetting(e.target.value);
                      localStorage.setItem('dispatch_default_source', e.target.value);
                    }}
                    style={{ maxWidth: '240px' }}
                  >
                    <option value="local">Local</option>
                    <option value="web">Web</option>
                  </select>
                </div>
                <div className="source-block">
                  <span className="field-label">日志保留天数</span>
                  <select 
                    className="prompt-input" 
                    value={logRetentionDays} 
                    onChange={(e) => {
                      setLogRetentionDays(e.target.value);
                      localStorage.setItem('dispatch_log_retention', e.target.value);
                    }}
                    style={{ maxWidth: '240px' }}
                  >
                    <option value="30">30 天</option>
                    <option value="60">60 天</option>
                    <option value="90">90 天</option>
                    <option value="unlimited">无限</option>
                  </select>
                </div>
                <div className="source-block">
                  <span className="field-label">浏览器信息</span>
                  <span style={{ fontSize: '13px', color: '#94a3b8', wordBreak: 'break-all', maxWidth: '500px', lineHeight: 1.5 }}>
                    {navigator.userAgent}
                  </span>
                </div>
              </div>
            </section>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="app-shell">
      <style>{globalStyles}</style>
      <CosmicBackdrop />
      <Sidebar activePage={activePage} onNavigate={setActivePage} pageMap={pageMap} />
      <main className="main-area">
        <div className="content-wrap">
          <div key={activePage} className="page-enter">
            {renderPageContent()}
          </div>
        </div>
      </main>
    </div>
  );
}
