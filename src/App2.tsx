import React, { useState, useEffect, useRef } from "react";
import { saveMapToCloud, loadMapFromCloud, uploadSvgToCloud } from "./localAPI";

// ==========================================
// API CONFIGURATION
// ==========================================
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

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

// Matches backend Schema
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
// STORAGE HELPERS
// ─────────────────────────────────────────────

function hashStr(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++)
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h.toString(36);
}

function generateUid(): string {
  return Math.random().toString(36).substring(2, 8);
}

const getUsers = (): Users =>
  JSON.parse(localStorage.getItem("fp_users") ?? "{}");
const saveUsers = (u: Users) =>
  localStorage.setItem("fp_users", JSON.stringify(u));
const getSession = (): string | null => sessionStorage.getItem("fp_session");
const setSession = (u: string) => sessionStorage.setItem("fp_session", u);
const clearSession = () => sessionStorage.removeItem("fp_session");

// Project Management Storage
function getUserProjects(user: string): MapProject[] {
  return JSON.parse(localStorage.getItem(`fp_projects_${user}`) ?? "[]");
}

function saveUserProjects(user: string, projects: MapProject[]) {
  localStorage.setItem(`fp_projects_${user}`, JSON.stringify(projects));
}

function loadMapData(
  user: string,
  projectId: string,
): { data: UserMapData | null; svgContent: string } {
  const raw = localStorage.getItem(`fp_data_${user}_${projectId}`);
  return {
    data: raw ? (JSON.parse(raw) as UserMapData) : null,
    svgContent: localStorage.getItem(`fp_svg_${user}_${projectId}`) ?? "",
  };
}

function saveMapData(
  user: string,
  projectId: string,
  data: UserMapData,
  svgContent: string,
) {
  try {
    localStorage.setItem(`fp_data_${user}_${projectId}`, JSON.stringify(data));
    if (svgContent) {
      try {
        localStorage.setItem(`fp_svg_${user}_${projectId}`, svgContent);
      } catch {
        console.warn("SVG too large for localStorage, skipping SVG save.");
      }
    } else {
      localStorage.removeItem(`fp_svg_${user}_${projectId}`);
    }
  } catch (e) {
    console.warn("localStorage save failed:", e);
  }
}

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
        setIsReg(false); // Switch to login after successful registration
        setError("Registration successful! Please login.");
      } else {
        sessionStorage.setItem("fp_token", data.token);
        sessionStorage.setItem("fp_user", data.username);
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
          <h1>Your Maps</h1>
          <div>
            <button
              onClick={createProject}
              style={{
                padding: "10px 16px",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: 8,
                marginRight: 10,
                cursor: "pointer",
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
              }}
            >
              <h3>{p.name}</h3>
              <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                <button
                  onClick={() => onSelectProject(p.id)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: "#eff6ff",
                    color: "#2563eb",
                    border: "none",
                    borderRadius: 6,
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
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
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
  const [svgContent, setSvgContent] = useState("");
  const [canvasW, setCanvasW] = useState(1500);
  const [canvasH, setCanvasH] = useState(1000);

  const [mode, setModeState] = useState<ToolMode>("draw");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tableView, setTableView] = useState<TableView>("graph");
  const [idPrefix, setIdPrefix] = useState("LT2-");
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
  const prefixRef = useRef(idPrefix);
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
    prefixRef.current = idPrefix;
  }, [idPrefix]);
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

  // Load Map Data
  useEffect(() => {
    const { data, svgContent: svg } = loadMapData(user, projectId);
    if (data) {
      setVertices(data.vertices ?? []);
      setEdges(data.edges ?? []);
      setCanvasW(data.canvasW ?? 1500);
      setCanvasH(data.canvasH ?? 1000);
    }
    if (svg) setSvgContent(svg);
  }, [user, projectId]);

  // Auto-save Map Data
  useEffect(() => {
    saveMapData(
      user,
      projectId,
      { vertices, edges, canvasW, canvasH },
      svgContent,
    );

    // Update modified timestamp
    const projects = getUserProjects(user);
    const updated = projects.map((p) =>
      p.id === projectId ? { ...p, updatedAt: Date.now() } : p,
    );
    saveUserProjects(user, updated);
  }, [user, projectId, vertices, edges, canvasW, canvasH, svgContent]);

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
      const nid =
        m === "room"
          ? `${prefixRef.current}${generateUid()}`
          : `j${generateUid()}`;
      setVertices((p) => [
        ...p,
        {
          id: nid,
          type: m as NodeType,
          label: null,
          description: null,
          categoryId: m === "room" ? "PUBLIC" : null,
          aliases: [],
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
      const nv: Vertex = {
        id: `j${generateUid()}`,
        type: "junction",
        label: null,
        description: null,
        categoryId: null,
        aliases: [],
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
      if (field === "id") {
        const nid = value.trim();
        if (!nid || nid === id) return;
        setVertices((p) => p.map((v) => (v.id === id ? { ...v, id: nid } : v)));
        setEdges((p) =>
          p.map((e) => {
            const newFrom = e.from === id ? nid : e.from;
            const newTo = e.to === id ? nid : e.to;
            const [a, b] = [newFrom, newTo].sort();
            return { id: `${a}_to_${b}`, from: a, to: b };
          }),
        );
        setSelectedIds([nid]);
      } else if (field === "aliases") {
        const arr = value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        setVertices((p) =>
          p.map((v) => (v.id === id ? { ...v, aliases: arr } : v)),
        );
      } else {
        setVertices((p) =>
          p.map((v) => (v.id === id ? { ...v, [field]: value || null } : v)),
        );
      }
    } else {
      if (field === "type" || field === "categoryId") {
        setVertices((p) =>
          p.map((v) =>
            selectedIds.includes(v.id) ? { ...v, [field]: value } : v,
          ),
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

  function importSVG(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = (ev) => {
      const text = ev.target?.result as string;
      setSvgContent(text);
      const doc = new DOMParser().parseFromString(text, "image/svg+xml");
      const el = doc.querySelector("svg");
      setCanvasW(parseInt(el?.getAttribute("width") ?? "0") || 1500);
      setCanvasH(parseInt(el?.getAttribute("height") ?? "0") || 1000);
    };
    r.readAsText(file);
    e.target.value = "";
  }

  function importJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (Array.isArray(data)) {
          // Reconstruct Graph JSON with 'connection' arrays back into Edges & Vertices
          const importedVertices: Vertex[] = data.map((v) => ({
            id: v.id,
            type: v.type,
            label: v.label ?? null,
            description: v.description ?? null,
            categoryId: v.category ?? "PUBLIC",
            aliases: v.aliases ?? [],
            cx: v.cx,
            cy: v.cy,
          }));
          const importedEdges: Edge[] = [];
          const seenEdges = new Set<string>();

          data.forEach((v) => {
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
          // Fallback to legacy import format if needed
          setVertices(data.vertices ?? []);
          setEdges(data.edges ?? []);
        }
        setSelectedIds([]);
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    r.readAsText(file);
    e.target.value = "";
  }

  function dl(content: string, name: string) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([content], { type: "application/json" }),
    );
    a.download = name;
    a.click();
  }

  // UPDATED EXPORT SCHEMAS
  function exportGraph() {
    const graphJson = vertices.map((v) => {
      const connections = edges
        .filter((e) => e.from === v.id || e.to === v.id)
        .map((e) => (e.from === v.id ? e.to : e.from));

      return {
        id: v.id,
        type: v.type,
        label: v.label,
        description: v.description,
        connection: connections,
        cx: v.cx,
        cy: v.cy,
      };
    });
    dl(JSON.stringify(graphJson, null, 2), "graph_navigation.json");
  }

  function exportDB() {
    const dbJson = vertices
      .filter((v) => v.type === "room")
      .map((v) => ({
        id: v.id,
        label: v.label ?? "",
        category: (v.categoryId ?? "PUBLIC").toUpperCase(),
        aliases: v.aliases ?? [],
        description: v.description ?? "",
      }));
    dl(JSON.stringify(dbJson, null, 2), "rooms_database.json");
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

  const selectedNode =
    selectedIds.length === 1
      ? vertices.find((v) => v.id === selectedIds[0])
      : null;

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
            🖼️ Import SVG
          </button>
          <button
            style={toolBtn(false)}
            onClick={() => document.getElementById("json-inp")?.click()}
          >
            📂 Import Map JSON
          </button>
          <input
            id="svg-inp"
            type="file"
            accept=".svg"
            hidden
            onChange={importSVG}
          />
          <input
            id="json-inp"
            type="file"
            accept=".json"
            hidden
            onChange={importJSON}
          />
          {svgContent && (
            <button
              onClick={() => setSvgContent("")}
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
            PREFIX
          </span>
          <input
            value={idPrefix}
            onChange={(e) => setIdPrefix(e.target.value)}
            style={{
              width: 68,
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
              {svgContent && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: canvasW,
                    height: canvasH,
                    overflow: "hidden",
                    pointerEvents: "none",
                  }}
                  dangerouslySetInnerHTML={{ __html: svgContent }}
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
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800 }}>Node Properties</div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
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
                    <PropField
                      label="ID"
                      value={selectedNode.id}
                      onChange={(v) => liveUpdate("id", v)}
                    />
                    <PropField
                      label="Label (DB Name)"
                      value={selectedNode.label ?? ""}
                      onChange={(v) => liveUpdate("label", v)}
                      placeholder="ENT / THT & General"
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
                            Category
                          </label>
                          <select
                            value={selectedNode.categoryId ?? "PUBLIC"}
                            onChange={(e) =>
                              liveUpdate("categoryId", e.target.value)
                            }
                            style={{
                              width: "100%",
                              padding: "7px 10px",
                              border: "1px solid #e2e8f0",
                              borderRadius: 7,
                            }}
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <PropField
                          label="Aliases (comma separated)"
                          value={(selectedNode.aliases ?? []).join(", ")}
                          onChange={(v) => liveUpdate("aliases", v)}
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
                onClick={exportGraph}
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
                📊 Export Graph JSON
              </button>
              <button
                onClick={exportDB}
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
                🗄️ Export DB JSON
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
                  {["ID", "Type", "Coords"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: 6,
                        borderBottom: "1px solid #e2e8f0",
                        textAlign: "left",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vertices.slice(0, 15).map((v) => (
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
                    <td style={TD}>{v.id}</td>
                    <td style={TD}>{v.type}</td>
                    <td style={TD}>
                      {v.cx},{v.cy}
                    </td>
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
