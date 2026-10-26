// Settings, bookmarks and last-read position, kept in this browser (localStorage).
import { useSyncExternalStore } from "react";

export type Riwayah = "hafs" | "warsh" | "qalun" | "duri" | "shubah" | "susi" | "bazzi";
export type Theme = "dark" | "light" | "sepia";

// Every saved ayah carries its riwayah, because "2:255" means different words in different counts.
export interface AyahRef { surah: number; ayah: number; riwayah: Riwayah }

export interface Settings {
  theme: Theme;
  riwayah: Riwayah;
  arabicSize: number;
  translationSize: number;
  translations: number[]; // Quran.com translation ids
  showTranslation: boolean;
  wordByWord: boolean;
  tajweed: boolean;
  tajweedTopics: string[]; // empty = all topics
  reciter: number; // Quran.com recitation id
  repeat: number; // times to play each ayah
  autoAdvance: boolean;
  tafsir: string; // spa5k tafsir slug
  markerStyle: string; // quran-assets ayah marker id
  markerColor: string;
}

const DEFAULTS: Settings = {
  theme: "dark",
  riwayah: "hafs",
  arabicSize: 34,
  translationSize: 17,
  translations: [20],
  showTranslation: true,
  wordByWord: false,
  tajweed: false,
  tajweedTopics: [],
  reciter: 7,
  repeat: 1,
  autoAdvance: true,
  tafsir: "en-tafisr-ibn-kathir",
  markerStyle: "ayah-markers/font-004-regular",
  markerColor: "#2CA4AB",
};

interface State {
  settings: Settings;
  bookmarks: AyahRef[];
  lastRead: (AyahRef & { at: number }) | null;
}

function read(): State {
  try {
    const raw = JSON.parse(localStorage.getItem("quran-app") ?? "{}");
    return { settings: { ...DEFAULTS, ...raw.settings }, bookmarks: raw.bookmarks ?? [], lastRead: raw.lastRead ?? null };
  } catch {
    return { settings: DEFAULTS, bookmarks: [], lastRead: null };
  }
}

let state = read();
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  try { localStorage.setItem("quran-app", JSON.stringify(state)); } catch { /* private mode: keep in memory */ }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));

export function useStore() {
  return useSyncExternalStore(subscribe, () => state);
}

export const store = {
  get: () => state,
  setSettings: (patch: Partial<Settings>) => set({ settings: { ...state.settings, ...patch } }),
  toggleBookmark(ref: AyahRef) {
    const same = (b: AyahRef) => b.surah === ref.surah && b.ayah === ref.ayah && b.riwayah === ref.riwayah;
    set({ bookmarks: state.bookmarks.some(same) ? state.bookmarks.filter((b) => !same(b)) : [...state.bookmarks, ref] });
  },
  isBookmarked: (ref: AyahRef) => state.bookmarks.some((b) => b.surah === ref.surah && b.ayah === ref.ayah && b.riwayah === ref.riwayah),
  setLastRead: (ref: AyahRef) => set({ lastRead: { ...ref, at: Date.now() } }),
};
