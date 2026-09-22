export type Category = 'Workout' | 'Study & Others';
export type RepeatType = 'once' | 'daily' | 'weekdays';

export type Task = {
  id: string;
  name: string;
  category: Category;
  target: number;
  unit: string;
  reminder: string;
  repeat: RepeatType;
  weekdays: number[];
  notes: string;
  createdAt: string;
  isExample?: boolean;
};

export type CompletionRecord = { date: string; taskId: string; actual: number };
export type Settings = {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  defaultReminder: string;
  weekStarts: 'monday' | 'sunday';
};
export type Store = {
  tasks: Task[];
  records: CompletionRecord[];
  settings: Settings;
  hasLaunched: boolean;
  schemaVersion: number;
};

const KEY = 'dailyscore-local-v1';
const BACKUP_KEY = `${KEY}-backup`;
const STORAGE_VERSION = 1;
export const todayKey = () => {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};
export const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
export const seedStore = (): Store => {
  const today = todayKey();
  return {
    tasks: [
      { id: 'example-move', name: 'Easy movement', category: 'Workout', target: 30, unit: 'minutes', reminder: '07:30', repeat: 'daily', weekdays: [], notes: 'A small start counts.', createdAt: today, isExample: true },
      { id: 'example-focus', name: 'Deep focus block', category: 'Study & Others', target: 45, unit: 'minutes', reminder: '18:00', repeat: 'weekdays', weekdays: [1, 2, 3, 4, 5], notes: 'Put your phone away and begin.', createdAt: today, isExample: true },
    ],
    records: [],
    settings: { theme: 'light', notifications: false, defaultReminder: '18:00', weekStarts: 'monday' },
    hasLaunched: false,
    schemaVersion: STORAGE_VERSION,
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const restoreStore = (value: unknown): Store | null => {
  if (!isRecord(value) || !Array.isArray(value.tasks) || !Array.isArray(value.records)) return null;

  const defaults = seedStore();
  const settings = isRecord(value.settings) ? value.settings : {};

  // Keep this migration boundary stable. New fields should be added to
  // defaults and migrated here instead of replacing the user's stored data.
  return {
    ...defaults,
    ...value,
    tasks: value.tasks as Task[],
    records: value.records as CompletionRecord[],
    settings: { ...defaults.settings, ...settings } as Settings,
    hasLaunched: true,
    schemaVersion: STORAGE_VERSION,
  };
};

export const loadStore = (): Store => {
  const raw = localStorage.getItem(KEY);
  try {
    const restored = restoreStore(raw ? JSON.parse(raw) : null);
    if (restored) {
      saveStore(restored);
      return restored;
    }
  } catch {
    // Keep the last raw value available for recovery instead of losing it
    // when a future release encounters malformed or incompatible data.
    if (raw) localStorage.setItem(BACKUP_KEY, raw);
  }
  const initial = seedStore();
  saveStore(initial);
  return initial;
};
export const saveStore = (store: Store) =>
  localStorage.setItem(KEY, JSON.stringify({ ...store, schemaVersion: STORAGE_VERSION }));
export const isScheduled = (task: Task, date: string) => {
  if (task.repeat === 'daily') return true;
  if (task.repeat === 'weekdays') return task.weekdays.includes(new Date(`${date}T12:00:00`).getDay());
  return task.createdAt.slice(0, 10) === date;
};
export const nextScheduledDate = (task: Task, fromDate: string) => {
  for (let offset = 0; offset <= 7; offset++) {
    const candidate = dateOffset(fromDate, offset);
    if (isScheduled(task, candidate)) return candidate;
  }
  return null;
};
export const getActual = (records: CompletionRecord[], taskId: string, date: string) => records.find((r) => r.taskId === taskId && r.date === date)?.actual || 0;
export const completion = (actual: number, target: number) => target ? Math.min(100, Math.round((actual / target) * 100)) : 0;
export const formatDate = (date: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) => new Intl.DateTimeFormat('en-US', options).format(new Date(`${date}T12:00:00`));
export const dateOffset = (date: string, offset: number) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
export const startOfWeek = (date: string, startsMonday = true) => { const d = new Date(`${date}T12:00:00`); const day = d.getDay(); const diff = startsMonday ? (day === 0 ? -6 : 1 - day) : -day; d.setDate(d.getDate() + diff); return d.toISOString().slice(0, 10); };
export const weekDates = (date: string, startsMonday = true) => Array.from({ length: 7 }, (_, i) => dateOffset(startOfWeek(date, startsMonday), i));
export const displayUnit = (unit: string, value: number) => `${value} ${unit}${value === 1 ? '' : unit.endsWith('s') ? '' : 's'}`;
export const exportJson = (store: Store) => JSON.stringify({ ...store, exportedAt: new Date().toISOString() }, null, 2);
export const importJson = (json: string): Store => {
  const parsed = JSON.parse(json);
  const restored = restoreStore(parsed);
  if (!restored) throw new Error('This file does not look like DailyScore data.');
  return restored;
};