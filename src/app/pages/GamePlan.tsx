import { useState, useMemo } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, Check, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { getClasses, addClass, updateClass, deleteClass } from '../utils/libraryStorage';
import { ClassSession, SessionLevel } from '../data/library';
import { isAdminActive } from '../utils/libraryStorage';

const LEVELS: SessionLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function SessionModal({
  date,
  session,
  onClose,
  onSave,
}: {
  date: string;
  session?: ClassSession;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    theme: session?.theme ?? '',
    level: (session?.level ?? 'All Levels') as SessionLevel,
    notes: session?.notes ?? '',
    status: (session?.status ?? 'planned') as ClassSession['status'],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.theme.trim()) {
      toast.error('Theme is required');
      return;
    }
    if (session) {
      updateClass(session.id, { ...form });
      toast.success('Session updated');
    } else {
      addClass({ date, ...form, videoIds: [] });
      toast.success('Session planned');
    }
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-['Bebas_Neue'] text-2xl tracking-wider">
              {session ? 'Edit Session' : 'Plan Session'}
            </h2>
            <p className="text-xs text-muted-foreground">{date}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Theme / Focus *</label>
            <input
              type="text"
              value={form.theme}
              onChange={(e) => setForm({ ...form, theme: e.target.value })}
              placeholder="e.g. Guard Passing, Leg Locks, Back Takes..."
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Level</label>
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value as SessionLevel })}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ClassSession['status'] })}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="planned">Planned</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Coaching notes, drill ideas, feedback..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all"
            >
              {session ? 'Save Changes' : 'Plan Session'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-border bg-secondary font-semibold text-sm hover:bg-muted transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SessionBadge({ session, onClick }: { session: ClassSession; onClick: () => void }) {
  const levelColors: Record<SessionLevel, string> = {
    Beginner: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    Intermediate: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    Advanced: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    'All Levels': 'bg-primary/10 text-primary border-primary/20',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2 py-1 rounded-md text-[10px] font-bold border transition-all hover:opacity-80 ${levelColors[session.level]} ${
        session.status === 'completed' ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-center gap-1">
        {session.status === 'completed' ? (
          <Check className="w-2.5 h-2.5 shrink-0" />
        ) : (
          <Clock className="w-2.5 h-2.5 shrink-0" />
        )}
        <span className="truncate">{session.theme}</span>
      </div>
    </button>
  );
}

export function GamePlan() {
  const admin = isAdminActive();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [sessions, setSessions] = useState<ClassSession[]>(getClasses);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [editSession, setEditSession] = useState<ClassSession | undefined>();

  const refreshSessions = () => setSessions(getClasses());

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [year, month]);

  const sessionsByDate = useMemo(() => {
    const map: Record<string, ClassSession[]> = {};
    sessions.forEach((s) => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [sessions]);

  const formatDate = (day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const openCreate = (day: number) => {
    if (!admin) return;
    setEditSession(undefined);
    setModalDate(formatDate(day));
  };

  const openEdit = (session: ClassSession) => {
    if (!admin) return;
    setEditSession(session);
    setModalDate(session.date);
  };

  const handleDeleteSession = (id: string) => {
    if (!confirm('Delete this session?')) return;
    deleteClass(id);
    refreshSessions();
    toast.success('Session deleted');
  };

  // Upcoming sessions list
  const upcomingSessions = useMemo(() => {
    return sessions
      .filter((s) => s.date >= todayStr && s.status === 'planned')
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [sessions, todayStr]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        {/* Calendar */}
        <div>
          {/* Month nav */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-['Bebas_Neue'] text-4xl sm:text-5xl tracking-wider leading-none">
              {MONTH_NAMES[month]} {year}
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 rounded-lg border border-border hover:bg-muted transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); }}
                className="px-3 py-2 rounded-lg border border-border hover:bg-muted transition-all text-xs font-bold uppercase tracking-wider"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-lg border border-border hover:bg-muted transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const dateStr = formatDate(day);
              const daySessions = sessionsByDate[dateStr] ?? [];
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={dateStr}
                  className={`min-h-[80px] p-1.5 rounded-lg border transition-all ${
                    isToday
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border/50 hover:border-border bg-card/50'
                  } ${admin ? 'cursor-pointer' : ''}`}
                  onClick={() => openCreate(day)}
                >
                  <div className={`text-xs font-bold mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`}>
                    {day}
                  </div>
                  <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
                    {daySessions.map((s) => (
                      <SessionBadge key={s.id} session={s} onClick={() => openEdit(s)} />
                    ))}
                  </div>
                  {admin && daySessions.length === 0 && (
                    <div className="opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center h-8">
                      <Plus className="w-3 h-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4">
            {Object.entries({
              Beginner: 'text-emerald-600 dark:text-emerald-400',
              Intermediate: 'text-blue-600 dark:text-blue-400',
              Advanced: 'text-red-600 dark:text-red-400',
              'All Levels': 'text-primary',
            }).map(([label, color]) => (
              <div key={label} className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${color}`}>
                <div className="w-2 h-2 rounded-full bg-current opacity-60" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar: upcoming sessions */}
        <div>
          <h2 className="font-['Bebas_Neue'] text-2xl tracking-wider mb-4">Upcoming</h2>
          {upcomingSessions.length === 0 ? (
            <div className="text-center py-8 bg-card rounded-xl border border-border">
              <p className="text-sm text-muted-foreground">No upcoming sessions planned.</p>
              {admin && (
                <p className="text-xs text-muted-foreground mt-1">Click on a calendar day to plan a session.</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {new Date(session.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                      <p className="font-semibold text-sm mt-0.5">{session.theme}</p>
                    </div>
                    {admin && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(session)}
                          className="p-1 rounded hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="w-3 h-3 rotate-45" />
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all text-muted-foreground"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                    {session.level}
                  </span>
                  {session.notes && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{session.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* All sessions count */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="font-['Bebas_Neue'] text-3xl text-primary leading-none mb-1">
                {sessions.filter((s) => s.status === 'planned').length}
              </div>
              <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">Planned</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="font-['Bebas_Neue'] text-3xl text-primary leading-none mb-1">
                {sessions.filter((s) => s.status === 'completed').length}
              </div>
              <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">Completed</div>
            </div>
          </div>
        </div>
      </div>

      {modalDate && (
        <SessionModal
          date={modalDate}
          session={editSession}
          onClose={() => { setModalDate(null); setEditSession(undefined); }}
          onSave={refreshSessions}
        />
      )}
    </div>
  );
}
