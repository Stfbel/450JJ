import { useState, useRef, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Loader2, Trash2, Sparkles, RefreshCw } from 'lucide-react';
import {
  getSyncedVideos,
  saveSyncedVideos,
  clearSyncedVideos,
} from '../utils/youtubeApi';
import {
  getSyncedGames,
  saveSyncedGames,
  clearSyncedGames,
} from '../utils/claudeApi';
import { searchTechniquesViaBackend, generateGamesBatchViaBackend, isBackendConfigured } from '../utils/backendApi';
import { techniques } from '../data/techniques';

interface SyncPanelProps {
  onClose: () => void;
  onSyncComplete: () => void;
}

type PhaseStatus = 'idle' | 'running' | 'done' | 'error';
interface PhaseProgress { done: number; total: number; errors: number; }

const COACH_STEPS = [
  'Studying the technique…',
  'Identifying No-Gi grip points…',
  'Designing the game situation…',
  'Defining TOP player objective…',
  'Defining BOTTOM player objective…',
  'Writing the coaching cue…',
  'Setting round duration & scoring…',
  'Reviewing game structure…',
];

export function SyncPanel({ onClose, onSyncComplete }: SyncPanelProps) {
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [ytStatus, setYtStatus] = useState<PhaseStatus>('idle');
  const [gamesStatus, setGamesStatus] = useState<PhaseStatus>('idle');
  const [ytProgress, setYtProgress] = useState<PhaseProgress>({ done: 0, total: 0, errors: 0 });
  const [gamesProgress, setGamesProgress] = useState<PhaseProgress>({ done: 0, total: 0, errors: 0 });
  const [ytSyncedCount, setYtSyncedCount] = useState(Object.keys(getSyncedVideos()).length);
  const [gamesSyncedCount, setGamesSyncedCount] = useState(Object.keys(getSyncedGames()).length);
  const [ytError, setYtError] = useState('');
  const [lastError, setLastError] = useState('');
  const [currentTechnique, setCurrentTechnique] = useState('');
  const [currentStep, setCurrentStep] = useState('');
  const [completedGames, setCompletedGames] = useState<{ technique: string; position: string }[]>([]);
  const abortRef = useRef(false);
  const isRunning = ytStatus === 'running' || gamesStatus === 'running';

  useEffect(() => { isBackendConfigured().then(setBackendOk); }, []);

  // ─── Phase 1 ────────────────────────────────────────────────────────────────

  const handleSyncYouTube = async () => {
    abortRef.current = false;
    setYtStatus('running');
    setYtError('');
    setCurrentTechnique('');
    setYtProgress({ done: 0, total: techniques.length, errors: 0 });

    let errors = 0;
    try {
      const results = await searchTechniquesViaBackend(
        techniques.map(t => ({ technique: t.technique, position: t.position, level: t.level })),
        (done, total, technique, position) => {
          setCurrentTechnique(`${technique} — ${position}`);
          setYtProgress({ done, total, errors });
        },
        (technique, error) => {
          errors++;
          setYtError(`${technique}: ${error}`);
          setYtProgress(prev => ({ ...prev, errors }));
        },
        abortRef
      );
      setCurrentTechnique('');
      saveSyncedVideos(results);
      setYtSyncedCount(Object.keys(results).length);
      setYtStatus(errors === techniques.length ? 'error' : 'done');
    } catch (err: any) {
      setCurrentTechnique('');
      setYtError(err?.message || 'Server error');
      setYtStatus('error');
    }
    onSyncComplete();
  };

  // ─── Phase 2 ────────────────────────────────────────────────────────────────

  const handleGenerateGames = async () => {
    abortRef.current = false;
    setGamesStatus('running');
    setGamesProgress({ done: 0, total: techniques.length, errors: 0 });
    setCompletedGames([]);
    setCurrentTechnique('');
    setCurrentStep('');
    setLastError('');

    const stepInterval = setInterval(() => {
      setCurrentStep(COACH_STEPS[Math.floor(Math.random() * COACH_STEPS.length)]);
    }, 400);

    let errors = 0;
    try {
      const results = await generateGamesBatchViaBackend(
        techniques.map(t => ({ technique: t.technique, position: t.position, level: t.level })),
        (done, total, technique, position) => {
          setCurrentTechnique(`${technique} — ${position}`);
          setGamesProgress({ done, total, errors });
          setCompletedGames(prev => [...prev.slice(-4), { technique, position }]);
        },
        (technique, error) => {
          errors++;
          setLastError(`${technique}: ${error}`);
          setGamesProgress(prev => ({ ...prev, errors }));
        },
        abortRef
      );
      clearInterval(stepInterval);
      setCurrentTechnique('');
      setCurrentStep('');
      saveSyncedGames(results);
      setGamesSyncedCount(Object.keys(results).length);
      setGamesStatus(errors === techniques.length ? 'error' : 'done');
    } catch (err: any) {
      clearInterval(stepInterval);
      setCurrentTechnique('');
      setCurrentStep('');
      setLastError(err?.message || 'Server error');
      setGamesStatus('error');
    }
    onSyncComplete();
  };

  const handleStop = () => { abortRef.current = true; };
  const handleClearYt = () => { clearSyncedVideos(); setYtSyncedCount(0); onSyncComplete(); };
  const handleClearGames = () => { clearSyncedGames(); setGamesSyncedCount(0); onSyncComplete(); };

  const bothDone = ytStatus === 'done' && gamesStatus === 'done';
  const nothingDone = ytSyncedCount === 0 && gamesSyncedCount === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-card z-10 border-b border-border">
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-['Bebas_Neue'] text-2xl tracking-wider leading-none">AI BJJ Coach</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Watches videos · Builds games · Coaches your class</p>
              </div>
            </div>
            <button onClick={onClose} disabled={isRunning}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Server status */}
          <div className="px-6 pb-4">
            {backendOk === null && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Connecting to coach…
              </div>
            )}
            {backendOk === true && (
              <div className="flex items-center gap-2 text-xs text-emerald-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Coach is online and ready
              </div>
            )}
            {backendOk === false && (
              <div className="flex items-center gap-2 text-xs text-destructive font-medium">
                <span className="w-2 h-2 rounded-full bg-destructive" /> Coach is offline — try again later
              </div>
            )}
          </div>
        </div>

        {/* Intro when nothing done yet */}
        {nothingDone && (
          <div className="mx-6 mt-6 rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">Your AI coach will:</p>
            <div className="space-y-2">
              {[
                { icon: '🎥', text: 'Search YouTube for the best BJJ videos matching each of your 81 techniques' },
                { icon: '🧠', text: 'Study each technique and design a custom 2-player competitive game' },
                { icon: '⬆️', text: 'Write specific TOP player objectives for each game' },
                { icon: '⬇️', text: 'Write specific BOTTOM player objectives for each game' },
                { icon: '📣', text: 'Craft one precise coaching cue per technique' },
                { icon: '⏱️', text: 'Set duration, scoring rules, and win conditions' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <span className="text-sm shrink-0">{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
              Run Step 1 first to find videos, then Step 2 to generate games. Takes ~5 min total.
            </p>
          </div>
        )}

        {bothDone && (
          <div className="mx-6 mt-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Coach session complete!</p>
              <p className="text-xs text-muted-foreground">{ytSyncedCount} techniques have videos · {gamesSyncedCount} games ready to use</p>
            </div>
          </div>
        )}

        <div className="p-6 space-y-6">

          {/* ── Step 1 ── */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-muted/30">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                ytStatus === 'done' ? 'bg-emerald-500 text-white' : 'bg-primary/15 text-primary'
              }`}>
                {ytStatus === 'done' ? '✓' : '1'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">Find Videos on YouTube</p>
                <p className="text-[11px] text-muted-foreground">
                  {ytSyncedCount > 0
                    ? `${ytSyncedCount} / ${techniques.length} techniques have videos`
                    : 'Searches YouTube once per technique — precise matches only'}
                </p>
              </div>
              {ytStatus === 'error' && <AlertCircle className="w-4 h-4 text-destructive shrink-0" />}
            </div>

            <div className="p-4 space-y-3">
              {ytStatus === 'idle' && (
                <p className="text-xs text-muted-foreground">
                  The coach searches YouTube for <span className="font-bold text-foreground">{techniques.length} techniques</span> individually — each video is matched to the exact technique, not guessed from a broad pool.
                </p>
              )}

              {(ytStatus === 'running' || ytStatus === 'done' || ytStatus === 'error') && (
                <div className="space-y-3">
                  <ProgressBar progress={ytProgress} status={ytStatus} label="techniques searched" />
                  {ytStatus === 'running' && currentTechnique && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center gap-2">
                      <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0" />
                      <span className="text-xs font-bold text-primary truncate">Searching: {currentTechnique}</span>
                    </div>
                  )}
                </div>
              )}
              {ytError && (
                <p className="text-xs text-destructive flex items-start gap-1.5 bg-destructive/5 border border-destructive/20 rounded-lg p-2.5">
                  <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                  {ytError}
                </p>
              )}

              <div className="flex gap-2">
                {ytStatus !== 'running' ? (
                  <>
                    <button onClick={handleSyncYouTube} disabled={!backendOk || isRunning}
                      className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      <RefreshCw className="w-4 h-4" />
                      {ytSyncedCount > 0 ? 'Refresh Videos' : 'Find Videos'}
                    </button>
                    {ytSyncedCount > 0 && (
                      <button onClick={handleClearYt} disabled={isRunning}
                        className="px-4 border border-border rounded-xl text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                ) : (
                  <StopButton onStop={handleStop} />
                )}
              </div>
            </div>
          </div>

          {/* ── Step 2 ── */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-muted/30">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                gamesStatus === 'done' ? 'bg-emerald-500 text-white' : 'bg-primary/15 text-primary'
              }`}>
                {gamesStatus === 'done' ? '✓' : '2'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">Build Competitive Games</p>
                <p className="text-[11px] text-muted-foreground">
                  {gamesSyncedCount > 0
                    ? `${gamesSyncedCount} / ${techniques.length} games built`
                    : 'Coach studies each technique and designs a game with top/bottom objectives'}
                </p>
              </div>
              {gamesStatus === 'error' && <AlertCircle className="w-4 h-4 text-destructive shrink-0" />}
            </div>

            <div className="p-4 space-y-3">
              {gamesStatus === 'idle' && gamesSyncedCount === 0 && (
                <div className="text-xs text-muted-foreground space-y-1.5">
                  <p>For each of your <span className="font-bold text-foreground">{techniques.length} techniques</span>, the coach will:</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-1">
                    {['Study the technique', 'Set No-Gi grips', 'Write TOP objective', 'Write BOTTOM objective', 'Craft coaching cue', 'Set scoring rules'].map(s => (
                      <p key={s} className="flex items-center gap-1"><span className="text-primary">·</span> {s}</p>
                    ))}
                  </div>
                </div>
              )}

              {(gamesStatus === 'running' || gamesStatus === 'done') && (
                <div className="space-y-3">
                  <ProgressBar progress={gamesProgress} status={gamesStatus} label="games built" />

                  {gamesStatus === 'running' && currentTechnique && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0" />
                        <span className="text-xs font-bold text-primary truncate">Coaching: {currentTechnique}</span>
                      </div>
                      {currentStep && (
                        <p className="text-[10px] text-muted-foreground pl-5">{currentStep}</p>
                      )}
                    </div>
                  )}

                  {completedGames.length > 0 && gamesStatus === 'running' && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Just completed</p>
                      {completedGames.slice().reverse().map((g, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>{g.technique} <span className="opacity-50">· {g.position}</span></span>
                        </div>
                      ))}
                    </div>
                  )}

                  {lastError && gamesStatus === 'running' && (
                    <p className="text-[10px] text-destructive/70 font-mono truncate">⚠ {lastError}</p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                {gamesStatus !== 'running' ? (
                  <>
                    <button onClick={handleGenerateGames} disabled={!backendOk || isRunning}
                      className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      <Sparkles className="w-4 h-4" />
                      {gamesSyncedCount > 0 ? 'Rebuild Games' : 'Build Games'}
                    </button>
                    {gamesSyncedCount > 0 && (
                      <button onClick={handleClearGames} disabled={isRunning}
                        className="px-4 border border-border rounded-xl text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                ) : (
                  <StopButton onStop={handleStop} />
                )}
              </div>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            Your coach runs on a secure server · No API keys needed
          </p>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ progress, status, label }: { progress: PhaseProgress; status: PhaseStatus; label: string }) {
  const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{progress.done} / {progress.total} {label}</span>
        <span className="font-semibold text-foreground">{percent}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${percent}%` }} />
      </div>
      {progress.errors > 0 && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {progress.errors} errors
        </p>
      )}
      {status === 'done' && (
        <p className="text-xs text-emerald-500 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Done — {progress.done - progress.errors} succeeded
        </p>
      )}
    </div>
  );
}

function StopButton({ onStop }: { onStop: () => void }) {
  return (
    <button onClick={onStop}
      className="flex-1 flex items-center justify-center gap-2 border border-border rounded-xl py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
      <Loader2 className="w-4 h-4 animate-spin" /> Stop
    </button>
  );
}
