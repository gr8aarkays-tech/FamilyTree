import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTree } from '../contexts/TreeContext';
import { getUpcomingReminders } from '../services/reminderEngine';

export default function HomePage() {
  const { trees, removeTree, reminders: allReminders, persons } = useTree();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Collect all reminders across all trees for the dashboard
  const upcoming = getUpcomingReminders(allReminders, persons, 7);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">Family Tree</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500">Your family histories</p>
        </div>
        <button
          onClick={() => navigate('/trees/new')}
          className="flex items-center gap-1.5 bg-blue-500 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
          aria-label="Create new family tree"
        >
          + New Tree
        </button>
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Upcoming reminders */}
        {upcoming.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Upcoming</h2>
            <div className="space-y-2">
              {upcoming.slice(0, 3).map(u => (
                <div key={u.reminder.id} className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                  <span className="text-2xl">{u.reminder.type === 'birthday' ? '🎂' : '🕯️'}</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{u.label}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Family trees */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">My Family Trees</h2>

          {trees.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
              <div className="text-5xl mb-3">🌳</div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">No family trees yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-4">Start building your family history</p>
              <button
                onClick={() => navigate('/trees/new')}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                Create My Family Tree
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {trees.map(tree => (
                <div
                  key={tree.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  {confirmDelete === tree.id ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-700 dark:text-gray-300">Delete <strong>{tree.name}</strong>? This cannot be undone.</p>
                      <div className="flex gap-2">
                        <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300">Cancel</button>
                        <button onClick={() => { removeTree(tree.id); setConfirmDelete(null); }} className="flex-1 py-2 text-sm rounded-xl bg-red-500 text-white hover:bg-red-600">Delete</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <button
                        className="flex-1 text-left"
                        onClick={() => navigate(`/trees/${tree.id}`)}
                        aria-label={`Open ${tree.name}`}
                      >
                        <h3 className="font-semibold text-gray-800 dark:text-white">{tree.name}</h3>
                        {tree.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{tree.description}</p>}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Updated {new Date(tree.updatedAt).toLocaleDateString()}
                        </p>
                      </button>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => navigate(`/trees/${tree.id}/edit`)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                          aria-label="Edit tree settings"
                        >✏️</button>
                        <button
                          onClick={() => setConfirmDelete(tree.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
                          aria-label="Delete tree"
                        >🗑️</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
