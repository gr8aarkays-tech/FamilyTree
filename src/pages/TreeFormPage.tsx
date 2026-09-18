import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTree } from '../contexts/TreeContext';

export default function TreeFormPage() {
  const { treeId } = useParams();
  const { trees, createTree, updateTree } = useTree();
  const navigate = useNavigate();

  const existing = treeId ? trees.find(t => t.id === treeId) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [errors, setErrors] = useState<{ name?: string }>({});

  function validate() {
    const e: { name?: string } = {};
    if (!name.trim()) e.name = 'Tree name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (existing) {
      await updateTree({ ...existing, name: name.trim(), description: description.trim() || undefined });
      navigate(`/trees/${existing.id}`);
    } else {
      const tree = await createTree({ name: name.trim(), description: description.trim() || undefined, ownerId: 'local' });
      navigate(`/trees/${tree.id}`);
    }
  }

  const inputClass = 'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl w-8 h-8 flex items-center justify-center" aria-label="Back">←</button>
        <h1 className="text-base font-semibold text-gray-800 dark:text-white">
          {existing ? 'Edit Family Tree' : 'Create Family Tree'}
        </h1>
      </div>

      <div className="max-w-md mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="treeName">
              Tree Name *
            </label>
            <input
              id="treeName"
              className={inputClass}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. My Family, Father's Side…"
              autoFocus
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="treeDesc">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="treeDesc"
              className={inputClass}
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="A brief description of this family tree…"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
            >
              {existing ? 'Save Changes' : 'Create Tree'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
