import type { Person, Relationship, Reminder } from '../types';
import { getImmediateRelatives, getRelationMeta } from '../services/relationshipEngine';
import { useSettings } from '../contexts/SettingsContext';

interface PersonDetailsPanelProps {
  person: Person;
  persons: Person[];
  relationships: Relationship[];
  reminders: Reminder[];
  anchorPersonId?: string;
  isAnchor: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetAnchor: () => void;
  onAddRelative: () => void;
  onCreateReminder: () => void;
  onClose: () => void;
  onViewOnTree: () => void;
}

export function PersonDetailsPanel({
  person, persons, relationships, reminders,
  anchorPersonId, isAnchor,
  onEdit, onDelete, onSetAnchor, onAddRelative, onCreateReminder, onClose, onViewOnTree,
}: PersonDetailsPanelProps) {
  const { settings } = useSettings();

  const gColor = person.gender === 'male' ? settings.maleColor
    : person.gender === 'female' ? settings.femaleColor
    : settings.otherColor;

  const name = `${person.firstName} ${person.lastName}`.trim();
  const genderLabel = person.gender === 'male' ? '♂ Male' : person.gender === 'female' ? '♀ Female' : '⚥ Other';

  function formatDate(iso?: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function calcAge(dob?: string, dod?: string) {
    if (!dob) return null;
    const end = dod ? new Date(dod) : new Date();
    const age = Math.floor((end.getTime() - new Date(dob).getTime()) / (365.25 * 86400000));
    return age >= 0 ? age : null;
  }

  const age = !person.isDeceased ? calcAge(person.dob) : null;
  const relatives = getImmediateRelatives(person.id, persons, relationships);

  const relMeta = anchorPersonId && anchorPersonId !== person.id
    ? getRelationMeta(anchorPersonId, person.id, persons, relationships)
    : null;

  const personReminders = reminders.filter(r => r.personId === person.id);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
        <h2 className="font-semibold text-gray-800 dark:text-white text-base">Person Details</h2>
        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-xl" aria-label="Close">✕</button>
      </div>

      {/* Profile */}
      <div className="p-4 flex flex-col items-center border-b border-gray-100 dark:border-gray-700" style={{ opacity: person.isDeceased ? settings.deceasedOpacity + 0.2 : 1 }}>
        {person.photo ? (
          <img src={person.photo} alt={name} className="w-20 h-20 rounded-full object-cover border-4" style={{ borderColor: gColor }} />
        ) : (
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold border-4" style={{ backgroundColor: gColor, borderColor: gColor }}>
            {person.firstName[0]}{person.lastName[0]}
          </div>
        )}
        <h3 className="mt-3 text-lg font-bold text-gray-800 dark:text-white">{name}</h3>
        <p className="text-sm font-medium mt-0.5" style={{ color: gColor }}>{genderLabel}</p>
        {isAnchor && <span className="mt-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">⭐ Anchor (Me)</span>}
        {person.isDeceased && <span className="mt-1 text-xs bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 px-2 py-0.5 rounded-full">✝ Deceased</span>}
        {relMeta && (
          <span
            className="mt-2 text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1.5 border"
            style={{
              backgroundColor: relMeta.badgeBg,
              borderColor: relMeta.badgeBorder,
              color: relMeta.badgeText,
            }}
          >
            <span>{relMeta.icon}</span>
            <span>Your {relMeta.label}</span>
          </span>
        )}
      </div>

      {/* Details */}
      <div className="p-4 space-y-3 border-b border-gray-100 dark:border-gray-700">
        <DetailRow label="Date of Birth" value={formatDate(person.dob)} />
        {!person.isDeceased && age !== null && <DetailRow label="Age" value={`${age} years`} />}
        {person.isDeceased && (
          <>
            <DetailRow label="Date of Death" value={formatDate(person.dod)} />
            {calcAge(person.dob, person.dod) !== null && <DetailRow label="Lived" value={`${calcAge(person.dob, person.dod)} years`} />}
          </>
        )}
        {person.phone && <DetailRow label="Phone" value={person.phone} />}
        {person.email && <DetailRow label="Email" value={person.email} />}
        {person.notes && <DetailRow label="Notes" value={person.notes} />}
      </div>

      {/* Relationships */}
      {relatives.length > 0 && (
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Immediate Family</h4>
          <div className="space-y-1">
            {relatives.map(({ person: rel, label }) => (
              <div key={rel.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: rel.gender === 'male' ? settings.maleColor : rel.gender === 'female' ? settings.femaleColor : settings.otherColor }}>
                    {rel.firstName[0]}
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{rel.firstName} {rel.lastName}</span>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reminders */}
      {personReminders.length > 0 && (
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Reminders</h4>
          {personReminders.map(r => (
            <div key={r.id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span>{r.type === 'birthday' ? '🎂' : '🕯️'}</span>
              <span>{r.type === 'birthday' ? 'Birthday' : 'Death anniversary'} reminder</span>
              <span className="text-xs text-gray-400">({r.timing === 'same-day' ? 'On the day' : `${r.timing} before`})</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="p-4 grid grid-cols-2 gap-2">
        <ActionButton icon="✏️" label="Edit" onClick={onEdit} />
        <ActionButton icon="➕" label="Add Relation" onClick={onAddRelative} />
        {!isAnchor && <ActionButton icon="⚓" label="Set as Me" onClick={onSetAnchor} />}
        <ActionButton icon="🎯" label="View on Tree" onClick={onViewOnTree} />
        <ActionButton icon="🔔" label="Reminder" onClick={onCreateReminder} />
        <ActionButton icon="🗑️" label="Delete" onClick={onDelete} variant="danger" />
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-700 dark:text-gray-300 text-right break-words max-w-[60%]">{value}</span>
    </div>
  );
}

function ActionButton({ icon, label, onClick, variant }: { icon: string; label: string; onClick: () => void; variant?: 'danger' }) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
        variant === 'danger'
          ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40'
          : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600',
      ].join(' ')}
    >
      <span>{icon}</span> {label}
    </button>
  );
}
