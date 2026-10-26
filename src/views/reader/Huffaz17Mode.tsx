// Printed pages drawn from text (quran-text + quran-assets), every word quran-text's:
// Mushaf 17, the 1960 Egyptian Mushaf al-Huffaz (line breaks from huffaz17-layout.json, matched from a scan),
// and Continuous, the regular Madinah mushaf's pages one under another.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Mushaf } from "@quran.ws/text";
import { useStore } from "../../lib/store";
import { usePlayer } from "../../lib/audio";
import { useAsync, useChapters } from "../../lib/hooks";
import { fontFamily, toArabicDigits } from "../../lib/quran";
import { SCAN_FOR_RIWAYAH } from "../../lib/assets";
import { setParam } from "../../lib/router";
import { Ornament } from "../../components/Ornament";
import { PageNav } from "./PageNav";
import type { Selection } from "./AyahSheet";

type Row = { t: "text"; w: number } | { t: "surah"; s: number } | { t: "basmala" };
interface Layout { first_page: number; last_page: number; pages: Record<string, Row[]> }

let layout: Promise<Layout> | null = null;
export const loadLayout = () => (layout ??= fetch(`${import.meta.env.BASE_URL}data/huffaz17-layout.json`).then((r) => r.json() as Promise<Layout>));

const JUZ = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر",
  "الحادي عشر", "الثاني عشر", "الثالث عشر", "الرابع عشر", "الخامس عشر", "السادس عشر", "السابع عشر", "الثامن عشر", "التاسع عشر", "العشرون",
  "الحادي والعشرون", "الثاني والعشرون", "الثالث والعشرون", "الرابع والعشرون", "الخامس والعشرون", "السادس والعشرون", "السابع والعشرون", "الثامن والعشرون", "التاسع والعشرون", "الثلاثون"];

const FRAME = `assets/page-frames/${SCAN_FOR_RIWAYAH.hafs}/mono.svg`;
const BANNER = `assets/surah-headers/${SCAN_FOR_RIWAYAH.hafs}/mono.svg`;

// Like the printed page, a line is filled out by stretching letters (kashida, "القيـــوم") rather than by wide gaps.
const TATWEEL = "ـ";
const LETTER = /[ء-غف-يٮٯٱ-ۓ]/; // base letters, not vowel marks
const JOINS_NEXT = /[بتثجحخسشصضطظعغفقكلمنهيىئٮٯ]/;
const ALEF = /[اأإآٱ]/;
// Where a word can stretch: before its last letter that joins the letter in front of it. -1 if it can't.
function stretchAt(s: string) {
  let prev = -1, at = -1;
  for (let i = 0; i < s.length; i++) {
    if (!LETTER.test(s[i])) continue;
    if (prev >= 0 && JOINS_NEXT.test(s[prev]) && !(s[prev] === "ل" && ALEF.test(s[i]))) at = i; // لا is one shape: never split it
    prev = i;
  }
  return at;
}

// The printed page a word sits on: the last page whose first line starts at or before it.
export function pageOf(L: Layout, word: number) {
  let found = L.first_page;
  for (const [p, rows] of Object.entries(L.pages)) {
    const t = rows.find((r) => r.t === "text");
    if (t?.t === "text" && t.w <= word) found = Number(p);
  }
  return found;
}

// A printed mushaf drawn from text: its pages, how many lines a page holds, and how many lines a surah title takes.
interface Book { L: Layout; lines: number; bannerRows: number; name: string; lineEnd: Map<number, number> }
function book(L: Layout, m: Mushaf, lines: number, bannerRows: number, name: string): Book {
  // Where each printed line ends: the next line's first word.
  const starts = Object.values(L.pages).flat().flatMap((r) => (r.t === "text" ? [r.w] : []));
  return { L, lines, bannerRows, name, lineEnd: new Map(starts.map((w, i) => [w, starts[i + 1] ?? m.wordCount])) };
}

// The regular Madinah mushaf (15 lines): quran-text knows its lines; a surah's title and basmala fill the gaps.
function madinah(m: Mushaf): Layout {
  const surahAt = new Map(m.surahs.map((s) => [s.start, s.number]));
  const pages: Record<string, Row[]> = {};
  for (const pg of m.pages) pages[pg.number] = pg.lines.flatMap((l): Row[] => {
    const s = surahAt.get(l.start);
    const head: Row[] = !s ? [] : s === 1 || s === 9 ? [{ t: "surah", s }] : [{ t: "surah", s }, { t: "basmala" }]; // al-Fatiha's basmala is its first ayah; at-Tawbah has none
    return [...head, { t: "text", w: l.start }];
  });
  return { first_page: 1, last_page: m.pageCount, pages };
}

export function Huffaz17Mode({ m, surah, ayah, page: pageParam, onSelect }: { m: Mushaf; surah: number; ayah: number | null; page: number | null; onSelect: (s: Selection) => void }) {
  const { settings } = useStore();
  const { data: L, error } = useAsync(loadLayout, []);
  const b = useMemo(() => L && book(L, m, 17, 2, "Mushaf al-Huffaz"), [L, m]);
  const [page, setPage] = useState<number | null>(pageParam);

  useEffect(() => {
    if (pageParam) setPage(pageParam);
    else if (L) setPage(pageOf(L, m.ayah(surah, ayah ?? 1).start));
  }, [L, m, surah, ayah, pageParam]);
  const turn = useCallback((n: number) => {
    if (!L || n < L.first_page || n > L.last_page) return;
    setPage(n); setParam("page", n);
  }, [L]);

  if (error) return <p className="error">Could not load the 17-line layout: {error}</p>;
  if (!b || !page) return <p className="muted center">Loading page…</p>;
  const sheet = <Sheet m={m} b={b} page={page} onSelect={onSelect} />;
  return (
    <div className="mushaf-wrap">
      <PageNav page={page} total={b.L.last_page} onPage={turn} />
      {settings.h17Border ? (
        <div className="mushaf-page h17-sheet">
          <Ornament path={FRAME} height="var(--h17-h, min(86vh, calc(min(94vw, 620px) / 0.69)))" color="var(--gold)" label={`${b.name}, page ${page}`}>{sheet}</Ornament>
        </div>
      ) : (
        <div className="mushaf-page h17-plain" aria-label={`${b.name}, page ${page}`}>{sheet}</div>
      )}
    </div>
  );
}

// Continuous, like Quran.com's reading view: the regular mushaf's printed pages one under another, read by scrolling.
// The address keeps the page at the top of the screen, so switching layouts lands in the same place.
export function ContinuousMode({ m, surah, ayah, page, onSelect }: { m: Mushaf; surah: number; ayah: number | null; page: number | null; onSelect: (s: Selection) => void }) {
  const b = useMemo(() => book(madinah(m), m, 15, 1, "Madinah Mushaf"), [m]);
  const first = pageOf(b.L, m.ayah(surah, 1).start);
  const last = pageOf(b.L, surah < 114 ? m.ayah(surah + 1, 1).start - 1 : m.wordCount - 1);
  const wrap = useRef<HTMLDivElement>(null);
  const startAt = useRef(page ?? pageOf(b.L, m.ayah(surah, ayah ?? 1).start)); // where we arrived; later pages come from our own scrolling

  useEffect(() => {
    // After the app's own jump to the top on a new surah.
    if (startAt.current > first) requestAnimationFrame(() => wrap.current?.querySelector(`[data-page="${startAt.current}"]`)?.scrollIntoView());
    const io = new IntersectionObserver((seen) => {
      const top = seen.filter((e) => e.isIntersecting).map((e) => Number((e.target as HTMLElement).dataset.page));
      if (top.length) setParam("page", Math.min(...top));
    }, { rootMargin: "0px 0px -70% 0px" }); // the page in the top third of the screen
    wrap.current?.querySelectorAll("[data-page]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [first, last]);

  return (
    <div className="mushaf-wrap continuous" ref={wrap}>
      {Array.from({ length: last - first + 1 }, (_, i) => first + i).map((p) => (
        <div key={p} data-page={p} className="mushaf-page h17-plain" aria-label={`${b.name}, page ${p}`}><Sheet m={m} b={b} page={p} onSelect={onSelect} /></div>
      ))}
    </div>
  );
}

// One printed page: its lines between a running header and the page number.
function Sheet({ m, b, page, onSelect }: { m: Mushaf; b: Book; page: number; onSelect: (s: Selection) => void }) {
  const { L, lineEnd } = b;
  const { settings } = useStore();
  const p = usePlayer();
  const { data: chapters } = useChapters();

  // Size the Arabic so the longest line on the page just fits, share that size across the page,
  // then stretch letters on each line until it reaches both edges.
  // With the frame on, the body only appears once the artwork has loaded, so it is tracked as state, not a ref.
  const [el, setBody] = useState<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (!el) return;
    const fit = () => {
      el.querySelectorAll<HTMLElement>(".w[data-stretched]").forEach((w) => {
        if (w.textContent === w.dataset.stretched) w.textContent = w.dataset.plain!; // else React already put a new word here
        delete w.dataset.stretched;
        delete w.dataset.plain;
      });
      const rowH = el.clientHeight / (b.lines + 1.4); // the lines + header and page-number strips
      el.style.setProperty("--rowh", `${rowH}px`);
      el.style.setProperty("--colw", `${el.clientWidth}px`);
      let fs = rowH * 0.62;
      el.style.setProperty("--fs", `${fs}px`);
      let worst = 1;
      el.querySelectorAll<HTMLElement>(".h17-line").forEach((line) => {
        const need = [...line.children].reduce((s, c) => s + (c as HTMLElement).offsetWidth, 0) + fs * 0.25 * line.children.length;
        if (need) worst = Math.min(worst, line.clientWidth / need);
      });
      fs *= worst * 0.98;
      el.style.setProperty("--fs", `${fs}px`);

      const lines = el.querySelectorAll<HTMLElement>(".h17-line.justify");
      if (!lines.length) return;
      const probe = document.createElement("span");
      probe.textContent = TATWEEL.repeat(10);
      lines[0].append(probe);
      const tw = probe.offsetWidth / 10;
      probe.remove();
      if (!tw) return;
      lines.forEach((line) => {
        const cells = [...line.children] as HTMLElement[];
        let n = Math.floor((line.clientWidth - cells.reduce((s, c) => s + c.offsetWidth, 0) - fs * 0.3 * (cells.length - 1)) / tw);
        const spots = cells.map((c) => c.querySelector<HTMLElement>(".w")!).map((w) => ({ w, at: stretchAt(w.textContent ?? ""), add: 0 }))
          .filter((x) => x.at > 0).sort((a, b) => b.w.offsetWidth - a.w.offsetWidth); // longer words stretch first
        for (let i = 0; n > 0 && spots.length; i = (i + 1) % spots.length, n--) spots[i].add++;
        const stretch = ({ w, at, add }: (typeof spots)[number]) => {
          const t = (w.dataset.plain ??= w.textContent!);
          w.textContent = t.slice(0, at) + TATWEEL.repeat(add) + t.slice(at);
          w.dataset.stretched = w.textContent;
        };
        spots.filter((x) => x.add).forEach(stretch);
        // A stretched word can come out a hair wider than the probe measured; take stretches back until the line fits.
        for (const x of spots) while (x.add && line.scrollWidth > line.clientWidth) { x.add--; stretch(x); }
      });
    };
    fit();
    // The Quran font arrives after the first measure; widths change then, so measure again.
    document.fonts?.addEventListener("loadingdone", fit);
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => { ro.disconnect(); document.fonts?.removeEventListener("loadingdone", fit); };
  }, [el, page, b, m]);

  const rows = L.pages[String(page)] ?? [];
  const firstWord = rows.find((r) => r.t === "text") as { w: number } | undefined;
  const head = firstWord ? m.wordAt(firstWord.w) : null;
  const marker = `assets/ayah-markers/${settings.markerStyle.split("/")[1]}/mono.svg`;
  const basmala = m.span(0, 4).wordList.map((w) => w.render(true)).join(" ");
  const opening = page < L.first_page + 2; // al-Fatiha and the start of al-Baqarah sit in a narrow box mid-page

  return (
    <div className={`h17-body ${opening ? "opening" : ""}`} ref={setBody} dir="rtl" lang="ar"
      style={{ fontFamily: fontFamily("hafs"), "--banner-rows": b.bannerRows, "--banner-h": `min(calc(var(--rowh) * ${b.bannerRows === 2 ? 1.3 : 0.95}), calc(var(--colw) / 8.6))` } as CSSProperties}>
      <div className="h17-head">
        <span>({toArabicDigits(head?.surah.number ?? 0)}) سورة {chapters?.[(head?.surah.number ?? 1) - 1]?.name_arabic}</span>
        <span>الجزء {head?.juz ? JUZ[head.juz.number - 1] : ""}</span>
      </div>
      {rows.map((r, i) => {
        if (r.t === "surah") return (
          <div key={i} className="h17-surah">
            <Ornament path={BANNER} height="var(--banner-h)" color="var(--gold)" label={`Surah ${r.s}`}>
              <span className="h17-banner-name">سورة {chapters?.[r.s - 1]?.name_arabic}</span>
            </Ornament>
          </div>
        );
        if (r.t === "basmala") return <div key={i} className="h17-line center">{basmala}</div>;
        const end = lineEnd.get(r.w) ?? r.w + 1;
        // A surah's last line sits in the middle, like the print; every other line runs edge to edge.
        const lastOfSurah = end >= m.wordCount || m.wordAt(end).surah.number !== m.wordAt(end - 1).surah.number;
        return (
          <div key={i} className={`h17-line ${lastOfSurah ? "center" : "justify"}`}>
            {Array.from({ length: end - r.w }, (_, k) => {
              const w = m.wordAt(r.w + k);
              const ayah = w.ayah;
              const playing = ayah && p.surah === w.surah.number && p.verseKey === ayah.key;
              return (
                <span key={k} className="h17-word">
                  <span className={`w ${playing ? (p.word === w.index ? "on" : "in-ayah") : ""}`}
                    onClick={() => ayah && onSelect({ riwayah: "hafs", surah: w.surah.number, ayah: ayah.number })}>{w.render(true)}</span>
                  {ayah && w.index === ayah.length && (
                    <Ornament path={marker} height="1.15em" color={settings.markerColor} className="marker" label={`End of ayah ${ayah.number}`}>
                      <span className="slot-num">{toArabicDigits(ayah.number)}</span>
                    </Ornament>
                  )}
                </span>
              );
            })}
          </div>
        );
      })}
      <div className="h17-foot">{toArabicDigits(page)}</div>
    </div>
  );
}
