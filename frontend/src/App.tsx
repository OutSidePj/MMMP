import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  AudioLines,
  ChevronRight,
  CircleAlert,
  Clock3,
  Disc3,
  History,
  Music2,
  RotateCcw,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { ApiError, generateMusic } from "./lib/api";
import type { Generation, MusicRequest } from "./types";

const APP_NAME = import.meta.env.VITE_APP_NAME || "MiniMax Music Playground";
const DEFAULT_PROMPT = "energetic cyberpunk electronic music with futuristic synths and a fast driving beat";
const GENRES = ["Electronic", "Synthwave", "Hip-Hop", "Pop", "Rock", "Jazz", "Ambient", "Cinematic", "Lo-fi"];
const MOODS = ["Energetic", "Happy", "Dark", "Calm", "Dreamy", "Epic", "Melancholic", "Aggressive"];
const STORAGE_KEY = "minimax-music-generations";

type ErrorState = { message: string; details?: string };

function rangeProgress(value: number, min: number, max: number) {
  return `${((value - min) / (max - min)) * 100}%`;
}

function titleFromPrompt(prompt: string) {
  return prompt
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function readHistory(): Generation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Generation[]).slice(0, 5) : [];
  } catch {
    return [];
  }
}

function LoadingState({ step }: { step: number }) {
  const steps = ["Preparing request", "Generating music", "Processing audio", "Ready"];
  return (
    <section
      className="glass-panel overflow-hidden rounded-3xl p-6 sm:p-8"
      aria-live="polite"
      aria-label="Music generation progress"
      data-testid="generation-loading"
    >
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Creating your track</p>
          <h2 className="text-xl font-semibold text-white">Generating music</h2>
          <p className="mt-2 text-sm text-zinc-400">This usually takes a few moments.</p>
        </div>
        <div className="flex h-12 items-end gap-1" aria-hidden="true">
          {[22, 38, 28, 44, 31, 48, 25, 39].map((height, index) => (
            <span key={index} className="wavebar" style={{ height, animationDelay: `${index * 90}ms` }} />
          ))}
        </div>
      </div>
      <ol className="space-y-4">
        {steps.map((label, index) => {
          const complete = index < step;
          const active = index === step;
          return (
            <li key={label} className={`flex items-center gap-3 text-sm ${active ? "text-white" : complete ? "text-zinc-300" : "text-zinc-600"}`}>
              <span className={`grid h-6 w-6 place-items-center rounded-full border ${complete ? "border-violet-400 bg-violet-500/20" : active ? "border-violet-400" : "border-zinc-700"}`}>
                {complete ? "✓" : active ? <span className="h-2 w-2 animate-pulse rounded-full bg-violet-400" /> : index + 1}
              </span>
              {label}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function TrackCard({ track, compact = false }: { track: Generation; compact?: boolean }) {
  return (
    <article
      className={compact ? "rounded-2xl border border-white/[0.07] bg-black/20 p-4" : "glass-panel rounded-3xl p-6 sm:p-8"}
      data-testid={compact ? undefined : "generated-track"}
    >
      <div className="flex items-start gap-4">
        <div className={`${compact ? "h-11 w-11" : "h-14 w-14"} grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-950/40`}>
          <Disc3 className={compact ? "h-5 w-5" : "h-6 w-6"} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          {!compact && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Generated track</p>}
          <h2 className={`${compact ? "text-sm" : "text-xl"} truncate font-semibold text-white`}>
            {track.title || "Generated Track"}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-zinc-400">
            <span>{track.metadata.bpm} BPM</span><span aria-hidden="true">·</span>
            <span>{track.metadata.duration}s</span><span aria-hidden="true">·</span>
            <span>{track.metadata.genre}</span><span aria-hidden="true">·</span>
            <span>{track.metadata.mood}</span>
          </p>
        </div>
      </div>
      <audio
        className={compact ? "mt-4" : "mt-7"}
        controls
        preload="metadata"
        src={track.audioUrl}
        aria-label={`Audio player for ${track.title || "generated track"}`}
        data-testid={compact ? undefined : "audio-player"}
      />
      {!compact && (
        <a
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-violet-400/50 hover:bg-violet-500/10 hover:text-white"
          href={track.audioUrl}
          download={`${track.title || "generated-track"}.wav`}
          data-testid="download-button"
        >
          <ArrowDownToLine className="h-4 w-4" aria-hidden="true" /> Download WAV
        </a>
      )}
    </article>
  );
}

export default function App() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [bpm, setBpm] = useState(128);
  const [duration, setDuration] = useState(20);
  const [genre, setGenre] = useState("Electronic");
  const [mood, setMood] = useState("Energetic");
  const [vocal, setVocal] = useState(false);
  const [lyrics, setLyrics] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [track, setTrack] = useState<Generation | null>(null);
  const [history, setHistory] = useState<Generation[]>(readHistory);
  const [error, setError] = useState<ErrorState | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading) return;
    setLoadingStep(0);
    const timers = [
      window.setTimeout(() => setLoadingStep(1), 450),
      window.setTimeout(() => setLoadingStep(2), 1500),
      window.setTimeout(() => setLoadingStep(3), 2400),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [loading]);

  const payload = useMemo<MusicRequest>(() => ({
    prompt: prompt.trim(), bpm, duration, genre, mood, vocal, lyrics: vocal && lyrics.trim() ? lyrics.trim() : null,
  }), [prompt, bpm, duration, genre, mood, vocal, lyrics]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!payload.prompt || loading) return;
    setLoading(true);
    setError(null);
    try {
      const generated = await generateMusic(payload);
      const enriched: Generation = {
        ...generated,
        title: generated.title || titleFromPrompt(payload.prompt),
        createdAt: new Date().toISOString(),
      };
      setTrack(enriched);
      setHistory((previous) => {
        const next = [enriched, ...previous.filter((item) => item.id !== enriched.id)].slice(0, 5);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    } catch (caught) {
      const apiError = caught instanceof ApiError ? caught : new ApiError("Music generation failed.");
      setError({ message: apiError.message, details: apiError.details });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="noise" aria-hidden="true" />
      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
        <a href="#main" className="flex items-center gap-3 font-semibold text-white" aria-label={`${APP_NAME} home`}>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-950/50">
            <AudioLines className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline">{APP_NAME}</span>
        </a>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5 text-xs font-medium text-emerald-300">
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />Ready to create
        </span>
      </header>

      <main id="main" className="relative mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-8 sm:pt-14 lg:px-10">
        <section className="mb-10 max-w-3xl sm:mb-14">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-3 py-1.5 text-xs font-medium text-violet-300">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Powered by MiniMax Music
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
            Turn an idea into <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-blue-300 bg-clip-text text-transparent">music.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
            Describe the sound in your head. Shape the tempo, mood, and style, then create a track in seconds.
          </p>
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.24fr)_minmax(340px,.76fr)]">
          <form className="glass-panel rounded-3xl p-5 sm:p-8" onSubmit={handleSubmit}>
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">New composition</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Create your track</h2>
              </div>
              <WandSparkles className="h-5 w-5 text-violet-300" aria-hidden="true" />
            </div>

            <div>
              <div className="mb-2.5 flex items-center justify-between gap-4">
                <label htmlFor="music-prompt" className="text-sm font-medium text-zinc-200">Music Prompt</label>
                <span className="text-xs tabular-nums text-zinc-500" aria-live="polite">{prompt.length}/500</span>
              </div>
              <textarea
                id="music-prompt"
                data-testid="music-prompt"
                className="field min-h-36 resize-y rounded-2xl px-4 py-4 text-[15px] leading-7 placeholder:text-zinc-600"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                maxLength={500}
                placeholder="Describe the music you want to create..."
                required
              />
              <p className="mt-2 text-xs text-zinc-500">Mention instruments, energy, setting, or production style.</p>
            </div>

            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <label htmlFor="bpm" className="text-sm font-medium text-zinc-200">BPM</label>
                  <output htmlFor="bpm" className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-sm font-semibold tabular-nums text-white">{bpm}</output>
                </div>
                <input id="bpm" aria-label="BPM" data-testid="bpm-slider" type="range" min="60" max="200" value={bpm} onChange={(event) => setBpm(Number(event.target.value))} style={{ "--range-progress": rangeProgress(bpm, 60, 200) } as React.CSSProperties} />
                <div className="mt-2 flex justify-between text-xs text-zinc-600"><span>60</span><span>200</span></div>
              </div>
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <label htmlFor="duration" className="text-sm font-medium text-zinc-200">Duration</label>
                  <output htmlFor="duration" className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-sm font-semibold tabular-nums text-white">{duration} sec</output>
                </div>
                <input id="duration" aria-label="Duration" data-testid="duration-slider" type="range" min="10" max="60" step="5" value={duration} onChange={(event) => setDuration(Number(event.target.value))} style={{ "--range-progress": rangeProgress(duration, 10, 60) } as React.CSSProperties} />
                <div className="mt-2 flex justify-between text-xs text-zinc-600"><span>10s</span><span>60s</span></div>
              </div>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="genre" className="mb-2.5 block text-sm font-medium text-zinc-200">Genre</label>
                <select id="genre" data-testid="genre-select" className="field h-12 rounded-xl px-3.5 text-sm" value={genre} onChange={(event) => setGenre(event.target.value)}>
                  {GENRES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="mood" className="mb-2.5 block text-sm font-medium text-zinc-200">Mood</label>
                <select id="mood" data-testid="mood-select" className="field h-12 rounded-xl px-3.5 text-sm" value={mood} onChange={(event) => setMood(event.target.value)}>
                  {MOODS.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
            </div>

            <fieldset className="mt-8">
              <legend className="mb-2.5 text-sm font-medium text-zinc-200">Vocals</legend>
              <div className="grid grid-cols-2 rounded-xl border border-zinc-700/80 bg-black/30 p-1" role="group" aria-label="Vocal mode">
                <button type="button" data-testid="instrumental-toggle" aria-pressed={!vocal} onClick={() => setVocal(false)} className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${!vocal ? "bg-white/10 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}>Instrumental</button>
                <button type="button" data-testid="vocal-toggle" aria-pressed={vocal} onClick={() => setVocal(true)} className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${vocal ? "bg-white/10 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}>Vocal</button>
              </div>
            </fieldset>

            {vocal && (
              <div className="mt-5">
                <label htmlFor="lyrics" className="mb-2.5 block text-sm font-medium text-zinc-200">Lyrics <span className="font-normal text-zinc-500">(optional)</span></label>
                <textarea id="lyrics" data-testid="lyrics-input" className="field min-h-28 resize-y rounded-xl px-4 py-3 text-sm leading-6 placeholder:text-zinc-600" value={lyrics} onChange={(event) => setLyrics(event.target.value)} maxLength={1500} placeholder="Write lyrics here..." />
              </div>
            )}

            <button
              type="submit"
              aria-label="Generate Music"
              data-testid="generate-button"
              disabled={loading || !prompt.trim()}
              className="mt-8 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-5 py-4 text-sm font-semibold text-white shadow-xl shadow-violet-950/30 transition hover:-translate-y-0.5 hover:shadow-violet-900/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Generating...</> : <><Sparkles className="h-4 w-4" aria-hidden="true" />Generate Music</>}
            </button>
          </form>

          <aside className="space-y-6" aria-label="Generation results">
            <div ref={resultRef}>
              {loading ? (
                <LoadingState step={loadingStep} />
              ) : error ? (
                <section className="glass-panel rounded-3xl p-6 sm:p-8" role="alert" data-testid="error-message">
                  <div className="flex items-start gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-500/10 text-red-300"><CircleAlert className="h-5 w-5" /></span>
                    <div>
                      <h2 className="font-semibold text-white">{error.message}</h2>
                      <p className="mt-2 text-sm leading-6 text-zinc-400">Check the inference server connection, then try again.</p>
                      {error.details && <details className="mt-3 text-xs text-zinc-500"><summary className="cursor-pointer">Technical details</summary><p className="mt-2 break-words">{error.details}</p></details>}
                    </div>
                  </div>
                  <button type="button" onClick={() => void handleSubmit({ preventDefault() {} } as React.FormEvent)} className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/[0.05]"><RotateCcw className="h-4 w-4" />Retry</button>
                </section>
              ) : track ? (
                <TrackCard track={track} />
              ) : (
                <section className="glass-panel rounded-3xl p-6 sm:p-8">
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-5 py-10 text-center">
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.045] text-zinc-400"><Music2 className="h-6 w-6" /></span>
                    <h2 className="mt-5 font-semibold text-zinc-200">Your track will appear here</h2>
                    <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-zinc-500">Choose your settings and generate a song to unlock the player.</p>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-2 rounded-xl bg-white/[0.025] px-3 py-3"><Clock3 className="h-3.5 w-3.5" />10–60 seconds</span>
                    <span className="flex items-center gap-2 rounded-xl bg-white/[0.025] px-3 py-3"><AudioLines className="h-3.5 w-3.5" />WAV output</span>
                  </div>
                </section>
              )}
            </div>

            {history.length > 0 && (
              <section className="glass-panel rounded-3xl p-5 sm:p-6" aria-labelledby="recent-title">
                <div className="mb-4 flex items-center justify-between">
                  <h2 id="recent-title" className="flex items-center gap-2 text-sm font-semibold text-zinc-200"><History className="h-4 w-4" />Recent generations</h2>
                  <span className="text-xs text-zinc-600">Last {history.length}</span>
                </div>
                <div className="space-y-3">
                  {history.map((item) => (
                    <button key={item.id} type="button" onClick={() => setTrack(item)} className="block w-full text-left" aria-label={`Open ${item.title || "generated track"}`}>
                      <div className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/15 p-3 transition hover:border-violet-400/20 hover:bg-violet-500/[0.05]">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/[0.05] text-violet-300"><Music2 className="h-4 w-4" /></span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-zinc-200">{item.title || "Generated Track"}</span><span className="mt-0.5 block text-xs text-zinc-500">{item.metadata.bpm} BPM · {item.metadata.duration}s · {item.metadata.genre}</span></span>
                        <ChevronRight className="h-4 w-4 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-violet-300" />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </main>

      <footer className="relative border-t border-white/[0.06] px-5 py-7 text-center text-xs text-zinc-600">
        Open source music generation · Built for any compatible MiniMax Music endpoint
      </footer>
    </div>
  );
}

