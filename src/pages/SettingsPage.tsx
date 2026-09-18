import { useState, type ChangeEvent, type ReactNode } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import type { BaseTheme, VisualTheme, ReminderTiming } from '../types';
import { exportBackup, importBackup } from '../services/db';
import type { BackupData } from '../services/db';
import { requestNotificationPermission } from '../services/reminderEngine';

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const [importError, setImportError] = useState('');
  const [exportSuccess, setExportSuccess] = useState(false);

  async function handleExport() {
    const data = await exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `family-tree-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  }

  function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const data: BackupData = JSON.parse(ev.target?.result as string);
        await importBackup(data);
        window.location.reload();
      } catch {
        setImportError('Invalid backup file. Please try again.');
      }
    };
    reader.readAsText(file);
  }

  async function handleEnableNotifications() {
    const ok = await requestNotificationPermission();
    if (!ok) alert('Notifications were denied. Please enable them in browser settings.');
  }

  const rowClass = 'flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-gray-700 last:border-0';
  const labelClass = 'text-sm text-gray-700 dark:text-gray-300';
  const subLabelClass = 'text-xs text-gray-400 dark:text-gray-500 mt-0.5';

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 px-4 py-3">
        <h1 className="text-lg font-bold text-gray-800 dark:text-white">Settings</h1>
      </div>

      <div className="p-4 space-y-5 max-w-xl mx-auto pb-24">

        {/* Appearance */}
        <SettingsSection title="Appearance">
          <div className={rowClass}>
            <div>
              <p className={labelClass}>Base Theme</p>
            </div>
            <select
              value={settings.baseTheme}
              onChange={e => updateSettings({ baseTheme: e.target.value as BaseTheme })}
              className="text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="high-contrast">High Contrast</option>
            </select>
          </div>

          <div className={rowClass}>
            <p className={labelClass}>Visual Theme</p>
            <select
              value={settings.visualTheme}
              onChange={e => updateSettings({ visualTheme: e.target.value as VisualTheme })}
              className="text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1"
            >
              {(['classic','elegant','modern','nature','heritage','minimal'] as VisualTheme[]).map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className={rowClass}>
            <p className={labelClass}>Male color</p>
            <input type="color" value={settings.maleColor} onChange={e => updateSettings({ maleColor: e.target.value })} className="w-8 h-8 rounded border-0 cursor-pointer" />
          </div>
          <div className={rowClass}>
            <p className={labelClass}>Female color</p>
            <input type="color" value={settings.femaleColor} onChange={e => updateSettings({ femaleColor: e.target.value })} className="w-8 h-8 rounded border-0 cursor-pointer" />
          </div>
          <div className={rowClass}>
            <p className={labelClass}>Other / Unknown color</p>
            <input type="color" value={settings.otherColor} onChange={e => updateSettings({ otherColor: e.target.value })} className="w-8 h-8 rounded border-0 cursor-pointer" />
          </div>
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title="Notifications">
          <div className={rowClass}>
            <div>
              <p className={labelClass}>Birthday reminders</p>
            </div>
            <Toggle value={settings.birthdayReminders} onChange={v => updateSettings({ birthdayReminders: v })} />
          </div>
          <div className={rowClass}>
            <div>
              <p className={labelClass}>Death anniversary reminders</p>
            </div>
            <Toggle value={settings.deathAnniversaryReminders} onChange={v => updateSettings({ deathAnniversaryReminders: v })} />
          </div>
          <div className={rowClass}>
            <p className={labelClass}>Default timing</p>
            <select
              value={settings.defaultReminderTiming}
              onChange={e => updateSettings({ defaultReminderTiming: e.target.value as ReminderTiming })}
              className="text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1"
            >
              <option value="same-day">On the day</option>
              <option value="1-day">1 day before</option>
              <option value="3-days">3 days before</option>
              <option value="7-days">7 days before</option>
            </select>
          </div>
          <div className={rowClass}>
            <div>
              <p className={labelClass}>Browser notifications</p>
              <p className={subLabelClass}>Required for push alerts</p>
            </div>
            <button onClick={handleEnableNotifications} className="text-sm text-blue-500 font-medium hover:underline">
              Enable
            </button>
          </div>
        </SettingsSection>

        {/* Data */}
        <SettingsSection title="Data & Backup">
          <div className={rowClass}>
            <div>
              <p className={labelClass}>Export backup</p>
              <p className={subLabelClass}>Download all family data as JSON</p>
            </div>
            <button onClick={handleExport} className="text-sm text-blue-500 font-medium hover:underline">
              {exportSuccess ? '✓ Exported' : 'Export'}
            </button>
          </div>
          <div className={rowClass}>
            <div>
              <p className={labelClass}>Import backup</p>
              <p className={subLabelClass}>Restore from a JSON backup file</p>
            </div>
            <label className="text-sm text-blue-500 font-medium hover:underline cursor-pointer">
              Import
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
          </div>
          {importError && <div className="px-4 py-2 text-xs text-red-500">{importError}</div>}
        </SettingsSection>

        {/* Privacy */}
        <SettingsSection title="Privacy">
          <div className="px-4 py-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Your family data is stored on this device only. No data is sent to any server unless you explicitly enable sharing or Google Drive sync.
            </p>
          </div>
        </SettingsSection>

        {/* About */}
        <SettingsSection title="About">
          <div className={rowClass}>
            <p className={labelClass}>Version</p>
            <span className="text-sm text-gray-400">1.0.0</span>
          </div>
          <div className={rowClass}>
            <p className={labelClass}>Storage</p>
            <span className="text-sm text-gray-400">Local device (IndexedDB)</span>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">{title}</h2>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-600'}`}
      role="switch"
      aria-checked={value}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
    </button>
  );
}
