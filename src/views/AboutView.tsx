// Where everything comes from. Credits are part of the adab of handling Quran data.
const ROWS: [string, string, string, string][] = [
  ["Arabic text, 7 riwayat, fonts", "quran-text 0.1.0 (Quran.ws)", "CC BY 4.0 + KFGQPC terms for the text", "https://quran.ws/blocks/quran-text"],
  ["Printed mushaf pages, ayah shapes", "quran-svg v1.1.1", "Shapes CC BY 4.0; page art © KFGQPC", "https://quran.ws/blocks/quran-svg"],
  ["Tappable words and marks", "quran-svg-elements v1.1.2 (beta)", "CC BY 4.0; page art © KFGQPC", "https://quran.ws/blocks/quran-svg-elements"],
  ["Canvas page drawing, memorize", "quran-engine 0.7.0 + page data v0.5.0 (beta)", "Code MIT; page data KFGQPC terms", "https://quran.ws/blocks/quran-engine"],
  ["Tajweed colouring and rule book", "quran-tajweed (rules + annotations 0.1.0)", "CC BY 4.0", "https://quran.ws/blocks/quran-tajweed"],
  ["Ayah numbering across counts", "qiraat-ayah-map 0.1.0", "CC BY 4.0", "https://quran.ws/blocks/qiraat-ayah-map"],
  ["Banners, markers, frames", "quran-assets (pinned commit)", "Per asset: OFL, or CC BY-NC-SA (provisional)", "https://quran.ws/blocks/quran-assets"],
  ["Translations, word meanings, audio, search", "Quran.com API v4", "Each translation and recitation keeps its own rights", "https://quran.com"],
  ["Tafsir", "spa5k/tafsir_api (pinned commit)", "Each tafsir keeps its own rights", "https://github.com/spa5k/tafsir_api"],
];

export function AboutView() {
  return (
    <div className="page narrow">
      <h1>About this app</h1>
      <p className="lead">A Quran reader built to show every part of the QuranTech toolkit working together, laid out like Quran.com. Nothing here changes the Quranic text: highlights, colours and ornaments are layers drawn on top of verified text.</p>
      <ul className="principles">
        <li>Every ayah reference carries its riwayah, because 2:255 in Hafs is 2:253–254 in Warsh.</li>
        <li>Translations are labelled “translation of the meanings”, and always sit next to the Arabic.</li>
        <li>Audio never plays until you press play, the reciter is always named, and Hafs recitations are never played over another riwayah's text.</li>
        <li>Tafsir is shown as published by its author, never AI-written.</li>
        <li>Every data source is pinned to a fixed version, so the text can't change silently.</li>
      </ul>
      <div className="table-scroll"><table className="table">
        <thead><tr><th>What</th><th>Source</th><th>Licence</th></tr></thead>
        <tbody>{ROWS.map(([what, src, lic, url]) => <tr key={what}><td>{what}</td><td><a href={url} target="_blank" rel="noreferrer">{src}</a></td><td className="small muted">{lic}</td></tr>)}</tbody>
      </table></div>
      <p className="hint">Your settings, bookmarks and reading position are stored only in this browser.</p>
    </div>
  );
}
