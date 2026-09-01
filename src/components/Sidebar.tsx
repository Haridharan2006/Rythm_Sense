import React from 'react';
import type { NavScreen, ThemeMode } from '../types';
import { LayoutDashboard, Radio, BarChart2, Layers, Sun, Moon } from 'lucide-react';

interface SidebarProps {
  currentScreen: NavScreen;
  onSelectScreen: (screen: NavScreen) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onSelectScreen,
  theme,
  onToggleTheme,
}) => {
  const navItems: { id: NavScreen; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
    { id: 'live', label: 'Live Analysis', icon: <Radio size={16} /> },
    { id: 'evaluation', label: 'Evaluation', icon: <BarChart2 size={16} /> },
    { id: 'methodology', label: 'Methodology', icon: <Layers size={16} /> },
  ];

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-header">
          <div className="brand-wordmark">
            <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>ACOUSTIGUARD</span>
          </div>
          <div className="brand-submark">Industrial Acoustic Intelligence</div>
        </div>

        <nav className="nav-menu">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${currentScreen === item.id ? 'active' : ''}`}
              onClick={() => onSelectScreen(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="sidebar-footer">
        {/* Theme Mode Toggle Button */}
        <button
          type="button"
          className="btn-secondary"
          onClick={onToggleTheme}
          style={{
            width: '100%',
            justifyContent: 'flex-start',
            padding: '7px 10px',
            marginBottom: '14px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {theme === 'dark' ? (
            <>
              <Sun size={14} style={{ color: 'var(--accent-primary)' }} />
              <span>THEME: DARK MODE</span>
            </>
          ) : (
            <>
              <Moon size={14} style={{ color: 'var(--text-secondary)' }} />
              <span>THEME: LIGHT MODE</span>
            </>
          )}
        </button>

        <div className="system-status">
          <div className="status-dot"></div>
          <span>Inference engine ready</span>
        </div>
        <div className="model-meta">
          <div>MODEL VERSION: TCN-PC v0.1</div>
          <div>CALIBRATION: Conformal</div>
        </div>
      </div>
    </aside>
  );
};
