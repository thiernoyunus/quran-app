// Tajweed (quran-tajweed): a coloured ayah you can explore letter by letter, the colour key,
// and the full rule book with each rule's review status.
import { useState } from "react";
import { useAsync } from "../lib/hooks";
import { store, useStore } from "../lib/store";
import { fontFamily } from "../lib/quran";
import { go } from "../lib/router";
import type { RuleInfo } from "../lib/tajweed";

export function TajweedView() {
  const { settings } = useStore();
  const [key, setKey] = useState("1:6");
  const [picked, setPicked] = useState<RuleInfo[] | null>(null);
  const tj = useAsync(async () => {
    const mod = await import("../lib/tajweed");
    const e = await mod.loadTajweedEdition();
    const corpus = (await import("@quran.ws/tajwid-rules")).default;
    return { mod, e, corpus };
  }, []);

  if (!tj.data) return <div className="page narrow"><p className="muted">{tj.error ?? "Loading the tajweed rule book…"}</p></div>;
  const { mod, e, corpus } = tj.data;
  const text = e.ayahs[key];
  const runs = text ? mod.tajweedRuns(key, text, settings.tajweedTopics) : [];

  return (
    <div className="page narrow">
      <h1>Tajweed</h1>
      <p className="lead">Tajweed is the set of rules for reciting correctly: where to stretch a sound, where to merge letters, where a letter echoes. This app colours them using quran-tajweed's scholar-written rule data ({mod.tajweedStats.rules} rules, version {mod.tajweedStats.version}). The colours are this app's own choice. Treat it as a study aid, not a replacement for a teacher.</p>
      <p className={e.verified ? "hint" : "error"}>{e.verified ? "✓ The text edition matches the fingerprint the rules were measured on, so every colour lands on the right letter." : "The text edition did not match its fingerprint, so colouring is turned off."}</p>

      <div className="card pad">
        <div className="form-row">
          <label>Ayah <input className="field" value={key} onChange={(ev) => { setKey(ev.target.value.trim()); setPicked(null); }} placeholder="2:255" /></label>
          <div className="chips">{["1:6", "2:2", "2:255", "112:1", "113:1", "114:1"].map((k) => <button key={k} className="chip" onClick={() => { setKey(k); setPicked(null); }}>{k}</button>)}</div>
        </div>
        {text ? (
          <div className="tajweed-demo" dir="rtl" style={{ fontFamily: fontFamily("hafs"), fontSize: `calc(${settings.arabicSize + 6}px * var(--ar))` }}>
            {runs.map((r, i) => r.color
              ? <span key={i} className="tj-run" style={{ color: r.color }} onClick={() => setPicked(r.rules)}>{r.text}</span>
              : <span key={i}>{r.text}</span>)}
          </div>
        ) : <p className="muted">Type a reference like 2:255 (Hafs count).</p>}
        {picked ? (
          <div className="rule-detail">
            {picked.map((r) => (
              <div key={r.ruleId}>
                <span className="dot" style={{ background: mod.TOPICS.find((t) => t.id === r.topic)?.color }} />
                <b>{mod.TOPICS.find((t) => t.id === r.topic)?.en}</b> · <span dir="rtl">{r.category} ← {r.hukum}</span>
                <div className="muted small" dir="rtl">{r.rule}</div>
                {r.status === "disputed" && <span className="badge">disputed: scholars differ on this one</span>}
                {r.needsReview && <span className="badge">awaiting specialist review</span>}
              </div>
            ))}
          </div>
        ) : text && <p className="hint">Tap a coloured letter to see which rule applies.</p>}
        {text && !runs.some((r) => r.color) && <p className="hint">No rules are marked in this ayah. That doesn't mean none apply: only 7 topics are covered.</p>}
      </div>

      <h2>Colour key</h2>
      <div className="legend">
        {mod.TOPICS.map((t) => {
          const on = !settings.tajweedTopics.length || settings.tajweedTopics.includes(t.id);
          return (
            <button key={t.id} className={`legend-item ${on ? "" : "off"}`} onClick={() => {
              const all = settings.tajweedTopics.length ? settings.tajweedTopics : mod.TOPICS.map((x) => x.id);
              const next = on ? all.filter((x) => x !== t.id) : [...all, t.id];
              store.setSettings({ tajweedTopics: next.length === mod.TOPICS.length ? [] : next });
            }}>
              <i style={{ background: t.color }} /> <span>{t.en}</span> <span className="muted" dir="rtl">{t.ar}</span>
            </button>
          );
        })}
      </div>
      <div className="row-inline">
        <button className="btn primary" onClick={() => { store.setSettings({ tajweed: true, riwayah: "hafs" }); go("/surah/1", { mode: "verse" }); }}>Read with tajweed colours</button>
        <span className="muted small">Tap a colour above to hide or show that topic everywhere.</span>
      </div>

      <h2>The rule book</h2>
      {(corpus.topics as { id: string; label: { ar: string } }[]).map((t) => (
        <details key={t.id} className="card rulebook">
          <summary><i className="dot" style={{ background: mod.TOPICS.find((x) => x.id === t.id)?.color }} /> {mod.TOPICS.find((x) => x.id === t.id)?.en} <span className="muted" dir="rtl">{t.label.ar}</span></summary>
          {(corpus.categories as { id: string; topic: string; label: { ar: string }; empty?: boolean }[]).filter((c) => c.topic === t.id && !c.empty).map((c) => (
            <div key={c.id} className="rb-cat">
              <h4 dir="rtl">{c.label.ar}</h4>
              {(corpus.hukums as { id: string; category: string; label: { ar: string } }[]).filter((h) => h.category === c.id).map((h) => (
                <div key={h.id} className="rb-hukum">
                  <div dir="rtl"><b>{h.label.ar}</b></div>
                  <ul dir="rtl">
                    {(corpus.rules as { id: string; hukum: string; status: string; label: { ar: string }; needsReview?: boolean }[]).filter((r) => r.hukum === h.id).map((r) => (
                      <li key={r.id}>{r.label.ar} {r.status !== "stable" && <span className="badge" dir="ltr">{r.status}</span>}{r.needsReview && <span className="badge" dir="ltr">needs review</span>}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </details>
      ))}
    </div>
  );
}
