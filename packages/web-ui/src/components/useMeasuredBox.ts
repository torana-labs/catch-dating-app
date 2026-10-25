import {useEffect, useLayoutEffect, useRef, useState} from "react";

export interface MeasuredBox {
  width: number;
  height: number;
}

// Layout effects measure before the first paint in the browser; the server
// has no layout, so it keeps the initial box.
const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * The element's rendered size in whole CSS pixels, kept current as it
 * resizes. Painted artwork reads it to draw at the size it is shown, as a
 * Flutter CustomPainter does, instead of scaling a fixed drawing.
 */
export function useMeasuredBox<T extends Element>(initial: MeasuredBox) {
  const ref = useRef<T | null>(null);
  const [box, setBox] = useState(initial);

  useBrowserLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = (width: number, height: number) => {
      const next = {width: Math.round(width), height: Math.round(height)};
      if (next.width <= 0 || next.height <= 0) return;
      setBox((current) => current.width === next.width && current.height === next.height ? current : next);
    };
    const rect = element.getBoundingClientRect();
    update(rect.width, rect.height);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => update(entry.contentRect.width, entry.contentRect.height));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, box] as const;
}
