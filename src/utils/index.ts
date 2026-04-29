/**
 * @file Utility Functions
 * @description Pure utility functions for common operations
 */

import { Point, Vertex, NodeType, GraphNode } from "../types";

/**
 * Generates a UUID v4 compatible string
 * Falls back to manual generation if crypto API is unavailable
 */
export function generateUid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generates a URL-friendly slug from node properties
 * @param floor - Floor number
 * @param wings - Wing name
 * @param label - Node label/name
 * @param type - Node type (room or junction)
 * @param id - Node ID (used for uniqueness)
 */
export function generateSlug(
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

/**
 * Calculates Euclidean distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Interpolates between two points by parameter t (0-1)
 */
export function lerp(p1: Point, p2: Point, t: number): Point {
  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
  };
}

/**
 * Checks if a point is within a rectangular bounds
 */
export function pointInRect(
  point: Point,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  return point.x >= x && point.x <= x + w && point.y >= y && point.y <= y + h;
}

/**
 * Rounds a point's coordinates to nearest integer
 */
export function roundPoint(p: Point): Point {
  return {
    x: Math.round(p.x),
    y: Math.round(p.y),
  };
}

/**
 * Clamps a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Parses JSON safely, returning null on failure
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Serializes data to JSON string safely
 */
export function safeJsonStringify(data: any): string {
  try {
    return JSON.stringify(data);
  } catch {
    return "{}";
  }
}
