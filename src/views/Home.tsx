import { useState } from "react";
import { go } from "../lib/router";
import { store, useStore } from "../lib/store";
import { useChapters, useMushaf } from "../lib/hooks";
import { riwayahInfo } from "../lib/quran";
import { Icon } from "../components/Icon";


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
          <button className="pill gold" onClick={() => go("/surah/2", { ayah: 255 })}>Ayat al-Kursi</button>
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
