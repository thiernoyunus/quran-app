// Riwayat & counting (qiraat-ayah-map + quran-text): the same ayah has different numbers
// in different counting traditions. Convert any reference, and compare the text across riwayat.
import { useState } from "react";
import { useAsync } from "../lib/hooks";
import { SYSTEMS, convert, surahCount, formatRange, type System } from "../lib/qiraat";
import { RIWAYAT, loadMushaf, fontFamily } from "../lib/quran";
import { go } from "../lib/router";
import { store } from "../lib/store";

const EXAMPLES: [number, number, string][] = [[1, 1, "Is the basmalah an ayah?"], [2, 1, "Disjoined letters (Alif Lam Mim)"], [2, 255, "Ayat al-Kursi"], [11, 82, "A split ayah"], [20, 1, "Ta-Ha"]];

export function QiraatView() {
  const [surah, setSurah] = useState(2);
  const [ayah, setAyah] = useState(255);
  const [from, setFrom] = useState<System>("kufi");

  const table = useAsync(async () => Promise.all(SYSTEMS.map(async (s) => ({ s, r: await convert(from, s.id, surah, ayah), count: await surahCount(s.id, surah) }))), [surah, ayah, from]);
  const [texts, setTexts] = useState(false);
  const compare = useAsync(async () => {
    if (!texts) return null;
    const hafs = await loadMushaf("hafs");
    const a = hafs.ayah(surah, Math.min(ayah, hafs.surah(surah).ayahCount));
    return Promise.all(RIWAYAT.map(async (r) => {
      const m = await loadMushaf(r.id);
      const match = a.to(m);
      return { r, key: match.key, relation: match.relation, text: match.ayahs.map((x) => x.render({ ayahMarks: true })).join(" ") };
    }));
  }, [texts, surah, ayah]);

  return (
    <div className="page narrow">
      <h1>Riwayat & ayah counting</h1>
      <p className="lead">The Quran is recited in several transmissions (riwayat). Scholars also counted where ayahs end in six slightly different ways, so the same words can be numbered differently. Hafs uses the Kufan count (6,236 ayahs); Warsh uses the Last Madinan count (6,214). This page converts a reference between all six.</p>

      <div className="card pad">
        <div className="form-row">
          <label>Surah <input className="field num" type="number" min={1} max={114} value={surah} onChange={(e) => setSurah(Math.min(114, Math.max(1, +e.target.value || 1)))} /></label>
          <label>Ayah <input className="field num" type="number" min={1} max={286} value={ayah} onChange={(e) => setAyah(Math.max(1, +e.target.value || 1))} /></label>
          <label>Counted as
            <select className="field" value={from} onChange={(e) => setFrom(e.target.value as System)}>
              {SYSTEMS.map((s) => <option key={s.id} value={s.id}>{s.name_en}</option>)}
            </select>
          </label>
        </div>
        <div className="chips">
          {EXAMPLES.map(([s, a, label]) => <button key={label} className="chip" onClick={() => { setSurah(s); setAyah(a); setFrom("kufi"); }}>{s}:{a} · {label}</button>)}
        </div>
      </div>

      <div className="table-scroll"><table className="table">
        <thead><tr><th>Counting system</th><th>Same words are</th><th>Ayahs in surah {surah}</th><th>Used by</th></tr></thead>
        <tbody>
          {table.data?.map(({ s, r, count }) => (
            <tr key={s.id} className={s.id === from ? "on" : ""}>
              <td><b>{s.name_en}</b> <span className="muted" dir="rtl">{s.name_ar}</span></td>
              <td>{formatRange(surah, r.ayahs)} {r.note !== "same" && <span className="badge">{r.note === "covers" ? "merged" : r.note}</span>}</td>
              <td>{count}</td>
              <td className="muted small">{s.used_by_qiraat.join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {table.error && <p className="error">{table.error}</p>}
      <p className="hint">“split” means this ayah is two ayahs in that count; “merged” means it is joined with its neighbour. A range is always shown in full, never just its first number. Data: qiraat-ayah-map 0.1.0 (CC BY 4.0).</p>

      <h2>Compare the text</h2>
      <p className="muted">Uses quran-text's shared word numbering: the same word has the same number in every riwayah, so differences in spelling and numbering line up.</p>
      {!texts && <button className="btn primary" onClick={() => setTexts(true)}>Show {surah}:{ayah} in all 7 riwayat (downloads about 13 MB once)</button>}
      {compare.loading && texts && <p className="muted">Downloading texts…</p>}
      {compare.data?.map(({ r, key, relation, text }) => (
        <div key={r.id} className="card compare-row">
          <div className="row-inline between">
            <span><b>{r.en}</b> <span className="muted">{r.ar} · qira'ah of {r.qiraah}</span></span>
            <span className="row-inline"><span className="badge">{key}{relation !== "same" ? ` · ${relation}` : ""}</span>
              <button className="link" onClick={() => { store.setSettings({ riwayah: r.id }); go(`/surah/${surah}`, { ayah: key.split(":")[1].split("-")[0] }); }}>Read in {r.en}</button></span>
          </div>
          <div className="compare-ar" dir="rtl" style={{ fontFamily: fontFamily(r.id) }}>{text || "—"}</div>
        </div>
      ))}
    </div>
  );
}
