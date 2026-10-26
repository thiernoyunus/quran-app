import { useEffect, useState } from "react";
import { useRoute, go } from "./lib/router";
import { useStore } from "./lib/store";
import { Icon } from "./components/Icon";
import { NavDrawer } from "./components/NavDrawer";
import { SettingsDrawer } from "./components/SettingsDrawer";
import { PlayerBar } from "./components/PlayerBar";
import { Home } from "./views/Home";
import { Reader } from "./views/Reader";
import { SearchView } from "./views/SearchView";
import { QiraatView } from "./views/QiraatView";
import { TajweedView } from "./views/TajweedView";
import { OrnamentsView } from "./views/OrnamentsView";
import { AboutView } from "./views/AboutView";
import { TafsirModal } from "./components/TafsirModal";

export default function App() {
  const { parts } = useRoute();
  const { settings } = useStore();
  const [nav, setNav] = useState(false);
  const [prefs, setPrefs] = useState(false);

  useEffect(() => { document.documentElement.dataset.theme = settings.theme; }, [settings.theme]);
  useEffect(() => { setNav(false); scrollTo(0, 0); }, [parts.join("/")]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setNav(false); setPrefs(false); } };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  const view = parts[0] ?? "";
  return (
    <div className="app">
      {view !== "surah" && <header className="topbar">
        <button className="icon-btn" onClick={() => setNav(true)} aria-label="Open navigation"><Icon name="menu" /></button>
        <button className="brand" onClick={() => go("/")}>
          <span className="brand-mark" aria-hidden="true">۞</span> QuranTech <span className="brand-sub">Reader</span>
        </button>
        <nav className="topnav" aria-label="Sections">
          {[["", "Read"], ["qiraat", "Riwayat"], ["tajweed", "Tajweed"], ["ornaments", "Ornaments"], ["about", "About"]].map(([p, label]) => (
            <button key={p} className={view === p || (p === "" && view === "surah") ? "active" : ""} onClick={() => go(`/${p}`)}>{label}</button>
          ))}
        </nav>
        <div className="topbar-actions">
          <button className="icon-btn" onClick={() => go("/search")} aria-label="Search"><Icon name="search" /></button>
          <button className="icon-btn" onClick={() => setPrefs(true)} aria-label="Settings"><Icon name="settings" /></button>
        </div>
      </header>}

      <NavDrawer open={nav} onClose={() => setNav(false)} />
      <SettingsDrawer open={prefs} onClose={() => setPrefs(false)} />

      <main className="main">
        {view === "" && <Home />}
        {view === "surah" && <Reader onMenu={() => setNav(true)} onSettings={() => setPrefs(true)} />}
        {view === "search" && <SearchView />}
        {view === "qiraat" && <QiraatView />}
        {view === "tajweed" && <TajweedView />}
        {view === "ornaments" && <OrnamentsView />}
        {view === "about" && <AboutView />}
      </main>

      <TafsirModal />
      <PlayerBar />
    </div>
  );
}
