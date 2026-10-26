import { useState } from "react";
import { go } from "../lib/router";
import { store, useStore } from "../lib/store";
import { useChapters, useMushaf } from "../lib/hooks";
import { riwayahInfo } from "../lib/quran";
import { Icon } from "../components/Icon";

// Every QuranTech block, one door each, so nothing in the app is hidden.
const FEATURES = [
  { title: "Verse by verse", block: "quran-text", body: "Arabic in 7 riwayat, translations, word meanings, audio, tafsir.", to: ["/surah/1", { mode: "verse" }] },
  { title: "Reading", block: "quran-text", body: "Flowing Arabic, broken into the same lines as the printed page.", to: ["/surah/1", { mode: "reading" }] },
  { title: "Mushaf pages", block: "quran-svg", body: "The real printed page in 5 riwayat. Tap any ayah.", to: ["/surah/1", { mode: "mushaf" }] },
  { title: "Tap a word", block: "quran-svg-elements", body: "Every word on the printed page is tappable: meaning and sound.", to: ["/surah/1", { mode: "words" }] },
  { title: "Fast page", block: "quran-engine", body: "The page drawn on a canvas by the rendering engine. Light and quick.", to: ["/surah/1", { mode: "engine" }] },
  { title: "Memorize", block: "quran-engine", body: "Hide the words, recite, and reveal them one by one.", to: ["/surah/1", { mode: "memorize" }] },
  { title: "Tajweed", block: "quran-tajweed", body: "Colour-coded recitation rules, with every rule explained.", to: ["/tajweed", {}] },
  { title: "Riwayat & counting", block: "qiraat-ayah-map", body: "Why 2:255 isn't always 2:255: convert across 6 counting systems.", to: ["/qiraat", {}] },
  { title: "Ornaments", block: "quran-assets", body: "Surah banners, ayah roundels and page frames, with their licences.", to: ["/ornaments", {}] },
] as const;

export function Home() {
  const { lastRead, bookmarks } = useStore();
  const { data: chapters, error } = useChapters();
  const { data: hafs } = useMushaf("hafs");
  const [tab, setTab] = useState<"surah" | "juz" | "revelation">("surah");
  const [q, setQ] = useState("");

  return (
    <div className="page home">
      <section className="hero">
        <div className="hero-title" dir="rtl" lang="ar">ٱلْقُرْءَانُ ٱلْكَرِيمُ</div>
        <form className="searchbox" onSubmit={(e) => { e.preventDefault(); go("/search", { q }); }}>
          <Icon name="search" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the Quran in Arabic or English…" aria-label="Search the Quran" />
        </form>
        <div className="row-inline center">
          <button className="pill gold" onClick={() => document.getElementById("surahs")?.scrollIntoView({ behavior: "smooth" })}>Surah list</button>
          <button className="pill" onClick={() => go("/surah/2", { ayah: 255 })}>Ayat al-Kursi</button>
          <button className="pill" onClick={() => go("/surah/36")}>Ya-Sin</button>
          <button className="pill" onClick={() => go("/surah/67")}>Al-Mulk</button>
          <button className="pill" onClick={() => go("/surah/18")}>Al-Kahf</button>
        </div>
      </section>

      {(lastRead || bookmarks.length > 0) && (
        <section className="section">
          {lastRead && (
            <>
              <h3 className="section-title">Continue reading</h3>
              <button className="card continue" onClick={() => go(`/surah/${lastRead.surah}`, { ayah: lastRead.ayah })}>
                <div>
                  <b>{chapters?.[lastRead.surah - 1]?.name_simple ?? `Surah ${lastRead.surah}`}</b>
                  <div className="muted small">{riwayahInfo(lastRead.riwayah).en} · ayah {lastRead.ayah}</div>
                </div>
                <span className="gold">Ayah {lastRead.ayah} <Icon name="chevronRight" size={14} /></span>
              </button>
            </>
          )}
          {bookmarks.length > 0 && (
            <>
              <h3 className="section-title">Bookmarks</h3>
              <div className="chips">
                {bookmarks.map((b) => (
                  <button key={`${b.riwayah}-${b.surah}-${b.ayah}`} className="chip" onClick={() => { store.setSettings({ riwayah: b.riwayah }); go(`/surah/${b.surah}`, { ayah: b.ayah }); }}>
                    <Icon name="bookmark" size={12} filled /> {b.surah}:{b.ayah} <span className="muted">{b.riwayah !== "hafs" ? riwayahInfo(b.riwayah).en : ""}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      <section className="section">
        <h3 className="section-title">Everything in QuranTech</h3>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <button key={f.title} className="card feature" onClick={() => go(f.to[0], f.to[1])}>
              <span className="tag">{f.block}</span>
              <b>{f.title}</b>
              <span className="muted small">{f.body}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="section" id="surahs">
        <div className="row-inline between">
          <div className="seg">
            {(["surah", "juz", "revelation"] as const).map((t) => (
              <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t === "revelation" ? "Revelation order" : t[0].toUpperCase() + t.slice(1)}</button>
            ))}
          </div>
        </div>
        {error && <p className="error">Could not load the surah list: {error}</p>}
        {tab !== "juz" && (
          <div className="surah-grid">
            {chapters && [...chapters].sort((a, b) => tab === "revelation" ? a.revelation_order - b.revelation_order : a.id - b.id).map((c) => (
              <button key={c.id} className="card surah-card" onClick={() => go(`/surah/${c.id}`)}>
                <span className="diamond"><span>{c.id}</span></span>
                <span className="grow">
                  <b>{c.name_simple}</b>
                  <span className="muted small">{c.translated_name.name}</span>
                </span>
                <span className="end">
                  <span className="arabic-name" dir="rtl">{c.name_arabic}</span>
                  <span className="muted small">{c.verses_count} Ayahs · {c.revelation_place === "makkah" ? "Makki" : "Madani"}</span>
                </span>
              </button>
            ))}
          </div>
        )}
        {tab === "juz" && hafs && (
          <div className="juz-grid">
            {hafs.ajza.map((j) => (
              <div key={j.number} className="card juz-card">
                <b>Juz {j.number}</b>
                {j.surahs.map((s) => {
                  const start = s.number === j.firstAyah!.surah.number ? j.firstAyah!.number : 1;
                  return (
                    <button key={s.number} className="row" onClick={() => go(`/surah/${s.number}`, { ayah: start })}>
                      <span className="num">{s.number}</span><span className="grow">{chapters?.[s.number - 1]?.name_simple}</span>
                      <span className="muted small">from {s.number}:{start}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
