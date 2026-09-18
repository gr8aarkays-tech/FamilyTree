import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTree } from '../contexts/TreeContext';
import { TreeVisualization } from '../components/TreeVisualization';
import { PersonDetailsPanel } from '../components/PersonDetailsPanel';
import { PersonForm } from '../components/PersonForm';
import { AddRelativeWizard } from '../components/AddRelativeWizard';
import type { Person, RelationshipType } from '../types';

type SidePanel = 'none' | 'details' | 'add-person' | 'edit-person' | 'add-relative' | 'create-reminder';

export default function TreeViewPage() {
  const { treeId } = useParams<{ treeId: string }>();
  const navigate = useNavigate();
  const {
    currentTree, persons, relationships, reminders,
    loadTree, addPerson, updatePerson, removePerson,
    addRelationship, addReminder, setAnchor,
  } = useTree();

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [sidePanel, setSidePanel] = useState<SidePanel>('none');
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (treeId) loadTree(treeId);
  }, [treeId, loadTree]);

  const selectedPerson = persons.find(p => p.id === selectedPersonId) ?? null;

  const handlePersonClick = useCallback((personId: string) => {
    setSelectedPersonId(personId);
    setSidePanel('details');
  }, []);

  async function handleAddPerson(data: Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'familyTreeId'>) {
    if (!treeId) return;
    await addPerson({ ...data, familyTreeId: treeId });
    setSidePanel('none');
  }

  async function handleEditPerson(data: Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'familyTreeId'>) {
    if (!editingPerson) return;
    await updatePerson({ ...editingPerson, ...data });
    setEditingPerson(null);
    setSidePanel(selectedPersonId ? 'details' : 'none');
  }

  async function handleDeletePerson() {
    if (!selectedPersonId) return;
    await removePerson(selectedPersonId);
    setSelectedPersonId(null);
    setSidePanel('none');
  }

  async function handleAddRelativeWizard(
    personData: Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'familyTreeId'>,
    relData: { personAId: string; personBId: string; type: RelationshipType }
  ) {
    if (!treeId) return;
    const newPerson = await addPerson({ ...personData, familyTreeId: treeId });
    // Replace placeholder '__new__' with actual id
    const finalRelData = {
      ...relData,
      personAId: relData.personAId === '__new__' ? newPerson.id : relData.personAId,
      personBId: relData.personBId === '__new__' ? newPerson.id : relData.personBId,
      familyTreeId: treeId,
    };
    await addRelationship(finalRelData);
    setSidePanel('details');
  }

  async function handleLinkExisting(_existingId: string, relData: { personAId: string; personBId: string; type: RelationshipType }) {
    if (!treeId) return;
    await addRelationship({ ...relData, familyTreeId: treeId });
    setSidePanel('details');
  }

  const filteredPersons = search
    ? persons.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        p.email?.toLowerCase().includes(search.toLowerCase()) ||
        p.phone?.includes(search)
      )
    : [];

  if (!currentTree) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 px-3 py-2 flex items-center gap-2 shrink-0">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 w-8 h-8 flex items-center justify-center text-xl" aria-label="Back">←</button>

        <h1 className="font-semibold text-gray-800 dark:text-white text-sm flex-1 truncate">{currentTree.name}</h1>

        <button onClick={() => setSearchOpen(!searchOpen)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Search">🔍</button>
        <button onClick={() => navigate(`/trees/${treeId}/edit`)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Tree settings">⚙️</button>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="bg-white dark:bg-gray-900 px-4 py-2 border-b border-gray-100 dark:border-gray-700">
          <input
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search by name, email, phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          {search && filteredPersons.length > 0 && (
            <div className="mt-2 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg max-h-48 overflow-y-auto">
              {filteredPersons.map(p => (
                <button
                  key={p.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                  onClick={() => { handlePersonClick(p.id); setSearch(''); setSearchOpen(false); }}
                >
                  <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs text-blue-600 dark:text-blue-300 font-bold">{p.firstName[0]}</div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{p.firstName} {p.lastName}</span>
                </button>
              ))}
            </div>
          )}
          {search && filteredPersons.length === 0 && (
            <p className="text-xs text-gray-400 mt-2 px-1">No results for "{search}"</p>
          )}
        </div>
      )}

      {/* Main content: tree + side panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tree visualization */}
        <div className={`flex-1 flex flex-col overflow-hidden ${sidePanel !== 'none' ? 'hidden md:flex' : ''}`}>
          <TreeVisualization
            persons={persons}
            relationships={relationships}
            anchorPersonId={currentTree.anchorPersonId}
            selectedPersonId={selectedPersonId ?? undefined}
            onPersonClick={handlePersonClick}
          />
        </div>

        {/* Side panel */}
        {sidePanel !== 'none' && (
          <div className="w-full md:w-80 lg:w-96 flex flex-col border-l border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shrink-0">
            {sidePanel === 'details' && selectedPerson && (
              <PersonDetailsPanel
                person={selectedPerson}
                persons={persons}
                relationships={relationships}
                reminders={reminders}
                anchorPersonId={currentTree.anchorPersonId}
                isAnchor={currentTree.anchorPersonId === selectedPerson.id}
                onEdit={() => { setEditingPerson(selectedPerson); setSidePanel('edit-person'); }}
                onDelete={handleDeletePerson}
                onSetAnchor={() => { setAnchor(selectedPerson.id); }}
                onAddRelative={() => setSidePanel('add-relative')}
                onCreateReminder={() => setSidePanel('create-reminder')}
                onClose={() => { setSidePanel('none'); setSelectedPersonId(null); }}
                onViewOnTree={() => setSidePanel('none')}
              />
            )}

            {sidePanel === 'add-person' && (
              <div className="flex flex-col h-full overflow-y-auto">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                  <h2 className="font-semibold text-gray-800 dark:text-white">Add Person</h2>
                  <button onClick={() => setSidePanel('none')} className="w-8 h-8 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-xl flex items-center justify-center" aria-label="Close">✕</button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                  <PersonForm onSave={handleAddPerson} onCancel={() => setSidePanel('none')} />
                </div>
              </div>
            )}

            {sidePanel === 'edit-person' && editingPerson && (
              <div className="flex flex-col h-full overflow-y-auto">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                  <h2 className="font-semibold text-gray-800 dark:text-white">Edit Person</h2>
                  <button onClick={() => setSidePanel('details')} className="w-8 h-8 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-xl flex items-center justify-center" aria-label="Close">✕</button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                  <PersonForm initial={editingPerson} onSave={handleEditPerson} onCancel={() => setSidePanel('details')} />
                </div>
              </div>
            )}

            {sidePanel === 'add-relative' && selectedPerson && (
              <div className="flex flex-col h-full overflow-y-auto">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                  <h2 className="font-semibold text-gray-800 dark:text-white">Add Relation</h2>
                  <button onClick={() => setSidePanel('details')} className="w-8 h-8 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-xl flex items-center justify-center" aria-label="Close">✕</button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                  <AddRelativeWizard
                    currentPerson={selectedPerson}
                    allPersons={persons}
                    onSaveNewPerson={handleAddRelativeWizard}
                    onLinkExisting={handleLinkExisting}
                    onCancel={() => setSidePanel('details')}
                  />
                </div>
              </div>
            )}

            {sidePanel === 'create-reminder' && selectedPerson && (
              <CreateReminderPanel
                person={selectedPerson}
                treeId={treeId!}
                onSave={async (type, timing) => {
                  await addReminder({ familyTreeId: treeId!, personId: selectedPerson.id, type, timing, enabled: true });
                  setSidePanel('details');
                }}
                onClose={() => setSidePanel('details')}
              />
            )}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setSidePanel('add-person')}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full bg-blue-500 text-white shadow-lg flex items-center justify-center text-2xl hover:bg-blue-600 transition-colors z-20 md:bottom-6"
        aria-label="Add person"
      >
        +
      </button>
    </div>
  );
}

function CreateReminderPanel({ person, treeId: _treeId, onSave, onClose }: {
  person: Person;
  treeId: string;
  onSave: (type: 'birthday' | 'death-anniversary', timing: 'same-day' | '1-day' | '3-days' | '7-days') => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<'birthday' | 'death-anniversary'>('birthday');
  const [timing, setTiming] = useState<'same-day' | '1-day' | '3-days' | '7-days'>('same-day');

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
        <h2 className="font-semibold text-gray-800 dark:text-white">Create Reminder</h2>
        <button onClick={onClose} className="w-8 h-8 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-xl flex items-center justify-center" aria-label="Close">✕</button>
      </div>
      <div className="p-4 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">For: <strong>{person.firstName} {person.lastName}</strong></p>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reminder type</label>
          <div className="flex gap-2">
            <button onClick={() => setType('birthday')} className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-colors ${type === 'birthday' ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
              🎂 Birthday
            </button>
            <button onClick={() => setType('death-anniversary')} className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-colors ${type === 'death-anniversary' ? 'bg-gray-600 border-gray-600 text-white' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
              🕯️ Anniversary
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Remind me</label>
          {(['same-day', '1-day', '3-days', '7-days'] as const).map(t => (
            <button key={t} onClick={() => setTiming(t)} className={`w-full text-left px-4 py-3 rounded-xl mb-1 text-sm transition-colors ${timing === t ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              {t === 'same-day' ? 'On the day' : t === '1-day' ? '1 day before' : t === '3-days' ? '3 days before' : '7 days before'}
            </button>
          ))}
        </div>

        <button onClick={() => onSave(type, timing)} className="w-full py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors">
          Save Reminder
        </button>
      </div>
    </div>
  );
}
