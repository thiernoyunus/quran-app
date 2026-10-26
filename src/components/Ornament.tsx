// Draws one quran-assets ornament inline (so CSS can colour it) and writes text into its slot.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { loadSvg } from "../lib/assets";

export function Ornament({ path, color, height, children, className, label }: {
  path: string; color?: string; height: string; children?: ReactNode; className?: string; label?: string;
}) {
  const host = useRef<HTMLSpanElement>(null);
  const [slot, setSlot] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [aspect, setAspect] = useState(1);

  useEffect(() => {
    let live = true;
    loadSvg(path).then((text) => {
      if (!live || !host.current) return;
      host.current.innerHTML = text;
      const svg = host.current.querySelector("svg")!;
      svg.querySelector("metadata")?.remove();
      svg.setAttribute("aria-hidden", "true");
      const [, , W, H] = svg.getAttribute("viewBox")!.split(/[\s,]+/).map(Number);
      const [x, y, w, h] = (svg.getAttribute("data-slot") ?? "0 0 0 0").split(/\s+/).map(Number);
      setAspect(W / H);
      setSlot(w ? { x: (x / W) * 100, y: (y / H) * 100, w: (w / W) * 100, h: (h / H) * 100 } : null);
    }).catch(() => {});
    return () => { live = false; };
  }, [path]);

  return (
    <span className={`ornament ${className ?? ""}`} style={{ height, width: `calc(${height} * ${aspect})`, color }} role={label ? "img" : undefined} aria-label={label}>
      <span ref={host} className="ornament-art" />
      {slot && children != null && (
        <span className="ornament-slot" style={{ left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.w}%`, height: `${slot.h}%` }}>{children}</span>
      )}
    </span>
  );
}
