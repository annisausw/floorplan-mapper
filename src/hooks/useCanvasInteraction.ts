/**
 * @file Canvas Interaction Hook
 * @description Custom hook for handling canvas mouse/keyboard interactions
 */

import { useRef, useCallback, useEffect } from "react";
import {
  Point,
  Vertex,
  Edge,
  Transform,
  PreviewLine,
  MarqueeRect,
} from "../types";
import { distance } from "../utils";

interface CanvasInteractionState {
  isDrawing: boolean;
  isDragging: boolean;
  isPanning: boolean;
  isSelecting: boolean;
  snapStart: Vertex | null;
}

interface InteractionCallbacks {
  onMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void;
  onWheel: (e: React.WheelEvent) => void;
}

interface CanvasRefs {
  drawing: React.MutableRefObject<boolean>;
  dragging: React.MutableRefObject<boolean>;
  panning: React.MutableRefObject<boolean>;
  selecting: React.MutableRefObject<boolean>;
  snapStart: React.MutableRefObject<Vertex | null>;
  interactStart: React.MutableRefObject<
    Point | { x: number; y: number; tx?: number; ty?: number } | null
  >;
}

/**
 * Hook for managing canvas interactions and state
 */
export function useCanvasInteraction(svgRef: React.RefObject<SVGSVGElement>) {
  const isDrawingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const isSelectingRef = useRef(false);
  const interactStartRef = useRef<{
    x: number;
    y: number;
    tx?: number;
    ty?: number;
  } | null>(null);
  const snapStartRef = useRef<Vertex | null>(null);

  const getCoords = useCallback(
    (e: MouseEvent): Point => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const rect = svgRef.current.getBoundingClientRect();
      // Note: scale should come from context, hardcoded as 1 for now
      const s = 1;
      return { x: (e.clientX - rect.left) / s, y: (e.clientY - rect.top) / s };
    },
    [svgRef],
  );

  return {
    refs: {
      drawing: isDrawingRef,
      dragging: isDraggingRef,
      panning: isPanningRef,
      selecting: isSelectingRef,
      snapStart: snapStartRef,
      interactStart: interactStartRef,
    },
    getCoords,
  };
}
