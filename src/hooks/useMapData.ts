/**
 * @file Use Map Data Hook
 * @description Custom hook for managing map data state and operations
 */

import { useState, useCallback } from "react";
import { Vertex, Edge, MapData } from "../types";
import { apiService } from "../services/APIService";
import { mapDataService } from "../services/MapDataService";

interface UseMapDataOptions {
  projectId: string;
}

interface UseMapDataReturn {
  // State
  vertices: Vertex[];
  edges: Edge[];
  canvasW: number;
  canvasH: number;
  svgUrl: string | null;
  isLoading: boolean;
  isSaving: boolean;

  // Data Loading
  loadMapData: () => Promise<void>;

  // Data Mutations
  updateVertices: (vertices: Vertex[]) => void;
  updateEdges: (edges: Edge[]) => void;
  updateCanvasDimensions: (w: number, h: number) => void;
  setSvgUrl: (url: string | null) => void;

  // Sync Operations
  syncToServer: () => Promise<void>;

  // Import/Export Operations
  importVerticesFromJson: (data: any[]) => void;
}

/**
 * Hook for managing map data state and operations
 * Handles loading, updating, and syncing map data
 */
export function useMapData({ projectId }: UseMapDataOptions): UseMapDataReturn {
  const [vertices, setVertices] = useState<Vertex[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [canvasW, setCanvasW] = useState(1500);
  const [canvasH, setCanvasH] = useState(1000);
  const [svgUrl, setSvgUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Loads map data from the server
   */
  const loadMapData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data: MapData = await apiService.getMapDetail(projectId);

      if (data.canvasW) setCanvasW(data.canvasW);
      if (data.canvasH) setCanvasH(data.canvasH);

      if (data.vertices) {
        setVertices(data.vertices);
        const importedEdges = mapDataService.importEdgesFromVertices(
          data.vertices,
        );
        setEdges(importedEdges);
      }

      if (data.svgUrl) setSvgUrl(data.svgUrl);
    } catch (err) {
      console.error("Failed to load map data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  /**
   * Syncs current map data to the server
   */
  const syncToServer = useCallback(async () => {
    setIsSaving(true);
    try {
      const graphPayload = mapDataService.verticesToGraphPayload(
        vertices,
        edges,
      );
      const metadataPayload =
        mapDataService.verticesToMetadataPayload(vertices);

      await apiService.syncBothGraphAndMetadata(
        projectId,
        graphPayload,
        metadataPayload,
      );
    } finally {
      setIsSaving(false);
    }
  }, [vertices, edges, projectId]);

  /**
   * Imports vertices from JSON data
   */
  const importVerticesFromJson = useCallback((data: any[]) => {
    const importedVertices = mapDataService.importVerticesFromJson(data);
    const importedEdges =
      mapDataService.importEdgesFromVertices(importedVertices);
    setVertices(importedVertices);
    setEdges(importedEdges);
  }, []);

  return {
    // State
    vertices,
    edges,
    canvasW,
    canvasH,
    svgUrl,
    isLoading,
    isSaving,

    // Data Loading
    loadMapData,

    // Data Mutations
    updateVertices: setVertices,
    updateEdges: setEdges,
    updateCanvasDimensions: (w, h) => {
      setCanvasW(w);
      setCanvasH(h);
    },
    setSvgUrl,

    // Sync Operations
    syncToServer,

    // Import/Export
    importVerticesFromJson,
  };
}
