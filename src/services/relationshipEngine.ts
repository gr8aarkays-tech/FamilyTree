/**
 * Relationship engine: derives human-readable labels from normalized parent-child / spouse graph.
 */
import type { Person, Relationship } from '../types';

type AdjacencyMap = Map<string, { parents: string[]; children: string[]; spouses: string[] }>;

function buildAdjacency(relationships: Relationship[]): AdjacencyMap {
  const map: AdjacencyMap = new Map();

  const ensure = (id: string) => {
    if (!map.has(id)) map.set(id, { parents: [], children: [], spouses: [] });
    return map.get(id)!;
  };

  for (const rel of relationships) {
    if (rel.type === 'parent-child') {
      ensure(rel.personAId).children.push(rel.personBId);
      ensure(rel.personBId).parents.push(rel.personAId);
    } else if (rel.type === 'spouse') {
      ensure(rel.personAId).spouses.push(rel.personBId);
      ensure(rel.personBId).spouses.push(rel.personAId);
    }
  }
  return map;
}

export type RelationCategory =
  | 'self'
  | 'spouse'
  | 'child'
  | 'parent'
  | 'sibling'
  | 'paternal-grandparent'
  | 'maternal-grandparent'
  | 'paternal-uncle-aunt'
  | 'maternal-uncle-aunt'
  | 'paternal-cousin'
  | 'maternal-cousin'
  | 'in-law'
  | 'grandchild'
  | 'other';

export interface RelationMetadata {
  label: string;
  shortLabel: string;
  icon: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  category: RelationCategory;
}

type StepEdge = {
  kind: 'parent' | 'child' | 'spouse';
  personId: string;
};

/**
 * Returns relation metadata (icon, specialized label like Maternal Aunt / Paternal Cousin, color codes)
 * from anchor's perspective to target person.
 */
export function getRelationMeta(
  anchorId: string | undefined,
  targetId: string,
  persons: Person[],
  relationships: Relationship[]
): RelationMetadata {
  const personMap = new Map(persons.map(p => [p.id, p]));
  const target = personMap.get(targetId);

  if (!anchorId || anchorId === targetId) {
    return {
      label: 'Self (Me)',
      shortLabel: 'Me',
      icon: '⭐',
      badgeBg: '#fef3c7',
      badgeBorder: '#f59e0b',
      badgeText: '#92400e',
      category: 'self',
    };
  }

  if (!target) {
    return {
      label: 'Relative',
      shortLabel: 'Relative',
      icon: '👤',
      badgeBg: '#f3f4f6',
      badgeBorder: '#9ca3af',
      badgeText: '#4b5563',
      category: 'other',
    };
  }

  const adj = buildAdjacency(relationships);

  // BFS from anchor, tracking path of nodes to know maternal vs paternal
  type State = { id: string; path: StepEdge[] };
  const visited = new Set<string>();
  const queue: State[] = [{ id: anchorId, path: [] }];

  let foundPath: StepEdge[] | null = null;

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const adj_ = adj.get(id) ?? { parents: [], children: [], spouses: [] };

    // Spouse
    for (const sid of adj_.spouses) {
      const newPath: StepEdge[] = [...path, { kind: 'spouse', personId: sid }];
      if (sid === targetId) {
        foundPath = newPath;
        break;
      }
      if (!visited.has(sid) && path.length < 5) queue.push({ id: sid, path: newPath });
    }
    if (foundPath) break;

    // Parents
    for (const pid of adj_.parents) {
      const newPath: StepEdge[] = [...path, { kind: 'parent', personId: pid }];
      if (pid === targetId) {
        foundPath = newPath;
        break;
      }
      if (!visited.has(pid) && path.length < 5) queue.push({ id: pid, path: newPath });
    }
    if (foundPath) break;

    // Children
    for (const cid of adj_.children) {
      const newPath: StepEdge[] = [...path, { kind: 'child', personId: cid }];
      if (cid === targetId) {
        foundPath = newPath;
        break;
      }
      if (!visited.has(cid) && path.length < 5) queue.push({ id: cid, path: newPath });
    }
    if (foundPath) break;
  }

  if (!foundPath) {
    return {
      label: 'Relative',
      shortLabel: 'Relative',
      icon: '👤',
      badgeBg: '#f3f4f6',
      badgeBorder: '#9ca3af',
      badgeText: '#4b5563',
      category: 'other',
    };
  }

  return categorizePath(foundPath, target, personMap);
}

function categorizePath(
  path: StepEdge[],
  target: Person,
  personMap: Map<string, Person>
): RelationMetadata {
  const g = target.gender;
  const isMale = g === 'male';
  const isFemale = g === 'female';
  const kinds = path.map(p => p.kind).join(',');

  // 1. Spouse
  if (kinds === 'spouse') {
    return {
      label: isMale ? 'Husband' : isFemale ? 'Wife' : 'Spouse',
      shortLabel: isMale ? 'Husband' : isFemale ? 'Wife' : 'Spouse',
      icon: '💍',
      badgeBg: '#fdf2f8',
      badgeBorder: '#ec4899',
      badgeText: '#9d174d',
      category: 'spouse',
    };
  }

  // 2. Direct Child
  if (kinds === 'child') {
    return {
      label: isMale ? 'Son' : isFemale ? 'Daughter' : 'Child',
      shortLabel: isMale ? 'Son' : isFemale ? 'Daughter' : 'Child',
      icon: isMale ? '👦' : isFemale ? '👧' : '🧒',
      badgeBg: '#ecfeff',
      badgeBorder: '#06b6d4',
      badgeText: '#155e75',
      category: 'child',
    };
  }

  // 3. Direct Parent
  if (kinds === 'parent') {
    const parentPerson = personMap.get(path[0].personId);
    const parentIsFather = parentPerson?.gender === 'male';
    const parentIsMother = parentPerson?.gender === 'female';
    return {
      label: parentIsFather ? 'Father' : parentIsMother ? 'Mother' : 'Parent',
      shortLabel: parentIsFather ? 'Father' : parentIsMother ? 'Mother' : 'Parent',
      icon: parentIsFather ? '👨' : parentIsMother ? '👩' : '🧑',
      badgeBg: parentIsFather ? '#eff6ff' : '#fdf2f8',
      badgeBorder: parentIsFather ? '#3b82f6' : '#ec4899',
      badgeText: parentIsFather ? '#1e40af' : '#9d174d',
      category: 'parent',
    };
  }

  // 4. Sibling (parent -> child)
  if (kinds === 'parent,child') {
    return {
      label: isMale ? 'Brother' : isFemale ? 'Sister' : 'Sibling',
      shortLabel: isMale ? 'Brother' : isFemale ? 'Sister' : 'Sibling',
      icon: isMale ? '👦' : isFemale ? '👧' : '🧑',
      badgeBg: '#f5f3ff',
      badgeBorder: '#8b5cf6',
      badgeText: '#5b21b6',
      category: 'sibling',
    };
  }

  // 5. Grandparents (parent -> parent)
  if (kinds === 'parent,parent') {
    const firstParent = personMap.get(path[0].personId);
    const isMaternal = firstParent?.gender === 'female';
    const prefix = isMaternal ? 'Maternal ' : 'Paternal ';
    const role = isMale ? 'Grandfather' : isFemale ? 'Grandmother' : 'Grandparent';
    return {
      label: `${prefix}${role}`,
      shortLabel: isMale ? `${isMaternal ? 'Mat.' : 'Pat.'} Grandpa` : `${isMaternal ? 'Mat.' : 'Pat.'} Grandma`,
      icon: isMaternal ? (isMale ? '👴🏼' : '👵🏼') : (isMale ? '👴' : '👵'),
      badgeBg: isMaternal ? '#f0fdf4' : '#eff6ff',
      badgeBorder: isMaternal ? '#22c55e' : '#3b82f6',
      badgeText: isMaternal ? '#166534' : '#1e40af',
      category: isMaternal ? 'maternal-grandparent' : 'paternal-grandparent',
    };
  }

  // 6. Uncles & Aunts (parent -> parent -> child OR parent -> sibling)
  if (kinds === 'parent,parent,child') {
    const firstParent = personMap.get(path[0].personId);
    const isMaternal = firstParent?.gender === 'female';
    const prefix = isMaternal ? 'Maternal ' : 'Paternal ';
    const role = isMale ? 'Uncle' : isFemale ? 'Aunt' : 'Uncle/Aunt';
    return {
      label: `${prefix}${role}`,
      shortLabel: `${prefix}${role}`,
      icon: isMaternal ? (isMale ? '🧔' : '👩‍🦰') : (isMale ? '👨‍💼' : '👩‍💼'),
      badgeBg: isMaternal ? '#ecfdf5' : '#f0f9ff',
      badgeBorder: isMaternal ? '#10b981' : '#0284c7',
      badgeText: isMaternal ? '#065f46' : '#075985',
      category: isMaternal ? 'maternal-uncle-aunt' : 'paternal-uncle-aunt',
    };
  }

  // 7. Cousins (parent -> parent -> child -> child)
  if (kinds === 'parent,parent,child,child') {
    const firstParent = personMap.get(path[0].personId);
    const isMaternal = firstParent?.gender === 'female';
    const prefix = isMaternal ? 'Maternal ' : 'Paternal ';
    return {
      label: `${prefix}Cousin`,
      shortLabel: `${prefix}Cousin`,
      icon: isMaternal ? '🌿' : '🔷',
      badgeBg: isMaternal ? '#fefce8' : '#e0e7ff',
      badgeBorder: isMaternal ? '#eab308' : '#6366f1',
      badgeText: isMaternal ? '#854d0e' : '#3730a3',
      category: isMaternal ? 'maternal-cousin' : 'paternal-cousin',
    };
  }

  // 8. In-laws
  if (kinds.startsWith('spouse,parent') || kinds.startsWith('parent,spouse')) {
    const role = isMale ? 'Father-in-law' : isFemale ? 'Mother-in-law' : 'Parent-in-law';
    return {
      label: role,
      shortLabel: role,
      icon: '🤝',
      badgeBg: '#fef2f2',
      badgeBorder: '#f87171',
      badgeText: '#991b1b',
      category: 'in-law',
    };
  }
  if (kinds === 'child,spouse') {
    const role = isMale ? 'Son-in-law' : isFemale ? 'Daughter-in-law' : 'Child-in-law';
    return {
      label: role,
      shortLabel: role,
      icon: '💐',
      badgeBg: '#fef2f2',
      badgeBorder: '#f87171',
      badgeText: '#991b1b',
      category: 'in-law',
    };
  }

  // 9. Grandchildren (child -> child)
  if (kinds === 'child,child') {
    const role = isMale ? 'Grandson' : isFemale ? 'Granddaughter' : 'Grandchild';
    return {
      label: role,
      shortLabel: role,
      icon: '🌟',
      badgeBg: '#fdf4ff',
      badgeBorder: '#d946ef',
      badgeText: '#86198f',
      category: 'grandchild',
    };
  }

  // 10. Nephew / Niece (parent -> child -> child)
  if (kinds === 'parent,child,child') {
    const role = isMale ? 'Nephew' : isFemale ? 'Niece' : 'Niece/Nephew';
    return {
      label: role,
      shortLabel: role,
      icon: '✨',
      badgeBg: '#f5f3ff',
      badgeBorder: '#a855f7',
      badgeText: '#6b21a8',
      category: 'other',
    };
  }

  // Default fallback with calculated label
  const fallbackLabel = getRelationshipLabel(path[0]?.personId ? anchorIdFromMap(path, personMap) : '', target.id, Array.from(personMap.values()), []) || 'Relative';

  return {
    label: fallbackLabel,
    shortLabel: fallbackLabel,
    icon: '👤',
    badgeBg: '#f3f4f6',
    badgeBorder: '#9ca3af',
    badgeText: '#4b5563',
    category: 'other',
  };
}

function anchorIdFromMap(path: StepEdge[], _personMap: Map<string, Person>): string {
  return path[0]?.personId || '';
}

/** Returns immediate relationship label from anchor's perspective to target.
 *  Returns null if no path found within depth 5.
 */
export function getRelationshipLabel(
  anchorId: string,
  targetId: string,
  persons: Person[],
  relationships: Relationship[]
): string | null {
  if (anchorId === targetId) return 'Me';
  const meta = getRelationMeta(anchorId, targetId, persons, relationships);
  return meta.label;
}

/** Get all immediate relatives of a person with labels from their perspective */
export function getImmediateRelatives(
  personId: string,
  persons: Person[],
  relationships: Relationship[]
): { person: Person; label: string }[] {
  const adj = buildAdjacency(relationships);
  const personMap = new Map(persons.map(p => [p.id, p]));
  const adj_ = adj.get(personId) ?? { parents: [], children: [], spouses: [] };
  const results: { person: Person; label: string }[] = [];

  for (const pid of adj_.parents) {
    const p = personMap.get(pid);
    if (p) results.push({ person: p, label: p.gender === 'male' ? 'Father' : p.gender === 'female' ? 'Mother' : 'Parent' });
  }
  for (const sid of adj_.spouses) {
    const p = personMap.get(sid);
    if (p) results.push({ person: p, label: p.gender === 'male' ? 'Husband' : p.gender === 'female' ? 'Wife' : 'Spouse' });
  }
  for (const cid of adj_.children) {
    const p = personMap.get(cid);
    if (p) results.push({ person: p, label: p.gender === 'male' ? 'Son' : p.gender === 'female' ? 'Daughter' : 'Child' });
  }

  return results;
}

/** Get siblings */
export function getSiblings(personId: string, relationships: Relationship[]): string[] {
  const adj = buildAdjacency(relationships);
  const adj_ = adj.get(personId) ?? { parents: [], children: [], spouses: [] };
  const siblingSet = new Set<string>();
  for (const parentId of adj_.parents) {
    const parentAdj = adj.get(parentId);
    if (parentAdj) {
      for (const sibling of parentAdj.children) {
        if (sibling !== personId) siblingSet.add(sibling);
      }
    }
  }
  return [...siblingSet];
}

export { buildAdjacency };
export type { AdjacencyMap };
