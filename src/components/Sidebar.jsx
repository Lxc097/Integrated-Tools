import React from 'react';
import {
  BarChart3,
  Bot,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Settings,
  Sparkles,
  TerminalSquare,
  Trash2,
} from 'lucide-react';

const navItems = [
  { id: 'dispatch', label: '调度台', icon: LayoutDashboard },
  { id: 'models', label: '模型池', icon: Bot },
  { id: 'apikeys', label: 'API 密钥', icon: KeyRound },
  { id: 'logs', label: '调用日志', icon: TerminalSquare },
  { id: 'analytics', label: '性能分析', icon: BarChart3 },
  { id: 'settings', label: '系统设置', icon: Settings },
];

export function Sidebar({
  page,
  setPage,
  sessions = [],
  currentSessionId,
  onCreateSession,
  onSwitchSession,
  onDeleteSession,
}) {
  return (
    <>
      <div className="brand">
        <div className="brand-mark">
          <Sparkles size={18} />
        </div>
        <div>
          <strong>Dispatch</strong>
          <span>Control Console</span>
        </div>
      </div>

      <nav className="nav-list" aria-label="主导航">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              key={item.id}
              onClick={() => setPage(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sessions-section">
        <div className="sessions-header">
          <span>历史会话</span>
          <span className="sessions-count">{sessions.length}</span>
        </div>

        <div className="sessions-list">
          {sessions.map((session) => {
            const isActive = currentSessionId === session.id;
            const rawTitle = session.name || '新会话';
            const displayTitle =
              rawTitle.length > 14 ? `${rawTitle.slice(0, 14)}…` : rawTitle;

            return (
              <div
                key={session.id}
                className={`session-item ${isActive ? 'active' : ''}`}
                onClick={() => onSwitchSession(session.id)}
                title={rawTitle}
              >
                <MessageSquare size={14} className="session-icon" />
                <span className="session-title">{displayTitle}</span>
                <button
                  className="session-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  aria-label="删除会话"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>

        <button className="new-session-btn" onClick={onCreateSession}>
          <Plus size={16} />
          <span>新建会话</span>
        </button>
      </div>
    </>
  );
}
