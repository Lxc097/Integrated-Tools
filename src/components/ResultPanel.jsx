import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { MessageSquareText, Copy, Check } from 'lucide-react';

export function ResultPanel({ result, timestamp }) {
  const [copied, setCopied] = useState(false);

  const resultText = typeof result === 'string' ? result : result ? JSON.stringify(result, null, 2) : '';

  const handleCopy = async () => {
    if (!resultText) return;
    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <section className="panel result-panel">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Result Preview</p>
          <h2>结果展示</h2>
          {timestamp && (
            <p className="result-time">生成时间：{formatTimestamp(timestamp)}</p>
          )}
        </div>
        <div className="heading-actions">
          {resultText && (
            <button
              type="button"
              onClick={handleCopy}
              className={`icon-button ${copied ? 'copied' : ''}`}
              title="复制结果"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          )}
          <MessageSquareText size={18} />
        </div>
      </div>
      <article className="markdown-body">
        {resultText ? (
          <ReactMarkdown>{resultText}</ReactMarkdown>
        ) : (
          <div className="result-empty">暂无结果</div>
        )}
      </article>
    </section>
  );
}
