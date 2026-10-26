import { useEffect, useState, useSyncExternalStore } from "react";
import type { Mushaf } from "@quran.ws/text";
import { loadMushaf, loadChapters, type ChapterMeta } from "./quran";
import type { Riwayah } from "./store";

// Run a promise-returning loader and keep its result; re-runs when deps change.
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): { data: T | null; error: string | null; loading: boolean } {
  const [s, setS] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  useEffect(() => {
    let live = true;
    setS((p) => ({ ...p, loading: true, error: null }));
    fn().then((data) => live && setS({ data, error: null, loading: false }), (e) => live && setS({ data: null, error: String(e?.message ?? e), loading: false }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return s;
}

export const useMushaf = (r: Riwayah) => useAsync<Mushaf>(() => loadMushaf(r), [r]);
export const useChapters = () => useAsync<ChapterMeta[]>(loadChapters, []);

// Which ayah's tafsir panel is open (always in the Hafs count, which is how tafsir is indexed).
let tafsirTarget: { surah: number; ayahs: number[]; label?: string } | null = null;
const tl = new Set<() => void>();
export const openTafsir = (t: typeof tafsirTarget) => { tafsirTarget = t; tl.forEach((l) => l()); };
export const useTafsirTarget = () => useSyncExternalStore((l) => (tl.add(l), () => tl.delete(l)), () => tafsirTarget);

// A short message at the bottom of the screen ("Copied").
let toast: string | null = null;
let timer = 0;
const tsl = new Set<() => void>();
export const showToast = (msg: string) => {
  toast = msg; tsl.forEach((l) => l());
  clearTimeout(timer);
  timer = window.setTimeout(() => { toast = null; tsl.forEach((l) => l()); }, 1800);
};
export const useToast = () => useSyncExternalStore((l) => (tsl.add(l), () => tsl.delete(l)), () => toast);
