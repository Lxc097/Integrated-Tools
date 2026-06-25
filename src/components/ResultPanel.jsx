import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { MessageSquareText, Copy, Check } from 'lucide-react';

export function ResultPanel({ result, timestamp }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
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
            <p className="text-xs text-gray-500 mt-1">
              生成时间：{formatTimestamp(timestamp)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <button
              onClick={handleCopy}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
              title="复制结果"
            >
              {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
            </button>
          )}
          <MessageSquareText size={18} />
        </div>
      </div>
      <article className="markdown-body">
        {result ? (
          <ReactMarkdown>{result}</ReactMarkdown>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 py-10">
            暂无结果
          </div>
        )}
      </article>
    </section>
  );
}
