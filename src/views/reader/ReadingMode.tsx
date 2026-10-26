// Reading mode (quran-text): flowing Arabic, broken into the printed mushaf's lines and pages.
import type { Mushaf } from "@quran.ws/text";
import { useStore, type Riwayah } from "../../lib/store";
import { usePlayer } from "../../lib/audio";
import { fontFamily, toArabicDigits } from "../../lib/quran";
import { Ornament } from "../../components/Ornament";
import type { Selection } from "./AyahSheet";

export function ReadingMode({ m, surah, onSelect }: { m: Mushaf; surah: number; onSelect: (s: Selection) => void }) {
  const { settings } = useStore();
  const p = usePlayer();
  const s = m.surah(surah);
  const riwayah = m.key as Riwayah;
  const marker = `assets/ayah-markers/${settings.markerStyle.split("/")[1]}/mono.svg`;

  return (
    <div className="reading" dir="rtl" lang="ar" style={{ fontFamily: fontFamily(riwayah), fontSize: `calc(${settings.arabicSize}px * var(--ar))` }}>
      {s.pages.map((page) => (
        <section key={page.number} className="reading-page">
          {page.lines.map((line) => {
            const words = line.wordList.filter((w) => w.surah.number === surah);
            if (!words.length) return null;
            return (
              <div key={line.number} className="reading-line">
                {words.map((w, i) => {
                  const ayah = w.ayah;
                  const playing = ayah && p.surah === surah && p.verseKey === ayah.key && riwayah === "hafs";
                  const ends = ayah && w.index === ayah.length;
                  return (
                    <span key={i}>
                      <span className={`w ${playing ? (p.word === w.index ? "on" : "in-ayah") : ""} ${ayah ? "" : "basmalah-word"}`}
                        onClick={() => ayah && onSelect({ riwayah, surah, ayah: ayah.number })}>{w.render(true)}</span>
                      {ends && (
                        <Ornament path={marker} height="1.1em" color={settings.markerColor} className="marker" label={`End of ayah ${ayah.number}`}>
                          <span className="slot-num">{toArabicDigits(ayah.number)}</span>
                        </Ornament>
                      )}{" "}
                    </span>
                  );
                })}
              </div>
            );
          })}
          <div className="page-num" dir="ltr">— page {page.number} —</div>
        </section>
      ))}
      <p className="hint" dir="ltr">Line breaks follow the printed {m.nameEn} mushaf (reconstructed by quran-text). Tap any word to open its ayah.</p>
    </div>
  );
}
