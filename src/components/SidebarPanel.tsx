/**
 * @file Sidebar Panel Component
 * @description Right sidebar with properties, crop tool, and data table
 */

import React from "react";
import { Vertex, TableView } from "../types";
import { PropField, SelectInput, PrimaryButton, NumberInput } from "./Common";
import { CATEGORIES } from "../constants";

interface SidebarPanelProps {
  selectedNode: Vertex | null;
  selectedIds: string[];
  vertices: Vertex[];
  tableView: TableView;
  onTableViewChange: (view: TableView) => void;
  onPropertyChange: (field: string, value: string) => void;
  onDeleteSelected: () => void;
  onExport: (type: "graph" | "db") => void;
  focusFrom: string;
  focusTo: string;
  roomNodes: Vertex[];
  onFocusFromChange: (id: string) => void;
  onFocusToChange: (id: string) => void;
  onGenerateImage: () => void;
  isGeneratingImg: boolean;
}

/**
 * SidebarPanel Component
 * Right-side panel with editing tools, properties, and data export
 */
function SidebarPanel({
  selectedNode,
  selectedIds,
  vertices,
  tableView,
  onTableViewChange,
  onPropertyChange,
  onDeleteSelected,
  onExport,
  focusFrom,
  focusTo,
  roomNodes,
  onFocusFromChange,
  onFocusToChange,
  onGenerateImage,
  isGeneratingImg,
}: SidebarPanelProps) {
  return (
    <div
      style={{
        width: 460,
        background: "#f8fafc",
        borderLeft: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        zIndex: 10,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 16px 10px",
          borderBottom: "1px solid #e2e8f0",
          background: "white",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 800 }}>Map Settings & Data</div>
        <div style={{ fontSize: 11, color: "#64748b" }}>
          {vertices.length} Nodes
        </div>
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        {/* CROP IMAGE TOOL */}
        <CropImageSection
          focusFrom={focusFrom}
          focusTo={focusTo}
          roomNodes={roomNodes}
          onFocusFromChange={onFocusFromChange}
          onFocusToChange={onFocusToChange}
          onGenerateImage={onGenerateImage}
          isGeneratingImg={isGeneratingImg}
        />

        {/* NODE PROPERTIES */}
        {selectedIds.length > 0 && selectedNode && (
          <NodePropertiesSection
            selectedNode={selectedNode}
            selectedIds={selectedIds}
            onPropertyChange={onPropertyChange}
            onDelete={onDeleteSelected}
          />
        )}

        {/* EXPORT BUTTONS */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => onExport("graph")}
            style={{
              flex: 1,
              padding: "10px 8px",
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            📊 Download Graph
          </button>
          <button
            onClick={() => onExport("db")}
            style={{
              flex: 1,
              padding: "10px 8px",
              background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            🗄️ Download DB
          </button>
        </div>

        {/* TABLE TOGGLE */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button
            onClick={() => onTableViewChange("graph")}
            style={{
              flex: 1,
              padding: 6,
              fontSize: 11,
              background: tableView === "graph" ? "#e2e8f0" : "white",
              border: "1px solid #cbd5e1",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Graph Table
          </button>
          <button
            onClick={() => onTableViewChange("db")}
            style={{
              flex: 1,
              padding: 6,
              fontSize: 11,
              background: tableView === "db" ? "#e2e8f0" : "white",
              border: "1px solid #cbd5e1",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            DB Table
          </button>
        </div>

        {/* DATA TABLE */}
        <DataTable vertices={vertices} view={tableView} />
      </div>
    </div>
  );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

interface CropImageSectionProps {
  focusFrom: string;
  focusTo: string;
  roomNodes: Vertex[];
  onFocusFromChange: (id: string) => void;
  onFocusToChange: (id: string) => void;
  onGenerateImage: () => void;
  isGeneratingImg: boolean;
}

function CropImageSection({
  focusFrom,
  focusTo,
  roomNodes,
  onFocusFromChange,
  onFocusToChange,
  onGenerateImage,
  isGeneratingImg,
}: CropImageSectionProps) {
  return (
    <div
      style={{
        background: "white",
        padding: 14,
        borderRadius: 10,
        marginBottom: 14,
        border: "1px solid #e2e8f0",
        boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          marginBottom: 8,
          color: "#0f172a",
          textTransform: "uppercase",
        }}
      >
        📸 Crop Map View
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <select
          value={focusFrom}
          onChange={(e) => onFocusFromChange(e.target.value)}
          style={{
            flex: 1,
            padding: "6px",
            fontSize: 11,
            borderRadius: 4,
            border: "1px solid #cbd5e1",
          }}
        >
          <option value="">From...</option>
          {roomNodes.map((v) => (
            <option key={`from-${v.id}`} value={v.id}>
              {v.label || v.slug}
            </option>
          ))}
        </select>
        <select
          value={focusTo}
          onChange={(e) => onFocusToChange(e.target.value)}
          style={{
            flex: 1,
            padding: "6px",
            fontSize: 11,
            borderRadius: 4,
            border: "1px solid #cbd5e1",
          }}
        >
          <option value="">To...</option>
          {roomNodes.map((v) => (
            <option key={`to-${v.id}`} value={v.id}>
              {v.label || v.slug}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={onGenerateImage}
        disabled={!focusFrom || !focusTo || isGeneratingImg}
        style={{
          width: "100%",
          padding: "8px",
          fontSize: 11,
          background: focusFrom && focusTo ? "#3b82f6" : "#e2e8f0",
          color: focusFrom && focusTo ? "white" : "#94a3b8",
          border: "none",
          borderRadius: 6,
          cursor: focusFrom && focusTo ? "pointer" : "not-allowed",
          fontWeight: 700,
        }}
      >
        {isGeneratingImg ? "Generating..." : "Generate High-Res PNG"}
      </button>
    </div>
  );
}

interface NodePropertiesSectionProps {
  selectedNode: Vertex;
  selectedIds: string[];
  onPropertyChange: (field: string, value: string) => void;
  onDelete: () => void;
}

function NodePropertiesSection({
  selectedNode,
  selectedIds,
  onPropertyChange,
  onDelete,
}: NodePropertiesSectionProps) {
  return (
    <div
      style={{
        background: "white",
        border: "2px solid #3b82f6",
        borderRadius: 10,
        padding: 14,
        marginBottom: 14,
      }}
    >
      {/* ID Display */}
      <div style={{ marginBottom: 10 }}>
        <label
          style={{
            display: "block",
            fontSize: 10,
            fontWeight: 700,
            color: "#94a3b8",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          ID
        </label>
        <div
          style={{
            width: "100%",
            padding: "7px 10px",
            border: "1px solid #e2e8f0",
            borderRadius: 7,
            fontSize: 11,
            background: "#f8fafc",
            color: "#64748b",
            wordBreak: "break-all",
          }}
        >
          {selectedNode.id}
        </div>
      </div>

      {/* Type & Room Type */}
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <label
            style={{
              display: "block",
              fontSize: 10,
              fontWeight: 700,
              color: "#94a3b8",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Type
          </label>
          <select
            value={selectedNode.type}
            onChange={(e) => onPropertyChange("type", e.target.value)}
            style={{
              width: "100%",
              padding: "7px 10px",
              border: "1px solid #e2e8f0",
              borderRadius: 7,
              fontSize: 13,
            }}
          >
            <option value="room">Room</option>
            <option value="junction">Junction</option>
          </select>
        </div>
        {selectedNode.type === "room" && (
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                fontSize: 10,
                fontWeight: 700,
                color: "#94a3b8",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Category
            </label>
            <select
              value={selectedNode["room-type"] || ""}
              onChange={(e) => onPropertyChange("room-type", e.target.value)}
              style={{
                width: "100%",
                padding: "7px 10px",
                border: "1px solid #e2e8f0",
                borderRadius: 7,
                fontSize: 13,
              }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Floor & Wings */}
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <label
            style={{
              display: "block",
              fontSize: 10,
              fontWeight: 700,
              color: "#94a3b8",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Floor
          </label>
          <input
            type="text"
            value={selectedNode.floor || ""}
            onChange={(e) => onPropertyChange("floor", e.target.value)}
            style={{
              width: "100%",
              padding: "7px 10px",
              border: "1px solid #e2e8f0",
              borderRadius: 7,
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label
            style={{
              display: "block",
              fontSize: 10,
              fontWeight: 700,
              color: "#94a3b8",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Wings
          </label>
          <input
            type="text"
            value={selectedNode.wings || ""}
            onChange={(e) => onPropertyChange("wings", e.target.value)}
            style={{
              width: "100%",
              padding: "7px 10px",
              border: "1px solid #e2e8f0",
              borderRadius: 7,
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Label & Slug */}
      <PropField
        label="Label (DB Name)"
        value={selectedNode.label ?? ""}
        onChange={(v) => onPropertyChange("label", v)}
      />
      <PropField
        label="Slug (Auto)"
        value={selectedNode.slug ?? ""}
        onChange={(v) => onPropertyChange("slug", v)}
      />

      {/* Descriptions */}
      <PropField
        label="Description (ID)"
        value={selectedNode.description_id ?? ""}
        onChange={(v) => onPropertyChange("description_id", v)}
      />
      <PropField
        label="Description (EN)"
        value={selectedNode.description_en ?? ""}
        onChange={(v) => onPropertyChange("description_en", v)}
      />

      {/* Delete Button */}
      {selectedIds.length > 0 && (
        <button
          onClick={onDelete}
          style={{
            width: "100%",
            padding: "8px",
            marginTop: 8,
            background: "#ef4444",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          🗑️ Delete Selected ({selectedIds.length})
        </button>
      )}
    </div>
  );
}

interface DataTableProps {
  vertices: Vertex[];
  view: TableView;
}

function DataTable({ vertices, view }: DataTableProps) {
  const TD: React.CSSProperties = {
    padding: "5px 8px",
    borderBottom: "1px solid #f1f5f9",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 90,
    fontSize: 10,
    color: "#475569",
  };

  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 10,
        background: "white",
        border: "1px solid #e2e8f0",
      }}
    >
      <thead style={{ background: "#f1f5f9" }}>
        <tr>
          <th style={{ ...TD, fontWeight: 700 }}>ID</th>
          {view === "graph" && (
            <>
              <th style={{ ...TD, fontWeight: 700 }}>Type</th>
              <th style={{ ...TD, fontWeight: 700 }}>X</th>
              <th style={{ ...TD, fontWeight: 700 }}>Y</th>
            </>
          )}
          {view === "db" && (
            <>
              <th style={{ ...TD, fontWeight: 700 }}>Label</th>
              <th style={{ ...TD, fontWeight: 700 }}>Floor</th>
              <th style={{ ...TD, fontWeight: 700 }}>Wings</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {vertices.slice(0, 20).map((v) => (
          <tr key={v.id}>
            <td style={TD}>{v.id.substring(0, 8)}</td>
            {view === "graph" && (
              <>
                <td style={TD}>{v.type}</td>
                <td style={TD}>{v.cx}</td>
                <td style={TD}>{v.cy}</td>
              </>
            )}
            {view === "db" && (
              <>
                <td style={TD}>{v.label || "—"}</td>
                <td style={TD}>{v.floor || "—"}</td>
                <td style={TD}>{v.wings || "—"}</td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default SidebarPanel;
