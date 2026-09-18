import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { FamilyTree, Person, Relationship, Reminder } from '../types';
import {
  getAllTrees, getTree, saveTree, deleteTree,
  getPersonsByTree, savePerson, deletePerson,
  getRelationshipsByTree, saveRelationship, deleteRelationship,
  getRemindersByTree, saveReminder, deleteReminder,
} from '../services/db';

interface TreeContextValue {
  trees: FamilyTree[];
  currentTree: FamilyTree | null;
  persons: Person[];
  relationships: Relationship[];
  reminders: Reminder[];
  loadTree: (id: string) => Promise<void>;
  refreshTrees: () => Promise<void>;
  refreshCurrent: () => Promise<void>;
  // CRUD helpers
  createTree: (data: Omit<FamilyTree, 'id' | 'createdAt' | 'updatedAt'>) => Promise<FamilyTree>;
  updateTree: (data: FamilyTree) => Promise<FamilyTree>;
  removeTree: (id: string) => Promise<void>;
  addPerson: (data: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Person>;
  updatePerson: (data: Person) => Promise<Person>;
  removePerson: (id: string) => Promise<void>;
  addRelationship: (data: Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Relationship>;
  removeRelationship: (id: string) => Promise<void>;
  addReminder: (data: Omit<Reminder, 'id' | 'createdAt'>) => Promise<Reminder>;
  updateReminder: (data: Reminder) => Promise<Reminder>;
  removeReminder: (id: string) => Promise<void>;
  setAnchor: (personId: string) => Promise<void>;
}

const TreeContext = createContext<TreeContextValue | null>(null);

export function TreeProvider({ children }: { children: ReactNode }) {
  const [trees, setTrees] = useState<FamilyTree[]>([]);
  const [currentTree, setCurrentTree] = useState<FamilyTree | null>(null);
  const [persons, setPersons] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const refreshTrees = useCallback(async () => {
    const all = await getAllTrees();
    all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    setTrees(all);
  }, []);

  useEffect(() => { refreshTrees(); }, [refreshTrees]);

  const loadTree = useCallback(async (id: string) => {
    const [tree, pArr, rArr, remArr] = await Promise.all([
      getTree(id),
      getPersonsByTree(id),
      getRelationshipsByTree(id),
      getRemindersByTree(id),
    ]);
    if (!tree) return;
    setCurrentTree(tree);
    setPersons(pArr);
    setRelationships(rArr);
    setReminders(remArr);
  }, []);

  const refreshCurrent = useCallback(async () => {
    if (!currentTree) return;
    await loadTree(currentTree.id);
  }, [currentTree, loadTree]);

  const createTree = useCallback(async (data: Omit<FamilyTree, 'id' | 'createdAt' | 'updatedAt'>) => {
    const t = await saveTree(data);
    await refreshTrees();
    return t;
  }, [refreshTrees]);

  const updateTree = useCallback(async (data: FamilyTree) => {
    const t = await saveTree(data);
    setCurrentTree(t);
    await refreshTrees();
    return t;
  }, [refreshTrees]);

  const removeTree = useCallback(async (id: string) => {
    await deleteTree(id);
    if (currentTree?.id === id) {
      setCurrentTree(null);
      setPersons([]);
      setRelationships([]);
      setReminders([]);
    }
    await refreshTrees();
  }, [currentTree, refreshTrees]);

  const addPerson = useCallback(async (data: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>) => {
    const p = await savePerson(data);
    setPersons(prev => [...prev, p]);
    if (currentTree) {
      await saveTree({ ...currentTree, updatedAt: new Date().toISOString() });
    }
    return p;
  }, [currentTree]);

  const updatePerson = useCallback(async (data: Person) => {
    const p = await savePerson(data);
    setPersons(prev => prev.map(x => x.id === p.id ? p : x));
    return p;
  }, []);

  const removePerson = useCallback(async (id: string) => {
    if (!currentTree) return;
    await deletePerson(id, currentTree.id);
    setPersons(prev => prev.filter(p => p.id !== id));
    setRelationships(prev => prev.filter(r => r.personAId !== id && r.personBId !== id));
    setReminders(prev => prev.filter(r => r.personId !== id));
  }, [currentTree]);

  const addRelationship = useCallback(async (data: Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>) => {
    const r = await saveRelationship(data);
    setRelationships(prev => [...prev, r]);
    return r;
  }, []);

  const removeRelationship = useCallback(async (id: string) => {
    await deleteRelationship(id);
    setRelationships(prev => prev.filter(r => r.id !== id));
  }, []);

  const addReminder = useCallback(async (data: Omit<Reminder, 'id' | 'createdAt'>) => {
    const r = await saveReminder(data);
    setReminders(prev => [...prev, r]);
    return r;
  }, []);

  const updateReminder = useCallback(async (data: Reminder) => {
    const r = await saveReminder(data);
    setReminders(prev => prev.map(x => x.id === r.id ? r : x));
    return r;
  }, []);

  const removeReminder = useCallback(async (id: string) => {
    await deleteReminder(id);
    setReminders(prev => prev.filter(r => r.id !== id));
  }, []);

  const setAnchor = useCallback(async (personId: string) => {
    if (!currentTree) return;
    const updated = await saveTree({ ...currentTree, anchorPersonId: personId });
    setCurrentTree(updated);
    await refreshTrees();
  }, [currentTree, refreshTrees]);

  return (
    <TreeContext.Provider value={{
      trees, currentTree, persons, relationships, reminders,
      loadTree, refreshTrees, refreshCurrent,
      createTree, updateTree, removeTree,
      addPerson, updatePerson, removePerson,
      addRelationship, removeRelationship,
      addReminder, updateReminder, removeReminder,
      setAnchor,
    }}>
      {children}
    </TreeContext.Provider>
  );
}

export function useTree() {
  const ctx = useContext(TreeContext);
  if (!ctx) throw new Error('useTree must be used within TreeProvider');
  return ctx;
}
