/**
 * @file Transform Management Hook
 * @description Custom hook for managing canvas transform (pan/zoom)
 */

import { useCallback, useState } from "react";
import { Transform } from "../types";
import { ZOOM } from "../constants";
import { clamp } from "../utils";

/**
 * Hook for managing canvas transformation (pan and zoom)
 */
export function useTransform(initialScale: number = 1) {
  const [transform, setTransform] = useState<Transform>({
    scale: initialScale,
    tx: 0,
    ty: 0,
  });

  const zoom = useCallback(
    (delta: number, mouseX: number, mouseY: number, viewportRect: DOMRect) => {
      setTransform((prev) => {
        // Determine zoom direction
        const scaleFactor = delta > 0 ? 0.9 : 1.1;
        const newScale = clamp(prev.scale * scaleFactor, ZOOM.MIN, ZOOM.MAX);

        // Calculate new transform to zoom toward mouse position
        const mx = mouseX - viewportRect.left;
        const my = mouseY - viewportRect.top;

        return {
          scale: newScale,
          tx: mx - (mx - prev.tx) * (newScale / prev.scale),
          ty: my - (my - prev.ty) * (newScale / prev.scale),
        };
      });
    },
    [],
  );

  const pan = useCallback((deltaX: number, deltaY: number) => {
    setTransform((prev) => ({
      ...prev,
      tx: prev.tx + deltaX,
      ty: prev.ty + deltaY,
    }));
  }, []);

  const startPan = useCallback(
    (startX: number, startY: number, currentX: number, currentY: number) => {
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;
      pan(deltaX, deltaY);
    },
    [pan],
  );

  const reset = useCallback(() => {
    setTransform({ scale: 1, tx: 0, ty: 0 });
  }, []);

  return {
    transform,
    setTransform,
    zoom,
    pan,
    startPan,
    reset,
  };
}
