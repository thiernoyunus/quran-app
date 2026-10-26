// Tiny address-bar router: "#/surah/2?ayah=255&mode=mushaf". Back/forward buttons just work.
import { useSyncExternalStore } from "react";

const subscribe = (l: () => void) => (addEventListener("hashchange", l), () => removeEventListener("hashchange", l));
const snapshot = () => location.hash.slice(1) || "/";

export function useRoute() {
  const raw = useSyncExternalStore(subscribe, snapshot);
  const [path, query = ""] = raw.split("?");
  return { parts: path.split("/").filter(Boolean), params: new URLSearchParams(query) };
}

export function go(path: string, params?: Record<string, string | number | undefined | null>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) if (v != null && v !== "") q.set(k, String(v));
  const s = q.toString();
  location.hash = path + (s ? `?${s}` : "");
}

// Change one query value without adding a history entry (e.g. switching reading mode).
export function setParam(key: string, value: string | number | null) {
  const [path, query = ""] = snapshot().split("?");
  const q = new URLSearchParams(query);
  if (value == null) q.delete(key); else q.set(key, String(value));
  history.replaceState(null, "", `#${path}${q.size ? `?${q}` : ""}`);
  dispatchEvent(new HashChangeEvent("hashchange"));
}
