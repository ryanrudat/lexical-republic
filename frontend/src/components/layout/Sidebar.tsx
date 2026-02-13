import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  locked?: boolean;
  lockWeek?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'mission', label: 'Current Shift', icon: '\u25B8', path: '/terminal' },
  { id: 'harmony', label: 'Harmony Feed', icon: '\u266B', path: '/terminal', locked: true, lockWeek: 3 },
  { id: 'roster', label: 'Duty Roster', icon: '\u2630', path: '/season' },
  { id: 'file', label: 'My File', icon: '\u2302', path: '/terminal' },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  currentWeek?: number;
}

export default function Sidebar({ collapsed = false, onToggle, currentWeek = 1 }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [, setHoveredId] = useState<string | null>(null);

  return (
    <nav className={`bg-terminal-bg border-r border-terminal-border flex flex-col transition-all duration-200 ${
      collapsed ? 'w-12' : 'w-60'
    }`}>
      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="p-3 text-terminal-green-dim hover:text-terminal-green border-b border-terminal-border transition-colors text-left"
      >
        <span className="font-ibm-mono text-sm">{collapsed ? '\u00BB' : '\u00AB'}</span>
      </button>

      {/* Nav items */}
      <div className="flex-1 py-2">
        {NAV_ITEMS.map((item) => {
          const isLocked = item.locked && currentWeek < (item.lockWeek || 999);
          const isActive = location.pathname === item.path && item.id === 'mission';

          return (
            <button
              key={item.id}
              onClick={() => !isLocked && navigate(item.path)}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              disabled={isLocked}
              className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors border-l-2 ${
                isActive
                  ? 'border-terminal-green bg-terminal-green/5 text-terminal-green'
                  : isLocked
                  ? 'border-transparent text-terminal-green-dim/30 cursor-not-allowed'
                  : 'border-transparent text-terminal-green-dim hover:text-terminal-green hover:bg-terminal-green/5'
              }`}
            >
              <span className="font-ibm-mono text-sm w-5 text-center flex-shrink-0">
                {isLocked ? '\uD83D\uDD12' : item.icon}
              </span>
              {!collapsed && (
                <span className="font-ibm-mono text-xs tracking-wider truncate">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Duty Roster link */}
      {!collapsed && (
        <div className="border-t border-terminal-border p-3">
          <button
            onClick={() => navigate('/season')}
            className="w-full text-left font-ibm-mono text-[11px] text-terminal-green-dim hover:text-terminal-green tracking-wider transition-colors"
          >
            {'\u25B8'} DUTY ROSTER
          </button>
        </div>
      )}
    </nav>
  );
}
