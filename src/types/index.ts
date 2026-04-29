/**
 * @file Core Type Definitions
 * @description Central location for all TypeScript types and interfaces
 */

// ==========================================
// TOOL & MODE TYPES
// ==========================================
export type NodeType = "room" | "junction";
export type ToolMode = "draw" | "room" | "junction" | "connect" | "select";
export type TableView = "graph" | "db";

// ==========================================
// GRAPH NODE TYPES
// ==========================================

/** Part 1: The Spatial "Skeleton" - Core graph structure */
export interface GraphNode {
  id: string;
  type: "room" | "junction";
  connection: string[];
  cx: number;
  cy: number;
}

/** Part 2: The Metadata "Brain" - Metadata for rooms and junctions */
export interface RoomMetadata {
  id: string;
  slug: string;
  label: string | null;
  floor: string;
  wings: string;
  description_id: string | null;
  description_en: string | null;
  "room-type": string | null;
  keywords: string | null;
  aliases: string | null;
}

/** The UI Type - Intersection of graph structure and metadata */
export type Vertex = GraphNode & Partial<RoomMetadata>;

// ==========================================
// EDGE & CONNECTION TYPES
// ==========================================
export interface Edge {
  id: string;
  from: string;
  to: string;
}

// ==========================================
// TRANSFORM & CANVAS TYPES
// ==========================================
export interface Transform {
  scale: number;
  tx: number;
  ty: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface PreviewLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface MarqueeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ==========================================
// PROJECT & MAP TYPES
// ==========================================
interface MapProject {
  id: string;
  name: string; // This becomes the Floor name
  hospital: string; // e.g., "St. Mary's"
  building: string; // e.g., "North Wing"
  updatedAt: number;
}

export interface MapData {
  id: string;
  canvasW: number;
  canvasH: number;
  vertices: Vertex[];
  svgUrl: string | null;
}

// ==========================================
// API REQUEST/RESPONSE TYPES
// ==========================================
export interface GraphPayload {
  id: string;
  type: NodeType;
  connection: string[];
  cx: number;
  cy: number;
}

export interface MetadataPayload {
  id: string;
  type: NodeType;
  slug: string;
  label: string;
  floor: string;
  wings: string;
  "room-type": string | null;
  keywords: string;
  aliases: string;
  description_id: string;
  description_en: string;
}

export interface SyncPayload {
  graph: GraphPayload[];
  rooms: MetadataPayload[];
}

// ==========================================
// INTERACTION STATE TYPES
// ==========================================
export interface InteractionState {
  x: number;
  y: number;
  tx?: number;
  ty?: number;
}

// ==========================================
// AUTH TYPES
// ==========================================
export interface AuthRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  username: string;
}
