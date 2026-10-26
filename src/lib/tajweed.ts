// Tajweed colouring (quran-tajweed block). The rules live beside the text as positions;
// the Quranic text itself is never edited. Spans only fit the exact text they were measured on,
// so we load that edition and check its fingerprint (SHA-256) before colouring anything.
import annotations from "@quran.ws/tajwid-annotations";
import corpus from "@quran.ws/tajwid-rules";

interface Rule { id: string; hukum: string; status: "stable" | "disabled" | "disputed"; label: { ar: string }; needsReview?: boolean }
interface Named { id: string; label: { ar: string } }
const rules = new Map<string, Rule>((corpus.rules as Rule[]).map((r) => [r.id, r]));
const hukums = new Map<string, Named & { category: string }>((corpus.hukums as (Named & { category: string })[]).map((h) => [h.id, h]));
const categories = new Map<string, Named & { topic: string }>((corpus.categories as (Named & { topic: string })[]).map((c) => [c.id, c]));

// The palette is this app's own choice, not any printed mushaf's scheme.
export const TOPICS: { id: string; en: string; ar: string; color: string }[] = [
  { id: "madd", en: "Elongation (madd)", ar: "المد", color: "#e5484d" },
  { id: "noon-tanween", en: "Noon & tanween", ar: "النون والتنوين", color: "#30a46c" },
  { id: "meem-sakinah", en: "Meem sakinah", ar: "الميم الساكنة", color: "#12a594" },
  { id: "mushaddadatan", en: "Doubled noon & meem (ghunnah)", ar: "المشددتان", color: "#f76b15" },
  { id: "qalqalah", en: "Echo (qalqalah)", ar: "القلقلة", color: "#3e63dd" },
  { id: "letter-relations", en: "Merging letters (idgham)", ar: "علاقات الحروف", color: "#8e4ec6" },
  { id: "tafkheem-tarqeeq", en: "Heavy & light letters", ar: "التفخيم والترقيق", color: "#ad7f58" },
];
const topicColor = new Map(TOPICS.map((t) => [t.id, t.color]));

export interface RuleInfo { ruleId: string; rule: string; hukum: string; category: string; topic: string; status: Rule["status"]; needsReview: boolean }
export function ruleInfo(ruleId: string): RuleInfo {
  const r = rules.get(ruleId)!;
  const h = hukums.get(r.hukum)!;
  const c = categories.get(h.category)!;
  return { ruleId, rule: r.label.ar, hukum: h.label.ar, category: c.label.ar, topic: c.topic, status: r.status, needsReview: !!r.needsReview };
}

type Edition = { ayahs: Record<string, string> };
let edition: Promise<{ ayahs: Record<string, string>; verified: boolean }> | null = null;

async function digest(e: Edition) {
  const s = Object.entries(e.ayahs).map(([k, v]) => `${k}\u0000${v}`).join("\u0001");
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function loadTajweedEdition() {
  edition ??= fetch(`${import.meta.env.BASE_URL}data/tajweed-edition-uthmani-hafs.json`)
    .then((r) => r.json())
    .then(async (e: Edition) => ({ ayahs: e.ayahs, verified: (await digest(e)) === annotations.edition.sha256 }));
  return edition;
}

export interface Run { text: string; color?: string; rules: RuleInfo[] }

const isMark = (c: string) => /\p{M}/u.test(c);
// Letters that never connect to the letter after them, so a colour cut after them needs no joiner.
const NON_JOINING = new Set("ءآأؤإاةدذرزوٱ ");
const ZWJ = "‍";

// Split one ayah into coloured runs. Offsets count code points, never UTF-16 units.
export function tajweedRuns(key: string, text: string, onlyTopics: string[] = []): Run[] {
  const cps = [...text];
  const at: RuleInfo[][] = cps.map(() => []);
  for (const [start, end, idx] of (annotations.spans as Record<string, number[][]>)[key] ?? []) {
    const info = ruleInfo(annotations.ruleIds[idx]);
    if (info.status === "disabled" || (onlyTopics.length && !onlyTopics.includes(info.topic))) continue;
    let s = start, e = end;
    while (s > 0 && isMark(cps[s])) s--; // a span starts on its letter
    while (e < cps.length && isMark(cps[e])) e++; // and keeps the letter's harakat with it
    for (let i = s; i < e; i++) at[i].push(info);
  }
  const runs: Run[] = [];
  const sig = (r: RuleInfo[]) => r.map((x) => x.ruleId).join();
  cps.forEach((c, i) => {
    const last = runs[runs.length - 1];
    if (last && sig(last.rules) === sig(at[i])) last.text += c;
    else runs.push({ text: c, rules: at[i], color: at[i].length ? topicColor.get(at[i][at[i].length - 1].topic) : undefined });
  });
  // Keep Arabic letters joined across a colour change (drawing only; never copied).
  for (let i = 0; i < runs.length - 1; i++) {
    const a = [...runs[i].text].filter((c) => !isMark(c));
    const b = [...runs[i + 1].text].find((c) => !isMark(c));
    const prev = a[a.length - 1];
    if (prev && b && !NON_JOINING.has(prev) && b !== " " && b !== "ء") {
      runs[i].text += ZWJ;
      runs[i + 1].text = ZWJ + runs[i + 1].text;
    }
  }
  return runs;
}

export const tajweedStats = {
  rules: corpus.rules.length,
  version: annotations.corpusVersion,
  ayahs: Object.keys(annotations.spans).length,
  disputed: (corpus.rules as Rule[]).filter((r) => r.status === "disputed").length,
};
