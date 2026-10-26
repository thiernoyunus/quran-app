// Verse by verse (quran-text + Quran.com translations/audio + quran-tajweed + quran-assets markers).
import { memo, useEffect, useMemo, useState } from "react";
import type { Ayah, Mushaf } from "@quran.ws/text";
import { stripTags, loadTranslations, type QcVerse } from "../../lib/api";
import { player, usePlayer } from "../../lib/audio";
import { store, useStore, type Settings } from "../../lib/store";
import { fontFamily, toArabicDigits } from "../../lib/quran";
import { openTafsir, showToast, useAsync, useMushaf } from "../../lib/hooks";
import { Icon } from "../../components/Icon";
import { Ornament } from "../../components/Ornament";
import { playFrom } from "../Reader";
import type { Selection } from "./AyahSheet";
import { go } from "../../lib/router";

type TajweedMod = typeof import("../../lib/tajweed");

export function useTajweed(on: boolean) {
  return useAsync<{ mod: TajweedMod; ayahs: Record<string, string>; verified: boolean } | null>(async () => {
    if (!on) return null;
    const mod = await import("../../lib/tajweed");
    const e = await mod.loadTajweedEdition();
    return { mod, ...e };
  }, [on]);
}

export function VerseMode({ m, surah, verses, targetAyah, onSelect }: {
  m: Mushaf; surah: number; verses: QcVerse[] | null; targetAyah: number | null; onSelect: (s: Selection) => void;
}) {
  const { settings } = useStore();
  const isHafs = m.key === "hafs";
  const { data: hafs } = useMushaf("hafs");
  const tj = useTajweed(settings.tajweed && isHafs);
  const { data: tList } = useAsync(() => loadTranslations("all"), []);
  const byNumber = useMemo(() => new Map(verses?.map((v) => [v.verse_number, v])), [verses]);
  const p = usePlayer();
  const s = m.surah(surah);

  useEffect(() => {
    if (!targetAyah) return;
    const t = setTimeout(() => document.getElementById(`a-${targetAyah}`)?.scrollIntoView({ block: "start" }), 50);
    return () => clearTimeout(t);
  }, [targetAyah, surah, m, !!verses]);

  // Follow the recitation down the page.
  useEffect(() => {
    if (p.surah !== surah || !p.verseKey || !isHafs) return;
    document.getElementById(`a-${p.verseKey.split(":")[1]}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [p.verseKey, p.surah, surah, isHafs]);

  return (
    <div className="verses">
      {tj.data && !tj.data.verified && <p className="error">Tajweed is off: the text edition did not match the fingerprint the colours were measured on.</p>}
      {tj.data?.verified && <p className="hint center">Tajweed colours checked against their text edition (SHA-256 verified). <button className="link" onClick={() => go("/tajweed")}>What do the colours mean?</button></p>}
      {s.basmalah && (
        <div className="basmalah" dir="rtl" style={{ fontFamily: fontFamily(m.key as Settings["riwayah"]), fontSize: `calc(${settings.arabicSize * 0.9}px * var(--ar))` }}>{s.basmalah.text}</div>
      )}
      {s.ayahs.map((a) => (
        <AyahRow key={a.key} a={a} m={m} hafs={hafs} verse={isHafs ? byNumber.get(a.number) : undefined} byNumber={byNumber}
          settings={settings} tj={tj.data?.verified ? tj.data : null} tNames={tList}
          active={isHafs && p.surah === surah && p.verseKey === a.key ? p.word ?? 0 : null}
          onSelect={onSelect} />
      ))}
    </div>
  );
}

const AyahRow = memo(function AyahRow({ a, m, hafs, verse, byNumber, settings, tj, tNames, active, onSelect }: {
  a: Ayah; m: Mushaf; hafs: Mushaf | null; verse?: QcVerse; byNumber: Map<number, QcVerse>; settings: Settings;
  tj: { mod: TajweedMod; ayahs: Record<string, string> } | null; tNames: { id: number; name: string }[] | null;
  active: number | null; onSelect: (s: Selection) => void;
}) {
  const [peek, setPeek] = useState<number | null>(null);
  const isHafs = m.key === "hafs";
  const riwayah = m.key as Settings["riwayah"];
  const ref = { surah: a.surah.number, ayah: a.number, riwayah };
  useStore(); // re-draw when bookmarks change
  const marked = store.isBookmarked(ref);

  // Where this ayah sits in Hafs (translations and tafsir are indexed that way).
  const match = !isHafs && hafs ? a.to(hafs) : null;
  const hafsAyahs = isHafs ? [a.number] : match?.ayahs.map((x) => x.number) ?? [];
  const hafsVerses = hafsAyahs.map((n) => byNumber.get(n)).filter(Boolean) as QcVerse[];

  const words = a.wordList;
  const qcWords = verse?.words.filter((w) => w.char_type_name === "word") ?? [];

  const tapWord = (i: number) => {
    if (!isHafs) return;
    if (!player.seekWord(a.key, i)) player.playWord(qcWords[i - 1]?.audio_url ?? null);
    setPeek(peek === i ? null : i);
  };

  const copy = async () => {
    const text = `${a.render({ marks: true, ayahMarks: true })}\n\n${hafsVerses.map((v) => v.translations?.map((t) => stripTags(t.text)).join("\n")).join("\n")}\n— Quran ${a.key}${isHafs ? "" : ` (${m.nameEn})`}`;
    await navigator.clipboard.writeText(text);
    showToast("Ayah copied");
  };

  return (
    <article id={`a-${a.number}`} className={`ayah ${active != null ? "playing" : ""}`}>
      <div className="ayah-bar">
        <div className="row-inline">
          <span className="key">{a.key}</span>
          {match && match.key !== a.key && <span className="badge" title="This ayah's number in the Hafs (Kufan) count, used by translations and tafsir">Hafs {match.key}{match.relation !== "same" ? ` · ${match.relation}` : ""}</span>}
          {isHafs && <button className="icon-btn" onClick={() => playFrom(a.surah.number, a.number)} aria-label={`Play ${a.key}`}><Icon name="play" size={16} /></button>}
          <button className={`icon-btn ${marked ? "gold" : ""}`} onClick={() => { store.toggleBookmark(ref); showToast(marked ? "Bookmark removed" : "Bookmarked"); }} aria-label="Bookmark"><Icon name="bookmark" size={16} filled={marked} /></button>
        </div>
        <div className="row-inline">
          <button className="icon-btn" onClick={copy} aria-label="Copy"><Icon name="copy" size={16} /></button>
          <button className="icon-btn" onClick={() => onSelect({ riwayah, surah: a.surah.number, ayah: a.number })} aria-label="More"><Icon name="info" size={16} /></button>
        </div>
      </div>

      <div className="arabic" dir="rtl" lang="ar" style={{ fontFamily: fontFamily(riwayah), fontSize: `calc(${settings.arabicSize}px * var(--ar))` }}
        onCopy={(e) => { e.clipboardData.setData("text/plain", (getSelection()?.toString() ?? "").replace(/‍/g, "")); e.preventDefault(); }}>
        {tj ? (
          <span className={`tajweed ${active != null ? "hl-ayah" : ""}`}>
            {tj.mod.tajweedRuns(a.key, tj.ayahs[a.key] ?? a.text, settings.tajweedTopics).map((r, i) =>
              r.color ? <span key={i} style={{ color: r.color }} title={r.rules.map((x) => `${x.category} — ${x.hukum}${x.status === "disputed" ? " (disputed)" : ""}`).join("\n")}>{r.text}</span> : r.text)}
          </span>
        ) : words.map((w, i) => (
          <span key={i} className="wwrap">
            <span className={`w ${active === i + 1 ? "on" : ""}`} onClick={() => tapWord(i + 1)}>{w.render(true)}</span>
            {settings.wordByWord && qcWords[i] && <span className="wbw" dir="ltr">{qcWords[i].translation.text}</span>}
            {peek === i + 1 && qcWords[i] && !settings.wordByWord && (
              <span className="peek" dir="ltr" onClick={() => setPeek(null)}>{qcWords[i].translation.text}<i>{qcWords[i].transliteration.text}</i></span>
            )}{" "}
          </span>
        ))}
        <Ornament path={`assets/ayah-markers/${settings.markerStyle.split("/")[1]}/mono.svg`} height="1.15em" color={settings.markerColor} className="marker" label={`End of ayah ${a.number}`}>
          <span className="slot-num">{toArabicDigits(a.number)}</span>
        </Ornament>
      </div>

      {settings.showTranslation && hafsVerses.map((v) => v.translations?.map((t) => (
        <div key={`${v.verse_key}-${t.resource_id}`} className="translation" style={{ fontSize: settings.translationSize }}>
          {hafsVerses.length > 1 && <b>{v.verse_key} </b>}{stripTags(t.text)}
          <div className="tname">Translation of the meanings · {tNames?.find((x) => x.id === t.resource_id)?.name ?? "…"}</div>
        </div>
      )))}

      <div className="ayah-links">
        <button onClick={() => openTafsir({ surah: a.surah.number, ayahs: hafsAyahs, label: isHafs ? undefined : `${m.nameEn} ${a.key}` })}><Icon name="book" size={14} /> Tafsir</button>
        <button onClick={() => onSelect({ riwayah, surah: a.surah.number, ayah: a.number })}><Icon name="layers" size={14} /> Other riwayat</button>
        {isHafs && verse && <button onClick={() => go(`/surah/${a.surah.number}`, { mode: "mushaf", page: verse.page_number })}><Icon name="book" size={14} /> See on page {verse.page_number}</button>}
      </div>
    </article>
  );
});
