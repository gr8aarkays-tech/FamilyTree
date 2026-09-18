import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import type { Person, Gender } from '../types';

interface PersonFormProps {
  initial?: Partial<Person>;
  onSave: (data: Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'familyTreeId'>) => void;
  onCancel: () => void;
}

export function PersonForm({ initial, onSave, onCancel }: PersonFormProps) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? '');
  const [lastName, setLastName] = useState(initial?.lastName ?? '');
  const [gender, setGender] = useState<Gender>(initial?.gender ?? 'other');
  const [dob, setDob] = useState(initial?.dob ?? '');
  const [isDeceased, setIsDeceased] = useState(initial?.isDeceased ?? false);
  const [dod, setDod] = useState(initial?.dod ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [photo, setPhoto] = useState(initial?.photo ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'First name is required';
    if (!lastName.trim()) e.lastName = 'Last name is required';
    if (dob && new Date(dob) > new Date()) e.dob = 'Date of birth cannot be in the future';
    if (dod && dob && new Date(dod) < new Date(dob)) e.dod = 'Date of death cannot be before date of birth';
    if (phone && !/^[+\d\s\-().]{7,15}$/.test(phone)) e.phone = 'Invalid phone number';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email address';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender,
      dob: dob || undefined,
      isDeceased,
      dod: isDeceased && dod ? dod : undefined,
      phone: phone || undefined,
      email: email || undefined,
      photo: photo || undefined,
      notes: notes || undefined,
    });
  }

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  const inputClass = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
  const errorClass = 'text-xs text-red-500 mt-0.5';

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Name row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="firstName">First Name *</label>
          <input id="firstName" className={inputClass} value={firstName} onChange={e => setFirstName(e.target.value)} autoFocus />
          {errors.firstName && <p className={errorClass}>{errors.firstName}</p>}
        </div>
        <div>
          <label className={labelClass} htmlFor="lastName">Last Name *</label>
          <input id="lastName" className={inputClass} value={lastName} onChange={e => setLastName(e.target.value)} />
          {errors.lastName && <p className={errorClass}>{errors.lastName}</p>}
        </div>
      </div>

      {/* Gender */}
      <div>
        <label className={labelClass}>Gender</label>
        <div className="flex gap-2">
          {(['male', 'female', 'other'] as Gender[]).map(g => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              className={[
                'flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors',
                gender === g
                  ? g === 'male' ? 'bg-blue-500 border-blue-500 text-white'
                    : g === 'female' ? 'bg-pink-500 border-pink-500 text-white'
                    : 'bg-gray-500 border-gray-500 text-white'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-transparent',
              ].join(' ')}
            >
              {g === 'male' ? '♂ Male' : g === 'female' ? '♀ Female' : '⚥ Other'}
            </button>
          ))}
        </div>
      </div>

      {/* DOB */}
      <div>
        <label className={labelClass} htmlFor="dob">Date of Birth</label>
        <input id="dob" type="date" className={inputClass} value={dob} onChange={e => setDob(e.target.value)} max={new Date().toISOString().split('T')[0]} />
        {errors.dob && <p className={errorClass}>{errors.dob}</p>}
      </div>

      {/* Deceased toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsDeceased(!isDeceased)}
          className={[
            'relative w-11 h-6 rounded-full transition-colors',
            isDeceased ? 'bg-gray-500' : 'bg-gray-200 dark:bg-gray-600',
          ].join(' ')}
          role="switch"
          aria-checked={isDeceased}
          aria-label="Deceased"
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isDeceased ? 'translate-x-5' : ''}`} />
        </button>
        <span className="text-sm text-gray-700 dark:text-gray-300">Deceased</span>
      </div>

      {/* DOD */}
      {isDeceased && (
        <div>
          <label className={labelClass} htmlFor="dod">Date of Death</label>
          <input id="dod" type="date" className={inputClass} value={dod} onChange={e => setDod(e.target.value)} min={dob || undefined} max={new Date().toISOString().split('T')[0]} />
          {errors.dod && <p className={errorClass}>{errors.dod}</p>}
        </div>
      )}

      {/* Contact */}
      <div>
        <label className={labelClass} htmlFor="phone">Phone</label>
        <input id="phone" type="tel" className={inputClass} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 8900" />
        {errors.phone && <p className={errorClass}>{errors.phone}</p>}
      </div>
      <div>
        <label className={labelClass} htmlFor="email">Email</label>
        <input id="email" type="email" className={inputClass} value={email} onChange={e => setEmail(e.target.value)} placeholder="person@example.com" />
        {errors.email && <p className={errorClass}>{errors.email}</p>}
      </div>

      {/* Photo */}
      <div>
        <label className={labelClass}>Photo</label>
        <div className="flex items-center gap-3">
          {photo && <img src={photo} alt="Preview" className="w-14 h-14 rounded-full object-cover border-2 border-gray-200" />}
          <button type="button" onClick={() => fileRef.current?.click()} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            {photo ? 'Change Photo' : 'Add Photo'}
          </button>
          {photo && <button type="button" onClick={() => setPhoto('')} className="text-xs text-red-500 hover:underline">Remove</button>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
      </div>

      {/* Notes */}
      <div>
        <label className={labelClass} htmlFor="notes">Notes</label>
        <textarea id="notes" className={inputClass} rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes…" />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          Cancel
        </button>
        <button type="submit" className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors">
          {initial?.id ? 'Save Changes' : 'Add Person'}
        </button>
      </div>
    </form>
  );
}
