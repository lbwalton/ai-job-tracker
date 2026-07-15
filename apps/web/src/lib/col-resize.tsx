"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Resizable table columns for a fixed-layout table.
 * Widths are px per column (0 = flexible / take remaining space) and persist
 * per-table in localStorage. Pair with a <colgroup> and a <Resizer> in each th.
 */
export function useColWidths(storageKey: string, defaults: number[]) {
  const [widths, setWidths] = useState<number[]>(defaults);
  const drag = useRef<{ i: number; startX: number; startW: number } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const arr = JSON.parse(saved) as number[];
        if (Array.isArray(arr) && arr.length === defaults.length) setWidths(arr);
      }
    } catch {
      /* corrupted saved widths — fall back to defaults */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function persist(next: number[]) {
    setWidths(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* private mode etc. — resizing still works for the session */
    }
  }

  function startResize(i: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.target as HTMLElement).closest("th");
    if (!th) return;
    drag.current = { i, startX: e.clientX, startW: th.offsetWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const move = (ev: MouseEvent) => {
      if (!drag.current) return;
      const w = Math.max(56, drag.current.startW + ev.clientX - drag.current.startX);
      setWidths((cur) => cur.map((c, idx) => (idx === drag.current!.i ? w : c)));
    };
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setWidths((cur) => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(cur));
        } catch {}
        return cur;
      });
      drag.current = null;
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  }

  function resetCol(i: number) {
    persist(widths.map((w, idx) => (idx === i ? defaults[i] : w)));
  }

  return { widths, startResize, resetCol };
}

export function Cols({ widths }: { widths: number[] }) {
  return (
    <colgroup>
      {widths.map((w, i) => (
        <col key={i} style={w > 0 ? { width: w } : undefined} />
      ))}
    </colgroup>
  );
}

export function Resizer({
  i,
  startResize,
  resetCol,
}: {
  i: number;
  startResize: (i: number, e: React.MouseEvent) => void;
  resetCol: (i: number) => void;
}) {
  return (
    <span
      className="col-resize"
      title="Drag to resize · double-click to reset"
      onMouseDown={(e) => startResize(i, e)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        resetCol(i);
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
