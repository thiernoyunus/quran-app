// One audio player for the whole app: plays ayah by ayah, repeats, and reports the word being
// recited (from Quran.com's word timings) so every view can highlight it. Never starts by itself.
import { useSyncExternalStore } from "react";
import { audioUrl, wordAudioUrl, type QcVerse } from "./api";
import { store } from "./store";

interface PlayerState {
  surah: number | null;
  queue: QcVerse[];
  index: number;
  playing: boolean;
  loading: boolean;
  verseKey: string | null;
  word: number | null; // 1-based word position inside the ayah
  played: number; // repeats done for the current ayah
  reciter: string;
  speed: number;
  error: string | null;
}

let state: PlayerState = { surah: null, queue: [], index: 0, playing: false, loading: false, verseKey: null, word: null, played: 0, reciter: "", speed: 1, error: null };
const listeners = new Set<() => void>();
const set = (p: Partial<PlayerState>) => { state = { ...state, ...p }; listeners.forEach((l) => l()); };

const el = typeof Audio !== "undefined" ? new Audio() : (null as unknown as HTMLAudioElement);
const preload = typeof Audio !== "undefined" ? new Audio() : null; // warms up the next ayah for gapless play
const wordEl = typeof Audio !== "undefined" ? new Audio() : null;

function load(i: number) {
  const v = state.queue[i];
  if (!v?.audio) return set({ error: "No recording for this ayah from this reciter.", playing: false });
  el.src = audioUrl(v.audio.url);
  el.playbackRate = state.speed;
  set({ index: i, verseKey: v.verse_key, word: null, loading: true, error: null });
  el.play().then(() => set({ playing: true, loading: false })).catch((e) => set({ playing: false, loading: false, error: String(e.message ?? e) }));
  const next = state.queue[i + 1];
  if (preload && next?.audio) preload.src = audioUrl(next.audio.url);
}

if (el) {
  el.addEventListener("timeupdate", () => {
    const segs = state.queue[state.index]?.audio?.segments ?? [];
    const ms = el.currentTime * 1000;
    const hit = segs.find((s) => s.length >= 4 && ms >= s[2] && ms < s[3]);
    const word = hit ? hit[1] : null;
    if (word !== state.word) set({ word });
  });
  el.addEventListener("ended", () => {
    const { repeat, autoAdvance } = store.get().settings;
    if (state.played + 1 < repeat) { set({ played: state.played + 1 }); el.currentTime = 0; el.play(); return; }
    set({ played: 0 });
    if (autoAdvance && state.index + 1 < state.queue.length) load(state.index + 1);
    else set({ playing: false, word: null });
  });
  el.addEventListener("pause", () => set({ playing: false }));
  el.addEventListener("play", () => set({ playing: true }));
}

export const player = {
  play(surah: number, queue: QcVerse[], index: number, reciter: string) {
    set({ surah, queue, reciter, played: 0 });
    load(index);
  },
  toggle() { if (!state.verseKey) return; if (el.paused) el.play(); else el.pause(); },
  next() { if (state.index + 1 < state.queue.length) { set({ played: 0 }); load(state.index + 1); } },
  prev() { if (state.index > 0) { set({ played: 0 }); load(state.index - 1); } },
  stop() { el.pause(); el.removeAttribute("src"); set({ surah: null, queue: [], verseKey: null, word: null, playing: false }); },
  setSpeed(speed: number) { el.playbackRate = speed; set({ speed }); },
  playWord(path: string | null) { if (path && wordEl) { wordEl.src = wordAudioUrl(path); wordEl.play().catch(() => {}); } },
  // Seek inside the current ayah to a word (tap-to-seek while listening).
  seekWord(verseKey: string, word: number) {
    if (state.verseKey !== verseKey) return false;
    const s = state.queue[state.index]?.audio?.segments.find((x) => x.length >= 4 && x[1] === word);
    if (!s) return false;
    el.currentTime = s[2] / 1000;
    return true;
  },
};

const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));
export const usePlayer = () => useSyncExternalStore(subscribe, () => state);
