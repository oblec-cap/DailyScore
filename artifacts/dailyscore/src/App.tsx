import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useLocation, Link, Route, Switch, Router as WouterRouter } from 'wouter';
import { Activity, Bell, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Copy, Download, Dumbbell, FileJson, Flame, Home, LockKeyhole, Moon, Pencil, Plus, RotateCcw, Settings as SettingsIcon, ShieldAlert, Sparkles, Sun, Target, Trash2, Trophy, Upload, X, Zap } from 'lucide-react';
import { Category, completion, dateOffset, displayUnit, exportJson, formatDate, getActual, importJson, isScheduled, loadStore, makeId, nextScheduledDate, saveStore, startOfWeek, Store, Task, todayKey, weekDates } from '@/lib/store';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const cx = (...items: Array<string | false | undefined>) => items.filter(Boolean).join(' ');
const iconFor = (category: Category) => category === 'Workout' ? Dumbbell : BookOpen;
const categoryTint = (category: Category) => category === 'Workout' ? 'text-[#a9622f] bg-[#f8e5d4] dark:bg-[#503324] dark:text-[#f5b78d]' : 'text-[#246579] bg-[#d9edf0] dark:bg-[#193f4a] dark:text-[#9cdce4]';

function useDailyScore() {
  const [store, setStore] = useState<Store>(() => loadStore());
  useEffect(() => { saveStore(store); }, [store]);
  const update = (fn: (current: Store) => Store) => setStore((current) => fn(current));
  return { store, update, setStore };
}

function useTheme(theme: Store['settings']['theme']) {
  useEffect(() => {
    const root = document.documentElement;
    const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', dark);
    root.style.colorScheme = dark ? 'dark' : 'light';
  }, [theme]);
}

function useTodayKey() {
  const [date, setDate] = useState(todayKey);

  useEffect(() => {
    let timer: number;
    const sync = () => setDate((current) => current === todayKey() ? current : todayKey());
    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      timer = window.setTimeout(() => {
        sync();
        scheduleMidnightRefresh();
      }, Math.max(1000, nextMidnight.getTime() - now.getTime()));
    };
    document.addEventListener('visibilitychange', sync);
    scheduleMidnightRefresh();
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  return date;
}

function Shell({ children, store, onResetIntro }: { children: ReactNode; store: Store; onResetIntro: () => void }) {
  const [location] = useLocation();
  useTheme(store.settings.theme);
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/manifest.webmanifest';
    document.head.appendChild(link);

    if (!('serviceWorker' in navigator)) return () => link.remove();

    let hadController = Boolean(navigator.serviceWorker.controller);
    let hasReloadedForUpdate = false;
    const handleControllerChange = () => {
      if (!hadController) {
        hadController = true;
        return;
      }
      if (!hasReloadedForUpdate) {
        hasReloadedForUpdate = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Check for a newer worker whenever the app launches.
      registration.update().catch(() => undefined);
    }).catch(() => undefined);

    // Ask the browser to protect this device's local data from eviction.
    if (navigator.storage?.persist) navigator.storage.persist().catch(() => undefined);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      link.remove();
    };
  }, []);
  const nav = [
    { href: '/', label: 'Today', icon: Home },
    { href: '/add', label: 'Add', icon: Plus },
    { href: '/weekly', label: 'Weekly', icon: Activity },
    { href: '/history', label: 'History', icon: CalendarDays },
    { href: '/settings', label: 'Settings', icon: SettingsIcon },
  ];
  return <div className="ds-grain min-h-[100dvh] bg-background text-foreground">
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-[238px] flex-col border-r border-sidebar-border bg-sidebar px-5 py-7 text-sidebar-foreground md:flex">
      <Link href="/" data-testid="link-brand" className="mb-12 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-sidebar-primary text-sidebar-primary-foreground"><Zap size={20} strokeWidth={2.8} /></span>
        <span><b className="ds-display text-[25px] leading-none">DailyScore</b><small className="mt-1 block font-mono text-[9px] uppercase tracking-[.22em] opacity-55">show up, gently</small></span>
      </Link>
      <nav className="space-y-2" aria-label="Primary navigation">
        {nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase()}`} className={cx('flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition', location === href ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'opacity-65 hover:bg-sidebar-accent hover:opacity-100')}><Icon size={18} /><span>{label}</span>{location === href && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />}</Link>)}
      </nav>
      <div className="mt-auto rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-4">
        <Sparkles size={16} className="mb-3 text-sidebar-primary" />
        <p className="text-[13px] leading-5 opacity-80">Progress is a practice, not a personality test.</p>
        <button onClick={onResetIntro} data-testid="button-view-examples" className="mt-3 text-xs font-bold text-sidebar-primary hover:underline">View example rhythm</button>
      </div>
      <p className="mt-5 px-1 font-mono text-[10px] uppercase tracking-[.15em] opacity-40">local-first · private</p>
    </aside>
    <main className="pb-24 md:ml-[238px] md:pb-0">{children}</main>
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[76px] items-center justify-around border-t border-border bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} data-testid={`link-mobile-${label.toLowerCase()}`} className={cx('flex min-w-[52px] flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-bold', location === href ? 'text-primary' : 'text-muted-foreground')}><Icon size={20} /><span>{label}</span></Link>)}
    </nav>
  </div>;
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="mb-8 flex items-end justify-between gap-4"><div><p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[.22em] text-primary">{eyebrow}</p><h1 className="ds-display text-4xl text-foreground sm:text-5xl">{title}</h1>{description && <p className="mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>}</div>{action}</header>;
}

function ProgressRing({ percent, size = 116 }: { percent: number; size?: number }) {
  const radius = 45; const circumference = 2 * Math.PI * radius; const dash = circumference * Math.min(100, percent) / 100;
  return <div className="relative shrink-0" style={{ width: size, height: size }}><svg viewBox="0 0 100 100" className="-rotate-90"><circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="7" /><circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--accent))" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${dash} ${circumference}`} className="ds-progress" /></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><b className="ds-display text-3xl">{percent}%</b><span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">today</span></div></div>;
}

function StatCard({ label, value, detail, icon: Icon, accent = 'text-primary' }: { label: string; value: string; detail: string; icon: typeof Target; accent?: string }) {
  return <div className="ds-card rounded-2xl p-4"><div className="mb-4 flex items-center justify-between"><span className="text-xs font-semibold text-muted-foreground">{label}</span><Icon size={17} className={accent} /></div><div className="ds-display text-3xl">{value}</div><div className="mt-1 text-xs text-muted-foreground">{detail}</div></div>;
}

function TaskRow({ task, date, actual, locked = false, unlockDate, onProgress, onDelete, onDuplicate }: { task: Task; date: string; actual: number; locked?: boolean; unlockDate?: string | null; onProgress: (value: number) => void; onDelete: () => void; onDuplicate: () => void }) {
  const pct = completion(actual, task.target);
  const Icon = iconFor(task.category);
  const unlockLabel = unlockDate ? formatDate(unlockDate, { weekday: 'long', month: 'short', day: 'numeric' }) : 'its next scheduled day';

  return <article className={cx('ds-card group rounded-2xl p-4 transition sm:p-5', !locked && 'hover:-translate-y-0.5 hover:shadow-lg')} data-testid={`card-task-${task.id}`} aria-label={locked ? `${task.name}, locked until ${unlockLabel}` : task.name}>
    <div className="flex items-start gap-3">
      <div className={cx('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', locked ? 'bg-muted text-muted-foreground' : categoryTint(task.category))}><Icon size={18} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold leading-5">{task.name}{task.isExample && <span className="ml-2 rounded-full bg-accent/25 px-2 py-0.5 align-middle font-mono text-[9px] uppercase tracking-wide text-accent-foreground">example</span>}</h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>{task.category}</span>{task.reminder && <span className="flex items-center gap-1"><Clock3 size={12} />{task.reminder}</span>}</p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 opacity-70">
            <Link href={`/add?edit=${task.id}`} data-testid={`button-edit-${task.id}`} className="rounded-lg p-2 hover:bg-muted" aria-label={`Edit ${task.name}`}><Pencil size={15} /></Link>
            <button onClick={onDuplicate} data-testid={`button-duplicate-${task.id}`} className="rounded-lg p-2 hover:bg-muted" aria-label={`Duplicate ${task.name}`}><Copy size={15} /></button>
            <button onClick={onDelete} data-testid={`button-delete-${task.id}`} className="rounded-lg p-2 text-destructive hover:bg-destructive/10" aria-label={`Delete ${task.name}`}><Trash2 size={15} /></button>
          </div>
        </div>
        <div className={cx('mt-4 flex items-end justify-between gap-3', locked && 'rounded-xl bg-muted/45 p-3')}>
          <div className="flex-1">
            <div className="mb-2 flex items-baseline justify-between"><span className="ds-mono text-sm font-bold">{actual} <span className="font-sans font-normal text-muted-foreground">/ {task.target} {task.unit}</span></span><span className={cx('font-mono text-xs font-bold', pct >= 100 ? 'text-primary' : 'text-muted-foreground')}>{pct >= 100 ? 'complete' : `${pct}%`}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={cx('ds-progress h-full rounded-full', pct >= 100 ? 'bg-primary' : 'bg-accent')} style={{ width: `${pct}%` }} /></div>
          </div>
          <button disabled={locked} onClick={() => onProgress(task.target)} data-testid={`button-complete-${task.id}`} className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border disabled:cursor-not-allowed disabled:opacity-45', pct >= 100 ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-primary hover:bg-primary hover:text-primary-foreground')} aria-label={locked ? `Locked until ${unlockLabel}` : `Complete ${task.name}`}><Check size={18} /></button>
        </div>
        {locked ? <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-[11px] font-semibold text-muted-foreground"><LockKeyhole size={14} className="shrink-0 text-primary" /><span>Opens {unlockLabel}. You can prepare it now; progress starts then.</span></div> : <div className="mt-3 flex items-center gap-2"><span className="text-[11px] font-semibold text-muted-foreground">Quick add</span>{[5, 10].map((amount) => <button key={amount} onClick={() => onProgress(Math.min(task.target, actual + amount))} data-testid={`button-add-${amount}-${task.id}`} className="rounded-lg border border-border px-2.5 py-1.5 font-mono text-[10px] font-bold hover:border-primary hover:text-primary">+{amount}</button>)}<button onClick={() => onProgress(task.target)} data-testid={`button-add-100-${task.id}`} className="rounded-lg border border-border px-2.5 py-1.5 font-mono text-[10px] font-bold hover:border-primary hover:text-primary">100%</button><span className="ml-auto text-[11px] text-muted-foreground">{pct >= 100 ? 'Nice work.' : 'Keep the thread.'}</span></div>}
      </div>
    </div>
  </article>;
}

function DeleteTaskDialog({ task, onCancel, onConfirm }: { task: Task; onCancel: () => void; onConfirm: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onCancel();
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/25 p-5 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
    <div className="ds-in w-full max-w-md overflow-hidden rounded-[26px] border border-destructive/20 bg-card shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="delete-task-title" aria-describedby="delete-task-description" data-testid="dialog-delete-task">
      <div className="relative overflow-hidden bg-primary p-6 text-primary-foreground">
        <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full border-[22px] border-accent/20" />
        <div className="relative flex items-start justify-between gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-lg"><ShieldAlert size={24} /></span><button onClick={onCancel} className="rounded-xl p-2 text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground" aria-label="Keep task"><X size={18} /></button></div>
        <p className="relative mt-5 font-mono text-[10px] font-bold uppercase tracking-[.2em] text-accent">A considered choice</p>
        <h2 id="delete-task-title" className="relative mt-1 ds-display text-3xl">Let this one go?</h2>
      </div>
      <div className="p-6">
        <p id="delete-task-description" className="text-sm leading-6 text-muted-foreground">You’re about to remove <strong className="text-foreground">“{task.name}”</strong> from your plan. Your completed history stays safe, but this task will no longer appear on future days.</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={onCancel} data-testid="button-cancel-delete" className="rounded-xl border border-border px-4 py-3 text-sm font-bold hover:bg-muted">Keep task</button><button onClick={onConfirm} data-testid="button-confirm-delete" className="flex items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-3 text-sm font-bold text-destructive-foreground shadow-sm hover:opacity-90"><Trash2 size={16} />Remove task</button></div>
      </div>
    </div>
  </div>;
}

function Today({ store, update }: { store: Store; update: (fn: (s: Store) => Store) => void }) {
  const date = useTodayKey();
  const scheduled = store.tasks.filter((task) => isScheduled(task, date));
  const upcoming = store.tasks
    .map((task) => ({ task, unlockDate: nextScheduledDate(task, date) }))
    .filter(({ task, unlockDate }) => !isScheduled(task, date) && unlockDate);
  const visibleTasks = [...scheduled.map((task) => ({ task, locked: false, unlockDate: null })), ...upcoming.map(({ task, unlockDate }) => ({ task, locked: true, unlockDate }))];
  const totals = scheduled.reduce((a, task) => ({ target: a.target + task.target, actual: a.actual + getActual(store.records, task.id, date) }), { target: 0, actual: 0 });
  const percent = completion(totals.actual, totals.target);
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const change = (task: Task, actual: number) => update((s) => ({ ...s, records: [...s.records.filter((r) => !(r.taskId === task.id && r.date === date)), { taskId: task.id, date, actual: Math.min(task.target, Math.max(0, actual)) }] }));
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const remove = (task: Task) => setPendingDelete(task);
  const confirmRemove = () => {
    if (!pendingDelete) return;
    update((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== pendingDelete.id) }));
    setPendingDelete(null);
  };
  const duplicate = (task: Task) => update((s) => ({ ...s, tasks: [...s.tasks, { ...task, id: makeId(), name: `${task.name} copy`, isExample: false, createdAt: date }] }));
  return <div className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 md:px-10 md:py-12">
     <div className="ds-in mb-9 flex items-start justify-between gap-4"><div><p className="mb-2 font-mono text-[10px] uppercase tracking-[.22em] text-primary">{formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}</p><h1 className="ds-display text-4xl sm:text-5xl">{greeting}, <em className="text-primary">friend.</em></h1><p className="mt-2 text-sm text-muted-foreground">A little intention, then the rest can unfold.</p></div><Link href="/add" data-testid="link-add-top" className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground shadow-md hover:opacity-90 sm:px-4"><Plus size={17} /><span>Add task</span></Link></div>
    <section className="ds-in ds-in-2 relative mb-7 overflow-hidden rounded-[26px] bg-primary p-6 text-primary-foreground sm:p-8"><div className="absolute -right-16 -top-24 h-72 w-72 rounded-full border-[34px] border-accent/20" /><div className="absolute -bottom-32 right-28 h-64 w-64 rounded-full border-[1px] border-primary-foreground/10" /><div className="relative flex items-center justify-between gap-6"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] opacity-70">Your daily score</p><div className="mt-3 flex items-baseline gap-2"><span className="ds-display text-6xl">{percent}</span><span className="ds-display text-2xl opacity-70">%</span></div><p className="mt-2 max-w-[240px] text-sm leading-5 opacity-75">{scheduled.length ? percent >= 100 ? 'You made the space and filled it.' : `${totals.actual} of ${totals.target} ${scheduled.length === 1 ? 'unit' : 'units'} in motion.` : 'Make today yours with one small task.'}</p></div><ProgressRing percent={percent} size={136} /></div></section>
    <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4"><StatCard label="Workout" value={`${completion(scheduled.filter(t => t.category === 'Workout').reduce((a,t)=>a+getActual(store.records,t.id,date),0), scheduled.filter(t=>t.category==='Workout').reduce((a,t)=>a+t.target,0))}%`} detail={`${scheduled.filter(t=>t.category === 'Workout').length} planned`} icon={Dumbbell} accent="text-[#a9622f]" /><StatCard label="Study & others" value={`${completion(scheduled.filter(t => t.category === 'Study & Others').reduce((a,t)=>a+getActual(store.records,t.id,date),0), scheduled.filter(t=>t.category==='Study & Others').reduce((a,t)=>a+t.target,0))}%`} detail={`${scheduled.filter(t=>t.category === 'Study & Others').length} planned`} icon={BookOpen} accent="text-[#246579]" /><StatCard label="Tasks" value={`${scheduled.length}`} detail={`${scheduled.filter(t=>getActual(store.records,t.id,date)>=t.target).length} complete`} icon={Target} /><StatCard label="Streak" value={`${streak(store)}d`} detail="days showing up" icon={Flame} accent="text-accent-foreground" /></div>
    {!store.hasLaunched && <div className="ds-in ds-in-3 mb-6 flex items-start gap-3 rounded-2xl border border-accent/40 bg-accent/15 p-4"><Sparkles size={18} className="mt-0.5 shrink-0 text-accent-foreground" /><div className="flex-1"><b className="text-sm">A couple of examples are ready.</b><p className="mt-1 text-xs leading-5 text-muted-foreground">They’re here to show the shape of DailyScore. Keep them, edit them, or make your own.</p></div><Link href="/add" data-testid="link-onboarding-add" className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Make mine</Link></div>}
     <section className="ds-in ds-in-3"><div className="mb-4 flex items-end justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">The plan</p><h2 className="ds-display mt-1 text-3xl">Today’s rhythm</h2></div><div className="flex items-center gap-2">{visibleTasks.length > 0 && <span className="rounded-full bg-muted px-3 py-1.5 font-mono text-[10px] text-muted-foreground">{scheduled.length} today{upcoming.length ? ` · ${upcoming.length} upcoming` : ''}</span>}<Link href="/add" data-testid="link-add-plan" className="flex items-center gap-1.5 rounded-lg border border-primary/30 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/10"><Plus size={14} />Add</Link></div></div>
       {visibleTasks.length ? <div className="grid gap-3 lg:grid-cols-2">{visibleTasks.map(({ task, locked, unlockDate }) => <TaskRow key={task.id} task={task} date={date} actual={locked ? 0 : getActual(store.records, task.id, date)} locked={locked} unlockDate={unlockDate} onProgress={(v) => change(task, v)} onDelete={() => remove(task)} onDuplicate={() => duplicate(task)} />)}</div> : <EmptyTasks />}
    </section>
     {pendingDelete && <DeleteTaskDialog task={pendingDelete} onCancel={() => setPendingDelete(null)} onConfirm={confirmRemove} />}
  </div>;
}

function EmptyTasks() {
  return <div className="ds-card ds-grid flex min-h-[260px] flex-col items-center justify-center rounded-2xl p-8 text-center"><span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/25 text-accent-foreground"><Target size={25} /></span><h3 className="ds-display text-2xl">A blank page can be a beginning.</h3><p className="mt-2 max-w-sm text-sm text-muted-foreground">Add a workout or study task and make a little room for it in your day.</p><Link href="/add" data-testid="link-empty-add" className="mt-5 flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"><Plus size={16} /> Add your first task</Link></div>;
}

function streak(store: Store) {
  let count = 0; let day = todayKey();
  for (let i = 0; i < 366; i++) {
    const scheduled = store.tasks.filter(t => isScheduled(t, day));
    if (!scheduled.length || scheduled.some(t => completion(getActual(store.records, t.id, day), t.target) < 100)) break;
    count++; day = dateOffset(day, -1);
  }
  return count;
}

function AddTask({ store, update }: { store: Store; update: (fn: (s: Store) => Store) => void }) {
  const [, navigate] = useLocation(); const editId = new URLSearchParams(window.location.search).get('edit'); const editing = store.tasks.find(t => t.id === editId);
  const [name, setName] = useState(editing?.name || ''); const [category, setCategory] = useState<Category>(editing?.category || 'Workout'); const [target, setTarget] = useState(String(editing?.target || '30')); const [unit, setUnit] = useState(editing?.unit || 'minutes'); const [reminder, setReminder] = useState(editing?.reminder || store.settings.defaultReminder); const [repeat, setRepeat] = useState<Task['repeat']>(editing?.repeat || 'once'); const [weekdays, setWeekdays] = useState<number[]>(editing?.weekdays || [1,2,3,4,5]); const [notes, setNotes] = useState(editing?.notes || ''); const [showExamples, setShowExamples] = useState(!store.hasLaunched);
  const submit = (event: FormEvent) => { event.preventDefault(); if (!name.trim() || Number(target) <= 0) return; const task: Task = { id: editing?.id || makeId(), name: name.trim(), category, target: Number(target), unit, reminder, repeat, weekdays, notes, createdAt: editing?.createdAt || todayKey(), isExample: editing?.isExample }; update(s => ({ ...s, tasks: editing ? s.tasks.map(t => t.id === task.id ? task : t) : [...s.tasks, task], hasLaunched: true })); navigate('/'); };
  const samples = [{ name: 'Morning walk', category: 'Workout' as Category, target: '20', unit: 'minutes' }, { name: 'Read a chapter', category: 'Study & Others' as Category, target: '1', unit: 'chapter' }];
  const applySample = (sample: typeof samples[number]) => { setName(sample.name); setCategory(sample.category); setTarget(sample.target); setUnit(sample.unit); setRepeat('daily'); setShowExamples(false); };
  return <div className="mx-auto max-w-[780px] px-5 py-8 sm:px-8 md:px-10 md:py-12"><PageHeader eyebrow={editing ? 'Refine the rhythm' : 'Make room for it'} title={editing ? 'Edit task' : 'New task'} description="Keep it concrete. A target gives your effort somewhere kind to land." action={<Link href="/" data-testid="link-cancel-task" className="rounded-xl border border-border p-3 text-muted-foreground hover:bg-muted"><X size={18} /></Link>} />
    {showExamples && !editing && <section className="ds-in mb-6 rounded-2xl border border-accent/40 bg-accent/15 p-5"><div className="flex items-start gap-3"><Sparkles className="mt-0.5 text-accent-foreground" size={18} /><div className="flex-1"><h2 className="font-bold">Start with a gentle example</h2><p className="mt-1 text-sm text-muted-foreground">Try one of these, or build your own from scratch. Examples are never hidden in your history.</p><div className="mt-4 flex flex-wrap gap-2">{samples.map(sample => <button key={sample.name} onClick={() => applySample(sample)} data-testid={`button-sample-${sample.name.toLowerCase().replaceAll(' ','-')}`} className="rounded-xl border border-border bg-card px-3 py-2 text-left text-xs font-semibold hover:border-primary">{sample.name}<span className="ml-2 font-normal text-muted-foreground">{sample.target} {sample.unit}</span></button>)}</div></div><button onClick={() => { setShowExamples(false); update(s => ({ ...s, hasLaunched: true })); }} data-testid="button-dismiss-examples" className="text-muted-foreground"><X size={16} /></button></div></section>}
    <form onSubmit={submit} className="space-y-5"><section className="ds-card rounded-2xl p-5 sm:p-7"><label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="task-name">What are you making time for?</label><input id="task-name" data-testid="input-task-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Strength session, Spanish practice" className="w-full border-0 border-b-2 border-border bg-transparent px-0 py-3 text-xl font-semibold outline-none placeholder:text-muted-foreground/50 focus:border-primary" autoFocus /><div className="mt-7"><span className="mb-3 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</span><div className="grid grid-cols-2 gap-2">{(['Workout','Study & Others'] as Category[]).map(item => { const Icon = iconFor(item); return <button type="button" key={item} onClick={() => setCategory(item)} data-testid={`button-category-${item}`} className={cx('flex items-center gap-3 rounded-xl border p-3 text-left text-sm font-bold', category === item ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted')}><Icon size={18} />{item}</button>; })}</div></div></section>
       <section className="ds-card rounded-2xl p-5 sm:p-7"><div className="grid gap-5 sm:grid-cols-[1fr_1.3fr]"><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Target amount</span><input type="number" min="1" id="task-target" data-testid="input-task-target" value={target} onChange={e => setTarget(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-3 font-mono outline-none focus:ring-2 focus:ring-ring" /></label><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Unit</span><select id="task-unit" data-testid="select-task-unit" value={unit} onChange={e => setUnit(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-ring"><option>seconds</option><option>minutes</option><option>hours</option><option>pages</option><option>chapters</option><option>sessions</option><option>reps</option><option>glasses</option></select></label></div><label className="mt-5 flex items-center justify-between gap-4 border-t border-border pt-5"><span><span className="block text-sm font-bold">Reminder</span><span className="text-xs text-muted-foreground">A nudge, not a demand.</span></span><input type="time" data-testid="input-task-reminder" value={reminder} onChange={e => setReminder(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2.5 font-mono text-sm" /></label></section>
      <section className="ds-card rounded-2xl p-5 sm:p-7"><span className="mb-3 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Repeat</span><div className="flex flex-wrap gap-2">{[['once','Once'],['daily','Every day'],['weekdays','Selected days']].map(([value,label]) => <button type="button" key={value} onClick={() => setRepeat(value as Task['repeat'])} data-testid={`button-repeat-${value}`} className={cx('rounded-xl border px-3 py-2.5 text-sm font-bold', repeat === value ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted')}>{label}</button>)}</div>{repeat === 'weekdays' && <div className="mt-4 flex gap-2">{['S','M','T','W','T','F','S'].map((label, i) => <button type="button" key={`${label}-${i}`} onClick={() => setWeekdays(d => d.includes(i) ? d.filter(x => x !== i) : [...d, i])} data-testid={`button-weekday-${i}`} className={cx('flex h-9 w-9 items-center justify-center rounded-full font-mono text-xs font-bold', weekdays.includes(i) ? 'bg-accent text-accent-foreground' : 'border border-border text-muted-foreground')}>{label}</button>)}</div>}<label className="mt-6 block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes <span className="font-normal normal-case tracking-normal">(optional)</span></span><textarea data-testid="textarea-task-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="What will make this easier to begin?" className="w-full resize-none rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label></section>
      <button type="submit" data-testid="button-save-task" className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-md hover:opacity-90">{editing ? <Check size={17} /> : <Plus size={17} />}{editing ? 'Save changes' : 'Add to today'}</button>
    </form>
  </div>;
}

function Weekly({ store }: { store: Store }) {
  const dates = weekDates(todayKey(), store.settings.weekStarts === 'monday'); const previous = dates.map(d => dateOffset(d, -7));
  const dayPercent = (date: string) => { const ts = store.tasks.filter(t => isScheduled(t, date)); return ts.length ? completion(ts.reduce((a,t)=>a+getActual(store.records,t.id,date),0),ts.reduce((a,t)=>a+t.target,0)) : 0; };
  const avg = Math.round(dates.reduce((a,d)=>a+dayPercent(d),0) / 7); const prevAvg = Math.round(previous.reduce((a,d)=>a+dayPercent(d),0) / 7); const delta = avg - prevAvg;
  const planned = dates.reduce((a,d)=>a+store.tasks.filter(t=>isScheduled(t,d)).length,0); const done = dates.reduce((a,d)=>a+store.tasks.filter(t=>isScheduled(t,d)&&getActual(store.records,t.id,d)>=t.target).length,0); const best = dates.reduce((a,d)=>dayPercent(d)>dayPercent(a)?d:a,dates[0]); const worst = dates.reduce((a,d)=>dayPercent(d)<dayPercent(a)?d:a,dates[0]); const workout = averageCategory(store, dates, 'Workout'); const study = averageCategory(store, dates, 'Study & Others');
  return <div className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 md:px-10 md:py-12"><PageHeader eyebrow="Look back, learn forward" title="Your week in motion." description={`${formatDate(dates[0],{month:'short',day:'numeric'})} — ${formatDate(dates[6],{month:'short',day:'numeric',year:'numeric'})}`} action={<div className="hidden items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground sm:flex"><Flame size={15} className="text-accent-foreground" /> {streak(store)} day streak</div>} />
    <div className="grid gap-3 sm:grid-cols-3"><div className="ds-card rounded-2xl bg-primary p-5 text-primary-foreground sm:col-span-1"><p className="font-mono text-[10px] uppercase tracking-[.2em] opacity-70">Average score</p><div className="ds-display mt-2 text-5xl">{avg}%</div><p className="mt-2 flex items-center gap-1 text-xs opacity-80">{delta >= 0 ? <ChevronRight size={14} className="-rotate-45" /> : <ChevronRight size={14} className="rotate-45" />}{Math.abs(delta)} pts vs last week</p></div><StatCard label="Completed" value={`${done}/${planned}`} detail="planned tasks" icon={Check} /><StatCard label="Streak" value={`${streak(store)} days`} detail="current run" icon={Flame} accent="text-accent-foreground" /></div>
    <section className="ds-card mt-5 rounded-2xl p-5 sm:p-7"><div className="mb-7 flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">Seven day view</p><h2 className="ds-display mt-1 text-2xl">The shape of your week</h2></div><span className="font-mono text-xs text-muted-foreground">{avg}% avg</span></div><div className="flex h-[190px] items-end justify-between gap-2 sm:gap-4">{dates.map((date,i) => { const pct=dayPercent(date); return <div key={date} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="font-mono text-[10px] text-muted-foreground">{pct}%</span><div className="relative flex w-full max-w-[52px] items-end overflow-hidden rounded-t-lg bg-muted" style={{height:'125px'}}><div className="ds-progress w-full rounded-t-lg bg-accent" style={{height:`${Math.max(4,pct)}%`}} /></div><span className={cx('font-mono text-[10px]', date === todayKey() ? 'font-bold text-primary' : 'text-muted-foreground')}>{new Date(`${date}T12:00:00`).toLocaleDateString('en-US',{weekday:'short'}).slice(0,2)}</span></div>; })}</div></section>
    <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><section className="ds-card rounded-2xl p-5 sm:p-7"><p className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">By category</p><h2 className="ds-display mt-1 text-2xl">Where energy went</h2><div className="mt-6 space-y-5">{([{label:'Workout',value:workout,Icon:Dumbbell},{label:'Study & Others',value:study,Icon:BookOpen}] as const).map(({label,value,Icon}) => <div key={label}><div className="mb-2 flex items-center justify-between text-sm"><span className="flex items-center gap-2 font-bold"><span className={cx('rounded-lg p-2', categoryTint(label))}><Icon size={15} /></span>{label}</span><b className="font-mono">{value}%</b></div><div className="h-2 rounded-full bg-muted"><div className="ds-progress h-full rounded-full bg-primary" style={{width:`${value}%`}} /></div></div>)}</div></section><section className="ds-card rounded-2xl p-5 sm:p-7"><p className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">The edges</p><h2 className="ds-display mt-1 text-2xl">Worth noticing</h2><div className="mt-5 space-y-4"><Insight icon={Trophy} title="Best day" text={`${formatDate(best,{weekday:'long'})} at ${dayPercent(best)}%`} /><Insight icon={RotateCcw} title="A softer day" text={`${formatDate(worst,{weekday:'long'})} at ${dayPercent(worst)}% — data, not a verdict.`} /><Insight icon={Zap} title="Next week goal" text={`Aim for ${Math.min(100, Math.max(avg + (delta >= 0 ? 5 : 3), avg + 1))}% average. Tiny consistency beats a heroic Monday.`} /></div></section></div>
  </div>;
}
function averageCategory(store: Store, dates: string[], category: Category) { const values=dates.map(d=>{const t=store.tasks.filter(x=>x.category===category&&isScheduled(x,d));return t.length?completion(t.reduce((a,x)=>a+getActual(store.records,x.id,d),0),t.reduce((a,x)=>a+x.target,0)):0}); return Math.round(values.reduce((a,v)=>a+v,0)/7); }
function Insight({ icon: Icon, title, text }: { icon: typeof Trophy; title: string; text: string }) { return <div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent-foreground"><Icon size={16} /></span><div><b className="text-sm">{title}</b><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{text}</p></div></div>; }

function History({ store }: { store: Store }) {
  const [date, setDate] = useState(todayKey()); const tasks=store.tasks.filter(t=>isScheduled(t,date)); const dates=Array.from({length:30},(_,i)=>dateOffset(todayKey(),-29+i)); const monthly=dates.map(d=>{const ts=store.tasks.filter(t=>isScheduled(t,d));return ts.length?Math.round(ts.reduce((a,t)=>a+completion(getActual(store.records,t.id,d),t.target),0)/ts.length):0}); const selected=monthly[monthly.length-1];
  return <div className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 md:px-10 md:py-12"><PageHeader eyebrow="Your record, without judgement" title="History" description="Notice patterns. Keep what helps. Leave the rest." action={<label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold"><CalendarDays size={16} className="text-primary" /><input type="date" data-testid="input-history-date" value={date} onChange={e=>setDate(e.target.value)} className="w-[116px] bg-transparent text-xs outline-none" /></label>} />
    <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]"><section className="ds-card rounded-2xl p-5 sm:p-7"><div className="mb-6 flex items-center justify-between"><button onClick={()=>setDate(dateOffset(date,-7))} data-testid="button-history-prev" className="rounded-lg p-2 hover:bg-muted"><ChevronLeft size={17}/></button><b>{formatDate(date,{month:'long',year:'numeric'})}</b><button onClick={()=>setDate(dateOffset(date,7))} data-testid="button-history-next" className="rounded-lg p-2 hover:bg-muted"><ChevronRight size={17}/></button></div><div className="grid grid-cols-7 gap-1.5">{Array.from({length:35},(_,i)=>{const d=dateOffset(startOfWeek(`${date.slice(0,7)}-01`,store.settings.weekStarts==='monday'),i); const pct=store.tasks.filter(t=>isScheduled(t,d)).length?Math.round(store.tasks.filter(t=>isScheduled(t,d)).reduce((a,t)=>a+completion(getActual(store.records,t.id,d),t.target),0)/store.tasks.filter(t=>isScheduled(t,d)).length):0; return <button key={d} onClick={()=>setDate(d)} data-testid={`button-calendar-${d}`} className={cx('relative flex h-10 items-center justify-center rounded-lg font-mono text-[11px]', d===date?'bg-primary text-primary-foreground':'hover:bg-muted', d.slice(0,7)!==date.slice(0,7)&&'opacity-30')}><span>{new Date(`${d}T12:00:00`).getDate()}</span>{pct>0&&<i className={cx('absolute bottom-1 h-1 w-1 rounded-full', d===date?'bg-accent':'bg-primary')} />}</button>})}</div><div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-primary" /> has progress</span><span>{formatDate(date,{weekday:'long',month:'short',day:'numeric'})}</span></div></section><section className="ds-card rounded-2xl p-5 sm:p-7"><p className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">Selected day</p><h2 className="ds-display mt-1 text-3xl">{formatDate(date,{weekday:'long'})}</h2><p className="mt-1 text-sm text-muted-foreground">{tasks.length ? `${tasks.length} planned ${tasks.length===1?'task':'tasks'}` : 'No scheduled tasks'}</p><div className="mt-6 space-y-3">{tasks.length ? tasks.map(task=>{const actual=getActual(store.records,task.id,date);const pct=completion(actual,task.target);return <div key={task.id} className="rounded-xl bg-muted/60 p-3"><div className="flex items-center justify-between gap-2"><span className="text-sm font-bold">{task.name}</span><span className="font-mono text-xs">{actual}/{task.target} {task.unit}</span></div><div className="mt-2 h-1.5 rounded-full bg-background"><div className="h-full rounded-full bg-primary" style={{width:`${pct}%`}} /></div></div>}) : <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nothing planned here. A quiet day counts too.</div>}</div></section></div>
    <section className="ds-card mt-5 rounded-2xl p-5 sm:p-7"><div className="flex items-end justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">Trend</p><h2 className="ds-display mt-1 text-2xl">Last 30 days</h2></div><span className="font-mono text-xs text-muted-foreground">{selected}% today</span></div><div className="mt-7 flex h-28 items-end gap-1">{monthly.map((pct,i)=><div key={i} title={`${pct}%`} className="group flex h-full flex-1 items-end"><div className={cx('w-full rounded-t-sm', pct>=80?'bg-primary':pct>0?'bg-accent':'bg-muted')} style={{height:`${Math.max(3,pct)}%`}} /></div>)}</div><div className="mt-3 flex justify-between font-mono text-[10px] text-muted-foreground"><span>30 days ago</span><span>today</span></div></section>
  </div>;
}

function Settings({ store, update }: { store: Store; update: (fn: (s: Store) => Store) => void }) {
  const fileRef=useRef<HTMLInputElement>(null); const [message,setMessage]=useState(''); const [installEvent,setInstallEvent]=useState<BeforeInstallPromptEvent | null>(null);
  useEffect(()=>{const handler=(event: Event)=>{event.preventDefault();setInstallEvent(event as BeforeInstallPromptEvent)};window.addEventListener('beforeinstallprompt',handler);return()=>window.removeEventListener('beforeinstallprompt',handler)},[]);
  const patchSettings=(patch: Partial<Store['settings']>)=>update(s=>({...s,settings:{...s.settings,...patch}}));
  const download=()=>{const url=URL.createObjectURL(new Blob([exportJson(store)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`dailyscore-${todayKey()}.json`;a.click();URL.revokeObjectURL(url);setMessage('Backup downloaded.');};
  const importFile=(file:File)=>{const reader=new FileReader();reader.onload=()=>{try{update(()=>importJson(String(reader.result)));setMessage('Backup restored.')}catch(e){setMessage(e instanceof Error?e.message:'Could not restore this file.')}};reader.readAsText(file)};
  const reset=()=>{if(window.confirm('Reset DailyScore? This clears tasks and history on this device.')){localStorage.clear();window.location.reload()}};
  return <div className="mx-auto max-w-[820px] px-5 py-8 sm:px-8 md:px-10 md:py-12"><PageHeader eyebrow="Make it yours" title="Settings" description="Everything stays on this device, unless you choose to take it with you." />
    <div className="space-y-4"><SettingSection icon={Sun} title="Appearance" description="Choose the atmosphere that helps you return."><div className="grid grid-cols-3 gap-2">{[['light','Light',Sun],['dark','Dark',Moon],['system','System',SettingsIcon]].map(([value,label,Icon])=><button key={value as string} onClick={()=>patchSettings({theme:value as Store['settings']['theme']})} data-testid={`button-theme-${value}`} className={cx('flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-bold',store.settings.theme===value?'border-primary bg-primary/10 text-primary':'border-border hover:bg-muted')}><Icon size={18}/>{label as string}</button>)}</div></SettingSection>
      <SettingSection icon={Bell} title="Reminders" description="Browser notifications are optional and never leave this device."><div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/60 p-3"><div><b className="text-sm">Notification permission</b><p className="mt-1 text-xs text-muted-foreground">{'Notification' in window ? (Notification.permission === 'granted' ? 'Allowed in this browser.' : Notification.permission === 'denied' ? 'Blocked — update browser site settings.' : 'Not requested yet.') : 'Not supported by this browser.'}</p></div><button onClick={()=>{'Notification' in window&&Notification.requestPermission().then(p=>{if(p==='granted')patchSettings({notifications:true});setMessage(p==='granted'?'Notifications are on.':'Notifications were not enabled.')})}} data-testid="button-enable-notifications" className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Enable</button></div><label className="mt-4 flex items-center justify-between text-sm font-semibold">Default reminder<input type="time" data-testid="input-default-reminder" value={store.settings.defaultReminder} onChange={e=>patchSettings({defaultReminder:e.target.value})} className="rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs" /></label></SettingSection>
      <SettingSection icon={CalendarDays} title="Week structure" description="Weekly reports use this as their first day."><div className="flex gap-2">{[['monday','Monday'],['sunday','Sunday']].map(([value,label])=><button key={value} onClick={()=>patchSettings({weekStarts:value as Store['settings']['weekStarts']})} data-testid={`button-week-start-${value}`} className={cx('rounded-xl border px-4 py-2.5 text-sm font-bold',store.settings.weekStarts===value?'border-primary bg-primary text-primary-foreground':'border-border hover:bg-muted')}>{label}</button>)}</div></SettingSection>
      <SettingSection icon={FileJson} title="Your data" description="Export a portable JSON backup, or restore one from this device."><div className="flex flex-wrap gap-2"><button onClick={download} data-testid="button-export" className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-bold hover:bg-muted"><Download size={16}/>Export JSON</button><button onClick={()=>fileRef.current?.click()} data-testid="button-import" className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-bold hover:bg-muted"><Upload size={16}/>Import JSON</button><input ref={fileRef} type="file" accept="application/json" onChange={e=>e.target.files?.[0]&&importFile(e.target.files[0])} className="hidden" /></div>{message&&<p className="mt-3 text-xs font-semibold text-primary">{message}</p>}</SettingSection>
      <SettingSection icon={Sparkles} title="Install DailyScore" description="Add it to your home screen for a focused, offline-friendly launch."><p className="text-sm leading-6 text-muted-foreground">On iPhone: tap Share, then “Add to Home Screen.” On Android or desktop: use your browser’s install icon.</p>{installEvent&&<button onClick={()=>{installEvent.prompt();setInstallEvent(null)}} data-testid="button-install" className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Install app</button>}</SettingSection>
      <button onClick={reset} data-testid="button-reset-data" className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 px-4 py-3 text-sm font-bold text-destructive hover:bg-destructive/10"><Trash2 size={16}/>Reset all local data</button>
    </div>
  </div>;
}
function SettingSection({icon:Icon,title,description,children}:{icon:typeof Sun;title:string;description:string;children:ReactNode}){return <section className="ds-card rounded-2xl p-5 sm:p-7"><div className="mb-5 flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent-foreground"><Icon size={17}/></span><div><h2 className="font-bold">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div></div>{children}</section>}

interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

function RouterContent({ store, update }: { store: Store; update: (fn: (s: Store) => Store) => void }) {
  return <Switch><Route path="/" component={() => <Today store={store} update={update} />} /><Route path="/add" component={() => <AddTask store={store} update={update} />} /><Route path="/weekly" component={() => <Weekly store={store} />} /><Route path="/history" component={() => <History store={store} />} /><Route path="/settings" component={() => <Settings store={store} update={update} />} /><Route component={NotFound} /></Switch>;
}

function App() {
  const { store, update } = useDailyScore();
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Shell store={store} onResetIntro={()=>update(s=>({...s,hasLaunched:false}))}><RouterContent store={store} update={update} /></Shell></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;