// Tafsir popup, like Quran.com's: pick a tafsir, step between ayahs. Text is shown as published,
// with its source named; nothing here is AI-written.
import { useEffect, useState } from "react";
import { isRtl, loadTafsirList, tafsirFor } from "../lib/api";
import { openTafsir, useAsync, useTafsirTarget, useMushaf } from "../lib/hooks";
import { store, useStore } from "../lib/store";
import { fontFamily } from "../lib/quran";
import { Icon } from "./Icon";

export function TafsirModal() {
  const t = useTafsirTarget();
  const { settings } = useStore();
  const { data: hafs } = useMushaf("hafs");
  const slug = settings.tafsir;
  const { data: list } = useAsync(() => loadTafsirList("all"), []);
  const info = list?.find((x) => x.slug === slug);
  // Like Quran.com: pick a language, then a tafsir in it. Starts on the chosen tafsir's language.
  const [lang, setLang] = useState<string | null>(null);
  const shownLang = lang ?? info?.language_name ?? "english";
  const languages = [...new Set(list?.map((x) => x.language_name))].sort();
  const { data, error, loading } = useAsync(
    () => (t ? Promise.all(t.ayahs.map((a) => tafsirFor(slug, t.surah, a))) : Promise.resolve([])),
    [t?.surah, t?.ayahs.join(), slug],
  );

  useEffect(() => {
    if (!t) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && openTafsir(null);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [t]);

  if (!t) return null;
  const count = hafs?.surah(t.surah).ayahCount ?? 0;
  const step = (d: number) => {
    const a = (d > 0 ? t.ayahs[t.ayahs.length - 1] : t.ayahs[0]) + d;
    if (a >= 1 && a <= count) openTafsir({ surah: t.surah, ayahs: [a] });
  };

  return (
    <div className="modal-wrap" onClick={() => openTafsir(null)}>
      <div className="modal" role="dialog" aria-label="Tafsir" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="row-inline">
            <button className="icon-btn" onClick={() => step(-1)} aria-label="Previous ayah"><Icon name="chevronLeft" /></button>
            <b>Tafsir · {t.surah}:{t.ayahs.join("–")}</b>
            <button className="icon-btn" onClick={() => step(1)} aria-label="Next ayah"><Icon name="chevronRight" /></button>
            {t.label && <span className="badge">{t.label}</span>}
          </div>
          <button className="icon-btn" onClick={() => openTafsir(null)} aria-label="Close"><Icon name="close" /></button>
        </div>
        {hafs && (
          <div className="tafsir-ayah" dir="rtl" style={{ fontFamily: fontFamily("hafs") }}>
            {t.ayahs.map((a) => hafs.ayah(t.surah, a).render({ marks: true, ayahMarks: true })).join(" ")}
          </div>
        )}
        <div className="chips">
          {list && (
            <select className="pill" value={shownLang} onChange={(e) => setLang(e.target.value)} aria-label="Tafsir language">
              {languages.map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
            </select>
          )}
          {list && (
            <select className="pill" value={info?.language_name === shownLang ? slug : ""} onChange={(e) => store.setSettings({ tafsir: e.target.value })} aria-label="Tafsir">
              {info?.language_name !== shownLang && <option value="" disabled>Choose a tafsir…</option>}
              {list.filter((x) => x.language_name === shownLang).map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}
            </select>
          )}
        </div>
        <div className="tafsir-body" dir={info && isRtl(info.language_name) ? "rtl" : "ltr"}>
          {loading && <p className="muted">Loading {info?.name ?? "tafsir"}…</p>}
          {error && <p className="error">Could not load this tafsir: {error}</p>}
          {data?.map((text, i) => (
            <div key={i}>
              {t.ayahs.length > 1 && <h4>{t.surah}:{t.ayahs[i]}</h4>}
              {text ? text.split(/\n+/).map((para, j) => <p key={j}>{para}</p>) : <p className="muted">This tafsir has no entry for this ayah (it may be covered with a neighbouring ayah).</p>}
            </div>
          ))}
        </div>
        <p className="hint">Source: {info?.name ?? slug}{info && info.author_name !== info.name ? ` (${info.author_name})` : ""}, via the open spa5k tafsir collection. Tafsir is scholarly explanation, not the Quran itself.</p>
      </div>
    </div>
  );
}
