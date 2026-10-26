// Mushaf mode (quran-svg): the printed page as vector art, with one tappable shape per ayah.
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore, type Riwayah } from "../../lib/store";
import { usePlayer } from "../../lib/audio";
import { RIWAYAT } from "../../lib/quran";
import { setParam } from "../../lib/router";
import { PageNav, pad3, surahIndex } from "./PageNav";
import type { Selection } from "./AyahSheet";

const SVG_CDN = "https://cdn.quran.ws/svg/pages/v1.1.1";
const WITH_PAGES = RIWAYAT.filter((r) => r.svg);

export function MushafMode({ surah, page: pageParam, onSelect }: { surah: number; page: number | null; onSelect: (s: Selection) => void }) {
  const { settings } = useStore();
  const p = usePlayer();
  // quran-svg has 5 of the 7 riwayat; fall back to Hafs for the other two.
  const riwayah: Riwayah = WITH_PAGES.some((r) => r.id === settings.riwayah) ? settings.riwayah : "hafs";
  const edition = RIWAYAT.find((r) => r.id === riwayah)!.svg!;
  const [page, setPage] = useState<number | null>(pageParam);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const host = useRef<HTMLDivElement>(null);

  // Find the surah's first page in this mushaf (page numbers differ between mushafs).
  useEffect(() => {
    if (pageParam) { setPage(pageParam); return; }
    surahIndex(edition).then((idx) => setPage(idx.find((s) => s.number === surah)?.pageNumber ?? 1));
  }, [edition, surah, pageParam]);

  const turn = useCallback((n: number) => { setPage(n); setParam("page", n); }, []);

  useEffect(() => {
    if (!page || !host.current) return;
    let live = true;
    setStatus("loading");
    fetch(`${SVG_CDN}/${edition}/${pad3(page)}.svg`).then((r) => { if (!r.ok) throw new Error(); return r.text(); }).then((text) => {
      if (!live || !host.current) return;
      host.current.innerHTML = text;
      const svg = host.current.querySelector("svg")!;
      svg.removeAttribute("width"); svg.removeAttribute("height");
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", `Mushaf page ${page}, ${riwayah}`);
      svg.querySelectorAll("path:not(.ayahPolygon)").forEach((el) => ((el as SVGElement).style.pointerEvents = "none"));
      if (page <= 2) {
        // Pages 1-2 are drawn small inside a big box: zoom to the ink.
        const b = svg.getBBox();
        svg.setAttribute("viewBox", `${b.x - 8} ${b.y - 8} ${b.width + 16} ${b.height + 16}`);
      }
      setStatus("ready");
    }).catch(() => live && setStatus("error"));
    return () => { live = false; };
  }, [edition, page, riwayah]);

  // Light up the selected ayah and the one being recited.
  useEffect(() => {
    if (status !== "ready" || !host.current) return;
    host.current.querySelectorAll<SVGPathElement>(".ayahPolygon").forEach((el) => {
      const key = `${el.getAttribute("surah")}:${el.getAttribute("ayah")}`;
      el.classList.toggle("sel", key === selected);
      el.classList.toggle("playing", riwayah === "hafs" && key === p.verseKey);
    });
  }, [status, selected, p.verseKey, riwayah]);

  const onClick = (e: React.MouseEvent) => {
    const poly = (e.target as Element).closest(".ayahPolygon");
    if (!poly) return;
    const s = Number(poly.getAttribute("surah")), a = Number(poly.getAttribute("ayah"));
    setSelected(`${s}:${a}`);
    onSelect({ riwayah, surah: s, ayah: a });
  };

  return (
    <div className="mushaf-wrap">
      {page && (
        <PageNav page={page} total={604} onPage={turn} />
      )}
      {!WITH_PAGES.some((r) => r.id === settings.riwayah) && <p className="hint center">quran-svg has printed pages for 5 riwayat; showing Hafs instead of {settings.riwayah}.</p>}
      <div className={`mushaf-page ${status}`} ref={host} onClick={onClick} />
      {status === "loading" && <p className="muted center">Loading page…</p>}
      {status === "error" && <p className="error center">This page could not be downloaded.</p>}
    </div>
  );
}
