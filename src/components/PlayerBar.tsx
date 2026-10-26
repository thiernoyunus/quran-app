// Bottom audio bar: shows the reciter (always credited), the ayah, and the controls.
import { player, usePlayer } from "../lib/audio";
import { useStore, store } from "../lib/store";
import { go } from "../lib/router";
import { useToast } from "../lib/hooks";
import { Icon } from "./Icon";

export function PlayerBar() {
  const p = usePlayer();
  const { settings } = useStore();
  const toast = useToast();
  return (
    <>
      {toast && <div className="toast" role="status">{toast}</div>}
      {p.verseKey && (
        <div className="player" role="region" aria-label="Audio player">
          <button className="player-info" onClick={() => go(`/surah/${p.surah}`, { ayah: p.verseKey!.split(":")[1] })}>
            <b>{p.verseKey}</b>
            <span className="muted small">{p.reciter}{settings.repeat > 1 ? ` · ${p.played + 1}/${settings.repeat}` : ""}</span>
          </button>
          <div className="player-controls">
            <button className="icon-btn" onClick={player.prev} aria-label="Previous ayah"><Icon name="prev" /></button>
            <button className="icon-btn big" onClick={player.toggle} aria-label={p.playing ? "Pause" : "Play"}>
              <Icon name={p.playing ? "pause" : "play"} filled size={22} />
            </button>
            <button className="icon-btn" onClick={player.next} aria-label="Next ayah"><Icon name="next" /></button>
          </div>
          <div className="player-extra">
            <button className="pill" onClick={() => store.setSettings({ repeat: settings.repeat === 1 ? 3 : settings.repeat === 3 ? 5 : 1 })} title="Repeat each ayah">
              <Icon name="repeat" size={14} /> {settings.repeat}×
            </button>
            <button className="pill" onClick={() => player.setSpeed(p.speed >= 1.5 ? 0.75 : p.speed + 0.25)} title="Playback speed">{p.speed}×</button>
            <button className="icon-btn" onClick={player.stop} aria-label="Close player"><Icon name="close" /></button>
          </div>
          {p.error && <div className="player-error">{p.error}</div>}
        </div>
      )}
    </>
  );
}
