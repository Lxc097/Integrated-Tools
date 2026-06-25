import React from 'react';
import {
  BarChart3,
  Bot,
  KeyRound,
  LayoutDashboard,
  Settings,
  Sparkles,
  TerminalSquare,
} from 'lucide-react';

const navItems = [
  { id: 'dispatch', label: '调度台', icon: LayoutDashboard },
  { id: 'models', label: '模型池', icon: Bot },
  { id: 'apikeys', label: 'API 密钥', icon: KeyRound },
  { id: 'logs', label: '调用日志', icon: TerminalSquare },
  { id: 'analytics', label: '性能分析', icon: BarChart3 },
  { id: 'settings', label: '系统设置', icon: Settings },
];

export function Sidebar({ activePage, onNavigate }) {
  return (
    <aside className="sidebar">
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
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              key={item.id}
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
