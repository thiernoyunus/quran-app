// Tap-a-word mode (quran-svg-elements): the printed page taken apart into words and marks.
import { useCallback, useEffect, useRef, useState } from "react";
import { usePlayer } from "../../lib/audio";
import { setParam } from "../../lib/router";
import { PageNav, pad3, surahIndex } from "./PageNav";
import type { Selection } from "./AyahSheet";

const EL = "https://cdn.quran.ws/svg/elements/v1.1.2"; // pinned version (latest when built)

// Colours for the "show the marks" view, by mark family.
const FAMILY_COLORS: [string, string][] = [
  ["tanwin", "#f76b15"], ["diacritic", "#e5484d"], ["dots", "#3e63dd"], ["waqf", "#8e4ec6"], ["sifr", "#30a46c"],
];

export function WordsMode({ surah, page: pageParam, onSelect }: { surah: number; page: number | null; onSelect: (s: Selection) => void }) {
  const p = usePlayer();
  const [page, setPage] = useState<number | null>(pageParam);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [selected, setSelected] = useState<string | null>(null);
  const [marks, setMarks] = useState(false);
  const [stats, setStats] = useState<{ words: number; marks: number } | null>(null);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pageParam) { setPage(pageParam); return; }
    surahIndex("hafs-kfqc").then((idx) => setPage(idx.find((s) => s.number === surah)?.pageNumber ?? 1));
  }, [surah, pageParam]);
  const turn = useCallback((n: number) => { setPage(n); setParam("page", n); }, []);

  useEffect(() => {
    if (!page || !host.current) return;
    let live = true;
    setStatus("loading");
    fetch(`${EL}/pages/${pad3(page)}.svg`).then((r) => { if (!r.ok) throw new Error(); return r.text(); }).then((text) => {
      if (!live || !host.current) return;
      host.current.innerHTML = text;
      const svg = host.current.querySelector("svg")!;
      svg.removeAttribute("width"); svg.removeAttribute("height");
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", `Mushaf page ${page} with tappable words`);
      setStats({ words: svg.querySelectorAll("g.word").length, marks: svg.querySelectorAll("path[data-kind='mark']").length });
      setStatus("ready");
    }).catch(() => live && setStatus("error"));
    return () => { live = false; };
  }, [page]);

  // Highlights: the word being recited, the tapped word, and (optionally) every mark by family.
  useEffect(() => {
    const svg = host.current?.querySelector("svg");
    if (status !== "ready" || !svg) return;
    svg.querySelectorAll(".on, .sel").forEach((el) => el.classList.remove("on", "sel"));
    if (p.verseKey && p.word) svg.querySelector(`g.word[data-word-key="${p.verseKey}:${p.word}"]`)?.classList.add("on");
    if (selected) svg.querySelector(`g.word[data-word-key="${selected}"]`)?.classList.add("sel");
    svg.querySelectorAll<SVGPathElement>("path[data-kind='mark']").forEach((el) => {
      const fam = el.getAttribute("data-mark-family") ?? "";
      const c = marks ? FAMILY_COLORS.find(([f]) => fam.split(" ").includes(f))?.[1] : undefined;
      el.style.fill = c ?? "";
    });
  }, [status, p.verseKey, p.word, selected, marks]);

  const onClick = (e: React.MouseEvent) => {
    const w = (e.target as Element).closest("g.word") as SVGGElement | null;
    if (!w) return;
    const key = w.dataset.wordKey!;
    const [s, a, i] = key.split(":").map(Number);
    const markEl = (e.target as Element).closest("path[data-kind='mark']");
    setSelected(key);
    onSelect({ riwayah: "hafs", surah: s, ayah: a, word: i, wordText: w.dataset.rasmUthmani, mark: markEl?.getAttribute("data-mark") ?? undefined });
  };

  return (
    <div className="mushaf-wrap">
      {page && (
        <PageNav page={page} total={604} onPage={turn}>
          <button className={`pill ${marks ? "gold" : ""}`} onClick={() => setMarks(!marks)} title="Colour every diacritic by its family">Show the marks</button>
        </PageNav>
      )}
      {marks && (
        <div className="chips center">
          {FAMILY_COLORS.map(([f, c]) => <span key={f} className="chip"><i style={{ background: c }} /> {f}</span>)}
        </div>
      )}
      <div className={`mushaf-page words ${status} ${marks ? "marks" : ""}`} ref={host} onClick={onClick} />
      {status === "loading" && <p className="muted center">Loading page…</p>}
      {status === "error" && <p className="error center">This page could not be downloaded.</p>}
      <p className="hint center">
        Tap any word for its meaning and sound. {stats && `This page: ${stats.words} words, ${stats.marks} separate marks.`} Hafs only (quran-svg-elements v1.1.2, beta).
      </p>
    </div>
  );
}
