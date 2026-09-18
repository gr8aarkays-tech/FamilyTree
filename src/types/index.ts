// ─── Core data models ────────────────────────────────────────────────────────

export type Gender = 'male' | 'female' | 'other';

export interface Person {
  id: string;
  familyTreeId: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  dob?: string;          // ISO date string YYYY-MM-DD
  dod?: string;
  isDeceased: boolean;
  phone?: string;
  email?: string;
  photo?: string;        // base64 data URI
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type RelationshipType =
  | 'parent-child'   // personA is parent of personB
  | 'spouse';        // bidirectional

export interface Relationship {
  id: string;
  familyTreeId: string;
  personAId: string;
  personBId: string;
  /** 'parent-child' means personA is parent of personB; 'spouse' is bidirectional */
  type: RelationshipType;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyTree {
  id: string;
  ownerId: string;      // local user id or 'local'
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  anchorPersonId?: string;
}

export type ReminderType = 'birthday' | 'death-anniversary';
export type ReminderTiming = 'same-day' | '1-day' | '3-days' | '7-days';

export interface Reminder {
  id: string;
  familyTreeId: string;
  personId: string;
  type: ReminderType;
  timing: ReminderTiming;
  enabled: boolean;
  createdAt: string;
}

// ─── App-wide settings ───────────────────────────────────────────────────────

export type BaseTheme = 'light' | 'dark' | 'system' | 'high-contrast';
export type VisualTheme = 'classic' | 'elegant' | 'modern' | 'nature' | 'heritage' | 'minimal';
export type TreeViewMode =
  | 'classic'
  | 'horizontal'
  | 'radial'
  | 'ancestor'
  | 'descendant'
  | 'compact'
  | 'timeline'
  | 'relationship';

export interface AppSettings {
  baseTheme: BaseTheme;
  visualTheme: VisualTheme;
  treeViewMode: TreeViewMode;
  maleColor: string;
  femaleColor: string;
  otherColor: string;
  deceasedOpacity: number;
  birthdayReminders: boolean;
  deathAnniversaryReminders: boolean;
  defaultReminderTiming: ReminderTiming;
  googleDriveSyncEnabled: boolean;
  lastSyncedAt?: string;
  onboardingComplete: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  baseTheme: 'system',
  visualTheme: 'classic',
  treeViewMode: 'classic',
  maleColor: '#3b82f6',
  femaleColor: '#ec4899',
  otherColor: '#6b7280',
  deceasedOpacity: 0.5,
  birthdayReminders: true,
  deathAnniversaryReminders: true,
  defaultReminderTiming: 'same-day',
  googleDriveSyncEnabled: false,
  onboardingComplete: false,
};

// ─── UI helpers ──────────────────────────────────────────────────────────────

export interface TreeNode {
  person: Person;
  x: number;
  y: number;
  children: TreeNode[];
  spouses: TreeNode[];
  parents: TreeNode[];
}

export interface RelationshipLabel {
  fromPersonId: string;
  toPersonId: string;
  label: string;  // e.g. "Father", "Mother's Brother", etc.
}
