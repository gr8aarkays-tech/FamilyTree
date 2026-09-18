import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/',           label: 'Home',      icon: '🏠' },
  { to: '/trees',      label: 'Trees',     icon: '🌳' },
  { to: '/reminders',  label: 'Reminders', icon: '🔔' },
  { to: '/settings',   label: 'Settings',  icon: '⚙️' },
];

export function AppLayout() {
  const location = useLocation();
  // Hide bottom nav when inside a tree view (showing full-screen canvas)
  const insideTree = /^\/trees\/[^/]+(?:\/|$)/.test(location.pathname) && !location.pathname.endsWith('/edit');

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Online/Offline indicator */}
      <OnlineStatus />

      {/* Page content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>

      {/* Bottom navigation (mobile) */}
      {!insideTree && (
        <nav className="shrink-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 safe-area-inset-bottom md:hidden" aria-label="Bottom navigation">
          <div className="flex">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                    isActive
                      ? 'text-blue-500'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
                  }`
                }
                aria-label={item.label}
              >
                <span className="text-xl leading-none">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      )}

      {/* Desktop left sidebar */}
      {!insideTree && (
        <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-700 flex-col py-6 px-3 z-20">
          <div className="px-3 mb-6">
            <h1 className="text-lg font-bold text-gray-800 dark:text-white">🌳 Family Tree</h1>
          </div>
          <nav className="space-y-1 flex-1">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`
                }
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
      )}

      {/* Desktop content offset */}
      {!insideTree && (
        <style>{`@media (min-width: 768px) { main { margin-left: 224px; } }`}</style>
      )}
    </div>
  );
}

function OnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (online) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700 px-4 py-1.5 flex items-center gap-2" role="status" aria-live="polite">
      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
      <span className="text-xs text-amber-700 dark:text-amber-300">Offline — Data stored on this device</span>
    </div>
  );
}
