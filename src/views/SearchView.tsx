// Search: Arabic runs locally over the verified text (quran-text, any riwayah, no internet needed);
// English and other languages use Quran.com's search.
import { useEffect, useState } from "react";
import { fold } from "@quran.ws/text";
import { useRoute, go } from "../lib/router";
import { useAsync, useMushaf } from "../lib/hooks";
import { useStore } from "../lib/store";
import { searchQuranCom, stripTags } from "../lib/api";
import { fontFamily, riwayahInfo } from "../lib/quran";
import { Icon } from "../components/Icon";

const isArabic = (s: string) => /[؀-ۿ]/.test(s);

export function SearchView() {
  const { params } = useRoute();
  const q = params.get("q") ?? "";
  const [draft, setDraft] = useState(q);
  useEffect(() => setDraft(q), [q]);
  const { settings } = useStore();
  const { data: m } = useMushaf(settings.riwayah);
  const arabic = isArabic(q);

  const local = useAsync(async () => {
    if (!q || !arabic || !m) return null;
    let spans = m.search(q);
    // Search matches whole words, but Arabic glues on prefixes (بالصبر), so fall back to "contains".
    const partial = !spans.length && !q.trim().includes(" ");
    if (partial) { const f = fold(q); spans = m.words.flatMap((w, i) => (fold(w).includes(f) ? [m.span(i, i + 1)] : [])); }
    return { partial, total: spans.length, hits: spans.slice(0, 100).map((s) => ({ ayah: s.firstAyah, text: s.firstAyah?.text ?? s.text, match: s.text })) };
  }, [q, arabic, m]);
  const remote = useAsync(async () => (q && !arabic ? searchQuranCom(q) : null), [q, arabic]);

  const highlight = (text: string, match: string) => {
    const i = text.indexOf(match);
    return i < 0 ? text : <>{text.slice(0, i)}<mark>{match}</mark>{text.slice(i + match.length)}</>;
  };

  return (
    <div className="page narrow">
      <form className="searchbox big" onSubmit={(e) => { e.preventDefault(); go("/search", { q: draft }); }}>
        <Icon name="search" />
        <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="مالك يوم الدين · mercy · patience" aria-label="Search" />
        <button className="btn primary">Search</button>
      </form>
      <div className="chips">
        {["الرحمن الرحيم", "الصبر", "رب العالمين", "mercy", "patience", "light"].map((x) => <button key={x} className="chip" onClick={() => { setDraft(x); go("/search", { q: x }); }}>{x}</button>)}
      </div>

      {arabic && q && (
        <>
          <p className="muted small">Arabic search in the {riwayahInfo(settings.riwayah).en} text, matched without harakat (quran-text's <code>search</code>). {local.data && `${local.data.total} ${local.data.partial ? "words containing it" : "matches"}${local.data.total > 100 ? ", first 100 shown" : ""}.`}</p>
          {local.data?.hits.map((h, i) => h.ayah && (
            <button key={i} className="card result" onClick={() => go(`/surah/${h.ayah!.surah.number}`, { ayah: h.ayah!.number })}>
              <span className="key">{h.ayah.key}</span>
              <span className="result-ar" dir="rtl" style={{ fontFamily: fontFamily(settings.riwayah) }}>{highlight(h.text, h.match)}</span>
            </button>
          ))}
          {local.data?.total === 0 && <p className="muted">No matches.</p>}
        </>
      )}

      {!arabic && q && (
        <>
          <p className="muted small">Searching translations with Quran.com.</p>
          {remote.loading && <p className="muted">Searching…</p>}
          {remote.error && <p className="error">Search failed: {remote.error}</p>}
          {remote.data?.map((h) => {
            const [s, a] = h.verse_key.split(":");
            return (
              <button key={h.verse_key} className="card result" onClick={() => go(`/surah/${s}`, { ayah: a })}>
                <span className="key">{h.verse_key}</span>
                <span className="result-ar" dir="rtl" style={{ fontFamily: fontFamily("hafs") }}>{stripTags(h.text)}</span>
                {h.translations?.slice(0, 1).map((t, i) => <span key={i} className="small">{stripTags(t.text)} <span className="muted">— {t.name}</span></span>)}
              </button>
            );
          })}
          {remote.data?.length === 0 && <p className="muted">No results.</p>}
        </>
      )}
    </div>
  );
}
