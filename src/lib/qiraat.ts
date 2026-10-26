// Ayah numbering across the six counting traditions (qiraat-ayah-map block).
// The Kufan count (used by Hafs) is the hub: every conversion goes through it.
import systems from "@quran.ws/qiraat-ayah-map/data/counting-systems.json";

export type System = "kufi" | "madani-first" | "madani-last" | "makki" | "basri" | "dimashqi";
export const SYSTEMS = Object.entries(systems as Record<string, { name_en: string; name_ar: string; total_ayahs: number; used_by_qiraat: string[]; description_en: string }>)
  .map(([id, s]) => ({ id: id as System, ...s }));

// Data files from @quran.ws/qiraat-ayah-map@0.1.0, copied into public/data/qiraat (CC BY 4.0).
const cache = new Map<string, Promise<unknown>>();
const get = (path: string) => {
  if (!cache.has(path)) cache.set(path, fetch(`${import.meta.env.BASE_URL}data/qiraat/${path}.json`).then((r) => r.json()));
  return cache.get(path)!;
};

type Forward = { target_ayah: number; status: "mapped" | "merged" | "split"; splits_into?: number[]; merges_with_next?: boolean };
type Reverse = { hafs_ayah: number; hafs_ayahs?: number[]; status: "mapped" | "covers_multiple" };
type Table<T> = { surahs: Record<string, { ayahs: Record<string, T> }> };

const load = <T,>(name: string) => get(`by-counting-system/${name}`) as Promise<Table<T>>;

// The counting a printed mushaf of this rawi carries (falls back to the one attributed to its qari).
export async function systemOfRawi(rawi: string): Promise<{ system: System; measured: boolean }> {
  const r = (await get(`rawis/${rawi}`)) as Record<string, string | null>;
  const printed = r._counting_system_printed as System | null;
  return { system: printed ?? (r._counting_system_associated_with_qari as System), measured: !!printed };
}

export async function surahCount(system: System, surah: number): Promise<number> {
  const c = (await get(`surah-counts/${system}`)) as { surahs: Record<string, number> };
  return c.surahs[String(surah)];
}

// Always a list: one ayah in one count can be two (or part of one) in another.
export interface Converted { ayahs: number[]; note: "same" | "split" | "merged" | "covers" | "missing"; mergesWithNext?: boolean }

export async function toKufi(system: System, surah: number, ayah: number): Promise<Converted> {
  if (system === "kufi") return { ayahs: [ayah], note: "same" };
  const e = (await load<Reverse>(`${system}-to-kufi`)).surahs[surah]?.ayahs[ayah];
  if (!e) return { ayahs: [], note: "missing" };
  return e.status === "covers_multiple" ? { ayahs: e.hafs_ayahs!, note: "covers" } : { ayahs: [e.hafs_ayah], note: "same" };
}

export async function fromKufi(system: System, surah: number, ayah: number): Promise<Converted> {
  if (system === "kufi") return { ayahs: [ayah], note: "same" };
  const e = (await load<Forward>(`kufi-to-${system}`)).surahs[surah]?.ayahs[ayah];
  if (!e) return { ayahs: [], note: "missing" };
  const ayahs = e.status === "split" ? e.splits_into! : [e.target_ayah];
  return { ayahs, note: e.status === "split" ? "split" : e.merges_with_next ? "merged" : "same", mergesWithNext: e.merges_with_next };
}

export async function convert(from: System, to: System, surah: number, ayah: number): Promise<Converted> {
  const k = await toKufi(from, surah, ayah);
  if (to === "kufi" || !k.ayahs.length) return k;
  const parts = await Promise.all(k.ayahs.map((a) => fromKufi(to, surah, a)));
  const ayahs = [...new Set(parts.flatMap((p) => p.ayahs))].sort((a, b) => a - b);
  const note = parts.some((p) => p.note === "split") ? "split" : k.note === "covers" || parts.some((p) => p.note === "merged") ? "merged" : "same";
  return { ayahs, note, mergesWithNext: parts.some((p) => p.mergesWithNext) };
}

export const formatRange = (surah: number, ayahs: number[]) =>
  !ayahs.length ? "—" : ayahs.length === 1 ? `${surah}:${ayahs[0]}` : `${surah}:${ayahs[0]}–${ayahs[ayahs.length - 1]}`;
