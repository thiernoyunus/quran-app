// Things no Quran.ws block covers (translations, tafsir, audio, English search) come from
// Quran.com's public API and the open spa5k tafsir collection. All of it is keyed in the Hafs count.
const QC = "https://api.quran.com/api/v4";
const json = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} from ${new URL(url).host}`);
  return r.json();
};
const memo = <T,>(fn: (key: string) => Promise<T>) => {
  const m = new Map<string, Promise<T>>();
  return (key: string) => {
    if (!m.has(key)) m.set(key, fn(key).catch((e) => { m.delete(key); throw e; }));
    return m.get(key)!;
  };
};

export interface QcWord {
  position: number;
  char_type_name: "word" | "end";
  text_uthmani: string;
  audio_url: string | null;
  translation: { text: string };
  transliteration: { text: string | null };
}
export interface QcVerse {
  verse_key: string;
  verse_number: number;
  page_number: number;
  juz_number: number;
  hizb_number: number;
  words: QcWord[];
  translations?: { resource_id: number; text: string }[];
  audio?: { url: string; segments: number[][] };
}

// One whole surah: words with meanings, chosen translations, and per-ayah audio with word timings.
const versesBy = memo<QcVerse[]>(async (key) => {
  const [surah, translations, reciter] = key.split("|");
  const fetchPage = (page: number) => {
    const q = new URLSearchParams({
      words: "true", word_fields: "text_uthmani", per_page: "50", page: String(page),
      ...(translations && { translations }), ...(reciter && { audio: reciter }),
    });
    return json(`${QC}/verses/by_chapter/${surah}?${q}`);
  };
  // First page tells us how many there are; the rest download side by side.
  const first = await fetchPage(1);
  const rest = await Promise.all(Array.from({ length: first.pagination.total_pages - 1 }, (_, i) => fetchPage(i + 2)));
  return [first, ...rest].flatMap((j) => j.verses);
});
export const loadVerses = (surah: number, translations: number[], reciter: number) =>
  versesBy(`${surah}|${translations.join(",")}|${reciter}`);

export const audioUrl = (path: string) => (/^https?:/.test(path) ? path : `https://verses.quran.com/${path.replace(/^\/\//, "")}`);
export const wordAudioUrl = (path: string) => `https://audio.qurancdn.com/${path}`;

export interface TranslationInfo { id: number; name: string; author_name: string; language_name: string }
export const loadTranslations = memo<TranslationInfo[]>(() => json(`${QC}/resources/translations`).then((j) => j.translations));
export interface Reciter { id: number; reciter_name: string; style: string | null }
export const loadReciters = memo<Reciter[]>(() => json(`${QC}/resources/recitations`).then((j) => j.recitations));

export interface SearchHit { verse_key: string; text: string; translations: { text: string; name: string }[] }
export const searchQuranCom = (q: string) =>
  json(`${QC}/search?q=${encodeURIComponent(q)}&size=30`).then((j) => j.search.results as SearchHit[]);

// Translations arrive with footnote markers like <sup foot_note=1>1</sup>; keep plain text only.
export const stripTags = (html: string) => html.replace(/<sup[^>]*>.*?<\/sup>/g, "").replace(/<[^>]+>/g, "");

// Tafsir: spa5k/tafsir_api, pinned commit on jsDelivr. The list of tafsirs is the collection's own.
const TAFSIR_CDN = "https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@eb82bb6294efe30ad5c135c03b1864afaa70e855/tafsir";
export interface TafsirInfo { slug: string; name: string; author_name: string; language_name: string }
// The collection repeats a few entries ("Kurdish"/"kurdish", the same tafsir under two slugs): keep the first.
export const loadTafsirList = memo<TafsirInfo[]>(() => json(`${TAFSIR_CDN}/editions.json`).then((list: TafsirInfo[]) => {
  const seen = new Set<string>();
  return list.map((t) => ({ ...t, language_name: t.language_name.toLowerCase() }))
    .filter((t) => !seen.has(t.language_name + t.name) && !!seen.add(t.language_name + t.name));
}));
const RTL = ["arabic", "urdu", "persian", "kurdish", "pashto", "uighur"];
export const isRtl = (language: string) => RTL.includes(language);
export const loadTafsir = memo<string>((key) =>
  json(`${TAFSIR_CDN}/${key}.json`).then((j) => j.text as string));
export const tafsirFor = (slug: string, surah: number, ayah: number) => loadTafsir(`${slug}/${surah}/${ayah}`);
