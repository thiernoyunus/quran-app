// Bottom sheet for a tapped ayah or word, from any mode. Translations and tafsir are indexed by
// Hafs numbers, so an ayah from another mushaf is first converted with qiraat-ayah-map.
import { useState } from "react";
import { useStore, store, type Riwayah } from "../../lib/store";
import { useAsync, useMushaf, openTafsir, showToast } from "../../lib/hooks";
import { loadVerses, stripTags } from "../../lib/api";
import { player } from "../../lib/audio";
import { fontFamily, riwayahInfo, RIWAYAT } from "../../lib/quran";
import { systemOfRawi, toKufi, SYSTEMS, formatRange } from "../../lib/qiraat";
import { go } from "../../lib/router";
import { Icon } from "../../components/Icon";
import { playFrom } from "../Reader";

export interface Selection { riwayah: Riwayah; surah: number; ayah: number; word?: number; wordText?: string; mark?: string }

export function AyahSheet({ sel, onClose }: { sel: Selection; onClose: () => void }) {
  const { settings } = useStore();
  const { data: m } = useMushaf(sel.riwayah);
  const { data: hafs } = useMushaf("hafs");
  const isHafs = sel.riwayah === "hafs";

  const conv = useAsync(async () => {
    const { system, measured } = await systemOfRawi(riwayahInfo(sel.riwayah).rawi);
    const k = await toKufi(system, sel.surah, sel.ayah);
    return { system, measured, ...k };
  }, [sel.riwayah, sel.surah, sel.ayah]);
  const hafsAyahs = isHafs ? [sel.ayah] : conv.data?.ayahs ?? [];
  const verses = useAsync(() => loadVerses(sel.surah, settings.translations, settings.reciter), [sel.surah, settings.translations.join(), settings.reciter]);
  const hv = verses.data?.filter((v) => hafsAyahs.includes(v.verse_number)) ?? [];
  const word = sel.word ? hv[0]?.words.filter((w) => w.char_type_name === "word")[sel.word - 1] : undefined;
  const ayah = m?.ayah(sel.surah, sel.ayah);
  const ref = { surah: sel.surah, ayah: sel.ayah, riwayah: sel.riwayah };
  const marked = store.isBookmarked(ref);

  // The same words in every other riwayah, through quran-text's shared word numbering.
  const [showOthers, setShowOthers] = useState(false);
  const others = useAsync(async () => {
    if (!ayah || !showOthers) return [];
    const { loadMushaf } = await import("../../lib/quran");
    return Promise.all(RIWAYAT.filter((r) => r.id !== sel.riwayah).map(async (r) => {
      try { const o = await loadMushaf(r.id); const match = ayah.to(o); return { r, match, text: match.ayahs.map((x) => x.text).join(" ۝ ") }; }
      catch { return { r, match: null, text: "" }; }
    }));
  }, [ayah?.key, sel.riwayah, showOthers]);

  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={`Ayah ${sel.surah}:${sel.ayah}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="modal-head">
          <div className="row-inline">
            <b>{sel.surah}:{sel.ayah}</b>
            <span className="badge">{riwayahInfo(sel.riwayah).en}</span>
            {!isHafs && conv.data && <span className="badge gold" title="Translations and tafsir use the Hafs count">= Hafs {formatRange(sel.surah, conv.data.ayahs)}</span>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>

        {sel.word && (
          <div className="word-card">
            <div className="word-ar" dir="rtl" style={{ fontFamily: fontFamily("hafs") }}>{sel.wordText ?? word?.text_uthmani}</div>
            <div>
              <div><b>{word?.translation.text ?? "…"}</b></div>
              <div className="muted small">{word?.transliteration.text} · word {sel.word} of ayah {sel.surah}:{sel.ayah}{sel.mark ? ` · tapped mark: ${sel.mark.replace(/_/g, " ")}` : ""}</div>
            </div>
            {word?.audio_url && <button className="pill gold" onClick={() => player.playWord(word.audio_url)}><Icon name="volume" size={14} /> Hear word</button>}
          </div>
        )}

        {ayah && <div className="sheet-arabic" dir="rtl" style={{ fontFamily: fontFamily(sel.riwayah), fontSize: Math.min(settings.arabicSize, 30) }}>{ayah.render({ marks: true, ayahMarks: true })}</div>}

        {hv.map((v) => v.translations?.map((t) => (
          <p key={`${v.verse_key}-${t.resource_id}`} className="translation">{hv.length > 1 && <b>{v.verse_key} </b>}{stripTags(t.text)}</p>
        )))}

        <div className="sheet-actions">
          {isHafs && <button className="pill gold" onClick={() => { playFrom(sel.surah, sel.ayah); }}><Icon name="play" size={14} filled /> Play from here</button>}
          <button className="pill" onClick={() => openTafsir({ surah: sel.surah, ayahs: hafsAyahs, label: isHafs ? undefined : `${riwayahInfo(sel.riwayah).en} ${sel.surah}:${sel.ayah}` })} disabled={!hafsAyahs.length}><Icon name="book" size={14} /> Tafsir</button>
          <button className={`pill ${marked ? "gold" : ""}`} onClick={() => { store.toggleBookmark(ref); showToast(marked ? "Bookmark removed" : "Bookmarked"); }}><Icon name="bookmark" size={14} filled={marked} /> {marked ? "Saved" : "Bookmark"}</button>
          <button className="pill" onClick={async () => { if (ayah) { await navigator.clipboard.writeText(`${ayah.render({ marks: true, ayahMarks: true })}\n— Quran ${ayah.key} (${riwayahInfo(sel.riwayah).en})`); showToast("Ayah copied"); } }}><Icon name="copy" size={14} /> Copy</button>
          <button className="pill" onClick={() => { if (sel.riwayah !== settings.riwayah) store.setSettings({ riwayah: sel.riwayah }); go(`/surah/${sel.surah}`, { ayah: sel.ayah, mode: "verse" }); }}>Open verse by verse</button>
        </div>

        {conv.data && (
          <p className="hint">
            Numbering: {SYSTEMS.find((s) => s.id === conv.data!.system)?.name_en} count{conv.data.measured ? " (measured from the printed mushaf)" : " (attributed to the qari)"}.{" "}
            {conv.data.note === "covers" && "This one ayah covers more than one Hafs ayah."}
          </p>
        )}

        <details className="others" onToggle={(e) => setShowOthers((e.target as HTMLDetailsElement).open)}>
          <summary>This ayah in the other riwayat</summary>
          {others.loading && <p className="muted small">Downloading the other texts…</p>}
          {others.data?.map(({ r, match, text }) => (
            <div key={r.id} className="other-row">
              <div className="muted small">{r.en} · {match ? `${match.key}${match.relation !== "same" ? ` (${match.relation})` : ""}` : "not available"}</div>
              {text && <div dir="rtl" style={{ fontFamily: fontFamily(r.id) }} className="other-ar">{text}</div>}
            </div>
          ))}
        </details>
      </div>
    </div>
  );
}
