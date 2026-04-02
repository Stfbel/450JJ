import { useState, useRef, useEffect } from 'react';
import { X, RefreshCw, CheckCircle2, AlertCircle, Loader2, Trash2, Sparkles, Youtube, ChevronDown, ChevronUp } from 'lucide-react';
import {
  matchVideosToTechnique,
  getSyncedVideos,
  saveSyncedVideos,
  clearSyncedVideos,
  clearVideoPool,
  getVideoPool,
  saveVideoPool,
  getSyncedKey,
  BJJ_SEARCH_QUERIES_TIER1,
  BJJ_SEARCH_QUERIES,
  YouTubeSearchResult,
} from '../utils/youtubeApi';
import {
  getSyncedGames,
  saveSyncedGames,
  clearSyncedGames,
} from '../utils/claudeApi';
import { crawlYouTubeViaBackend, generateGamesBatchViaBackend, isBackendConfigured } from '../utils/backendApi';
import { techniques } from '../data/techniques';

interface SyncPanelProps {
  onClose: () => void;
  onSyncComplete: () => void;
}

type PhaseStatus = 'idle' | 'running' | 'done' | 'error';

interface PhaseProgress {
  done: number;
  total: number;
  errors: number;
}

export function SyncPanel({ onClose, onSyncComplete }: SyncPanelProps) {
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  const [ytStatus, setYtStatus] = useState<PhaseStatus>('idle');
  const [gamesStatus, setGamesStatus] = useState<PhaseStatus>('idle');
  const [ytProgress, setYtProgress] = useState<PhaseProgress>({ done: 0, total: 0, errors: 0 });
  const [gamesProgress, setGamesProgress] = useState<PhaseProgress>({ done: 0, total: 0, errors: 0 });

  const [ytSyncedCount, setYtSyncedCount] = useState(Object.keys(getSyncedVideos()).length);
  const [poolCount, setPoolCount] = useState(getVideoPool().length);
  const [quotaTier, setQuotaTier] = useState<'eco' | 'full'>('eco');
  const [gamesSyncedCount, setGamesSyncedCount] = useState(Object.keys(getSyncedGames()).length);
  const [lastError, setLastError] = useState('');
  const [ytError, setYtError] = useState('');
  const [currentTechnique, setCurrentTechnique] = useState('');
  const [currentStep, setCurrentStep] = useState('');
  const [showCoachSteps, setShowCoachSteps] = useState(false);
  const [completedGames, setCompletedGames] = useState<{ technique: string; position: string }[]>([]);

  const abortRef = useRef(false);

  const isRunning = ytStatus === 'running' || gamesStatus === 'running';

  useEffect(() => {
    isBackendConfigured().then(setBackendOk);
  }, []);

  const handleSyncYouTube = async () => {
    abortRef.current = false;
    setYtStatus('running');
    setYtError('');

    const queries = quotaTier === 'eco' ? BJJ_SEARCH_QUERIES_TIER1 : BJJ_SEARCH_QUERIES;
    setYtProgress({ done: 0, total: queries.length, errors: 0 });

    // If pool already has videos, skip crawl and just re-assign
    const existingPool = getVideoPool();
    let pool: YouTubeSearchResult[] = existingPool.length > 0 && ytSyncedCount > 0 ? existingPool : [];

    if (pool.length === 0) {
      try {
        pool = await crawlYouTubeViaBackend(
          queries,
          (done, total, videoCount) => {
            setYtProgress({ done, total, errors: 0 });
            setPoolCount(videoCount);
          }
        );
      } catch (err: any) {
        setYtError(err?.message || 'Backend error — server may be unavailable');
        setYtStatus('error');
        return;
      }

      if (abortRef.current) { setYtStatus('idle'); return; }

      if (pool.length === 0) {
        setYtError('No videos found — server may be unavailable or quota exhausted');
        setYtStatus('error');
        return;
      }

      saveVideoPool(pool);
    }

    saveVideoPool(pool);
    setPoolCount(pool.length);

    // Step 2: match pool videos to each technique
    const synced: Record<string, any[]> = {};
    for (const t of techniques) {
      const key = getSyncedKey(t.technique, t.position);
      const matches = matchVideosToTechnique(t.technique, t.position, pool, 5);
      if (matches.length > 0) synced[key] = matches;
    }

    saveSyncedVideos(synced);
    setYtSyncedCount(Object.keys(synced).length);
    setYtStatus('done');
    onSyncComplete();
  };

  const handleGenerateGames = async () => {
    abortRef.current = false;
    setGamesStatus('running');
    setGamesProgress({ done: 0, total: techniques.length, errors: 0 });
    setCompletedGames([]);
    setCurrentTechnique('');
    setCurrentStep('');
    setLastError('');

    const COACH_STEPS = [
      'Identifying position & technique family…',
      'Analyzing No-Gi grip requirements…',
      'Defining game situation & starting position…',
      'Writing TOP player objective…',
      'Writing BOTTOM player objective…',
      'Crafting coaching cue…',
      'Setting duration & scoring…',
      'Validating game structure…',
    ];

    // Animate coach steps while streaming
    const stepInterval = setInterval(() => {
      setCurrentStep(COACH_STEPS[Math.floor(Math.random() * COACH_STEPS.length)]);
    }, 300);

    let errors = 0;

    try {
      const results = await generateGamesBatchViaBackend(
        techniques.map(t => ({ technique: t.technique, position: t.position, level: t.level })),
        (done, total, technique, position) => {
          setCurrentTechnique(`${technique} — ${position}`);
          setGamesProgress({ done, total, errors });
          setCompletedGames((prev) => [...prev.slice(-4), { technique, position }]);
        },
        (technique, error) => {
          errors++;
          setLastError(`${technique}: ${error}`);
          setGamesProgress((prev) => ({ ...prev, errors }));
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
      setLastError(err?.message || 'Backend error — server may be unavailable');
      setGamesStatus('error');
    }

    onSyncComplete();
  };

  const handleStop = () => { abortRef.current = true; };

  const handleClearYt = () => {
    clearSyncedVideos();
    clearVideoPool();
    setYtSyncedCount(0);
    setPoolCount(0);
    onSyncComplete();
  };
  const handleClearGames = () => { clearSyncedGames(); setGamesSyncedCount(0); onSyncComplete(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="font-bold text-lg">Sync & Generate</h2>
          <button
            onClick={onClose}
            disabled={isRunning}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-8">

          {/* ── Backend Status Indicator ── */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            {backendOk === null && (
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking server…
              </span>
            )}
            {backendOk === true && (
              <span className="text-emerald-500 flex items-center gap-1.5">
                🟢 Connected to server
              </span>
            )}
            {backendOk === false && (
              <span className="text-destructive flex items-center gap-1.5">
                🔴 Server unavailable
              </span>
            )}
          </div>

          {/* ── Phase 1: YouTube Videos ── */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Youtube className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Phase 1 — YouTube Videos</h3>
                <p className="text-xs text-muted-foreground">
                  {poolCount > 0
                    ? `${poolCount} videos found · ${ytSyncedCount} techniques assigned`
                    : `Crawls ${BJJ_SEARCH_QUERIES.length} BJJ topics · up to ${BJJ_SEARCH_QUERIES.length * 50} videos`}
                </p>
              </div>
              {ytStatus === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
              {ytStatus === 'error' && <AlertCircle className="w-4 h-4 text-destructive ml-auto" />}
            </div>

            {/* Quota tier selector */}
            {ytStatus === 'idle' && (
              <div className="space-y-1.5">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quota Usage</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setQuotaTier('eco')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${quotaTier === 'eco' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'}`}
                  >
                    <p className="text-xs font-bold">Eco — 1,000 units</p>
                    <p className="text-[10px] text-muted-foreground">10 queries · ~500 videos</p>
                  </button>
                  <button
                    onClick={() => setQuotaTier('full')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${quotaTier === 'full' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'}`}
                  >
                    <p className="text-xs font-bold">Full — 3,000 units</p>
                    <p className="text-[10px] text-muted-foreground">30 queries · ~1,500 videos</p>
                  </button>
                </div>
                {poolCount > 0 && (
                  <p className="text-[10px] text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Pool existant ({poolCount} vidéos) — le sync réutilise ce pool sans requêtes supplémentaires
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">Quota gratuit : 10,000 unités/jour · Reset à minuit PT</p>
              </div>
            )}

            {/* YT Progress */}
            {(ytStatus === 'running' || ytStatus === 'done' || ytStatus === 'error') && (
              <ProgressBar
                progress={ytProgress}
                status={ytStatus}
                label={`queries · ${poolCount} videos found`}
              />
            )}
            {ytError && (
              <p className="text-xs text-destructive flex items-start gap-1.5 bg-destructive/5 border border-destructive/20 rounded-lg p-2.5">
                <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                <span className="font-mono break-all">{ytError}</span>
              </p>
            )}

            <div className="flex gap-2">
              {ytStatus !== 'running' ? (
                <>
                  <button
                    onClick={handleSyncYouTube}
                    disabled={!backendOk || isRunning}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl py-2.5 text-sm font-bold hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {ytSyncedCount > 0 ? 'Re-sync Videos' : 'Sync Videos'}
                  </button>
                  {ytSyncedCount > 0 && (
                    <button onClick={handleClearYt} disabled={isRunning} className="px-4 border border-border rounded-xl text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              ) : (
                <StopButton onStop={handleStop} />
              )}
            </div>
          </section>

          <div className="h-px bg-border" />

          {/* ── Phase 2: AI Coach Game Generation ── */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm">Phase 2 — AI Coach</h3>
                <p className="text-xs text-muted-foreground">
                  {gamesSyncedCount > 0
                    ? `${gamesSyncedCount} / ${techniques.length} games generated`
                    : 'BJJ instructor AI analyzes each technique and builds a competitive game'}
                </p>
              </div>
              {gamesStatus === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto shrink-0" />}
              {gamesStatus === 'error' && <AlertCircle className="w-4 h-4 text-destructive ml-auto shrink-0" />}
            </div>

            {/* What the AI Coach does — collapsible */}
            <div className="rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setShowCoachSteps(!showCoachSteps)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-primary" />
                  What the AI Coach does per technique
                </span>
                {showCoachSteps ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showCoachSteps && (
                <div className="border-t border-border divide-y divide-border/50">
                  {[
                    { step: '1', label: 'Identify technique family & position', detail: 'Leg Lock / Guard Pass / Choke / Sweep / Escape…' },
                    { step: '2', label: 'Define No-Gi grips & control points', detail: 'Wrist, elbow, ankle, body lock — no gi-specific grips' },
                    { step: '3', label: 'Set game situation & starting position', detail: 'Exact body alignment, which grips are pre-set' },
                    { step: '4', label: 'Write TOP player objective', detail: 'What the dominant player must do to win the round' },
                    { step: '5', label: 'Write BOTTOM player objective', detail: 'What the defensive player must do to survive or escape' },
                    { step: '6', label: 'Craft coaching cue', detail: 'One technical detail that separates good from sloppy execution' },
                    { step: '7', label: 'Set duration & scoring', detail: 'Round length, point values, win conditions' },
                    { step: '8', label: 'Flag ⚠️ safety risks', detail: 'Heel hooks, spine locks, and high-risk positions' },
                  ].map(({ step, label, detail }) => (
                    <div key={step} className="flex items-start gap-3 px-3 py-2.5 bg-muted/20">
                      <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{step}</span>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{label}</p>
                        <p className="text-[10px] text-muted-foreground">{detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Games Progress + live coach feed */}
            {(gamesStatus === 'running' || gamesStatus === 'done') && (
              <div className="space-y-3">
                <ProgressBar progress={gamesProgress} status={gamesStatus} label="games generated" />

                {gamesStatus === 'running' && currentTechnique && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0" />
                      <span className="text-xs font-bold text-primary truncate">{currentTechnique}</span>
                    </div>
                    {currentStep && (
                      <p className="text-[10px] text-muted-foreground pl-5 font-mono">{currentStep}</p>
                    )}
                  </div>
                )}

                {completedGames.length > 0 && gamesStatus === 'running' && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recently completed</p>
                    {completedGames.slice().reverse().map((g, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>{g.technique} <span className="opacity-50">— {g.position}</span></span>
                      </div>
                    ))}
                  </div>
                )}

                {lastError && gamesStatus === 'running' && (
                  <p className="text-xs text-destructive/70 font-mono truncate">⚠ {lastError}</p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {gamesStatus !== 'running' ? (
                <>
                  <button
                    onClick={handleGenerateGames}
                    disabled={!backendOk || isRunning}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-4 h-4" />
                    {gamesSyncedCount > 0 ? 'Regenerate Games' : 'Generate Games'}
                  </button>
                  {gamesSyncedCount > 0 && (
                    <button onClick={handleClearGames} disabled={isRunning} className="px-4 border border-border rounded-xl text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              ) : (
                <StopButton onStop={handleStop} />
              )}
            </div>
          </section>

          <p className="text-xs text-muted-foreground text-center">
            API keys are managed securely on the server
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
    <button
      onClick={onStop}
      className="flex-1 flex items-center justify-center gap-2 border border-border rounded-xl py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
    >
      <Loader2 className="w-4 h-4 animate-spin" /> Stop
    </button>
  );
}
