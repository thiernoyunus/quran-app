// Right-hand settings panel, laid out like Quran.com's: Arabic, Translation, Audio, Look.
import { useState } from "react";
import { store, useStore, type Riwayah, type Theme } from "../lib/store";
import { RIWAYAT, fontFamily } from "../lib/quran";
import { useAsync, useMushaf } from "../lib/hooks";
import { loadReciters, loadTranslations } from "../lib/api";
import { loadCatalog, isShippable } from "../lib/assets";
import { TOPICS } from "../lib/tajweed";
import { Icon } from "./Icon";
import { Ornament } from "./Ornament";

type Tab = "arabic" | "translation" | "audio" | "look";

export function SettingsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("arabic");
  const { settings: s } = useStore();
  return (
    <>
      <div className={`scrim ${open ? "show" : ""}`} onClick={onClose} />
      <aside className={`drawer right ${open ? "open" : ""}`} aria-hidden={!open} aria-label="Settings">
        <div className="drawer-head">
          <div className="seg">
            {(["arabic", "translation", "audio", "look"] as Tab[]).map((t) => (
              <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>
            ))}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close settings"><Icon name="close" /></button>
        </div>
        <div className="drawer-body">
          {open && tab === "arabic" && <ArabicTab />}
          {open && tab === "translation" && <TranslationTab />}
          {open && tab === "audio" && <AudioTab />}
          {open && tab === "look" && <LookTab />}
        </div>
        <div className="drawer-foot">
          <span className="muted small">Saved in this browser</span>
          <button className="btn primary" onClick={onClose}>Done</button>
        </div>
      </aside>
    </>
  );

}

function ArabicTab() {
  const { settings: s } = useStore();
  const { data: m } = useMushaf(s.riwayah);
  return (
    <>
      <div className="preview" dir="rtl" style={{ fontFamily: fontFamily(s.riwayah), fontSize: s.arabicSize }}>
        {m ? m.ayah(1, 1).render({ ayahMarks: true }) : "…"}
      </div>
      <label className="label">Riwayah (which transmission of the recitation)</label>
      <select className="field" value={s.riwayah} onChange={(e) => store.setSettings({ riwayah: e.target.value as Riwayah })}>
        {RIWAYAT.map((r) => <option key={r.id} value={r.id}>{r.en} — {r.ar}</option>)}
      </select>
      <p className="hint">Text from quran-text. Hafs is built in; the other six download once (about 2 MB each). Audio is only offered for Hafs, because the reciters available here recite Hafs.</p>
      <Stepper label="Arabic size" value={s.arabicSize} min={20} max={60} step={2} onChange={(v) => store.setSettings({ arabicSize: v })} />
      <Toggle label="Tajweed colours" hint="Hafs only. Colours come from quran-tajweed's rule data; the text itself is untouched." on={s.tajweed} set={(v) => store.setSettings({ tajweed: v })} />
      {s.tajweed && (
        <div className="chips">
          {TOPICS.map((t) => {
            const on = !s.tajweedTopics.length || s.tajweedTopics.includes(t.id);
            return (
              <button key={t.id} className={`chip ${on ? "on" : ""}`} style={{ borderColor: t.color }}
                onClick={() => {
                  const all = s.tajweedTopics.length ? s.tajweedTopics : TOPICS.map((x) => x.id);
                  const next = on ? all.filter((x) => x !== t.id) : [...all, t.id];
                  store.setSettings({ tajweedTopics: next.length === TOPICS.length ? [] : next });
                }}>
                <i style={{ background: t.color }} /> {t.en}
              </button>
            );
          })}
        </div>
      )}
      <Toggle label="Word-by-word meanings" hint="Show each word's English meaning under it (Quran.com data)." on={s.wordByWord} set={(v) => store.setSettings({ wordByWord: v })} />
    </>
  );
}

function TranslationTab() {
  const { settings: s } = useStore();
  const { data: list } = useAsync(() => loadTranslations("all"), []);
  const [q, setQ] = useState("");
  return (
    <>
      <Toggle label="Show translation" on={s.showTranslation} set={(v) => store.setSettings({ showTranslation: v })} />
      <Stepper label="Translation size" value={s.translationSize} min={13} max={28} step={1} onChange={(v) => store.setSettings({ translationSize: v })} />
      <label className="label">Translations of the meanings (pick one or more)</label>
      <input className="field" placeholder="Filter by language or translator" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="checklist">
        {list?.filter((t) => !q || `${t.language_name} ${t.name} ${t.author_name}`.toLowerCase().includes(q.toLowerCase()))
          .sort((a, b) => a.language_name.localeCompare(b.language_name))
          .map((t) => (
            <label key={t.id} className="check">
              <input type="checkbox" checked={s.translations.includes(t.id)}
                onChange={(e) => store.setSettings({ translations: e.target.checked ? [...s.translations, t.id] : s.translations.filter((x) => x !== t.id) })} />
              <span><b>{t.language_name}</b> · {t.name}</span>
            </label>
          ))}
      </div>
    </>
  );
}

function AudioTab() {
  const { settings: s } = useStore();
  const { data: reciters } = useAsync(() => loadReciters("all"), []);
  return (
    <>
      <label className="label">Reciter (Hafs)</label>
      <div className="checklist">
        {reciters?.map((r) => (
          <label key={r.id} className="check">
            <input type="radio" name="reciter" checked={s.reciter === r.id} onChange={() => store.setSettings({ reciter: r.id })} />
            <span>{r.reciter_name}{r.style ? ` · ${r.style}` : ""}</span>
          </label>
        ))}
      </div>
      <Stepper label="Play each ayah" value={s.repeat} min={1} max={10} step={1} suffix="×" onChange={(v) => store.setSettings({ repeat: v })} />
      <Toggle label="Continue to the next ayah" on={s.autoAdvance} set={(v) => store.setSettings({ autoAdvance: v })} />
    </>
  );
}

function LookTab() {
  const { settings: s } = useStore();
  const { data: cat } = useAsync(loadCatalog, []);
  return (
    <>
      <label className="label">Theme</label>
      <div className="seg wide">
        {(["dark", "light", "sepia"] as Theme[]).map((t) => (
          <button key={t} className={s.theme === t ? "on" : ""} onClick={() => store.setSettings({ theme: t })}>{t[0].toUpperCase() + t.slice(1)}</button>
        ))}
      </div>
      <label className="label">Ayah number marker</label>
      <p className="hint">From quran-assets. Only markers with a confirmed open licence (OFL) are listed here.</p>
      <div className="marker-grid">
        {cat?.filter((a) => a.type === "ayah-markers" && isShippable(a)).map((a) => (
          <button key={a.id} className={`marker-pick ${s.markerStyle === a.id ? "on" : ""}`} onClick={() => store.setSettings({ markerStyle: a.id })} title={a.style}>
            <Ornament path={a.variants.mono} height="40px" color={s.markerColor}><span className="slot-num">٢٥٥</span></Ornament>
          </button>
        ))}
      </div>
      <label className="label">Marker colour</label>
      <input type="color" className="color" value={s.markerColor} onChange={(e) => store.setSettings({ markerColor: e.target.value })} />
    </>
  );
}

export function Toggle({ label, hint, on, set }: { label: string; hint?: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <div className="toggle-row">
      <div><div>{label}</div>{hint && <div className="hint">{hint}</div>}</div>
      <button role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? "on" : ""}`} onClick={() => set(!on)}><span /></button>
    </div>
  );
}

export function Stepper({ label, value, min, max, step, suffix = "", onChange }: { label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (v: number) => void }) {
  return (
    <div className="toggle-row">
      <div>{label}</div>
      <div className="stepper">
        <button onClick={() => onChange(Math.max(min, value - step))} aria-label={`Smaller ${label}`}>−</button>
        <span>{value}{suffix}</span>
        <button onClick={() => onChange(Math.min(max, value + step))} aria-label={`Larger ${label}`}>+</button>
      </div>
    </div>
  );
}
