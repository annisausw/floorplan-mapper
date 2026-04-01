import React, { useState, useEffect, useRef } from "react";

// ==========================================
// API CONFIGURATION
// ==========================================
// Using type assertion to bypass TypeScript "env" error in Vite
const API_URL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:8080";

function getAuthHeaders() {
  const token = sessionStorage.getItem("fp_token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ==========================================
// TYPES
// ==========================================
type NodeType = "room" | "junction";
type ToolMode = "draw" | "room" | "junction" | "connect" | "select";
type TableView = "graph" | "db";

// Strictly matches the new Backend Schema
interface Vertex {
  id: string;
  type: NodeType;
  slug: string;
  floor: string;
  wings: string;
  label: string | null;
  description: string | null;
  "room-type": string | null;
  keywords: string | null;
  aliases: string | null;
  connection: string[];
  cx: number;
  cy: number;
}

interface Edge {
  id: string;
  from: string;
  to: string;
}

interface Transform {
  scale: number;
  tx: number;
  ty: number;
}
interface Point {
  x: number;
  y: number;
}
interface PreviewLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
interface MarqueeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface MapProject {
  id: string;
  name: string;
  updatedAt: number;
}

const CATEGORIES = [
  "CIRCULATION",
  "SERVICE",
  "CLINIC",
  "TOILET",
  "PUBLIC",
] as const;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function generateUid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateSlug(
  floor: string,
  wings: string,
  label: string | null,
  type: NodeType,
  id: string,
): string {
  const f = floor || "";
  const w = (wings || "").toLowerCase().replace(/\s+/g, "");
  const l = (label || (type === "room" ? "room" : "junct"))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const shortId = id.split("-")[0].substring(0, 4);
  return `f${f}-w${w}-${l}-${shortId}`;
}

const getSession = (): string | null => sessionStorage.getItem("fp_user");
const setSession = (u: string) => sessionStorage.setItem("fp_user", u);
const clearSession = () => {
  sessionStorage.removeItem("fp_session");
  sessionStorage.removeItem("fp_user");
  sessionStorage.removeItem("fp_token");
};

// ─────────────────────────────────────────────
// AUTH SCREEN
// ─────────────────────────────────────────────
function AuthScreen({ onLogin }: { onLogin: (u: string) => void }) {
  const [isReg, setIsReg] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    const endpoint = isReg ? "/api/auth/register" : "/api/auth/login";
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Authentication failed");

      if (isReg) {
        setIsReg(false);
        setError("Registration successful! Please login.");
        setPassword("");
      } else {
        sessionStorage.setItem("fp_token", data.token);
        setSession(data.username);
        onLogin(data.username);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background:
          "linear-gradient(145deg, #0f1c26 0%, #1a2f40 40%, #243b55 100%)",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.04,
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div
        style={{
          position: "relative",
          background: "rgba(255,255,255,0.97)",
          borderRadius: 20,
          padding: "44px 48px",
          width: 420,
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "linear-gradient(135deg, #1a6fad, #2ecc71)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              margin: "0 auto 14px",
              boxShadow: "0 8px 24px rgba(26,111,173,0.4)",
            }}
          >
            🗺️
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 800,
              color: "#0f1c26",
            }}
          >
            Floorplan Mapper
          </h2>
        </div>
        <div
          style={{
            display: "flex",
            background: "#f1f5f9",
            borderRadius: 10,
            padding: 4,
            marginBottom: 24,
          }}
        >
          {(["Sign In", "Register"] as const).map((label, i) => {
            const active = isReg === (i === 1);
            return (
              <button
                key={label}
                onClick={() => {
                  setIsReg(i === 1);
                  setError("");
                }}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  border: "none",
                  borderRadius: 7,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 13,
                  transition: "all 0.2s",
                  background: active ? "white" : "transparent",
                  color: active ? "#1a6fad" : "#64748b",
                  boxShadow: active ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        {error && (
          <div
            style={{
              background: "#fff5f5",
              color: "#b91c1c",
              padding: "10px 14px",
              borderRadius: 8,
              marginBottom: 18,
              fontSize: 13,
              borderLeft: "3px solid #ef4444",
            }}
          >
            ⚠️ {error}
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 700,
              color: "#475569",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            style={{
              width: "100%",
              padding: "11px 14px",
              border: "2px solid #e2e8f0",
              borderRadius: 10,
              fontSize: 14,
              outline: "none",
            }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 700,
              color: "#475569",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            style={{
              width: "100%",
              padding: "11px 14px",
              border: "2px solid #e2e8f0",
              borderRadius: 10,
              fontSize: 14,
              outline: "none",
            }}
          />
        </div>
        <button
          onClick={submit}
          style={{
            width: "100%",
            padding: "13px",
            marginTop: 8,
            background: "linear-gradient(135deg, #1a6fad, #1558a0)",
            color: "white",
            border: "none",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {isReg ? "✨ Create Account" : "→ Sign In"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PROJECT SELECTION SCREEN
// ─────────────────────────────────────────────
function ProjectSelectionScreen({
  user,
  onSelectProject,
  onLogout,
}: {
  user: string;
  onSelectProject: (id: string) => void;
  onLogout: () => void;
}) {
  const [projects, setProjects] = useState<MapProject[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/api/maps`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) =>
        setProjects(data.sort((a: any, b: any) => b.updatedAt - a.updatedAt)),
      )
      .catch(console.error);
  }, []);

  async function createProject() {
    const name = prompt("Enter new map name:", "Floor 1 Map");
    if (!name) return;
    try {
      const res = await fetch(`${API_URL}/api/maps`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      onSelectProject(data.mapId);
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteProject(id: string) {
    if (
      !confirm(
        "Are you sure you want to delete this map? This cannot be undone.",
      )
    )
      return;
    try {
      await fetch(`${API_URL}/api/maps/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      setProjects((p) => p.filter((proj) => proj.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div
      style={{
        padding: "60px 20px",
        fontFamily: "system-ui",
        background: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 40,
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>Your Maps</h1>
            <p style={{ margin: "5px 0 0", color: "#64748b" }}>
              Logged in as <strong>{user}</strong>
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={createProject}
              style={{
                padding: "10px 16px",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              + New Map
            </button>
            <button
              onClick={onLogout}
              style={{
                padding: "10px 16px",
                background: "white",
                color: "#ef4444",
                border: "1px solid #fca5a5",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 20,
          }}
        >
          {projects.map((p) => (
            <div
              key={p.id}
              style={{
                background: "white",
                padding: 20,
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <h3 style={{ margin: "0 0 10px 0" }}>{p.name}</h3>
              <p
                style={{ margin: "0 0 20px 0", fontSize: 12, color: "#94a3b8" }}
              >
                Updated: {new Date(p.updatedAt).toLocaleDateString()}
              </p>
              <div style={{ marginTop: "auto", display: "flex", gap: 8 }}>
                <button
                  onClick={() => onSelectProject(p.id)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: "#eff6ff",
                    color: "#2563eb",
                    border: "1px solid #bfdbfe",
                    borderRadius: 6,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Open
                </button>
                <button
                  onClick={() => deleteProject(p.id)}
                  style={{
                    padding: "8px",
                    background: "#fef2f2",
                    color: "#ef4444",
                    border: "1px solid #fecaca",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <div
              style={{
                gridColumn: "1 / -1",
                textAlign: "center",
                padding: 60,
                border: "2px dashed #cbd5e1",
                borderRadius: 12,
                color: "#64748b",
              }}
            >
              No maps found. Click "+ New Map" to start.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SMALL HELPERS
// ─────────────────────────────────────────────
function PropField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
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
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "7px 10px",
          border: "1px solid #e2e8f0",
          borderRadius: 7,
          fontSize: 13,
          outline: "none",
          color: "#1e293b",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

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

// ─────────────────────────────────────────────
// FLOORPLAN MAPPER
// ─────────────────────────────────────────────
function FloorplanMapper({
  user,
  projectId,
  onBack,
}: {
  user: string;
  projectId: string;
  onBack: () => void;
}) {
  const [vertices, setVertices] = useState<Vertex[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [originalVertices, setOriginalVertices] = useState<Vertex[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [svgUrl, setSvgUrl] = useState<string | null>(null);
  const [canvasW, setCanvasW] = useState(1500);
  const [canvasH, setCanvasH] = useState(1000);

  const [mode, setModeState] = useState<ToolMode>("draw");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tableView, setTableView] = useState<TableView>("graph");
  const [pixelSpacing, setPixelSpacing] = useState(40);
  const [history, setHistory] = useState<string[]>([]);
  const [connectFirst, setConnectFirst] = useState<Vertex | null>(null);
  const [transform, setTransform] = useState<Transform>({
    scale: 1,
    tx: 0,
    ty: 0,
  });
  const [preview, setPreview] = useState<PreviewLine | null>(null);
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);

  // Image Cropping Feature State
  const [focusFrom, setFocusFrom] = useState<string>("");
  const [focusTo, setFocusTo] = useState<string>("");
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);

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

  const vRef = useRef(vertices);
  const eRef = useRef(edges);
  const selRef = useRef(selectedIds);
  const modeRef = useRef(mode);
  const spacingRef = useRef(pixelSpacing);
  const txRef = useRef(transform);
  const cfRef = useRef(connectFirst);
  const histRef = useRef(history);
  const svgRef = useRef<SVGSVGElement>(null);
  const vpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    vRef.current = vertices;
  }, [vertices]);
  useEffect(() => {
    eRef.current = edges;
  }, [edges]);
  useEffect(() => {
    selRef.current = selectedIds;
  }, [selectedIds]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    spacingRef.current = pixelSpacing;
  }, [pixelSpacing]);
  useEffect(() => {
    txRef.current = transform;
  }, [transform]);
  useEffect(() => {
    cfRef.current = connectFirst;
  }, [connectFirst]);
  useEffect(() => {
    histRef.current = history;
  }, [history]);

  // 1. Load Data from Backend
  useEffect(() => {
    fetch(`${API_URL}/api/maps/${projectId}`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (data.vertices) {
          setVertices(data.vertices);
          setOriginalVertices(data.vertices);

          const importedEdges: Edge[] = [];
          const seenEdges = new Set<string>();
          data.vertices.forEach((v: Vertex) => {
            if (Array.isArray(v.connection)) {
              v.connection.forEach((targetId: string) => {
                const [a, b] = [v.id, targetId].sort();
                const edgeId = `${a}_to_${b}`;
                if (!seenEdges.has(edgeId)) {
                  seenEdges.add(edgeId);
                  importedEdges.push({ id: edgeId, from: a, to: b });
                }
              });
            }
          });
          setEdges(importedEdges);
        }
        if (data.svgUrl) setSvgUrl(data.svgUrl);
      })
      .catch(console.error);
  }, [projectId]);

  // 2. Sync Batch Data to Backend
  async function syncToServer() {
    setIsSaving(true);
    try {
      const currentVertices = vertices.map((v) => {
        const connections = edges
          .filter((e) => e.from === v.id || e.to === v.id)
          .map((e) => (e.from === v.id ? e.to : e.from));
        return { ...v, connection: connections };
      });

      const origIds = new Set(originalVertices.map((v) => v.id));
      const currIds = new Set(currentVertices.map((v) => v.id));

      const added = currentVertices.filter((v) => !origIds.has(v.id));
      const updated = currentVertices.filter((v) => origIds.has(v.id));
      const deleted = originalVertices
        .filter((v) => !currIds.has(v.id))
        .map((v) => v.id);

      if (added.length > 0) {
        const res = await fetch(`${API_URL}/api/maps/${projectId}/vertices`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(added),
        });
        if (!res.ok) throw new Error(await res.text());
      }
      if (updated.length > 0) {
        const res = await fetch(`${API_URL}/api/maps/${projectId}/vertices`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(updated),
        });
        if (!res.ok) throw new Error(await res.text());
      }
      if (deleted.length > 0) {
        const res = await fetch(`${API_URL}/api/maps/${projectId}/vertices`, {
          method: "DELETE",
          headers: getAuthHeaders(),
          body: JSON.stringify({ ids: deleted }),
        });
        if (!res.ok) throw new Error(await res.text());
      }

      setOriginalVertices(currentVertices);
      setVertices(currentVertices);
      alert("✅ Map Synced Successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to sync: " + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  // 3. Handle SVG Upload
  async function handleSvgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("svgFile", file);

    try {
      const res = await fetch(`${API_URL}/api/maps/${projectId}/svg`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("fp_token")}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (data.url) setSvgUrl(data.url);
    } catch (err) {
      alert("Failed to upload SVG");
    }
    e.target.value = "";
  }

  // Exports via API
  function triggerExport(type: "graph" | "db") {
    fetch(`${API_URL}/api/maps/${projectId}/export/${type}`, {
      headers: getAuthHeaders(),
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `export_${type}.json`;
        a.click();
      });
  }

  // ─────────────────────────────────────────────
  // GENERATE CROPPED IMAGE LOGIC (FIXED)
  // ─────────────────────────────────────────────
  async function generateCroppedImage() {
    if (!focusFrom || !focusTo || !svgRef.current) return;
    setIsGeneratingImg(true);

    const n1 = vertices.find((v) => v.id === focusFrom);
    const n2 = vertices.find((v) => v.id === focusTo);
    if (!n1 || !n2) {
      setIsGeneratingImg(false);
      return;
    }

    const padding = 100;
    const minX = Math.max(0, Math.min(n1.cx, n2.cx) - padding);
    const maxX = Math.min(canvasW, Math.max(n1.cx, n2.cx) + padding);
    const minY = Math.max(0, Math.min(n1.cy, n2.cy) - padding);
    const maxY = Math.min(canvasH, Math.max(n1.cy, n2.cy) + padding);

    const cropW = maxX - minX;
    const cropH = maxY - minY;

    // HIGH RESOLUTION SCALE FACTOR (3x for crisp rendering)
    const scaleFactor = 3;

    const canvas = document.createElement("canvas");
    canvas.width = cropW * scaleFactor;
    canvas.height = cropH * scaleFactor;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      setIsGeneratingImg(false);
      return;
    }

    // Fill white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply scale and translation so drawing at (0,0) perfectly frames the crop area
    ctx.scale(scaleFactor, scaleFactor);
    ctx.translate(-minX, -minY);

    try {
      // 1. Draw Background
      if (svgUrl) {
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            // Draw original size, the ctx.translate/scale handles the cropping perfectly
            ctx.drawImage(img, 0, 0, canvasW, canvasH);
            resolve();
          };
          img.onerror = () => {
            console.warn(
              "Could not load background image due to CORS or network issue.",
            );
            resolve(); // Proceed without background if failed
          };
          img.src = svgUrl;
        });
      }

      // 2. Draw Foreground SVG
      await new Promise<void>((resolve, reject) => {
        const clone = svgRef.current!.cloneNode(true) as SVGSVGElement;

        // Ensure SVG treats itself as the full size, viewBox changes are no longer needed
        clone.setAttribute("width", `${canvasW}`);
        clone.setAttribute("height", `${canvasH}`);

        const svgData = new XMLSerializer().serializeToString(clone);
        // Use URI encoding instead of Blobs for maximum browser compatibility
        const encodedData = encodeURIComponent(svgData);
        const url = `data:image/svg+xml;charset=utf-8,${encodedData}`;

        const img = new Image();
        img.onload = () => {
          // Draw original size, the ctx.translate/scale handles the cropping perfectly
          ctx.drawImage(img, 0, 0, canvasW, canvasH);
          resolve();
        };
        img.onerror = reject;
        img.src = url;
      });

      // Output high quality PNG
      setCroppedImage(canvas.toDataURL("image/png", 1.0));
    } catch (err) {
      console.error(err);
      alert("Failed to generate image.");
    } finally {
      setIsGeneratingImg(false);
    }
  }

  // Canvas Interaction Handlers
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  function getCoords(e: MouseEvent): Point {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const s = txRef.current.scale;
    return { x: (e.clientX - rect.left) / s, y: (e.clientY - rect.top) / s };
  }

  function findNear(pt: Point, vs?: Vertex[]): Vertex | undefined {
    const threshold = 20 / txRef.current.scale;
    return (vs ?? vRef.current).find(
      (v) => Math.hypot(v.cx - pt.x, v.cy - pt.y) < threshold,
    );
  }

  function captureHistory() {
    const snap = JSON.stringify({
      vertices: vRef.current,
      edges: eRef.current,
    });
    setHistory((prev) => {
      const n = [...prev, snap];
      return n.length > 50 ? n.slice(-50) : n;
    });
  }

  function undo() {
    if (histRef.current.length === 0) return;
    const last = histRef.current[histRef.current.length - 1];
    const s = JSON.parse(last);
    setVertices(s.vertices);
    setEdges(s.edges);
    setSelectedIds([]);
    setHistory((p) => p.slice(0, -1));
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const d = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((prev) => {
      if (e.ctrlKey) {
        const ns = Math.min(Math.max(prev.scale * d, 0.05), 20);
        const r = vpRef.current!.getBoundingClientRect();
        const mx = e.clientX - r.left,
          my = e.clientY - r.top;
        return {
          scale: ns,
          tx: mx - (mx - prev.tx) * (ns / prev.scale),
          ty: my - (my - prev.ty) * (ns / prev.scale),
        };
      }
      return { ...prev, tx: prev.tx - e.deltaX, ty: prev.ty - e.deltaY };
    });
  }

  function handleMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (e.button === 1) {
      isPanningRef.current = true;
      interactStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        tx: txRef.current.tx,
        ty: txRef.current.ty,
      };
      e.preventDefault();
      return;
    }
    if (e.button !== 0) return;

    const pt = getCoords(e.nativeEvent);
    const hit = findNear(pt);
    const m = modeRef.current;

    if (m === "select") {
      if (hit) {
        if (!e.shiftKey) {
          if (!selRef.current.includes(hit.id)) setSelectedIds([hit.id]);
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
    } else if (m === "connect") {
      if (!hit) return;
      if (!cfRef.current) {
        setConnectFirst(hit);
      } else if (cfRef.current.id !== hit.id) {
        captureHistory();
        const [a, b] = [cfRef.current.id, hit.id].sort();
        const eid = `${a}_to_${b}`;
        if (!eRef.current.some((e2) => e2.id === eid)) {
          setEdges((p) => [...p, { id: eid, from: a, to: b }]);
        }
        setConnectFirst(null);
      }
    } else if (m === "room" || m === "junction") {
      captureHistory();
      const nid = generateUid();
      setVertices((p) => [
        ...p,
        {
          id: nid,
          type: m as NodeType,
          slug: generateSlug("1", "Main", null, m as NodeType, nid),
          floor: "1",
          wings: "Main",
          label: null,
          description: null,
          "room-type": m === "room" ? "PUBLIC" : null,
          keywords: null,
          aliases: null,
          connection: [],
          cx: Math.round(pt.x),
          cy: Math.round(pt.y),
        },
      ]);
    } else if (m === "draw") {
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
        selRef.current.length > 0 &&
        interactStartRef.current
      ) {
        const dx = Math.round(pt.x - interactStartRef.current.x);
        const dy = Math.round(pt.y - interactStartRef.current.y);
        if (dx !== 0 || dy !== 0) {
          setVertices((p) =>
            p.map((v) =>
              selRef.current.includes(v.id)
                ? { ...v, cx: v.cx + dx, cy: v.cy + dy }
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
        setSelectedIds(
          vRef.current
            .filter(
              (v) => v.cx >= x && v.cx <= x + w && v.cy >= y && v.cy <= y + h,
            )
            .map((v) => v.id),
        );
      } else if (isDrawingRef.current) {
        const snap = findNear(pt);
        setPreview((p) =>
          p
            ? { ...p, x2: snap ? snap.cx : pt.x, y2: snap ? snap.cy : pt.y }
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
          if (Math.hypot(ep.x - sp.x, ep.y - sp.y) > 5) {
            captureHistory();
            createPath(sp, ep, snapStartRef.current, snap ?? null);
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
  }, []);

  function createPath(
    p1: Point,
    p2: Point,
    sNode: Vertex | null,
    eNode: Vertex | null,
  ) {
    const interval = spacingRef.current || 40;
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const count = Math.max(2, Math.floor(dist / interval));

    const newVerts: Vertex[] = [];
    const newEdges: Edge[] = [];
    const seg: Vertex[] = [];

    for (let i = 0; i < count; i++) {
      if (i === 0 && sNode) {
        seg.push(sNode);
        continue;
      }
      if (i === count - 1 && eNode) {
        seg.push(eNode);
        continue;
      }
      const t = i / (count - 1);
      const jid = generateUid();
      const nv: Vertex = {
        id: jid,
        type: "junction",
        slug: generateSlug("1", "Main", null, "junction", jid),
        floor: "1",
        wings: "Main",
        label: null,
        description: null,
        "room-type": null,
        keywords: null,
        aliases: null,
        connection: [],
        cx: Math.round(p1.x + (p2.x - p1.x) * t),
        cy: Math.round(p1.y + (p2.y - p1.y) * t),
      };
      newVerts.push(nv);
      seg.push(nv);
    }

    for (let i = 0; i < seg.length - 1; i++) {
      const [a, b] = [seg[i].id, seg[i + 1].id].sort();
      newEdges.push({ id: `${a}_to_${b}`, from: a, to: b });
    }

    setVertices((p) => [...p, ...newVerts]);
    setEdges((p) => [...p, ...newEdges]);
  }

  function liveUpdate(field: string, value: string) {
    if (selectedIds.length === 0) return;

    if (selectedIds.length === 1) {
      const id = selectedIds[0];
      setVertices((p) =>
        p.map((v) => {
          if (v.id === id) {
            const updated = { ...v, [field]: value || null };

            // Auto-update slug if core fields change
            if (field === "floor" || field === "wings" || field === "label") {
              updated.slug = generateSlug(
                updated.floor,
                updated.wings,
                updated.label,
                updated.type,
                updated.id,
              );
            }
            return updated;
          }
          return v;
        }),
      );
    } else {
      // Bulk update
      if (
        field === "type" ||
        field === "room-type" ||
        field === "floor" ||
        field === "wings"
      ) {
        setVertices((p) =>
          p.map((v) => {
            if (selectedIds.includes(v.id)) {
              const updated = { ...v, [field]: value || null };

              if (field === "floor" || field === "wings") {
                updated.slug = generateSlug(
                  updated.floor,
                  updated.wings,
                  updated.label,
                  updated.type,
                  updated.id,
                );
              }
              return updated;
            }
            return v;
          }),
        );
      }
    }
  }

  function deleteSelected() {
    if (selectedIds.length === 0) return;
    captureHistory();
    setVertices((p) => p.filter((v) => !selectedIds.includes(v.id)));
    setEdges((p) =>
      p.filter(
        (e) => !selectedIds.includes(e.from) && !selectedIds.includes(e.to),
      ),
    );
    setSelectedIds([]);
  }

  function setMode(m: ToolMode) {
    setModeState(m);
    setConnectFirst(null);
  }

  function handleRowClick(e: React.MouseEvent, v: Vertex) {
    if (e.shiftKey) {
      setSelectedIds((p) =>
        p.includes(v.id) ? p.filter((x) => x !== v.id) : [...p, v.id],
      );
    } else {
      setSelectedIds([v.id]);
    }
  }

  // --- Handlers for manual JSON Import ---
  function importJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (Array.isArray(data)) {
          // Map to strictly fit the Vertex Schema
          const importedVertices: Vertex[] = data.map((v: any) => ({
            id: v.id || generateUid(),
            type: v.type || "junction",
            slug: v.slug || v.id,
            floor: v.floor || "1",
            wings: v.wings || "Main",
            label: v.label ?? null,
            description: v.description ?? null,
            "room-type": v["room-type"] ?? v.categoryId ?? "PUBLIC",
            keywords: v.keywords ?? null,
            aliases: Array.isArray(v.aliases)
              ? v.aliases.join(", ")
              : v.aliases || null,
            connection: v.connection || [],
            cx: v.cx,
            cy: v.cy,
          }));

          const importedEdges: Edge[] = [];
          const seenEdges = new Set<string>();
          importedVertices.forEach((v) => {
            if (Array.isArray(v.connection)) {
              v.connection.forEach((targetId: string) => {
                const [a, b] = [v.id, targetId].sort();
                const edgeId = `${a}_to_${b}`;
                if (!seenEdges.has(edgeId)) {
                  seenEdges.add(edgeId);
                  importedEdges.push({ id: edgeId, from: a, to: b });
                }
              });
            }
          });
          setVertices(importedVertices);
          setEdges(importedEdges);
        } else {
          alert("Invalid file format. Ensure it's an array.");
        }
        setSelectedIds([]);
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    r.readAsText(file);
    e.target.value = "";
  }

  const selectedNode =
    selectedIds.length === 1
      ? vertices.find((v) => v.id === selectedIds[0])
      : null;
  const roomNodes = vertices.filter((v) => v.type === "room");

  function toolBtn(active: boolean): React.CSSProperties {
    return {
      padding: "6px 11px",
      borderRadius: 7,
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 12,
      border: "none",
      transition: "all 0.15s",
      background: active ? "#3b82f6" : "rgba(255,255,255,0.12)",
      color: active ? "white" : "rgba(255,255,255,0.85)",
      boxShadow: active ? "0 2px 8px rgba(59,130,246,0.5)" : "none",
    };
  }

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
      {/* MODAL POPUP FOR CROPPED IMAGE */}
      {croppedImage && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              background: "white",
              padding: 30,
              borderRadius: 16,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              maxWidth: "90%",
              maxHeight: "90%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
            }}
          >
            <h2 style={{ margin: "0 0 20px 0", color: "#0f172a" }}>
              📸 Generated Route Map
            </h2>
            <div
              style={{
                background: "#f1f5f9",
                borderRadius: 8,
                padding: 10,
                overflow: "hidden",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <img
                src={croppedImage}
                alt="Cropped Route"
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: 4,
                  maxWidth: "100%",
                  maxHeight: "60vh",
                  objectFit: "contain",
                  background: "white",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 12, width: "100%" }}>
              <button
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = croppedImage;
                  a.download = `route-${focusFrom}-to-${focusTo}.png`;
                  a.click();
                }}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  background: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: 14,
                }}
              >
                💾 Download PNG
              </button>
              <button
                onClick={() => setCroppedImage(null)}
                style={{
                  padding: "12px 24px",
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: 14,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div
        style={{
          background: "linear-gradient(90deg, #0f1c26 0%, #1a2f40 100%)",
          padding: "10px 16px",
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          zIndex: 10,
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
            style={toolBtn(false)}
            onClick={() => document.getElementById("svg-inp")?.click()}
          >
            🖼️ Upload SVG
          </button>
          <input
            id="svg-inp"
            type="file"
            accept=".svg"
            hidden
            onChange={handleSvgUpload}
          />

          <button
            style={toolBtn(false)}
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
                ...toolBtn(false),
                background: "rgba(239,68,68,0.2)",
                color: "#fca5a5",
              }}
            >
              🗑️ Clear BG
            </button>
          )}
        </div>

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
            <button
              key={id}
              onClick={() => setMode(id)}
              style={toolBtn(mode === id)}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={undo}
          title="Ctrl+Z"
          style={{
            ...toolBtn(false),
            background: "rgba(245,158,11,0.25)",
            color: "#fcd34d",
          }}
        >
          ↩ Undo
        </button>

        {/* Sync Data Button */}
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
          {isSaving ? "⏳ Syncing..." : "☁️ Sync Changes to Server"}
        </button>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Canvas */}
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
            <div
              style={{
                position: "relative",
                background: "white",
                width: canvasW,
                height: canvasH,
                boxShadow:
                  "0 0 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1)",
              }}
            >
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
                  }}
                  alt="Map Background"
                />
              )}

              <svg
                ref={svgRef}
                style={{ position: "absolute", top: 0, left: 0 }}
                width={canvasW}
                height={canvasH}
                viewBox={`0 0 ${canvasW} ${canvasH}`}
                onMouseDown={handleMouseDown}
              >
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
                      stroke="#1e293b"
                      strokeWidth={3}
                      opacity={0.35}
                      strokeLinecap="round"
                      style={{
                        cursor: mode === "select" ? "pointer" : "default",
                      }}
                      onClick={() => {
                        if (
                          modeRef.current === "select" &&
                          window.confirm(`Delete edge?`)
                        ) {
                          captureHistory();
                          setEdges((p) => p.filter((x) => x.id !== edge.id));
                        }
                      }}
                    />
                  );
                })}
                {vertices.map((v) => {
                  const sel =
                    selectedIds.includes(v.id) || connectFirst?.id === v.id;
                  const isRoom = v.type === "room";
                  return (
                    <g key={v.id}>
                      <circle
                        cx={v.cx}
                        cy={v.cy}
                        r={sel ? 11 : isRoom ? 9 : 7}
                        fill={isRoom ? "#ef4444" : "#3b82f6"}
                        stroke={sel ? "#fbbf24" : "white"}
                        strokeWidth={sel ? 3.5 : 2}
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
                          {v.label.length > 18
                            ? v.label.slice(0, 17) + "…"
                            : v.label}
                        </text>
                      )}
                    </g>
                  );
                })}
                {preview && (
                  <line
                    x1={preview.x1}
                    y1={preview.y1}
                    x2={preview.x2}
                    y2={preview.y2}
                    stroke="#22c55e"
                    strokeWidth={2}
                    strokeDasharray="7,4"
                    pointerEvents="none"
                  />
                )}
                {marquee && (
                  <rect
                    x={marquee.x}
                    y={marquee.y}
                    width={marquee.w}
                    height={marquee.h}
                    fill="rgba(59,130,246,0.08)"
                    stroke="#3b82f6"
                    strokeWidth={1}
                    strokeDasharray="5,3"
                    pointerEvents="none"
                  />
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* Sidebar */}
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
          <div
            style={{
              padding: "14px 16px 10px",
              borderBottom: "1px solid #e2e8f0",
              background: "white",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800 }}>Node Properties</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>
              {vertices.length} Nodes
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
            {/* CROPPED IMAGE TOOL */}
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
                  onChange={(e) => setFocusFrom(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "6px",
                    fontSize: 11,
                    borderRadius: 4,
                    border: "1px solid #cbd5e1",
                    maxWidth: "50%",
                  }}
                >
                  <option value="">Select From...</option>
                  {roomNodes.map((v) => (
                    <option key={`from-${v.id}`} value={v.id}>
                      {v.label || v.slug || v.id}
                    </option>
                  ))}
                </select>
                <select
                  value={focusTo}
                  onChange={(e) => setFocusTo(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "6px",
                    fontSize: 11,
                    borderRadius: 4,
                    border: "1px solid #cbd5e1",
                    maxWidth: "50%",
                  }}
                >
                  <option value="">Select To...</option>
                  {roomNodes.map((v) => (
                    <option key={`to-${v.id}`} value={v.id}>
                      {v.label || v.slug || v.id}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={generateCroppedImage}
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
                {isGeneratingImg
                  ? "Generating Image..."
                  : "Generate High-Res PNG"}
              </button>
            </div>

            {/* NODE PROPERTIES */}
            {selectedIds.length > 0 && (
              <div
                style={{
                  background: "white",
                  border: "2px solid #3b82f6",
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 14,
                }}
              >
                {selectedNode && (
                  <>
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
                        ID (Auto-generated UUID)
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
                          boxSizing: "border-box",
                          wordBreak: "break-all",
                        }}
                      >
                        {selectedNode.id}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <PropField
                          label="Floor"
                          value={selectedNode.floor ?? ""}
                          onChange={(v) => liveUpdate("floor", v)}
                          placeholder="e.g. 5"
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <PropField
                          label="Wings"
                          value={selectedNode.wings ?? ""}
                          onChange={(v) => liveUpdate("wings", v)}
                          placeholder="e.g. North"
                        />
                      </div>
                    </div>

                    <PropField
                      label="Label (DB Name)"
                      value={selectedNode.label ?? ""}
                      onChange={(v) => liveUpdate("label", v)}
                      placeholder="ENT / THT & General"
                    />
                    <PropField
                      label="Slug (Auto-Generated)"
                      value={selectedNode.slug ?? ""}
                      onChange={(v) => liveUpdate("slug", v)}
                    />
                    <PropField
                      label="Description (DB Desc)"
                      value={selectedNode.description ?? ""}
                      onChange={(v) => liveUpdate("description", v)}
                      placeholder="Klinik konsultasi spesialis..."
                    />

                    {selectedNode.type === "room" && (
                      <>
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
                            Room Type
                          </label>
                          <select
                            value={selectedNode["room-type"] ?? "PUBLIC"}
                            onChange={(e) =>
                              liveUpdate("room-type", e.target.value)
                            }
                            style={{
                              width: "100%",
                              padding: "7px 10px",
                              border: "1px solid #e2e8f0",
                              borderRadius: 7,
                            }}
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                        <PropField
                          label="Keywords (comma separated)"
                          value={selectedNode.keywords ?? ""}
                          onChange={(v) => liveUpdate("keywords", v)}
                          placeholder="asuransi, rawat jalan..."
                        />
                        <PropField
                          label="Aliases (comma separated)"
                          value={selectedNode.aliases ?? ""}
                          onChange={(v) => liveUpdate("aliases", v)}
                          placeholder="dokter tht, obgyn..."
                        />
                      </>
                    )}
                  </>
                )}
                <button
                  onClick={deleteSelected}
                  style={{
                    width: "100%",
                    padding: "9px",
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: 7,
                    cursor: "pointer",
                    fontWeight: 700,
                    marginTop: 4,
                  }}
                >
                  🗑️ Delete Selection ({selectedIds.length})
                </button>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => triggerExport("graph")}
                style={{
                  flex: 1,
                  padding: "10px 8px",
                  background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                📊 Download Graph API
              </button>
              <button
                onClick={() => triggerExport("db")}
                style={{
                  flex: 1,
                  padding: "10px 8px",
                  background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                🗄️ Download DB API
              </button>
            </div>

            {/* Table Toggle */}
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <button
                onClick={() => setTableView("graph")}
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
                View Graph Table
              </button>
              <button
                onClick={() => setTableView("db")}
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
                View DB Table
              </button>
            </div>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 10,
                background: "white",
                border: "1px solid #e2e8f0",
              }}
            >
              <thead>
                <tr>
                  {(tableView === "graph"
                    ? ["ID", "Type", "Coords"]
                    : ["ID", "Category", "Aliases"]
                  ).map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: 6,
                        borderBottom: "1px solid #e2e8f0",
                        textAlign: "left",
                        background: "#f8fafc",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vertices.slice(0, 50).map((v) => (
                  <tr
                    key={v.id}
                    onClick={(e) => handleRowClick(e as any, v)}
                    style={{
                      background: selectedIds.includes(v.id)
                        ? "#fef9c3"
                        : "white",
                      cursor: "pointer",
                    }}
                  >
                    <td style={{ ...TD, maxWidth: 60 }} title={v.id}>
                      {v.id}
                    </td>
                    {tableView === "graph" ? (
                      <>
                        <td style={TD}>{v.type}</td>
                        <td style={TD}>
                          {v.cx},{v.cy}
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={TD}>{v["room-type"] || "—"}</td>
                        <td style={TD}>{v.aliases || "—"}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(() =>
    getSession(),
  );
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  function handleLogin(u: string) {
    setSession(u);
    setCurrentUser(u);
  }
  function handleLogout() {
    clearSession();
    setCurrentUser(null);
    setCurrentProjectId(null);
  }

  if (!currentUser) return <AuthScreen onLogin={handleLogin} />;
  if (!currentProjectId)
    return (
      <ProjectSelectionScreen
        user={currentUser}
        onSelectProject={setCurrentProjectId}
        onLogout={handleLogout}
      />
    );
  return (
    <FloorplanMapper
      user={currentUser}
      projectId={currentProjectId}
      onBack={() => setCurrentProjectId(null)}
    />
  );
}
