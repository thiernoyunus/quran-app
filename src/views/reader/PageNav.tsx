// Page turner shared by the page layouts (the reader's bottom bar sends it "turn" events). Arabic books open right-to-left,
// so the next page sits on the left (and the left arrow key turns forward).
import { useEffect, type ReactNode } from "react";

export function PageNav({ page, total, onPage, children }: { page: number; total: number; onPage: (p: number) => void; children?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,select,textarea")) return;
      if (e.key === "ArrowLeft" && page < total) onPage(page + 1);
      if (e.key === "ArrowRight" && page > 1) onPage(page - 1);
    };
    // Swipe on the page: finger moving right turns to the next page (Arabic books open right-to-left).
    let start: { x: number; y: number } | null = null;
    const onStart = (e: TouchEvent) => { start = (e.target as HTMLElement).closest(".mushaf-page, .engine-box") ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; };
    const onEnd = (e: TouchEvent) => {
      if (!start) return;
      const dx = e.changedTouches[0].clientX - start.x, dy = e.changedTouches[0].clientY - start.y;
      if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) { if (dx > 0 && page < total) onPage(page + 1); if (dx < 0 && page > 1) onPage(page - 1); }
    };
    // The reader's bottom bar asks for a page turn: 1 forward, -1 back.
    const onTurn = (e: Event) => { const n = page + (e as CustomEvent<number>).detail; if (n >= 1 && n <= total) onPage(n); };
    addEventListener("turn", onTurn);
    addEventListener("keydown", onKey);
    addEventListener("touchstart", onStart, { passive: true });
    addEventListener("touchend", onEnd);
    return () => { removeEventListener("turn", onTurn); removeEventListener("keydown", onKey); removeEventListener("touchstart", onStart); removeEventListener("touchend", onEnd); };
  }, [page, total, onPage]);

  return (
    <div className="page-nav">
      <label className="muted small">Page <input className="page-input" type="number" min={1} max={total} value={page} onChange={(e) => { const v = Number(e.target.value); if (v >= 1 && v <= total) onPage(v); }} /> of {total}</label>
      {children}
    </div>
  );
}

export const pad3 = (n: number) => String(n).padStart(3, "0");

const surahPages = new Map<string, Promise<{ number: number; pageNumber: number }[]>>();
// Each mushaf's own surah index from quran-svg (page N differs between mushafs).
export function surahIndex(edition: string) {
  if (!surahPages.has(edition)) surahPages.set(edition, fetch(`https://cdn.quran.ws/svg/pages/v1.1.1/${edition}/surah.json`).then((r) => r.json()));
  return surahPages.get(edition)!;
}
