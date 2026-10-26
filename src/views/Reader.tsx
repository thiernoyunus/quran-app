// The reader: one surah, six ways to read it. Each mode is powered by a different QuranTech block.
import { useEffect, useState } from "react";
import { useRoute, setParam, go } from "../lib/router";
import { store, useStore } from "../lib/store";
import { useAsync, useChapters, useMushaf } from "../lib/hooks";
import { loadVerses, loadReciters, type QcVerse } from "../lib/api";
import { player, usePlayer } from "../lib/audio";
import { riwayahInfo, RIWAYAT } from "../lib/quran";
import { SCAN_FOR_RIWAYAH } from "../lib/assets";
import { Icon } from "../components/Icon";
import { Ornament } from "../components/Ornament";
import { VerseMode } from "./reader/VerseMode";
import { ReadingMode } from "./reader/ReadingMode";
import { MushafMode } from "./reader/MushafMode";
import { Huffaz17Mode } from "./reader/Huffaz17Mode";
import { WordsMode } from "./reader/WordsMode";
import { EngineMode } from "./reader/EngineMode";
import { AyahSheet, type Selection } from "./reader/AyahSheet";

export const MODES = [
  { id: "verse", label: "Verse by Verse", block: "quran-text" },
  { id: "reading", label: "Reading", block: "quran-text" },
  { id: "mushaf", label: "Mushaf", block: "quran-svg" },
  { id: "huffaz", label: "Mushaf 17", block: "quran-text + quran-assets" },
  { id: "words", label: "Tap a word", block: "quran-svg-elements" },
  { id: "engine", label: "Fast page", block: "quran-engine" },
  { id: "memorize", label: "Memorize", block: "quran-engine" },
] as const;
export type Mode = (typeof MODES)[number]["id"];

// Starts recitation from an ayah (Hafs count). Shared by every mode.
export async function playFrom(surah: number, hafsAyah: number) {
  const { translations, reciter } = store.get().settings;
  const [verses, reciters] = await Promise.all([loadVerses(surah, translations, reciter), loadReciters("all")]);
  const r = reciters.find((x) => x.id === reciter);
  player.play(surah, verses, Math.max(0, verses.findIndex((v) => v.verse_number === hafsAyah)), r ? `${r.reciter_name}${r.style ? ` (${r.style})` : ""}` : "Reciter");
}

export function Reader() {
  const { parts, params } = useRoute();
  const surah = Math.min(114, Math.max(1, Number(parts[1]) || 1));
  const mode = (params.get("mode") ?? "verse") as Mode;
  const targetAyah = Number(params.get("ayah")) || null;
  const page = Number(params.get("page")) || null;
  const { settings } = useStore();
  const p = usePlayer();
  const { data: chapters } = useChapters();
  const { data: m, error: textError } = useMushaf(settings.riwayah);
  const { data: hafs } = useMushaf("hafs"); // the 17-line layout is Hafs word numbers, whatever riwayah is picked
  const verses = useAsync<QcVerse[]>(() => loadVerses(surah, settings.translations, settings.reciter), [surah, settings.translations.join(), settings.reciter]);
  const [sel, setSel] = useState<Selection | null>(null);
  const meta = chapters?.[surah - 1];
  const isHafs = settings.riwayah === "hafs";

  useEffect(() => { setSel(null); }, [surah, mode]);
  useEffect(() => { document.querySelector(".mode-tabs .on")?.scrollIntoView({ inline: "center", block: "nearest" }); }, [mode]);
  useEffect(() => { store.setLastRead({ surah, ayah: targetAyah ?? 1, riwayah: settings.riwayah }); }, [surah, targetAyah, settings.riwayah]);
  useEffect(() => {
    // Keyboard: left/right arrows move between surahs in the scrolling modes.
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,select,textarea") || !["verse", "reading"].includes(mode)) return;
      if (e.key === "ArrowLeft" && surah < 114) go(`/surah/${surah + 1}`, { mode });
      if (e.key === "ArrowRight" && surah > 1) go(`/surah/${surah - 1}`, { mode });
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [surah, mode]);

  const firstVerse = verses.data?.[0];
  const playingHere = p.surah === surah && p.verseKey;

  return (
    <div className="reader">
      <div className="contextbar">
        <select className="surah-select" value={surah} onChange={(e) => go(`/surah/${e.target.value}`, { mode })} aria-label="Choose surah">
          {chapters?.map((c) => <option key={c.id} value={c.id}>{c.id}. {c.name_simple}</option>)}
        </select>
        <span className="muted small ctx-info">{firstVerse ? `Juz ${firstVerse.juz_number} · Hizb ${firstVerse.hizb_number} · Page ${firstVerse.page_number}` : ""}</span>
        <div className="mode-tabs" role="tablist" aria-label="Reading mode">
          {MODES.map((x) => (
            <button key={x.id} role="tab" aria-selected={mode === x.id} className={mode === x.id ? "on" : ""} onClick={() => { setParam("mode", x.id); scrollTo(0, 0); }} title={`Powered by ${x.block}`}>
              {x.label}
            </button>
          ))}
        </div>
      </div>

      <div className="page">
        <section className="surah-head card">
          <div className="surah-head-banner">
            <Ornament path={`assets/surah-headers/${SCAN_FOR_RIWAYAH[settings.riwayah]}/mono.svg`} height="clamp(44px, 9vw, 72px)" color="var(--gold)" label={`Surah header ornament for ${meta?.name_simple ?? ""}`}>
              <span className="banner-name" dir="rtl" lang="ar">سورة {meta?.name_arabic}</span>
            </Ornament>
          </div>
          <div className="surah-head-row">
            <div>
              <h1>{surah}. Surah {meta?.name_simple}</h1>
              <div className="muted">{meta?.translated_name.name} · {m ? m.surah(surah).ayahCount : meta?.verses_count} ayahs in {riwayahInfo(settings.riwayah).en} · {meta?.revelation_place === "makkah" ? "Makki" : "Madani"}</div>
            </div>
            <div className="row-inline">
              {isHafs ? (
                <button className="pill gold" onClick={() => (playingHere ? player.toggle() : playFrom(surah, targetAyah ?? 1))}>
                  <Icon name={playingHere && p.playing ? "pause" : "play"} filled size={14} /> {playingHere && p.playing ? "Pause" : "Listen"}
                </button>
              ) : (
                <span className="pill" title="Recitations here are in Hafs; playing them over another riwayah's text would not match.">No {riwayahInfo(settings.riwayah).en} audio</span>
              )}
              <select className="pill" value={settings.riwayah} onChange={(e) => store.setSettings({ riwayah: e.target.value as typeof settings.riwayah })} aria-label="Riwayah">
                {RIWAYAT.map((r) => <option key={r.id} value={r.id}>{r.en}</option>)}
              </select>
            </div>
          </div>
          <div className="block-note">Powered by <b>{MODES.find((x) => x.id === mode)?.block}</b>{mode === "verse" && settings.tajweed && isHafs ? " + quran-tajweed" : ""}{!isHafs ? " + qiraat-ayah-map" : ""} · banner from quran-assets</div>
        </section>

        {textError && <p className="error">Could not load the {riwayahInfo(settings.riwayah).en} text: {textError}</p>}
        {verses.error && <p className="error">Translations and audio could not load ({verses.error}). The Arabic still works.</p>}

        {mode === "verse" && m && <VerseMode m={m} surah={surah} verses={verses.data} targetAyah={targetAyah} onSelect={setSel} />}
        {mode === "reading" && m && <ReadingMode m={m} surah={surah} onSelect={setSel} />}
        {mode === "mushaf" && <MushafMode surah={surah} page={page} onSelect={setSel} />}
        {mode === "huffaz" && hafs && <Huffaz17Mode m={hafs} surah={surah} page={page} onSelect={setSel} />}
        {mode === "words" && <WordsMode surah={surah} page={page} onSelect={setSel} />}
        {(mode === "engine" || mode === "memorize") && <EngineMode surah={surah} page={page} memorize={mode === "memorize"} onSelect={setSel} />}

        {["verse", "reading"].includes(mode) && (
          <div className="surah-nav">
            {surah > 1 && <button className="btn" onClick={() => go(`/surah/${surah - 1}`, { mode })}><Icon name="chevronLeft" size={14} /> Previous surah</button>}
            <button className="btn" onClick={() => scrollTo({ top: 0, behavior: "smooth" })}>Beginning of surah</button>
            {surah < 114 && <button className="btn" onClick={() => go(`/surah/${surah + 1}`, { mode })}>Next surah <Icon name="chevronRight" size={14} /></button>}
          </div>
        )}
      </div>

      {sel && <AyahSheet sel={sel} onClose={() => setSel(null)} />}
    </div>
  );
}
