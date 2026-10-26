// Quran text (quran-text block): the verified words of seven riwayat, plus their fonts.
import { Mushaf } from "@quran.ws/text";
import type { Riwayah } from "./store";

// Pinned commit of quran-ws/quran-text, so the text never changes under us.
const TEXT_REPO = "https://raw.githubusercontent.com/quran-ws/quran-text/80361413c304107801895ba303ca01971f20bfe4/data";

export const RIWAYAT: { id: Riwayah; en: string; ar: string; qiraah: string; font: string; svg?: string; rawi: string }[] = [
  { id: "hafs", en: "Hafs", ar: "حفص عن عاصم", qiraah: "Asim", font: "UthmanicHafs-v-3.0.ttf", svg: "hafs-kfqc", rawi: "hafs" },
  { id: "warsh", en: "Warsh", ar: "ورش عن نافع", qiraah: "Nafi", font: "UthmanicWarsh-v-3.0.ttf", svg: "warsh-kfqc", rawi: "warsh" },
  { id: "qalun", en: "Qalun", ar: "قالون عن نافع", qiraah: "Nafi", font: "UthmanicQaloun-v-3.0.ttf", svg: "qalon-kfqc", rawi: "qalun" },
  { id: "duri", en: "Al-Duri", ar: "الدوري عن أبي عمرو", qiraah: "Abu Amr", font: "UthmanicDouri-V20.ttf", svg: "douri-kfqc", rawi: "duri" },
  { id: "shubah", en: "Shu'bah", ar: "شعبة عن عاصم", qiraah: "Asim", font: "UthmanicShubah-v-3.0.ttf", svg: "shubah-kfqc", rawi: "shuba" },
  { id: "susi", en: "Al-Susi", ar: "السوسي عن أبي عمرو", qiraah: "Abu Amr", font: "UthmanicSousi-v-3.0.ttf", rawi: "susi" },
  { id: "bazzi", en: "Al-Bazzi", ar: "البزي عن ابن كثير", qiraah: "Ibn Kathir", font: "UthmanicBazzi-v-3.0.ttf", rawi: "bazzi" },
];

export const riwayahInfo = (id: Riwayah) => RIWAYAT.find((r) => r.id === id)!;
export const fontFamily = (id: Riwayah) => `Quran-${id}`;

const cache = new Map<Riwayah, Promise<Mushaf>>();
const fontsAdded = new Set<Riwayah>();

function addFont(id: Riwayah, bundled?: string | null) {
  if (fontsAdded.has(id)) return;
  fontsAdded.add(id);
  // Hafs ships its font inside the package; the others come from the same pinned repo as their text.
  const url = bundled ?? `${TEXT_REPO}/fonts/${riwayahInfo(id).font}`;
  const style = document.createElement("style");
  style.textContent = `@font-face{font-family:"${fontFamily(id)}";src:url("${url}") format("truetype");font-display:swap}`;
  document.head.appendChild(style);
}

export function loadMushaf(id: Riwayah): Promise<Mushaf> {
  if (!cache.has(id)) {
    const p = id === "hafs"
      ? Mushaf.hafs()
      : fetch(`${TEXT_REPO}/mushaf/${id}.json`).then((r) => {
          if (!r.ok) throw new Error(`Could not download the ${id} text (HTTP ${r.status})`);
          return r.json();
        }).then((j) => Mushaf.fromJson(j));
    p.then((m) => addFont(id, m.font.url), () => cache.delete(id));
    cache.set(id, p);
  }
  return cache.get(id)!;
}

export const toArabicDigits = (n: number) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);

// English names come from Quran.com's chapter list (the text block only has transliterated names).
export interface ChapterMeta { id: number; name_simple: string; name_arabic: string; translated_name: { name: string }; verses_count: number; revelation_place: string; revelation_order: number; pages: number[] }
let chapters: Promise<ChapterMeta[]> | null = null;
export function loadChapters() {
  chapters ??= fetch("https://api.quran.com/api/v4/chapters").then((r) => r.json()).then((j) => j.chapters);
  return chapters;
}
