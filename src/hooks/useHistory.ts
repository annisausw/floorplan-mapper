/**
 * @file History Management Hook
 * @description Custom hook for undo/redo functionality
 */

import { useCallback, useRef, useState } from "react";
import { Vertex, Edge } from "../types";
import { HISTORY_MAX_SIZE } from "../constants";
import { safeJsonParse, safeJsonStringify } from "../utils";

interface HistorySnapshot {
  vertices: Vertex[];
  edges: Edge[];
}

/**
 * Hook for managing undo/redo history
 */
export function useHistory() {
  const [history, setHistory] = useState<string[]>([]);
  const historyRef = useRef<string[]>([]);

  // Keep refs in sync with state
  historyRef.current = history;

  const captureSnapshot = useCallback((vertices: Vertex[], edges: Edge[]) => {
    const snapshot: HistorySnapshot = { vertices, edges };
    const json = safeJsonStringify(snapshot);

    setHistory((prev) => {
      const updated = [...prev, json];
      return updated.length > HISTORY_MAX_SIZE
        ? updated.slice(-HISTORY_MAX_SIZE)
        : updated;
    });
  }, []);

  const canUndo = useCallback(() => {
    return historyRef.current.length > 0;
  }, []);

  const undo = useCallback((): HistorySnapshot | null => {
    if (historyRef.current.length === 0) return null;

    const lastSnapshot = historyRef.current[historyRef.current.length - 1];
    const snapshot = safeJsonParse<HistorySnapshot>(lastSnapshot, null);

    setHistory((prev) => prev.slice(0, -1));

    return snapshot;
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    history,
    captureSnapshot,
    undo,
    canUndo,
    clearHistory,
    historyRef,
  };
}
