// Mushaf ornaments (quran-assets block): ayah roundels, surah header banners, page frames.
// catalog.json is the contract: every asset says where it came from and under which licence.
const REPO = "https://raw.githubusercontent.com/quran-ws/quran-assets/d4cae845c9aae1fbe56ee69d04bc7d8964419373";

export interface Slot { role: string; x: number; y: number; w: number; h: number; cx: number; cy: number }
export interface Asset {
  id: string;
  type: "ayah-markers" | "surah-headers" | "page-frames";
  style: string;
  lineage: "font" | "scan";
  riwayah: string | null;
  viewBox: string;
  variants: Record<string, string>;
  slots: Slot[];
  palette: { name: string; hex: string; stroke?: boolean }[];
  license: { id: string; status: "confirmed" | "pending" | "provisional"; attribution: string; note?: string };
  sources: { mushaf?: string; family?: string; title?: string; url?: string }[];
}

let catalog: Promise<Asset[]> | null = null;
export const loadCatalog = () =>
  (catalog ??= fetch(`${REPO}/catalog.json`).then((r) => r.json()).then((c) => c.assets as Asset[]));

const svgCache = new Map<string, Promise<string>>();
export function loadSvg(path: string) {
  if (!svgCache.has(path)) svgCache.set(path, fetch(`${REPO}/${path}`).then((r) => r.text()));
  return svgCache.get(path)!;
}

// Which ornaments this app is allowed to show. Font markers under OFL are fine anywhere; the
// scanned ornaments are non-commercial and still provisional, so they are opt-in and labelled.
export const isShippable = (a: Asset) => a.license.status === "confirmed";

// Recolouring needs no code: every asset has a "mono" drawing in currentColor, so CSS `color` tints it.

// Ornament scans are keyed by printing, with spellings that differ from the text block's keys.
export const SCAN_FOR_RIWAYAH: Record<string, string> = {
  hafs: "mushaf-hafs-madinah-mumtaza", warsh: "mushaf-warsh", qalun: "mushaf-qalon",
  duri: "mushaf-douri", shubah: "mushaf-shubah", susi: "mushaf-sousi", bazzi: "mushaf-hafs-madinah-mumtaza",
};
