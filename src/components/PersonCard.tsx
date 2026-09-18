import { useSettings } from '../contexts/SettingsContext';
import type { Person, Relationship } from '../types';
import { getRelationMeta } from '../services/relationshipEngine';

interface PersonCardProps {
  person: Person;
  persons?: Person[];
  relationships?: Relationship[];
  anchorPersonId?: string;
  label?: string;
  isAnchor?: boolean;
  isSelected?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

export function PersonCard({
  person,
  persons = [],
  relationships = [],
  anchorPersonId,
  label,
  isAnchor,
  isSelected,
  compact,
  onClick,
}: PersonCardProps) {
  const { settings } = useSettings();

  const relMeta = anchorPersonId
    ? getRelationMeta(anchorPersonId, person.id, persons, relationships)
    : null;

  const genderColor = person.gender === 'male'
    ? settings.maleColor
    : person.gender === 'female'
    ? settings.femaleColor
    : settings.otherColor;

  const cardBorderColor = relMeta?.badgeBorder || genderColor;

  const opacity = person.isDeceased ? settings.deceasedOpacity : 1;
  const name = `${person.firstName} ${person.lastName}`.trim();

  const genderIcon = person.gender === 'male' ? '♂' : person.gender === 'female' ? '♀' : '⚥';

  function formatDate(iso?: string) {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function calcAge(dob?: string, dod?: string) {
    if (!dob) return null;
    const end = dod ? new Date(dod) : new Date();
    const start = new Date(dob);
    const age = Math.floor((end.getTime() - start.getTime()) / (365.25 * 86400000));
    return age >= 0 ? age : null;
  }

  const age = person.isDeceased ? null : calcAge(person.dob);
  const livedYears = person.isDeceased ? calcAge(person.dob, person.dod) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
      aria-label={`${name}${label ? ', ' + label : ''}${isAnchor ? ', anchor person' : ''}`}
      className={[
        'relative rounded-xl border-2 transition-all duration-150 cursor-pointer select-none',
        compact ? 'p-2 min-w-[90px] max-w-[120px]' : 'p-3 min-w-[120px] max-w-[160px]',
        isSelected ? 'ring-2 ring-offset-2 ring-blue-500' : '',
        isAnchor ? 'ring-2 ring-offset-2 ring-yellow-400' : '',
        'hover:shadow-lg dark:hover:shadow-gray-900',
        'dark:bg-gray-800 bg-white',
      ].join(' ')}
      style={{
        borderColor: cardBorderColor,
        opacity,
        boxShadow: isSelected ? undefined : `0 2px 8px ${cardBorderColor}40`,
      }}
    >
      {isAnchor && (
        <span className="absolute -top-2 -right-2 text-xs bg-yellow-400 text-yellow-900 rounded-full px-1.5 py-0.5 font-bold z-10">Me</span>
      )}
      {person.isDeceased && (
        <span className="absolute top-1 left-1 text-xs" title="Deceased" aria-label="Deceased">✝</span>
      )}

      {/* Avatar */}
      <div className="flex justify-center mb-1">
        {person.photo ? (
          <img
            src={person.photo}
            alt={name}
            className={`rounded-full object-cover border-2 ${compact ? 'w-10 h-10' : 'w-14 h-14'}`}
            style={{ borderColor: genderColor }}
          />
        ) : (
          <div
            className={`rounded-full flex items-center justify-center border-2 text-white font-bold ${compact ? 'w-10 h-10 text-sm' : 'w-14 h-14 text-lg'}`}
            style={{ backgroundColor: genderColor, borderColor: genderColor }}
          >
            {person.firstName[0]}{person.lastName[0]}
          </div>
        )}
      </div>

      {/* Name */}
      <p className={`font-semibold text-center truncate dark:text-white text-gray-800 ${compact ? 'text-xs' : 'text-sm'}`}>
        {name}
      </p>

      {!compact && (
        <>
          {/* Gender icon + status */}
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <span style={{ color: genderColor }}>{genderIcon}</span>
            {age !== null && <span>{age}y</span>}
            {livedYears !== null && <span>{livedYears}y</span>}
          </div>

          {/* DOB */}
          {person.dob && (
            <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-0.5">
              {formatDate(person.dob)}
            </p>
          )}

          {/* Relationship label with icon */}
          {relMeta && !isAnchor && (
            <div
              className="mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium flex items-center justify-center gap-1 border"
              style={{
                backgroundColor: relMeta.badgeBg,
                borderColor: relMeta.badgeBorder,
                color: relMeta.badgeText,
              }}
            >
              <span>{relMeta.icon}</span>
              <span className="truncate">{relMeta.shortLabel}</span>
            </div>
          )}
          {!relMeta && label && (
            <p className="text-xs text-center font-medium mt-1 truncate" style={{ color: genderColor }}>
              {label}
            </p>
          )}
        </>
      )}
    </div>
  );
}
