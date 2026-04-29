/**
 * @file Application Constants
 * @description Centralized configuration and magic values
 */

// ==========================================
// API CONFIGURATION
// ==========================================
export const API_URL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:8080";

// ==========================================
// STORAGE KEYS
// ==========================================
export const STORAGE_KEYS = {
  TOKEN: "fp_token",
  USER: "fp_user",
  SESSION: "fp_session",
} as const;

// ==========================================
// UI CONSTANTS
// ==========================================
export const CATEGORIES = [
  "CIRCULATION",
  "SERVICE",
  "CLINIC",
  "TOILET",
  "PUBLIC",
] as const;

// ==========================================
// CANVAS DEFAULTS
// ==========================================
export const CANVAS_DEFAULTS = {
  WIDTH: 1500,
  HEIGHT: 1000,
  PIXEL_SPACING: 40,
  GRID_SIZE: 50,
} as const;

// ==========================================
// NODE SIZES
// ==========================================
export const NODE_SIZES = {
  SELECTED_RADIUS: 11,
  ROOM_RADIUS: 9,
  JUNCTION_RADIUS: 7,
} as const;

// ==========================================
// STROKE SIZES
// ==========================================
export const STROKE_SIZES = {
  EDGE: 3,
  NODE_SELECTED: 3.5,
  NODE_DEFAULT: 2,
  PREVIEW_LINE: 2,
  MARQUEE: 1,
} as const;

// ==========================================
// TOOL MODES
// ==========================================
export const TOOL_MODES = {
  DRAW: "draw",
  ROOM: "room",
  JUNCTION: "junction",
  CONNECT: "connect",
  SELECT: "select",
} as const;

// ==========================================
// TABLE VIEWS
// ==========================================
export const TABLE_VIEWS = {
  GRAPH: "graph",
  DB: "db",
} as const;

// ==========================================
// HISTORY
// ==========================================
export const HISTORY_MAX_SIZE = 50;

// ==========================================
// ZOOM LIMITS
// ==========================================
export const ZOOM = {
  MIN: 0.05,
  MAX: 20,
} as const;

// ==========================================
// SNAP THRESHOLD (pixels)
// ==========================================
export const SNAP_THRESHOLD = 20;

// ==========================================
// DRAW PATH SETTINGS
// ==========================================
export const PATH_SETTINGS = {
  MIN_DISTANCE: 5,
} as const;

// ==========================================
// DEFAULT ROOM VALUES
// ==========================================
export const DEFAULT_ROOM_VALUES = {
  FLOOR: "1",
  WINGS: "Main",
  ROOM_TYPE: "PUBLIC",
} as const;

// ==========================================
// COLOR PALETTE
// ==========================================
export const COLORS = {
  ROOM: "#ef4444",
  JUNCTION: "#3b82f6",
  SELECTED: "#fbbf24",
  EDGE: "#1e293b",
  PREVIEW: "#22c55e",
  MARQUEE_FILL: "rgba(59,130,246,0.08)",
  MARQUEE_STROKE: "#3b82f6",
} as const;

// ==========================================
// API ENDPOINTS
// ==========================================
export const API_ENDPOINTS = {
  AUTH_REGISTER: "/auth/register",
  AUTH_LOGIN: "/auth/login",
  MAPS: "/maps",
  MAP_DETAIL: (id: string) => `/maps/${id}`,
  MAP_GRAPH: (id: string) => `/maps/${id}/graph`,
  MAP_ROOMS: (id: string) => `/maps/${id}/rooms`,
  MAP_SVG: (id: string) => `/maps/${id}/svg`,
  MAP_CROP: (id: string) => `/maps/${id}/crop`,
  MAP_EXPORT: (id: string, type: "graph" | "db") =>
    `/maps/${id}/export/${type}`,
  MAP_DELETE: (id: string) => `/maps/${id}`,
} as const;
