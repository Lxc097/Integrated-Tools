import React from 'react';
import { ChevronDown, CirclePlay, Cloud, Home } from 'lucide-react';

const sourceIcons = {
  local: Home,
  web: Cloud,
};

function formatNumber(num) {
  return Math.round(num).toLocaleString('en-US');
}

export function TaskPanel({
  prompt,
  systemPrompt,
  source,
  sourceOptions,
  selectedModel,
  model,
  models,
  isRunning,
  onSourceChange,
  onPromptChange,
  onSystemPromptChange,
  onModelChange,
  onRunTask,
  contextUsed,
  maxContextTokens,
}) {
  const groupedModels = models.reduce((groups, item) => {
    const vendor = item.vendor || '其他';
    if (!groups[vendor]) {
      groups[vendor] = [];
    }
    groups[vendor].push(item);
    return groups;
  }, {});

  const contextPercent = maxContextTokens
    ? Math.min((contextUsed / maxContextTokens) * 100, 100)
    : 0;

  const contextColor =
    contextPercent > 80 ? '#ef4444' : contextPercent >= 50 ? '#f59e0b' : '#3b82f6';

  return (
    <div className="panel task-panel">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Task Input</p>
          <h2>{'\u4efb\u52a1\u8f93\u5165'}</h2>
        </div>
        <span className={`model-state ${model?.status ?? 'idle'}`}>{model?.status ?? 'idle'}</span>
      </div>

      <div className="source-block">
        <span className="field-label">{'\u8c03\u7528\u6e90'}</span>
        <div className="source-toggle" role="radiogroup" aria-label="\u8c03\u7528\u6e90">
          {sourceOptions.map((option) => {
            const Icon = sourceIcons[option.id];
            return (
              <button
                key={option.id}
                className={`source-option ${source === option.id ? 'active' : ''}`}
                type="button"
                role="radio"
                aria-checked={source === option.id}
                onClick={() => onSourceChange(option.id)}
              >
                <Icon size={17} />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <label className="field-label" htmlFor="system-prompt">
        {'System Prompt'}
      </label>
      <textarea
        id="system-prompt"
        className="prompt-input"
        placeholder="\u7cfb\u7edf\u63d0\u793a\u8bcd\uff08\u53ef\u9009\uff09"
        value={systemPrompt}
        onChange={(event) => onSystemPromptChange(event.target.value)}
      />

      <label className="field-label" htmlFor="task-prompt">
        {'\u4efb\u52a1\u5185\u5bb9'}
      </label>
      <textarea
        id="task-prompt"
        className="prompt-input"
        placeholder="\u8f93\u5165\u9700\u8981\u8c03\u5ea6\u7ed9\u6a21\u578b\u5904\u7406\u7684\u4efb\u52a1..."
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
      />

      <div className="action-row">
        <label className="select-wrap" htmlFor="model-select">
          <span>{'\u6a21\u578b'}</span>
          <select
            id="model-select"
            value={selectedModel}
            onChange={(event) => onModelChange(event.target.value)}
          >
            {Object.entries(groupedModels).map(([vendor, vendorModels]) => (
              <optgroup key={vendor} label={vendor}>
                {vendorModels.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown className="select-icon" size={16} aria-hidden="true" />
        </label>
        <button
          className="primary-button"
          type="button"
          onClick={onRunTask}
          disabled={!prompt.trim() || isRunning}
        >
          <CirclePlay size={18} />
          {isRunning ? '\u6267\u884c\u4e2d' : '\u6267\u884c\u4efb\u52a1'}
        </button>
      </div>

      {maxContextTokens ? (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
              fontSize: 12,
              color: 'rgba(255, 255, 255, 0.6)',
              fontFamily: 'inherit',
            }}
          >
            <span>
              {'上下文: '}
              {formatNumber(contextUsed)}
              {' / '}
              {formatNumber(maxContextTokens)}
              {' tokens'}
            </span>
            <span style={{ color: contextColor, fontWeight: 500 }}>
              {contextPercent.toFixed(1)}%
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: 6,
              borderRadius: 3,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${contextPercent}%`,
                height: '100%',
                borderRadius: 3,
                backgroundColor: contextColor,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}