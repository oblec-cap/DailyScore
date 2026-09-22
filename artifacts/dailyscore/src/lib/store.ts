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
export type Store = { tasks: Task[]; records: CompletionRecord[]; settings: Settings; hasLaunched: boolean };

const KEY = 'dailyscore-local-v1';
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
  };
};
export const loadStore = (): Store => {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (parsed?.tasks && parsed?.records) return { ...seedStore(), ...parsed, hasLaunched: true };
  } catch { /* safe empty state */ }
  const initial = seedStore();
  localStorage.setItem(KEY, JSON.stringify(initial));
  return initial;
};
export const saveStore = (store: Store) => localStorage.setItem(KEY, JSON.stringify(store));
export const isScheduled = (task: Task, date: string) => {
  if (task.repeat === 'daily') return true;
  if (task.repeat === 'weekdays') return task.weekdays.includes(new Date(`${date}T12:00:00`).getDay());
  return task.createdAt.slice(0, 10) === date;
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
  if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.records)) throw new Error('This file does not look like DailyScore data.');
  return { ...seedStore(), ...parsed, hasLaunched: true };
};