// Mushaf 17 (quran-text + quran-assets): the 1960 Egyptian Mushaf al-Huffaz, 17 lines a page.
// The line breaks come from huffaz17-layout.json (matched from a scan); every word is quran-text's.
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
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
const loadLayout = () => (layout ??= fetch(`${import.meta.env.BASE_URL}data/huffaz17-layout.json`).then((r) => r.json() as Promise<Layout>));

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

export function Huffaz17Mode({ m, surah, page: pageParam, onSelect }: { m: Mushaf; surah: number; page: number | null; onSelect: (s: Selection) => void }) {
  const { settings } = useStore();
  const p = usePlayer();
  const { data: chapters } = useChapters();
  const { data: L, error } = useAsync(loadLayout, []);
  const [page, setPage] = useState<number | null>(pageParam);
  const [framed, setFramed] = useState(() => { try { return localStorage.getItem("h17-framed") !== "0"; } catch { return true; } });
  const toggleFrame = () => setFramed((f) => { try { localStorage.setItem("h17-framed", f ? "0" : "1"); } catch { /* private window */ } return !f; });

  // Where each printed line ends: the next line's first word.
  const lineEnd = useMemo(() => {
    const ends = new Map<number, number>();
    if (!L) return ends;
    const starts = Object.values(L.pages).flat().flatMap((r) => (r.t === "text" ? [r.w] : []));
    starts.forEach((w, i) => ends.set(w, starts[i + 1] ?? m.wordCount));
    return ends;
  }, [L, m]);

  useEffect(() => {
    if (pageParam) { setPage(pageParam); return; }
    if (!L) return;
    const found = Object.entries(L.pages).find(([, rows]) => rows.some((r) => r.t === "surah" && r.s === surah));
    setPage(found ? Number(found[0]) : L.first_page);
  }, [L, surah, pageParam]);
  const turn = useCallback((n: number) => {
    if (!L || n < L.first_page || n > L.last_page) return;
    setPage(n); setParam("page", n);
  }, [L]);

  // Size the Arabic so the longest line on the page just fits, share that size across all 17 lines,
  // then stretch letters on each line until it reaches both edges.
  // With the frame on, the body only appears once the artwork has loaded, so it is tracked as state, not a ref.
  const [el, setBody] = useState<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (!el) return;
    const fit = () => {
      el.querySelectorAll<HTMLElement>(".w[data-stretched]").forEach((w) => {
        if (w.textContent === w.dataset.stretched) w.textContent = w.dataset.plain!; // else React already put a new word here
        delete w.dataset.stretched;
      });
      const rowH = el.clientHeight / 18.4; // 17 lines + header and page-number strips
      el.style.setProperty("--rowh", `${rowH}px`);
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
        spots.forEach(({ w, at, add }) => {
          if (!add) return;
          const t = w.textContent!;
          w.dataset.plain = t;
          w.textContent = t.slice(0, at) + TATWEEL.repeat(add) + t.slice(at);
          w.dataset.stretched = w.textContent;
        });
      });
    };
    fit();
    // The Quran font arrives after the first measure; widths change then, so measure again.
    document.fonts?.addEventListener("loadingdone", fit);
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => { ro.disconnect(); document.fonts?.removeEventListener("loadingdone", fit); };
  }, [el, page, L, m, framed]);

  if (error) return <p className="error">Could not load the 17-line layout: {error}</p>;
  if (!L || !page) return <p className="muted center">Loading page…</p>;

  const rows = L.pages[String(page)] ?? [];
  const firstWord = rows.find((r) => r.t === "text") as { w: number } | undefined;
  const head = firstWord ? m.wordAt(firstWord.w) : null;
  const marker = `assets/ayah-markers/${settings.markerStyle.split("/")[1]}/mono.svg`;
  const basmala = m.span(0, 4).wordList.map((w) => w.render(true)).join(" ");
  const opening = page < L.first_page + 2; // al-Fatiha and the start of al-Baqarah sit in a narrow box mid-page

  const sheet = (
    <div className={`h17-body ${opening ? "opening" : ""}`} ref={setBody} dir="rtl" lang="ar" style={{ fontFamily: fontFamily("hafs") }}>
      <div className="h17-head">
        <span>({toArabicDigits(head?.surah.number ?? 0)}) سورة {chapters?.[(head?.surah.number ?? 1) - 1]?.name_arabic}</span>
        <span>الجزء {head?.juz ? JUZ[head.juz.number - 1] : ""}</span>
      </div>
      {rows.map((r, i) => {
        if (r.t === "surah") return (
          <div key={i} className="h17-surah">
            <Ornament path={BANNER} height="calc(var(--rowh) * 1.3)" color="var(--gold)" label={`Surah ${r.s}`}>
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

  return (
    <div className="mushaf-wrap">
      <PageNav page={page} total={L.last_page} onPage={turn}>
        <button className="pill" onClick={toggleFrame} aria-pressed={framed}>{framed ? "Border on" : "Border off"}</button>
      </PageNav>
      {framed ? (
        <div className="mushaf-page h17-sheet">
          <Ornament path={FRAME} height="min(86vh, calc(min(94vw, 620px) / 0.69))" color="var(--gold)" label={`Mushaf al-Huffaz, page ${page}`}>{sheet}</Ornament>
        </div>
      ) : (
        <div className="mushaf-page h17-plain" aria-label={`Mushaf al-Huffaz, page ${page}`}>{sheet}</div>
      )}
      <p className="hint center">Lines and pages follow the 1960 Egyptian Mushaf al-Huffaz (17 lines). Words from quran-text; frame and banners from quran-assets (scanned ornaments, personal use).</p>
    </div>
  );
}
