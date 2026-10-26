// Ornaments (quran-assets): every banner, roundel and frame, recolourable, with its licence shown.
import { useState } from "react";
import { useAsync } from "../lib/hooks";
import { loadCatalog, type Asset } from "../lib/assets";
import { store, useStore } from "../lib/store";
import { Ornament } from "../components/Ornament";

const TYPES = [["surah-headers", "Surah banners"], ["ayah-markers", "Ayah markers"], ["page-frames", "Page frames"]] as const;
const STATUS: Record<string, string> = {
  confirmed: "Open licence (OFL): safe to use anywhere",
  provisional: "Non-commercial only, permission still being settled",
  pending: "Licence unknown: not for use",
};

export function OrnamentsView() {
  const { settings } = useStore();
  const { data: cat, error } = useAsync(loadCatalog, []);
  const [type, setType] = useState<Asset["type"]>("surah-headers");
  const [color, setColor] = useState("#c9a24a");
  const [variant, setVariant] = useState<"color" | "mono">("mono");
  const list = cat?.filter((a) => a.type === type) ?? [];

  return (
    <div className="page">
      <h1>Ornaments</h1>
      <p className="lead">Decorations from printed mushafs, redrawn as sharp vector art by quran-assets. They hold no Quranic text: the surah name or ayah number is placed in a marked slot. Every piece states where it came from and what you may do with it.</p>
      {error && <p className="error">Could not load the catalogue: {error}</p>}
      <div className="row-inline wrap">
        <div className="seg">{TYPES.map(([t, label]) => <button key={t} className={type === t ? "on" : ""} onClick={() => setType(t)}>{label}</button>)}</div>
        <div className="seg">{(["mono", "color"] as const).map((v) => <button key={v} className={variant === v ? "on" : ""} onClick={() => setVariant(v)}>{v === "mono" ? "Tinted" : "Original colours"}</button>)}</div>
        {variant === "mono" && <label className="row-inline small">Tint <input type="color" className="color" value={color} onChange={(e) => setColor(e.target.value)} /></label>}
        <span className="muted small">{list.length} pieces</span>
      </div>

      <div className={`ornament-grid ${type}`}>
        {list.map((a) => (
          <figure key={a.id} className={`card ornament-card status-${a.license.status}`}>
            <div className="ornament-stage">
              <Ornament path={a.variants[variant]} color={variant === "mono" ? color : undefined}
                height={type === "surah-headers" ? "clamp(36px, 11vw, 64px)" : type === "page-frames" ? "220px" : "64px"} label={a.id}>
                {type === "surah-headers" && <span className="banner-name" dir="rtl">سورة الفاتحة</span>}
                {type === "ayah-markers" && <span className="slot-num">٢٥٥</span>}
                {type === "page-frames" && <span className="frame-text muted small">text area</span>}
              </Ornament>
            </div>
            <figcaption>
              <b>{a.style}</b>
              <span className="muted small">{a.lineage === "font" ? `From the font ${a.sources[0]?.family ?? ""}` : `Traced from a printed mushaf (${a.style.replace("mushaf-", "")})`}</span>
              <span className={`badge lic-${a.license.status}`} title={a.license.note}>{a.license.id} · {STATUS[a.license.status]}</span>
              {a.type === "ayah-markers" && a.license.status === "confirmed" && (
                <button className={`pill ${settings.markerStyle === a.id ? "gold" : ""}`} onClick={() => store.setSettings({ markerStyle: a.id })}>{settings.markerStyle === a.id ? "In use in the reader" : "Use in the reader"}</button>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="hint">The traced mushaf ornaments are released for non-commercial use while permission from their publishers is sought. This app is a personal study tool; check each licence before using any of them in a product.</p>
    </div>
  );
}
