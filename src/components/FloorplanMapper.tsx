/**
 * @file Floorplan Mapper Component
 * @description Main editor component for creating and managing floorplans
 */

import React, { useState, useRef, useEffect } from "react";
import {
  Vertex,
  Edge,
  Transform,
  PreviewLine,
  MarqueeRect,
  ToolMode,
  TableView,
} from "../types";
import { apiService } from "../services/APIService";
import { mapDataService } from "../services/MapDataService";
import { imageService } from "../services/ImageService";
import { exportService } from "../services/ExportService";
import { useHistory, useTransform } from "../hooks";
import { generateUid } from "../utils";
import {
  TOOL_MODES,
  CANVAS_DEFAULTS,
  COLORS,
  NODE_SIZES,
  STROKE_SIZES,
  SNAP_THRESHOLD,
  PATH_SETTINGS,
} from "../constants";
import { ToolButton, PropField, SelectInput, PrimaryButton } from "./Common";
import CanvasRenderer from "./CanvasRenderer";
import SidebarPanel from "./SidebarPanel";
import CroppedImageModal from "./CroppedImageModal";

interface FloorplanMapperProps {
  user: string;
  projectId: string;
  onBack: () => void;
}

/**
 * FloorplanMapper Component
 * Main floorplan editor with canvas and sidebar panels
 */
export function FloorplanMapper({
  user,
  projectId,
  onBack,
}: FloorplanMapperProps) {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [vertices, setVertices] = useState<Vertex[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mode, setModeState] = useState<ToolMode>("draw");
  const [tableView, setTableView] = useState<TableView>("graph");
  const [pixelSpacing, setPixelSpacing] = useState(
    CANVAS_DEFAULTS.PIXEL_SPACING,
  );

  // Canvas state
  const [svgUrl, setSvgUrl] = useState<string | null>(null);
  const [canvasW, setCanvasW] = useState(CANVAS_DEFAULTS.WIDTH);
  const [canvasH, setCanvasH] = useState(CANVAS_DEFAULTS.HEIGHT);
  const [isSaving, setIsSaving] = useState(false);

  // Image cropping state
  const [focusFrom, setFocusFrom] = useState<string>("");
  const [focusTo, setFocusTo] = useState<string>("");
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [displayImgUrl, setDisplayImgUrl] = useState<string | null>(null);

  // Canvas interaction state
  const [preview, setPreview] = useState<PreviewLine | null>(null);
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const [connectFirst, setConnectFirst] = useState<Vertex | null>(null);

  // Custom hooks
  const { history, captureSnapshot, undo, canUndo } = useHistory();
  const { transform, setTransform, zoom, pan } = useTransform();

  // Refs for interaction tracking
  const isDrawingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const isSelectingRef = useRef(false);
  const interactStartRef = useRef<any>(null);
  const snapStartRef = useRef<Vertex | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const vpRef = useRef<HTMLDivElement>(null);

  // Keep refs in sync with state
  useEffect(() => {
    // Used in event handlers via refs
  }, []);

  // ==========================================
  // INITIALIZATION & DATA LOADING
  // ==========================================

  useEffect(() => {
    loadMapData();
  }, [projectId]);

  async function loadMapData() {
    try {
      const data = await apiService.getMapDetail(projectId);

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
    }
  }

  // ==========================================
  // SYNC OPERATIONS
  // ==========================================

  async function syncToServer() {
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
      alert("✅ Map Synced! Spatial and Metadata stored separately.");
    } catch (err: any) {
      console.error(err);
      alert("Failed to sync: " + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  // ==========================================
  // IMAGE & FILE OPERATIONS
  // ==========================================

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await imageService.uploadSvgBackground(projectId, file);
      setSvgUrl(result.url);
      if (result.canvasW) setCanvasW(result.canvasW);
      if (result.canvasH) setCanvasH(result.canvasH);
    } catch (err) {
      alert("Failed to upload image");
    }
    e.target.value = "";
  }

  async function generateCroppedImage() {
    if (!focusFrom || !focusTo) return;
    setIsGeneratingImg(true);

    try {
      const url = await apiService.generateCroppedImage(
        projectId,
        focusFrom,
        focusTo,
      );
      setCroppedImage(url);
    } catch (err: any) {
      console.error(err);
      alert("Failed to generate image: " + err.message);
    } finally {
      setIsGeneratingImg(false);
    }
  }

  useEffect(() => {
    async function fetchSecureImage() {
      if (!croppedImage) {
        setDisplayImgUrl(null);
        return;
      }

      try {
        const blob = await imageService.fetchSecureImage(croppedImage);
        const localUrl = URL.createObjectURL(blob);
        setDisplayImgUrl(localUrl);
      } catch (err) {
        console.error("Image load error:", err);
      }
    }

    fetchSecureImage();

    return () => {
      if (displayImgUrl) URL.revokeObjectURL(displayImgUrl);
    };
  }, [croppedImage]);

  async function downloadCroppedImage() {
    if (!croppedImage) return;
    try {
      const blob = await imageService.fetchSecureImage(croppedImage);
      imageService.downloadBlob(blob, "route-map.png");
    } catch (err) {
      console.error("Download failed", err);
      alert("Failed to download image file.");
    }
  }

  // ==========================================
  // EXPORT OPERATIONS
  // ==========================================

  async function triggerExport(type: "graph" | "db") {
    try {
      const blob =
        type === "graph"
          ? await exportService.exportGraphJson(projectId)
          : await exportService.exportDatabaseJson(projectId);
      exportService.downloadBlob(blob, `export_${type}.json`);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export data");
    }
  }

  // ==========================================
  // JSON IMPORT
  // ==========================================

  function importJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (Array.isArray(data)) {
          const importedVertices = mapDataService.importVerticesFromJson(data);
          const importedEdges =
            mapDataService.importEdgesFromVertices(importedVertices);
          setVertices(importedVertices);
          setEdges(importedEdges);
          setSelectedIds([]);
        } else {
          alert("Invalid file format. Ensure it's an array.");
        }
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ==========================================
  // CANVAS INTERACTION HANDLERS
  // ==========================================

  function getCoords(e: MouseEvent): { x: number; y: number } {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const s = transform.scale;
    return {
      x: (e.clientX - rect.left) / s,
      y: (e.clientY - rect.top) / s,
    };
  }

  function findNear(pt: { x: number; y: number }): Vertex | undefined {
    return mapDataService.findNearestVertex(pt, vertices, transform.scale);
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    if (!vpRef.current) return;

    if (e.ctrlKey || e.metaKey) {
      zoom(
        e.deltaY,
        e.clientX,
        e.clientY,
        vpRef.current.getBoundingClientRect(),
      );
    } else {
      pan(-e.deltaX, -e.deltaY);
    }
  }

  function handleMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (e.button === 1) {
      isPanningRef.current = true;
      interactStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        tx: transform.tx,
        ty: transform.ty,
      };
      e.preventDefault();
      return;
    }
    if (e.button !== 0) return;

    const pt = getCoords(e.nativeEvent);
    const hit = findNear(pt);

    if (mode === "select") {
      if (hit) {
        captureSnapshot(vertices, edges);
        if (!e.shiftKey) {
          if (!selectedIds.includes(hit.id)) setSelectedIds([hit.id]);
        } else {
          setSelectedIds((p) =>
            p.includes(hit.id) ? p.filter((x) => x !== hit.id) : [...p, hit.id],
          );
        }
        isDraggingRef.current = true;
        interactStartRef.current = pt;
      } else {
        isSelectingRef.current = true;
        interactStartRef.current = pt;
        setSelectedIds([]);
        setMarquee({ x: pt.x, y: pt.y, w: 0, h: 0 });
      }
    } else if (mode === "connect") {
      if (!hit) return;
      if (!connectFirst) {
        setConnectFirst(hit);
      } else if (connectFirst.id !== hit.id) {
        captureSnapshot(vertices, edges);
        setEdges((p) => mapDataService.addEdge(p, connectFirst, hit));
        setConnectFirst(null);
      }
    } else if (mode === "room" || mode === "junction") {
      captureSnapshot(vertices, edges);
      const newVertex = mapDataService.createVertex(mode, pt.x, pt.y);
      setVertices((p) => [...p, newVertex]);
    } else if (mode === "draw") {
      isDrawingRef.current = true;
      snapStartRef.current = hit ?? null;
      const sp = hit ? { x: hit.cx, y: hit.cy } : pt;
      interactStartRef.current = sp;
      setPreview({ x1: sp.x, y1: sp.y, x2: sp.x, y2: sp.y });
    }
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (isPanningRef.current && interactStartRef.current) {
        const {
          x: sx,
          y: sy,
          tx: stx = 0,
          ty: sty = 0,
        } = interactStartRef.current;
        setTransform((p) => ({
          ...p,
          tx: stx + (e.clientX - sx),
          ty: sty + (e.clientY - sy),
        }));
        return;
      }

      if (!svgRef.current) return;
      const pt = getCoords(e);

      if (
        isDraggingRef.current &&
        selectedIds.length > 0 &&
        interactStartRef.current
      ) {
        const dx = Math.round(pt.x - interactStartRef.current.x);
        const dy = Math.round(pt.y - interactStartRef.current.y);

        if (dx !== 0 || dy !== 0) {
          setVertices((p) =>
            p.map((v) =>
              selectedIds.includes(v.id)
                ? mapDataService.updateVertexPosition(v, dx, dy)
                : v,
            ),
          );
          interactStartRef.current = pt;
        }
      } else if (isSelectingRef.current && interactStartRef.current) {
        const sx = interactStartRef.current.x,
          sy = interactStartRef.current.y;
        const x = Math.min(sx, pt.x),
          y = Math.min(sy, pt.y);
        const w = Math.abs(sx - pt.x),
          h = Math.abs(sy - pt.y);

        setMarquee({ x, y, w, h });
        const selected = mapDataService
          .findVerticesInRect(x, y, w, h, vertices)
          .map((v) => v.id);
        setSelectedIds(selected);
      } else if (isDrawingRef.current) {
        const snap = findNear(pt);
        setPreview((p) =>
          p
            ? {
                ...p,
                x2: snap ? snap.cx : pt.x,
                y2: snap ? snap.cy : pt.y,
              }
            : null,
        );
      }
    }

    function onUp(e: MouseEvent) {
      isPanningRef.current = false;

      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        if (svgRef.current && interactStartRef.current) {
          const pt = getCoords(e);
          const snap = findNear(pt);
          const sp = interactStartRef.current;
          const ep = snap ? { x: snap.cx, y: snap.cy } : pt;

          if (
            Math.hypot(ep.x - sp.x, ep.y - sp.y) > PATH_SETTINGS.MIN_DISTANCE
          ) {
            captureSnapshot(vertices, edges);
            const { vertices: newVerts, edges: newEdges } =
              mapDataService.createPath(
                sp,
                ep,
                pixelSpacing,
                snapStartRef.current,
                snap ?? null,
              );
            setVertices((p) => [...p, ...newVerts]);
            setEdges((p) => [...p, ...newEdges]);
          }
        }
        setPreview(null);
      }

      isDraggingRef.current = false;
      isSelectingRef.current = false;
      setMarquee(null);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [selectedIds, mode, pixelSpacing, vertices, edges, transform]);

  // ==========================================
  // EDIT OPERATIONS
  // ==========================================

  function liveUpdate(field: string, value: string) {
    if (selectedIds.length === 0) return;

    if (selectedIds.length === 1) {
      const id = selectedIds[0];
      setVertices((p) =>
        p.map((v) =>
          v.id === id
            ? mapDataService.updateVertexProperty(
                v,
                field as keyof Vertex,
                value,
              )
            : v,
        ),
      );
    } else {
      if (["type", "room-type", "floor", "wings"].includes(field)) {
        setVertices((p) =>
          p.map((v) =>
            selectedIds.includes(v.id)
              ? mapDataService.updateVertexProperty(
                  v,
                  field as keyof Vertex,
                  value,
                )
              : v,
          ),
        );
      }
    }
  }

  function deleteSelected() {
    if (selectedIds.length === 0) return;
    captureSnapshot(vertices, edges);
    const { vertices: newVerts, edges: newEdges } =
      mapDataService.deleteVertices(vertices, edges, selectedIds);
    setVertices(newVerts);
    setEdges(newEdges);
    setSelectedIds([]);
  }

  function setMode(m: ToolMode) {
    setModeState(m);
    setConnectFirst(null);
  }

  function handleUndo() {
    const snapshot = undo();
    if (snapshot) {
      setVertices(snapshot.vertices);
      setEdges(snapshot.edges);
      setSelectedIds([]);
    }
  }

  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================

  const selectedNode =
    selectedIds.length === 1
      ? vertices.find((v) => v.id === selectedIds[0])
      : null;
  const roomNodes = vertices.filter((v) => v.type === "room");

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* CROPPED IMAGE MODAL */}
      {croppedImage && (
        <CroppedImageModal
          displayImgUrl={displayImgUrl}
          onDownload={downloadCroppedImage}
          onClose={() => setCroppedImage(null)}
        />
      )}

      {/* TOOLBAR */}
      <div
        style={{
          background: "linear-gradient(90deg, #0f1c26 0%, #1a2f40 100%)",
          padding: "10px 16px",
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          zIndex: 100,
          boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
        }}
      >
        <button
          onClick={onBack}
          style={{
            padding: "6px 10px",
            background: "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: 6,
            color: "white",
            cursor: "pointer",
            marginRight: 8,
          }}
        >
          ← Back
        </button>

        {/* Upload & Import */}
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            borderRight: "1px solid rgba(255,255,255,0.12)",
            paddingRight: 12,
          }}
        >
          <button
            style={{
              padding: "6px 11px",
              borderRadius: 7,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 12,
              border: "none",
              background: "rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.85)",
            }}
            onClick={() => document.getElementById("img-inp")?.click()}
          >
            🖼️ Upload Background
          </button>
          <input
            id="img-inp"
            type="file"
            accept="image/png, image/jpeg, image/svg+xml"
            hidden
            onChange={handleImageUpload}
          />

          <button
            style={{
              padding: "6px 11px",
              borderRadius: 7,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 12,
              border: "none",
              background: "rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.85)",
            }}
            onClick={() => document.getElementById("json-inp")?.click()}
          >
            📂 Import Local JSON
          </button>
          <input
            id="json-inp"
            type="file"
            accept=".json"
            hidden
            onChange={importJSON}
          />

          {svgUrl && (
            <button
              onClick={() => setSvgUrl(null)}
              style={{
                padding: "6px 11px",
                borderRadius: 7,
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 12,
                border: "none",
                background: "rgba(239,68,68,0.2)",
                color: "#fca5a5",
              }}
            >
              🗑️ Clear BG
            </button>
          )}
        </div>

        {/* Spacing Control */}
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            borderRight: "1px solid rgba(255,255,255,0.12)",
            paddingRight: 12,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.5)",
              fontWeight: 600,
            }}
          >
            NODE DISTANCE (px)
          </span>
          <input
            type="number"
            min={10}
            value={pixelSpacing}
            onChange={(e) => setPixelSpacing(parseInt(e.target.value) || 40)}
            style={{
              width: 60,
              padding: "5px 8px",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.08)",
              color: "white",
              fontSize: 12,
              outline: "none",
            }}
          />
        </div>

        {/* Tool Modes */}
        <div
          style={{
            display: "flex",
            gap: 5,
            alignItems: "center",
            borderRight: "1px solid rgba(255,255,255,0.12)",
            paddingRight: 12,
          }}
        >
          {(
            [
              ["draw", "✏️ Draw"],
              ["room", "🏠 Room"],
              ["junction", "🔵 Junction"],
              ["connect", "🔗 Connect"],
              ["select", "🖐️ Select"],
            ] as [ToolMode, string][]
          ).map(([id, label]) => (
            <ToolButton
              key={id}
              active={mode === id}
              onClick={() => setMode(id)}
            >
              {label}
            </ToolButton>
          ))}
        </div>

        {/* Undo Button */}
        <button
          onClick={handleUndo}
          disabled={!canUndo()}
          title="Ctrl+Z"
          style={{
            padding: "6px 11px",
            borderRadius: 7,
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 12,
            border: "none",
            background: canUndo()
              ? "rgba(245,158,11,0.25)"
              : "rgba(255,255,255,0.12)",
            color: canUndo() ? "#fcd34d" : "rgba(255,255,255,0.85)",
          }}
        >
          ↩ Undo
        </button>

        {/* Sync Button */}
        <button
          onClick={syncToServer}
          disabled={isSaving}
          style={{
            marginLeft: "auto",
            padding: "8px 16px",
            background: isSaving ? "#9ca3af" : "#f59e0b",
            color: "white",
            border: "none",
            borderRadius: 6,
            fontWeight: "bold",
            cursor: isSaving ? "not-allowed" : "pointer",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          {isSaving ? "⏳ Syncing..." : "☁️ Sync Changes"}
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* CANVAS */}
        <div
          ref={vpRef}
          onWheel={handleWheel}
          style={{
            flex: 1,
            background: "#1a2535",
            position: "relative",
            overflow: "hidden",
            touchAction: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.03,
              backgroundImage:
                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "50px 50px",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "absolute",
              transformOrigin: "0 0",
              willChange: "transform",
              transform: `translate(${transform.tx}px,${transform.ty}px) scale(${transform.scale})`,
            }}
          >
            <CanvasRenderer
              svgRef={svgRef}
              canvasW={canvasW}
              canvasH={canvasH}
              svgUrl={svgUrl}
              vertices={vertices}
              edges={edges}
              selectedIds={selectedIds}
              connectFirst={connectFirst}
              preview={preview}
              marquee={marquee}
              mode={mode}
              onMouseDown={handleMouseDown}
              onEdgeDelete={(edgeId: string) => {
                if (window.confirm("Delete edge?")) {
                  captureSnapshot(vertices, edges);
                  setEdges((p) => p.filter((x) => x.id !== edgeId));
                }
              }}
            />
          </div>
        </div>

        {/* SIDEBAR */}
        <SidebarPanel
          selectedNode={selectedNode}
          selectedIds={selectedIds}
          vertices={vertices}
          tableView={tableView}
          onTableViewChange={setTableView}
          onPropertyChange={liveUpdate}
          onDeleteSelected={deleteSelected}
          onExport={triggerExport}
          focusFrom={focusFrom}
          focusTo={focusTo}
          roomNodes={roomNodes}
          onFocusFromChange={setFocusFrom}
          onFocusToChange={setFocusTo}
          onGenerateImage={generateCroppedImage}
          isGeneratingImg={isGeneratingImg}
        />
      </div>
    </div>
  );
}
