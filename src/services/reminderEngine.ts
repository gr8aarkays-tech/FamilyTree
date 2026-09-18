/**
 * Reminder engine: checks upcoming birthdays / death anniversaries.
 */
import type { Person, Reminder, ReminderTiming } from '../types';

export interface UpcomingReminder {
  reminder: Reminder;
  person: Person;
  eventDate: Date;
  daysUntil: number;
  label: string;   // e.g. "Today is Ravi's 45th Birthday"
  year: number;    // the year of the occurrence
}

function timingDays(timing: ReminderTiming): number {
  switch (timing) {
    case 'same-day': return 0;
    case '1-day': return 1;
    case '3-days': return 3;
    case '7-days': return 7;
  }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Returns reminders that fire within the next `windowDays` days */
export function getUpcomingReminders(
  reminders: Reminder[],
  persons: Person[],
  windowDays = 30
): UpcomingReminder[] {
  const personMap = new Map(persons.map(p => [p.id, p]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const results: UpcomingReminder[] = [];

  for (const reminder of reminders) {
    if (!reminder.enabled) continue;
    const person = personMap.get(reminder.personId);
    if (!person) continue;

    const dateStr = reminder.type === 'birthday' ? person.dob : person.dod;
    if (!dateStr) continue;

    const eventBase = new Date(dateStr);
    if (isNaN(eventBase.getTime())) continue;

    // Find the next occurrence this year or next year
    const thisYear = today.getFullYear();
    for (const year of [thisYear, thisYear + 1]) {
      const occurrence = new Date(year, eventBase.getMonth(), eventBase.getDate());
      occurrence.setHours(0, 0, 0, 0);

      const notifyDate = new Date(occurrence);
      notifyDate.setDate(occurrence.getDate() - timingDays(reminder.timing));
      notifyDate.setHours(0, 0, 0, 0);

      const daysUntilNotify = Math.round((notifyDate.getTime() - today.getTime()) / 86400000);
      if (daysUntilNotify >= 0 && daysUntilNotify <= windowDays) {
        const yearsElapsed = year - eventBase.getFullYear();
        let label = '';
        if (reminder.type === 'birthday') {
          label = daysUntilNotify === 0
            ? `Today is ${person.firstName}'s ${ordinal(yearsElapsed)} birthday`
            : `${person.firstName}'s ${ordinal(yearsElapsed)} birthday in ${daysUntilNotify} day${daysUntilNotify === 1 ? '' : 's'}`;
        } else {
          label = daysUntilNotify === 0
            ? `Today is the ${ordinal(yearsElapsed)} death anniversary of ${person.firstName}`
            : `${ordinal(yearsElapsed)} death anniversary of ${person.firstName} in ${daysUntilNotify} day${daysUntilNotify === 1 ? '' : 's'}`;
        }
        results.push({ reminder, person, eventDate: occurrence, daysUntil: daysUntilNotify, label, year });
        break; // only add once
      }
    }
  }

  results.sort((a, b) => a.daysUntil - b.daysUntil);
  return results;
}

/** Request browser notification permission and schedule a local notification if permitted */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function fireNotification(title: string, body: string, icon = '/icons/icon-192.png'): void {
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon });
  }
}
