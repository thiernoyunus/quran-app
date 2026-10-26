// Go to: jump by surah, juz, page or exact verse, staying in the layout you're reading.
// The box understands "2:255", "293" (a page, surah or juz) and surah names, and can hand words to search.
import { useEffect, useRef, useState } from "react";
import { go, useRoute } from "../lib/router";
import { useAsync, useChapters, useMushaf } from "../lib/hooks";
import { loadLayout } from "../views/reader/Huffaz17Mode";
import { TURNS_PAGES, type Mode } from "../views/Reader";
import { Icon } from "./Icon";

type Tab = "surah" | "juz" | "page" | "verse";

export function NavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("surah");
  const [q, setQ] = useState("");
  const { data: chapters } = useChapters();
  const { data: hafs } = useMushaf("hafs");
  const box = useRef<HTMLInputElement>(null);
  // A fresh box, ready to type in, with the list showing where you are.
  useEffect(() => {
    if (!open) return;
    setQ("");
    box.current?.focus();
    requestAnimationFrame(() => box.current?.parentElement?.querySelector(".row.on")?.scrollIntoView({ block: "center" }));
  }, [open]);
  const { parts, params } = useRoute();
  const mode = parts[0] === "surah" ? params.get("mode") : null; // keep the reader's layout
  const h17 = mode === "huffaz";
  const { data: L } = useAsync(() => (open ? loadLayout() : Promise.resolve(null)), [open]);
  // Page numbers mean the layout's own pages: Mushaf 17 has 486, every other layout follows the Madinah 604.
  const pageCount = h17 ? (L?.last_page ?? 0) : (hafs?.pageCount ?? 0);
  const firstPage = h17 ? (L?.first_page ?? 1) : 1;
  const pageStart = (p: number, huffaz = h17) => {
    if (!hafs) return null;
    if (!huffaz) return hafs.page(p).firstAyah;
    const t = L?.pages[p]?.find((r) => r.t === "text");
    return t?.t === "text" ? hafs.wordAt(t.w).ayah : null;
  };
  // Page layouts open at the page; the scrolling ones at its first ayah.
  const toPage = (p: number, m = mode) => {
    const a = pageStart(p, m === "huffaz");
    const paged = m === "continuous" || TURNS_PAGES.includes(m as Mode);
    go(`/surah/${a?.surah.number ?? 1}`, { mode: m, page: paged ? p : null, ayah: !paged && a && a.number > 1 ? a.number : null });
  };
  const toAyah = (s: number, a: number) => go(`/surah/${s}`, { mode, ayah: a > 1 ? a : null });

  // What the box could mean, best guesses first.
  const n = /^\d+$/.test(q.trim()) ? Number(q) : 0;
  const ref = q.match(/^\s*(\d{1,3})\s*[:.\s]\s*(\d{1,3})\s*$/);
  const guesses: [string, () => void][] = [];
  if (ref) guesses.push([`Verse ${ref[1]}:${ref[2]}`, () => toAyah(+ref[1], +ref[2])]);
  if (n >= 1 && n <= 114) guesses.push([`Surah ${n} · ${chapters?.[n - 1]?.name_simple ?? ""}`, () => go(`/surah/${n}`, { mode })]);
  if (n >= 1 && n <= 604) guesses.push([h17 ? `Mushaf page ${n}` : `Page ${n}`, () => toPage(n, h17 ? "mushaf" : mode)]);
  if (n >= 2 && n <= 486) guesses.push([`Mushaf 17 page ${n}`, () => toPage(n, "huffaz")]);
  if (n >= 1 && n <= 30 && hafs) guesses.push([`Juz ${n}`, () => toAyah(hafs.juz(n).firstAyah!.surah.number, hafs.juz(n).firstAyah!.number)]);
  const plain = (t: string) => t.toLowerCase().replace(/[^a-z\u0600-\u06ff]/g, "");
  const named = q.trim() && !n && !ref ? chapters?.find((c) => plain(`${c.name_simple}${c.name_arabic}`).includes(plain(q))) : null;
  if (named) guesses.push([`Surah ${named.id} · ${named.name_simple}`, () => go(`/surah/${named.id}`, { mode })]);
  if (q.trim() && !n && !ref) guesses.push([`Search the Quran for “${q.trim()}”`, () => go("/search", { q: q.trim() })]);

  return (
    <>
      <div className={`scrim ${open ? "show" : ""}`} onClick={onClose} />
      <aside className={`drawer drop ${open ? "open" : ""}`} aria-hidden={!open} aria-label="Go to">
        <div className="drawer-head">
          <div className="seg">
            {(["surah", "verse", "juz", "page"] as Tab[]).map((t) => (
              <button key={t} className={tab === t ? "on" : ""} onClick={() => { setTab(t); setQ(""); }}>{t[0].toUpperCase() + t.slice(1)}</button>
            ))}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close navigation"><Icon name="close" /></button>
        </div>
        <input ref={box} className="field" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && guesses[0]?.[1]()}
          placeholder="Surah, 2:255, page, juz or words" aria-label="Go to" />
        <div className="drawer-list">
          {guesses.length > 0 && (
            <div className="guesses">
              {guesses.map(([label, act]) => (
                <button key={label} className="row" onClick={act}><Icon name={label.startsWith("Search") ? "search" : "chevronRight"} size={14} /><span className="grow">{label}</span></button>
              ))}
            </div>
          )}
          {tab === "surah" && chapters?.filter((c) => !q || `${c.id} ${c.name_simple} ${c.translated_name.name} ${c.name_arabic}`.toLowerCase().includes(q.toLowerCase()))
            .map((c) => (
              <button key={c.id} className={`row ${parts[0] === "surah" && Number(parts[1]) === c.id ? "on" : ""}`} onClick={() => go(`/surah/${c.id}`, { mode })}>
                <span className="num">{c.id}</span><span className="grow">{c.name_simple}</span><span className="muted small">{c.verses_count}</span>
              </button>
            ))}
          {tab === "juz" && hafs?.ajza.filter((j) => !q || String(j.number).startsWith(q)).map((j) => (
            <button key={j.number} className="row" onClick={() => toAyah(j.firstAyah!.surah.number, j.firstAyah!.number)}>
              <span className="num">{j.number}</span><span className="grow">Juz {j.number}</span><span className="muted small">{j.firstAyah!.key}</span>
            </button>
          ))}
          {tab === "page" && Array.from({ length: pageCount - firstPage + 1 }, (_, i) => firstPage + i).filter((p) => !q || String(p).startsWith(q)).slice(0, 120).map((p) => (
            <button key={p} className="row" onClick={() => toPage(p)}>
              <span className="num">{p}</span><span className="grow">Page {p}</span><span className="muted small">{pageStart(p)?.key}</span>
            </button>
          ))}
          {tab === "verse" && (
            <div className="pad">
              <p className="muted small">Type a reference like <b>2:255</b> and press Enter. Numbers follow the Hafs (Kufan) count.</p>
              <button className="btn" onClick={() => guesses[0]?.[1]()}>Go</button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
