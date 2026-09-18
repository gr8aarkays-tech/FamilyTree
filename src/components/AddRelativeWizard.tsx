import { Fragment, useState } from 'react';
import type { Person, RelationshipType } from '../types';

interface AddRelativeWizardProps {
  currentPerson: Person;
  allPersons: Person[];
  onSaveNewPerson: (
    personData: Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'familyTreeId'>,
    relationship: { personAId: string; personBId: string; type: RelationshipType }
  ) => void;
  onLinkExisting: (
    existingPersonId: string,
    relationship: { personAId: string; personBId: string; type: RelationshipType }
  ) => void;
  onCancel: () => void;
}

type Step = 'choose-relation' | 'select-existing' | 'add-new';

type RelOption = {
  label: string;
  type: RelationshipType;
  aIsParent?: boolean; // for parent-child: is currentPerson the parent?
};

const REL_OPTIONS: RelOption[] = [
  { label: '👨 Father', type: 'parent-child', aIsParent: false },
  { label: '👩 Mother', type: 'parent-child', aIsParent: false },
  { label: '👦 Son', type: 'parent-child', aIsParent: true },
  { label: '👧 Daughter', type: 'parent-child', aIsParent: true },
  { label: '👫 Spouse / Partner', type: 'spouse' },
  { label: '👱 Brother / Sister', type: 'parent-child', aIsParent: false }, // sibling via shared parent — simplification
];

export function AddRelativeWizard({
  currentPerson, allPersons, onSaveNewPerson, onLinkExisting, onCancel,
}: AddRelativeWizardProps) {
  const [step, setStep] = useState<Step>('choose-relation');
  const [selectedRel, setSelectedRel] = useState<RelOption | null>(null);
  const [existingId, setExistingId] = useState('');

  // Simple new person fields (minimal)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('other');
  const [dob, setDob] = useState('');

  function buildRelationship(otherPersonId: string): { personAId: string; personBId: string; type: RelationshipType } | null {
    if (!selectedRel) return null;
    if (selectedRel.type === 'spouse') {
      return { personAId: currentPerson.id, personBId: otherPersonId, type: 'spouse' };
    }
    // parent-child
    if (selectedRel.aIsParent) {
      // currentPerson is parent
      return { personAId: currentPerson.id, personBId: otherPersonId, type: 'parent-child' };
    } else {
      // other person is parent of currentPerson
      return { personAId: otherPersonId, personBId: currentPerson.id, type: 'parent-child' };
    }
  }

  function handleSaveNew() {
    if (!firstName.trim() || !selectedRel) return;
    const rel = buildRelationship('__new__');
    if (!rel) return;
    onSaveNewPerson(
      { firstName: firstName.trim(), lastName: lastName.trim(), gender, dob: dob || undefined, isDeceased: false },
      { ...rel, personBId: rel.personAId === currentPerson.id ? '__new__' : rel.personBId }
    );
  }

  function handleLinkExisting() {
    if (!existingId || !selectedRel) return;
    const rel = buildRelationship(existingId);
    if (!rel) return;
    onLinkExisting(existingId, rel);
  }

  const inputClass = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-1 text-xs text-gray-400">
        {['choose-relation', step === 'select-existing' ? 'select-existing' : 'add-new'].map((s, i) => (
          <Fragment key={s}>
            <span className={step === s ? 'text-blue-500 font-medium' : ''}>{i + 1}</span>
            {i < 1 && <span>›</span>}
          </Fragment>
        ))}
      </div>

      {/* Step 1: choose relationship & whether new or existing */}
      {step === 'choose-relation' && (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Add a relation for <strong>{currentPerson.firstName} {currentPerson.lastName}</strong>
            </p>
            <p className="text-xs text-gray-400 mt-1">Select relationship type:</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {REL_OPTIONS.map(opt => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setSelectedRel(opt)}
                className={`py-3 px-3 rounded-xl border-2 text-sm transition-colors text-left font-medium ${
                  selectedRel?.label === opt.label
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {selectedRel && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Choose person source:</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('add-new')}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 text-sm transition-colors"
                >
                  ➕ Add New Person
                </button>
                {allPersons.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep('select-existing')}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors"
                  >
                    🔗 Link Existing
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3a: select existing */}
      {step === 'select-existing' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">Select an existing person:</p>
          <select
            className={inputClass}
            value={existingId}
            onChange={e => setExistingId(e.target.value)}
          >
            <option value="">— Select person —</option>
            {allPersons
              .filter(p => p.id !== currentPerson.id)
              .map(p => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
              ))}
          </select>
          <div className="flex gap-3">
            <button onClick={() => setStep('choose-relation')} className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium">← Back</button>
            <button
              onClick={handleLinkExisting}
              disabled={!existingId}
              className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              Link
            </button>
          </div>
        </div>
      )}

      {/* Step 3b: add new */}
      {step === 'add-new' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">Adding: <strong>{selectedRel?.label}</strong> of {currentPerson.firstName}</p>
          <div>
            <label className={labelClass}>First Name *</label>
            <input className={inputClass} value={firstName} onChange={e => setFirstName(e.target.value)} autoFocus />
          </div>
          <div>
            <label className={labelClass}>Last Name</label>
            <input className={inputClass} value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Gender</label>
            <div className="flex gap-2">
              {(['male', 'female', 'other'] as const).map(g => (
                <button key={g} type="button" onClick={() => setGender(g)}
                  className={`flex-1 py-2 rounded-lg text-sm border-2 transition-colors ${gender === g ? (g === 'male' ? 'bg-blue-500 border-blue-500 text-white' : g === 'female' ? 'bg-pink-500 border-pink-500 text-white' : 'bg-gray-500 border-gray-500 text-white') : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
                  {g === 'male' ? '♂' : g === 'female' ? '♀' : '⚥'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Date of Birth</label>
            <input type="date" className={inputClass} value={dob} onChange={e => setDob(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('choose-relation')} className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium">← Back</button>
            <button
              onClick={handleSaveNew}
              disabled={!firstName.trim()}
              className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              Add Person
            </button>
          </div>
        </div>
      )}

      <button onClick={onCancel} className="w-full text-sm text-gray-400 hover:underline">Cancel</button>
    </div>
  );
}
