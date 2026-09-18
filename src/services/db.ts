/**
 * IndexedDB wrapper using the idb library.
 * All family-tree data is stored locally first.
 */
import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type { Person, Relationship, FamilyTree, Reminder, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = 'family-tree-db';
const DB_VERSION = 1;

type FamilyTreeDB = {
  familyTrees: {
    key: string;
    value: FamilyTree;
    indexes: { 'by-owner': string };
  };
  persons: {
    key: string;
    value: Person;
    indexes: { 'by-tree': string };
  };
  relationships: {
    key: string;
    value: Relationship;
    indexes: { 'by-tree': string };
  };
  reminders: {
    key: string;
    value: Reminder;
    indexes: { 'by-tree': string; 'by-person': string };
  };
  settings: {
    key: string;
    value: AppSettings & { id: string };
  };
};

let _db: IDBPDatabase<FamilyTreeDB> | null = null;

async function getDb(): Promise<IDBPDatabase<FamilyTreeDB>> {
  if (_db) return _db;
  _db = await openDB<FamilyTreeDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // FamilyTrees
      const treesStore = db.createObjectStore('familyTrees', { keyPath: 'id' });
      treesStore.createIndex('by-owner', 'ownerId');

      // Persons
      const personsStore = db.createObjectStore('persons', { keyPath: 'id' });
      personsStore.createIndex('by-tree', 'familyTreeId');

      // Relationships
      const relStore = db.createObjectStore('relationships', { keyPath: 'id' });
      relStore.createIndex('by-tree', 'familyTreeId');

      // Reminders
      const remStore = db.createObjectStore('reminders', { keyPath: 'id' });
      remStore.createIndex('by-tree', 'familyTreeId');
      remStore.createIndex('by-person', 'personId');

      // Settings (single record, key = 'app')
      db.createObjectStore('settings', { keyPath: 'id' });
    },
  });
  return _db;
}

// ─── FamilyTree CRUD ─────────────────────────────────────────────────────────

export async function getAllTrees(): Promise<FamilyTree[]> {
  const db = await getDb();
  return db.getAll('familyTrees');
}

export async function getTree(id: string): Promise<FamilyTree | undefined> {
  const db = await getDb();
  return db.get('familyTrees', id);
}

export async function saveTree(tree: Omit<FamilyTree, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<FamilyTree, 'id' | 'createdAt' | 'updatedAt'>>): Promise<FamilyTree> {
  const db = await getDb();
  const now = new Date().toISOString();
  const record: FamilyTree = {
    id: tree.id ?? uuidv4(),
    createdAt: tree.createdAt ?? now,
    updatedAt: now,
    ownerId: tree.ownerId ?? 'local',
    name: tree.name,
    description: tree.description,
    anchorPersonId: tree.anchorPersonId,
  };
  await db.put('familyTrees', record);
  return record;
}

export async function deleteTree(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['familyTrees', 'persons', 'relationships', 'reminders'], 'readwrite');
  await Promise.all([
    tx.objectStore('familyTrees').delete(id),
    (async () => {
      const persons = await tx.objectStore('persons').index('by-tree').getAllKeys(id);
      await Promise.all(persons.map(k => tx.objectStore('persons').delete(k)));
    })(),
    (async () => {
      const rels = await tx.objectStore('relationships').index('by-tree').getAllKeys(id);
      await Promise.all(rels.map(k => tx.objectStore('relationships').delete(k)));
    })(),
    (async () => {
      const rems = await tx.objectStore('reminders').index('by-tree').getAllKeys(id);
      await Promise.all(rems.map(k => tx.objectStore('reminders').delete(k)));
    })(),
  ]);
  await tx.done;
}

// ─── Person CRUD ─────────────────────────────────────────────────────────────

export async function getPersonsByTree(treeId: string): Promise<Person[]> {
  const db = await getDb();
  return db.getAllFromIndex('persons', 'by-tree', treeId);
}

export async function getPerson(id: string): Promise<Person | undefined> {
  const db = await getDb();
  return db.get('persons', id);
}

export async function savePerson(person: Omit<Person, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<Person, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Person> {
  const db = await getDb();
  const now = new Date().toISOString();
  const record: Person = {
    id: person.id ?? uuidv4(),
    createdAt: person.createdAt ?? now,
    updatedAt: now,
    familyTreeId: person.familyTreeId,
    firstName: person.firstName,
    lastName: person.lastName,
    gender: person.gender,
    dob: person.dob,
    dod: person.dod,
    isDeceased: person.isDeceased,
    phone: person.phone,
    email: person.email,
    photo: person.photo,
    notes: person.notes,
  };
  await db.put('persons', record);
  return record;
}

export async function deletePerson(id: string, treeId: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['persons', 'relationships', 'reminders'], 'readwrite');
  await tx.objectStore('persons').delete(id);
  const rels = await tx.objectStore('relationships').index('by-tree').getAll(treeId);
  await Promise.all(
    rels.filter(r => r.personAId === id || r.personBId === id)
      .map(r => tx.objectStore('relationships').delete(r.id))
  );
  const rems = await tx.objectStore('reminders').index('by-person').getAllKeys(id);
  await Promise.all(rems.map(k => tx.objectStore('reminders').delete(k)));
  await tx.done;
}

// ─── Relationship CRUD ───────────────────────────────────────────────────────

export async function getRelationshipsByTree(treeId: string): Promise<Relationship[]> {
  const db = await getDb();
  return db.getAllFromIndex('relationships', 'by-tree', treeId);
}

export async function saveRelationship(rel: Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<Relationship, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Relationship> {
  const db = await getDb();
  const now = new Date().toISOString();
  const record: Relationship = {
    id: rel.id ?? uuidv4(),
    createdAt: rel.createdAt ?? now,
    updatedAt: now,
    familyTreeId: rel.familyTreeId,
    personAId: rel.personAId,
    personBId: rel.personBId,
    type: rel.type,
  };
  await db.put('relationships', record);
  return record;
}

export async function deleteRelationship(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('relationships', id);
}

// ─── Reminder CRUD ───────────────────────────────────────────────────────────

export async function getRemindersByTree(treeId: string): Promise<Reminder[]> {
  const db = await getDb();
  return db.getAllFromIndex('reminders', 'by-tree', treeId);
}

export async function getRemindersByPerson(personId: string): Promise<Reminder[]> {
  const db = await getDb();
  return db.getAllFromIndex('reminders', 'by-person', personId);
}

export async function saveReminder(rem: Omit<Reminder, 'id' | 'createdAt'> & Partial<Pick<Reminder, 'id' | 'createdAt'>>): Promise<Reminder> {
  const db = await getDb();
  const record: Reminder = {
    id: rem.id ?? uuidv4(),
    createdAt: rem.createdAt ?? new Date().toISOString(),
    familyTreeId: rem.familyTreeId,
    personId: rem.personId,
    type: rem.type,
    timing: rem.timing,
    enabled: rem.enabled,
  };
  await db.put('reminders', record);
  return record;
}

export async function deleteReminder(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('reminders', id);
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const db = await getDb();
  const row = await db.get('settings', 'app');
  if (!row) return { ...DEFAULT_SETTINGS };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...rest } = row;
  return rest as AppSettings;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDb();
  await db.put('settings', { ...settings, id: 'app' });
}

// ─── Backup / Restore ────────────────────────────────────────────────────────

export interface BackupData {
  version: number;
  exportedAt: string;
  trees: FamilyTree[];
  persons: Person[];
  relationships: Relationship[];
  reminders: Reminder[];
  settings: AppSettings;
}

export async function exportBackup(): Promise<BackupData> {
  const db = await getDb();
  const [trees, persons, relationships, reminders, settings] = await Promise.all([
    db.getAll('familyTrees'),
    db.getAll('persons'),
    db.getAll('relationships'),
    db.getAll('reminders'),
    getSettings(),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    trees,
    persons,
    relationships,
    reminders,
    settings,
  };
}

export async function importBackup(data: BackupData): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['familyTrees', 'persons', 'relationships', 'reminders', 'settings'], 'readwrite');
  await Promise.all([
    ...data.trees.map(t => tx.objectStore('familyTrees').put(t)),
    ...data.persons.map(p => tx.objectStore('persons').put(p)),
    ...data.relationships.map(r => tx.objectStore('relationships').put(r)),
    ...data.reminders.map(r => tx.objectStore('reminders').put(r)),
    tx.objectStore('settings').put({ ...data.settings, id: 'app' }),
  ]);
  await tx.done;
}
