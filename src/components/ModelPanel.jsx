import React from 'react';
import { Bot, Sparkles } from 'lucide-react';

export function ModelPanel({ model, sourceOptions, tokenUsage }) {
  const sourceLabel =
    sourceOptions.find((option) => option.id === model?.source)?.shortLabel ?? model?.source ?? '-';

  const truncate = (str, max = 40) => {
    if (!str) return '-';
    return str.length > max ? `${str.slice(0, max)}…` : str;
  };

  const precisionColor = {
    reported: 'var(--color-success, #22c55e)',
    estimated: 'var(--color-warning, #eab308)',
    idle: 'var(--color-muted, #9ca3af)',
  };

  const precisionStyle = tokenUsage.precision
    ? { color: precisionColor[tokenUsage.precision] ?? 'inherit' }
    : {};

  return (
    <aside className="panel model-panel">
      <div className="panel-heading compact">
        <div>
          <p className="section-kicker">Selected Model</p>
          <h2>{'\u5f53\u524d\u6a21\u578b'}</h2>
        </div>
        <Sparkles size={18} />
      </div>
      <div className="selected-model">
        <div className="model-avatar">
          <Bot size={24} />
        </div>
        <div>
          <strong>{model?.name ?? '-'}</strong>
          <span>{model?.vendor ?? '-'}</span>
        </div>
      </div>
      <div className="model-facts">
        <div>
          <span>{'\u6765\u6e90'}</span>
          <strong>{sourceLabel}</strong>
        </div>
        <div>
          <span>{'\u72b6\u6001'}</span>
          <strong>{model?.status ?? '-'}</strong>
        </div>
        <div>
          <span>{'\u5e73\u5747\u5ef6\u8fdf'}</span>
          <strong>{model?.latency ?? '-'}</strong>
        </div>
        <div>
          <span>Token</span>
          <strong style={precisionStyle}>{tokenUsage.precision}</strong>
        </div>
        <div>
          <span>Base URL</span>
          <strong title={model?.baseUrl ?? '-'} style={{ textTransform: 'none' }}>{truncate(model?.baseUrl)}</strong>
        </div>
        <div>
          <span>API Key Env</span>
          <strong style={{ textTransform: 'none' }}>{model?.apiKeyEnv ?? '-'}</strong>
        </div>
        <div>
          <span>接口模型</span>
          <strong style={{ textTransform: 'none' }}>{model?.apiModel || '运行时检测'}</strong>
        </div>
      </div>
      {tokenUsage.note ? <p className="token-note">{tokenUsage.note}</p> : null}
    </aside>
  );
}
