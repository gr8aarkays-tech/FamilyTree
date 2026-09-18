import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTree } from '../contexts/TreeContext';
import { useSettings } from '../contexts/SettingsContext';


type Step = 'welcome' | 'tree-name' | 'your-name' | 'done';

export default function OnboardingPage() {
  const { createTree, addPerson, setAnchor } = useTree();
  const { updateSettings } = useSettings();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('welcome');
  const [treeName, setTreeName] = useState('My Family');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [_importFile, setImportFile] = useState<File | null>(null);

  async function handleStart() {
    if (!treeName.trim()) return;
    const tree = await createTree({ name: treeName.trim(), ownerId: 'local' });

    if (firstName.trim()) {
      const person = await addPerson({
        familyTreeId: tree.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender: 'other',
        isDeceased: false,
      });
      await setAnchor(person.id);
    }

    await updateSettings({ onboardingComplete: true });
    navigate(`/trees/${tree.id}`);
  }

  async function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    try {
      const { importBackup } = await import('../services/db');
      const text = await file.text();
      await importBackup(JSON.parse(text));
      await updateSettings({ onboardingComplete: true });
      window.location.reload();
    } catch {
      alert('Invalid backup file. Please try a valid family-tree-backup.json file.');
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <div className="w-full max-w-sm space-y-6">

        {step === 'welcome' && (
          <>
            <div className="text-center">
              <div className="text-7xl mb-4">🌳</div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Welcome to Family Tree</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm leading-relaxed">
                Build and preserve your family history.<br />
                Your data stays on your device.
              </p>
            </div>
            <button
              onClick={() => setStep('tree-name')}
              className="w-full py-4 rounded-2xl bg-blue-500 text-white font-semibold text-base hover:bg-blue-600 transition-colors shadow-md"
            >
              Create My Family Tree
            </button>
            <label className="w-full py-4 rounded-2xl border-2 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-semibold text-base text-center block cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Import Existing Tree
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
          </>
        )}

        {step === 'tree-name' && (
          <>
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Name Your Family Tree</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">You can create multiple trees later</p>
            </div>
            <input
              className="w-full rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-4 text-base focus:outline-none focus:border-blue-400"
              placeholder="e.g. My Family, The Smiths…"
              value={treeName}
              onChange={e => setTreeName(e.target.value)}
              autoFocus
            />
            <button
              onClick={() => setStep('your-name')}
              disabled={!treeName.trim()}
              className="w-full py-4 rounded-2xl bg-blue-500 text-white font-semibold text-base hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              Continue →
            </button>
          </>
        )}

        {step === 'your-name' && (
          <>
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Who are you?</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">You'll be the anchor "Me" person</p>
            </div>
            <div className="space-y-3">
              <input
                className="w-full rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-4 text-base focus:outline-none focus:border-blue-400"
                placeholder="First name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                autoFocus
              />
              <input
                className="w-full rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-4 text-base focus:outline-none focus:border-blue-400"
                placeholder="Last name"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
              />
            </div>
            <button
              onClick={handleStart}
              disabled={!firstName.trim()}
              className="w-full py-4 rounded-2xl bg-blue-500 text-white font-semibold text-base hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              Start Building My Tree 🌳
            </button>
            <button onClick={() => handleStart()} className="w-full text-sm text-gray-400 hover:underline py-2">
              Skip — I'll add myself later
            </button>
          </>
        )}
      </div>
    </div>
  );
}
