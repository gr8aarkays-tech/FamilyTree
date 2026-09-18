import { useMemo } from 'react';
import { useTree } from '../contexts/TreeContext';
import { getUpcomingReminders } from '../services/reminderEngine';

export default function RemindersPage() {
  const { reminders, persons, updateReminder, removeReminder } = useTree();

  const upcoming = useMemo(() => getUpcomingReminders(reminders, persons, 30), [reminders, persons]);
  const all = [...reminders].sort((a, b) => a.type.localeCompare(b.type));
  const personMap = new Map(persons.map(p => [p.id, p]));

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 px-4 py-3">
        <h1 className="text-lg font-bold text-gray-800 dark:text-white">Reminders</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500">Birthdays & death anniversaries</p>
      </div>

      <div className="p-4 space-y-6 max-w-xl mx-auto">
        {/* Upcoming */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Upcoming (Next 30 days)</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">No upcoming reminders</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map(u => (
                <div key={u.reminder.id} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 shadow-sm">
                  <span className="text-2xl">{u.reminder.type === 'birthday' ? '🎂' : '🕯️'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{u.label}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {u.daysUntil === 0 ? 'Today!' : `In ${u.daysUntil} day${u.daysUntil === 1 ? '' : 's'}`}
                    </p>
                  </div>
                  {u.daysUntil === 0 && <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">Today</span>}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* All reminders */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">All Reminders</h2>
          {all.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">No reminders set. Add people with birthdays to get started.</p>
          ) : (
            <div className="space-y-2">
              {all.map(rem => {
                const person = personMap.get(rem.personId);
                if (!person) return null;
                return (
                  <div key={rem.id} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                    <span className="text-xl">{rem.type === 'birthday' ? '🎂' : '🕯️'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{person.firstName} {person.lastName}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {rem.type === 'birthday' ? 'Birthday' : 'Death anniversary'} · {rem.timing === 'same-day' ? 'On the day' : `${rem.timing} before`}
                      </p>
                    </div>
                    {/* Toggle */}
                    <button
                      onClick={() => updateReminder({ ...rem, enabled: !rem.enabled })}
                      className={`relative w-9 h-5 rounded-full transition-colors ${rem.enabled ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-600'}`}
                      role="switch"
                      aria-checked={rem.enabled}
                      aria-label={rem.enabled ? 'Disable reminder' : 'Enable reminder'}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${rem.enabled ? 'translate-x-4' : ''}`} />
                    </button>
                    <button onClick={() => removeReminder(rem.id)} className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors" aria-label="Delete reminder">🗑️</button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
