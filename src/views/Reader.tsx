// The reader: one surah, eight ways to read it. Each layout is powered by a different QuranTech block.
import { useEffect, useState } from "react";
import { useRoute, go, setParam } from "../lib/router";
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
import { ContinuousMode, Huffaz17Mode, loadLayout, pageOf } from "./reader/Huffaz17Mode";
import { WordsMode } from "./reader/WordsMode";
import { EngineMode } from "./reader/EngineMode";
import { AyahSheet, type Selection } from "./reader/AyahSheet";

export const MODES = [
  { id: "verse", label: "Verse by Verse", about: "Each ayah with its translation", block: "quran-text" },
  { id: "reading", label: "Reading", about: "Arabic only, flowing like a book", block: "quran-text" },
  { id: "continuous", label: "Continuous", about: "Mushaf pages one under another: just scroll", block: "quran-text" },
  { id: "mushaf", label: "Mushaf", about: "The printed Madinah page, turned one at a time", block: "quran-svg" },
  { id: "huffaz", label: "Mushaf 17", about: "The 17-line Egyptian Mushaf al-Huffaz", block: "quran-text + quran-assets" },
  { id: "words", label: "Tap a word", about: "The printed page with every word tappable", block: "quran-svg-elements" },
  { id: "engine", label: "Fast page", about: "Printed pages that open instantly", block: "quran-engine" },
  { id: "memorize", label: "Memorize", about: "Hide the words and test yourself", block: "quran-engine" },
] as const;
export type Mode = (typeof MODES)[number]["id"];
export const TURNS_PAGES: Mode[] = ["mushaf", "huffaz", "words", "engine", "memorize"];

// Starts recitation from an ayah (Hafs count). Shared by every mode.
export async function playFrom(surah: number, hafsAyah: number) {
  const { translations, reciter } = store.get().settings;
  const [verses, reciters] = await Promise.all([loadVerses(surah, translations, reciter), loadReciters("all")]);
  const r = reciters.find((x) => x.id === reciter);
  player.play(surah, verses, Math.max(0, verses.findIndex((v) => v.verse_number === hafsAyah)), r ? `${r.reciter_name}${r.style ? ` (${r.style})` : ""}` : "Reciter");
}

export function Reader({ onMenu, onSettings }: { onMenu: () => void; onSettings: () => void }) {
  const { parts, params } = useRoute();
  const surah = Math.min(114, Math.max(1, Number(parts[1]) || 1));
  const mode = (params.get("mode") ?? "verse") as Mode;
  const targetAyah = Number(params.get("ayah")) || null;
  const page = Number(params.get("page")) || null;
  const { settings } = useStore();
  const p = usePlayer();
  const { data: chapters } = useChapters();
  const { data: m, error: textError } = useMushaf(settings.riwayah);
  const { data: hafs } = useMushaf("hafs"); // page and line layouts are Hafs word numbers, whatever riwayah is picked
  const { data: h17 } = useAsync(() => (mode === "huffaz" ? loadLayout() : Promise.resolve(null)), [mode]);
  const verses = useAsync<QcVerse[]>(() => loadVerses(surah, settings.translations, settings.reciter), [surah, settings.translations.join(), settings.reciter]);
  const [sel, setSel] = useState<Selection | null>(null);
  const [display, setDisplay] = useState(false);
  const [full, setFull] = useState(false);
  const meta = chapters?.[surah - 1];
  const isHafs = settings.riwayah === "hafs";
  const turnsPages = TURNS_PAGES.includes(mode);

  // Where the reader is now, as a Hafs ayah: the top of the page in page layouts, else the ayah asked for.
  // Switching layouts carries this over, so you land where you were.
  const here = (() => {
    if (!hafs) return null;
    const start = hafs.ayah(surah, Math.min(targetAyah ?? 1, hafs.surah(surah).ayahCount));
    const t = page && mode === "huffaz" ? h17?.pages[page]?.find((r) => r.t === "text") : null;
    const top = t?.t === "text" ? hafs.wordAt(t.w).ayah : page && mode !== "huffaz" && (mode !== "mushaf" || isHafs) ? hafs.page(page).firstAyah : null;
    return top && top.surah.number >= surah ? top : start; // a surah's first page often opens with the end of the one before
  })();
  const hereWord = here && hafs?.wordAt(here.start);
  const shownPage = page ?? (mode === "huffaz" ? (h17 && here ? pageOf(h17, here.start) : null) : hereWord?.page.number);
  // The Madinah page for an ayah, for the page layouts that number pages like it (other riwayat's printed pages differ).
  const madinahPage = page ?? (targetAyah && hafs && (isHafs || mode !== "mushaf") ? hafs.ayah(surah, targetAyah).page.number : null);

  useEffect(() => { setSel(null); }, [surah, mode]);
  useEffect(() => { store.setLastRead({ surah, ayah: targetAyah ?? 1, riwayah: settings.riwayah }); }, [surah, targetAyah, settings.riwayah]);
  useEffect(() => {
    // Keyboard: left/right arrows move between surahs in the scrolling layouts.
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,select,textarea") || turnsPages) return;
      if (e.key === "ArrowLeft" && surah < 114) go(`/surah/${surah + 1}`, { mode });
      if (e.key === "ArrowRight" && surah > 1) go(`/surah/${surah - 1}`, { mode });
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [surah, mode, turnsPages]);
  // Full screen: hide everything but the text (the app's own menus, not the browser's — iPhone Safari can't).
  useEffect(() => {
    document.documentElement.classList.toggle("focus", full);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFull(false); };
    if (full) addEventListener("keydown", onKey);
    return () => { document.documentElement.classList.remove("focus"); removeEventListener("keydown", onKey); };
  }, [full]);

  const switchTo = (next: Mode) => {
    setDisplay(false);
    if (next === mode) return;
    go(`/surah/${here?.surah.number ?? surah}`, { mode: next, ayah: here && here.number > 1 ? here.number : null });
  };
  // Arabic books open right-to-left, so "forward" sits on the left: the next page, or the next surah.
  const step = (d: 1 | -1) => {
    if (turnsPages) dispatchEvent(new CustomEvent("turn", { detail: d }));
    else if (surah + d >= 1 && surah + d <= 114) go(`/surah/${surah + d}`, { mode });
  };
  const playingHere = p.surah === surah && p.verseKey;
  const play = () => (playingHere ? player.toggle() : playFrom(here?.surah.number ?? surah, here?.number ?? 1));
  const options = mode === "huffaz" ? (
    <button className="pill" onClick={() => store.setSettings({ h17Border: !settings.h17Border })} aria-pressed={settings.h17Border}>Border {settings.h17Border ? "on" : "off"}</button>
  ) : ["verse", "reading", "mushaf"].includes(mode) ? (
    <select className="pill" value={settings.riwayah} onChange={(e) => { store.setSettings({ riwayah: e.target.value as typeof settings.riwayah }); if (mode === "mushaf") setParam("page", null); }} aria-label="Riwayah">
      {RIWAYAT.filter((r) => mode !== "mushaf" || r.svg).map((r) => <option key={r.id} value={r.id}>{r.en}</option>)}
    </select>
  ) : mode === "continuous" ? <span className="muted small">Madinah pages, 15 lines, Hafs</span> : null;

  return (
    <div className="reader">
      <header className="topbar readbar">
        <button className="icon-btn" onClick={() => go("/")} aria-label="Home"><Icon name="home" /></button>
        <button className="read-title" onClick={onMenu} aria-label="Go to a surah, verse, juz or page">
          <span className="read-name">{surah} · {meta?.name_simple ?? "Surah"} <Icon name="chevronDown" size={14} /></span>
          <span className="muted small">{hereWord?.juz ? `Juz ${hereWord.juz.number}` : ""}{shownPage ? ` · Page ${shownPage}` : ""}</span>
        </button>
        <div className="topbar-actions">
          <button className="icon-btn" onClick={() => go("/search")} aria-label="Search"><Icon name="search" /></button>
          <button className="icon-btn" onClick={onSettings} aria-label="Settings"><Icon name="settings" /></button>
        </div>
      </header>

      <div className="page">
        {(mode === "verse" || mode === "reading") && (
          <section className="surah-intro">
            <Ornament path={`assets/surah-headers/${SCAN_FOR_RIWAYAH[settings.riwayah]}/mono.svg`} height="clamp(44px, 9vw, 72px)" color="var(--gold)" label={`Surah header ornament for ${meta?.name_simple ?? ""}`}>
              <span className="banner-name" dir="rtl" lang="ar">سورة {meta?.name_arabic}</span>
            </Ornament>
            <div className="muted small">{meta?.translated_name.name} · {m ? m.surah(surah).ayahCount : meta?.verses_count} ayahs{isHafs ? "" : ` in ${riwayahInfo(settings.riwayah).en}`} · {meta?.revelation_place === "makkah" ? "Makki" : "Madani"}</div>
          </section>
        )}

        {textError && <p className="error">Could not load the {riwayahInfo(settings.riwayah).en} text: {textError}</p>}
        {verses.error && <p className="error">Translations and audio could not load ({verses.error}). The Arabic still works.</p>}

        {mode === "verse" && m && <VerseMode m={m} surah={surah} verses={verses.data} targetAyah={targetAyah} onSelect={setSel} />}
        {mode === "reading" && m && <ReadingMode m={m} surah={surah} onSelect={setSel} />}
        {mode === "continuous" && hafs && <ContinuousMode key={surah} m={hafs} surah={surah} ayah={targetAyah} page={page} onSelect={setSel} />}
        {mode === "mushaf" && <MushafMode surah={surah} page={madinahPage} onSelect={setSel} />}
        {mode === "huffaz" && hafs && <Huffaz17Mode m={hafs} surah={surah} ayah={targetAyah} page={page} onSelect={setSel} />}
        {mode === "words" && <WordsMode surah={surah} page={madinahPage} onSelect={setSel} />}
        {(mode === "engine" || mode === "memorize") && <EngineMode surah={surah} page={madinahPage} memorize={mode === "memorize"} onSelect={setSel} />}

        {!turnsPages && (
          <div className="surah-nav">
            {surah < 114 && <button className="btn" onClick={() => go(`/surah/${surah + 1}`, { mode })}><Icon name="chevronLeft" size={14} /> Next surah</button>}
            <button className="btn" onClick={() => scrollTo({ top: 0, behavior: "smooth" })}>Beginning of surah</button>
          </div>
        )}
      </div>

      <nav className="readerbar" aria-label="Reader controls">
        <button className="icon-btn" onClick={() => step(1)} aria-label={turnsPages ? "Next page" : "Next surah"} title={turnsPages ? "Next page" : "Next surah"}><Icon name="chevronLeft" /></button>
        <button className="icon-btn" onClick={() => setDisplay(true)} aria-label="Layout" title="Layout"><Icon name="layers" /></button>
        <button className="icon-btn big" onClick={play} disabled={!isHafs} aria-label={playingHere && p.playing ? "Pause" : "Listen"}
          title={isHafs ? "Listen from here" : "Recitations here are in Hafs; playing them over another riwayah's text would not match."}>
          <Icon name={playingHere && p.playing ? "pause" : "play"} filled />
        </button>
        <button className="icon-btn" onClick={() => setFull(true)} aria-label="Full screen" title="Full screen"><Icon name="expand" /></button>
        <button className="icon-btn" onClick={() => step(-1)} aria-label={turnsPages ? "Previous page" : "Previous surah"} title={turnsPages ? "Previous page" : "Previous surah"}><Icon name="chevronRight" /></button>
      </nav>
      <button className="icon-btn focus-exit" onClick={() => setFull(false)} aria-label="Exit full screen"><Icon name="shrink" /></button>

      {display && (
        <div className="sheet-wrap" onClick={() => setDisplay(false)}>
          <div className="sheet" role="dialog" aria-label="Choose a layout" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grip" />
            <h3 className="sheet-title">Layout</h3>
            <div className="layouts">
              {MODES.map((x) => (
                <div key={x.id} className={`layout ${x.id === mode ? "on" : ""}`}>
                  <button className="layout-pick" onClick={() => switchTo(x.id)} aria-current={x.id === mode}>
                    <b>{x.label}</b><span className="muted small">{x.about}</span>
                  </button>
                  {x.id === mode && options && <div className="layout-options">{options}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {sel && <AyahSheet sel={sel} onClose={() => setSel(null)} />}
    </div>
  );
}
