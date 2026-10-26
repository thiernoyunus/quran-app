// Left-hand navigation, like Quran.com's: jump by surah, juz, page or exact verse.
import { useState } from "react";
import { go } from "../lib/router";
import { useChapters, useMushaf } from "../lib/hooks";
import { Icon } from "./Icon";

type Tab = "surah" | "juz" | "page" | "verse";

export function NavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("surah");
  const [q, setQ] = useState("");
  const { data: chapters } = useChapters();
  const { data: hafs } = useMushaf("hafs");

  const openVerse = () => {
    const m = q.match(/(\d+)\D+(\d+)/);
    if (m) go(`/surah/${m[1]}`, { ayah: m[2] });
  };

  return (
    <>
      <div className={`scrim ${open ? "show" : ""}`} onClick={onClose} />
      <aside className={`drawer left ${open ? "open" : ""}`} aria-hidden={!open} aria-label="Navigation">
        <div className="drawer-head">
          <div className="seg">
            {(["surah", "verse", "juz", "page"] as Tab[]).map((t) => (
              <button key={t} className={tab === t ? "on" : ""} onClick={() => { setTab(t); setQ(""); }}>{t[0].toUpperCase() + t.slice(1)}</button>
            ))}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close navigation"><Icon name="close" /></button>
        </div>
        <input className="field" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && tab === "verse" && openVerse()}
          placeholder={tab === "verse" ? "Type surah:ayah, e.g. 2:255" : tab === "surah" ? "Search surah" : `Go to ${tab}`} />
        <div className="drawer-list">
          {tab === "surah" && chapters?.filter((c) => !q || `${c.id} ${c.name_simple} ${c.translated_name.name} ${c.name_arabic}`.toLowerCase().includes(q.toLowerCase()))
            .map((c) => (
              <button key={c.id} className="row" onClick={() => go(`/surah/${c.id}`)}>
                <span className="num">{c.id}</span><span className="grow">{c.name_simple}</span><span className="muted small">{c.verses_count}</span>
              </button>
            ))}
          {tab === "juz" && hafs?.ajza.filter((j) => !q || String(j.number).startsWith(q)).map((j) => (
            <button key={j.number} className="row" onClick={() => go(`/surah/${j.firstAyah!.surah.number}`, { ayah: j.firstAyah!.number })}>
              <span className="num">{j.number}</span><span className="grow">Juz {j.number}</span><span className="muted small">{j.firstAyah!.key}</span>
            </button>
          ))}
          {tab === "page" && hafs && Array.from({ length: hafs.pageCount }, (_, i) => i + 1).filter((p) => !q || String(p).startsWith(q)).slice(0, 120).map((p) => {
            const first = hafs.page(p).firstAyah!;
            return (
              <button key={p} className="row" onClick={() => go(`/surah/${first.surah.number}`, { mode: "mushaf", page: p })}>
                <span className="num">{p}</span><span className="grow">Page {p}</span><span className="muted small">{first.key}</span>
              </button>
            );
          })}
          {tab === "verse" && (
            <div className="pad">
              <p className="muted small">Type a reference like <b>2:255</b> and press Enter. Numbers follow the Hafs (Kufan) count.</p>
              <button className="btn" onClick={openVerse}>Go</button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
