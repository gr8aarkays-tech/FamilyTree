import { useNavigate } from 'react-router-dom';
import { useTree } from '../contexts/TreeContext';

export default function TreesListPage() {
  const { trees } = useTree();
  const navigate = useNavigate();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800 dark:text-white">My Trees</h1>
        <button
          onClick={() => navigate('/trees/new')}
          className="flex items-center gap-1.5 bg-blue-500 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          + New Tree
        </button>
      </div>

      <div className="p-4 space-y-3 max-w-xl mx-auto">
        {trees.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🌳</div>
            <p className="text-gray-500 dark:text-gray-400">No family trees yet</p>
            <button onClick={() => navigate('/trees/new')} className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors">
              Create Your First Tree
            </button>
          </div>
        ) : (
          trees.map(tree => (
            <button
              key={tree.id}
              className="w-full text-left bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow"
              onClick={() => navigate(`/trees/${tree.id}`)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white">{tree.name}</h3>
                  {tree.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{tree.description}</p>}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Updated {new Date(tree.updatedAt).toLocaleDateString()}</p>
                </div>
                <span className="text-gray-300 dark:text-gray-600 text-xl">›</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
