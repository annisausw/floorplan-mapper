/**
 * @file Canvas Renderer Component
 * @description SVG canvas rendering for nodes, edges, and preview
 */

import React from "react";
import { Vertex, Edge, PreviewLine, MarqueeRect, ToolMode } from "../types";
import { COLORS, NODE_SIZES, STROKE_SIZES } from "../constants";

interface CanvasRendererProps {
  svgRef: React.RefObject<SVGSVGElement>;
  canvasW: number;
  canvasH: number;
  svgUrl: string | null;
  vertices: Vertex[];
  edges: Edge[];
  selectedIds: string[];
  connectFirst: Vertex | null;
  preview: PreviewLine | null;
  marquee: MarqueeRect | null;
  mode: ToolMode;
  onMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void;
  onEdgeDelete: (edgeId: string) => void;
}

/**
 * CanvasRenderer Component
 * Renders the SVG canvas with all nodes, edges, and preview elements
 */
function CanvasRenderer({
  svgRef,
  canvasW,
  canvasH,
  svgUrl,
  vertices,
  edges,
  selectedIds,
  connectFirst,
  preview,
  marquee,
  mode,
  onMouseDown,
  onEdgeDelete,
}: CanvasRendererProps) {
  return (
    <div
      style={{
        position: "relative",
        background: "white",
        width: canvasW,
        height: canvasH,
        boxShadow: "0 0 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1)",
      }}
    >
      {/* Background SVG/Image */}
      {svgUrl && (
        <img
          src={svgUrl}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            objectFit: "contain",
            background: "#f0f0f0",
          }}
          alt="Map Background"
        />
      )}

      {/* Main SVG */}
      <svg
        ref={svgRef}
        style={{ position: "absolute", top: 0, left: 0 }}
        width={canvasW}
        height={canvasH}
        viewBox={`0 0 ${canvasW} ${canvasH}`}
        onMouseDown={onMouseDown}
      >
        {/* Edges */}
        {edges.map((edge) => {
          const v1 = vertices.find((v) => v.id === edge.from);
          const v2 = vertices.find((v) => v.id === edge.to);
          if (!v1 || !v2) return null;

          return (
            <line
              key={edge.id}
              x1={v1.cx}
              y1={v1.cy}
              x2={v2.cx}
              y2={v2.cy}
              stroke={COLORS.EDGE}
              strokeWidth={STROKE_SIZES.EDGE}
              opacity={0.35}
              strokeLinecap="round"
              style={{ cursor: mode === "select" ? "pointer" : "default" }}
              onClick={() => {
                if (mode === "select") {
                  onEdgeDelete(edge.id);
                }
              }}
            />
          );
        })}

        {/* Vertices */}
        {vertices.map((v) => {
          const sel = selectedIds.includes(v.id) || connectFirst?.id === v.id;
          const isRoom = v.type === "room";

          return (
            <g key={v.id}>
              <circle
                cx={v.cx}
                cy={v.cy}
                r={
                  sel
                    ? NODE_SIZES.SELECTED_RADIUS
                    : isRoom
                      ? NODE_SIZES.ROOM_RADIUS
                      : NODE_SIZES.JUNCTION_RADIUS
                }
                fill={isRoom ? COLORS.ROOM : COLORS.JUNCTION}
                stroke={sel ? COLORS.SELECTED : "white"}
                strokeWidth={
                  sel ? STROKE_SIZES.NODE_SELECTED : STROKE_SIZES.NODE_DEFAULT
                }
                style={{ cursor: "pointer" }}
              />
              {isRoom && v.label && (
                <text
                  x={v.cx}
                  y={v.cy - 14}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#1e293b"
                  fontWeight={600}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {v.label.length > 18 ? v.label.slice(0, 17) + "…" : v.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Preview Line */}
        {preview && (
          <line
            x1={preview.x1}
            y1={preview.y1}
            x2={preview.x2}
            y2={preview.y2}
            stroke={COLORS.PREVIEW}
            strokeWidth={STROKE_SIZES.PREVIEW_LINE}
            strokeDasharray="7,4"
            pointerEvents="none"
          />
        )}

        {/* Marquee Selection */}
        {marquee && (
          <rect
            x={marquee.x}
            y={marquee.y}
            width={marquee.w}
            height={marquee.h}
            fill={COLORS.MARQUEE_FILL}
            stroke={COLORS.MARQUEE_STROKE}
            strokeWidth={STROKE_SIZES.MARQUEE}
            strokeDasharray="5,3"
            pointerEvents="none"
          />
        )}
      </svg>
    </div>
  );
}

export default CanvasRenderer;
