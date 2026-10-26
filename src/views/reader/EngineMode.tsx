// Fast page + Memorize (quran-engine, lite decoder): the page is drawn on a canvas from compact
// QVP data. Memorize hides every word and lets you reveal them one at a time.
import { useCallback, useEffect, useRef, useState } from "react";
import { loadPage, type QvpLitePage } from "@quran.ws/engine/lite";
import { usePlayer } from "../../lib/audio";
import { setParam } from "../../lib/router";
import { useStore } from "../../lib/store";
import { PageNav, pad3, surahIndex } from "./PageNav";
import type { Selection } from "./AyahSheet";
import { playFrom } from "../Reader";

const QVP = "https://cdn.quran.ws/qvp/v0.5.0"; // pinned page-data version

export function EngineMode({ surah, page: pageParam, memorize, onSelect }: { surah: number; page: number | null; memorize: boolean; onSelect: (s: Selection) => void }) {
  const { settings } = useStore();
  const p = usePlayer();
  const [page, setPage] = useState<number | null>(pageParam);
  const [qvp, setQvp] = useState<QvpLitePage | null>(null);
  const [error, setError] = useState(false);
  const [ms, setMs] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null); // "s:a"
  const [shown, setShown] = useState<Set<number>>(new Set()); // revealed word indexes (memorize)
  const [width, setWidth] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const fit = useRef({ scale: 1, x: 0, y: 0, ratio: 2 });

  useEffect(() => {
    if (pageParam) { setPage(pageParam); return; }
    surahIndex("hafs-kfqc").then((idx) => setPage(idx.find((s) => s.number === surah)?.pageNumber ?? 1));
  }, [surah, pageParam]);
  const turn = useCallback((n: number) => { setPage(n); setParam("page", n); setShown(new Set()); }, []);

  useEffect(() => {
    if (!page) return;
    let live = true;
    const t0 = performance.now();
    setError(false);
    loadPage(`${QVP}/${pad3(page)}.qvp`).then((pg) => { if (live) { setQvp(pg); setMs(Math.round(performance.now() - t0)); } }).catch(() => live && setError(true));
    return () => { live = false; };
  }, [page]);

  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  // Draw. Backing pixels = max(2, devicePixelRatio) per CSS pixel: sharp strokes, no blur.
  useEffect(() => {
    const c = canvas.current;
    if (!c || !qvp || !width) return;
    const ratio = Math.max(2, devicePixelRatio);
    const cssW = Math.min(width, 640), cssH = Math.round(cssW * (qvp.height / qvp.width));
    c.style.width = `${cssW}px`; c.style.height = `${cssH}px`;
    c.width = cssW * ratio; c.height = cssH * ratio;
    const f = qvp.fit(c, 24 * ratio);
    fit.current = { ...f, ratio };
    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue("--ink").trim() || "#231f20";
    const band = css.getPropertyValue("--band").trim() || "#bedbfa";
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);

    const playing = qvp.words.filter((w) => `${w.surah}:${w.ayah}` === p.verseKey && (memorize || w.word === p.word)).map((w) => w.index);
    const sel = qvp.words.filter((w) => `${w.surah}:${w.ayah}` === selected).map((w) => w.index);

    if (!memorize) {
      qvp.draw(ctx, { ...f, ink, band, highlight: [...sel, ...playing] });
      return;
    }
    // Memorize: decorations always, a soft box where each hidden word sits, ink only for revealed words.
    ctx.save();
    ctx.setTransform(f.scale, 0, 0, f.scale, f.x, f.y);
    ctx.fillStyle = band;
    for (const w of qvp.words) {
      if (shown.has(w.index)) continue;
      const [x0, y0, x1, y1] = w.box;
      ctx.globalAlpha = playing.includes(w.index) ? 0.9 : 0.35;
      ctx.beginPath(); ctx.roundRect(x0 + 1, y0 + 6, x1 - x0 - 2, y1 - y0 - 12, 4); ctx.fill();
    }
    ctx.restore();
    qvp.drawDecorations(ctx, { ...f, ink });
    qvp.drawWords(ctx, [...shown], { ...f, ink });
  }, [qvp, width, p.verseKey, p.word, selected, memorize, shown, settings.theme]);

  const toPage = (e: React.MouseEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    const { scale, x, y, ratio } = fit.current;
    return [((e.clientX - r.left) * ratio - x) / scale, ((e.clientY - r.top) * ratio - y) / scale];
  };

  const onClick = (e: React.MouseEvent) => {
    if (!qvp) return;
    const [x, y] = toPage(e);
    const w = qvp.hitTest(x, y);
    if (!w) return;
    if (memorize) {
      setShown((s) => new Set(s).add(w.index));
      return;
    }
    setSelected(`${w.surah}:${w.ayah}`);
    onSelect({ riwayah: "hafs", surah: w.surah, ayah: w.ayah, word: w.word, wordText: w.text });
  };

  const revealNext = () => {
    const next = qvp?.words.find((w) => !shown.has(w.index));
    if (next) setShown((s) => new Set(s).add(next.index));
  };
  const revealAyah = () => {
    const next = qvp?.words.find((w) => !shown.has(w.index));
    if (!next || !qvp) return;
    setShown((s) => { const n = new Set(s); qvp.words.filter((w) => w.surah === next.surah && w.ayah === next.ayah).forEach((w) => n.add(w.index)); return n; });
  };
  const nextHidden = qvp?.words.find((w) => !shown.has(w.index));

  return (
    <div className="mushaf-wrap">
      {page && <PageNav page={page} total={604} onPage={turn} />}
      {memorize && qvp && (
        <div className="memo-bar">
          <span className="muted small">{shown.size} of {qvp.words.length} words shown</span>
          <button className="pill gold" onClick={revealNext}>Reveal next word</button>
          <button className="pill" onClick={revealAyah}>Reveal ayah</button>
          {nextHidden && <button className="pill" onClick={() => playFrom(nextHidden.surah, nextHidden.ayah)}>Listen to {nextHidden.surah}:{nextHidden.ayah}</button>}
          <button className="pill" onClick={() => setShown(new Set(qvp.words.map((w) => w.index)))}>Show all</button>
          <button className="pill" onClick={() => setShown(new Set())}>Hide all</button>
        </div>
      )}
      <div className="engine-box" ref={box}>
        <canvas ref={canvas} className="engine-canvas" onClick={onClick} role="img" aria-label={`Mushaf page ${page}${memorize ? ", words hidden for memorisation" : ""}`} />
      </div>
      {error && <p className="error center">This page could not be downloaded.</p>}
      <p className="hint center">
        {memorize ? "Recite from memory, then tap a hidden word (or use the buttons) to check yourself. While audio plays, the ayah being recited glows." : "Tap a word. The page is drawn by quran-engine's lite decoder on a canvas."}
        {ms != null && ` Page data loaded and decoded in ${ms} ms.`}
      </p>
    </div>
  );
}
