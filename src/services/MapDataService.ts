/**
 * @file Map Data Service
 * @description Business logic for map operations, transformations, and data management
 */

import {
  Vertex,
  Edge,
  Point,
  NodeType,
  GraphPayload,
  MetadataPayload,
} from "../types";
import { generateUid, generateSlug, distance } from "../utils";
import { DEFAULT_ROOM_VALUES, SNAP_THRESHOLD } from "../constants";

/**
 * MapDataService
 * Handles map data transformations, validations, and business logic
 */
export class MapDataService {
  /**
   * Creates a new vertex (room or junction)
   */
  createVertex(
    type: NodeType,
    cx: number,
    cy: number,
    floor: string = DEFAULT_ROOM_VALUES.FLOOR,
    wings: string = DEFAULT_ROOM_VALUES.WINGS,
  ): Vertex {
    const id = generateUid();
    return {
      id,
      type,
      slug: generateSlug(floor, wings, null, type, id),
      floor,
      wings,
      label: null,
      description_id: null,
      description_en: null,
      "room-type": type === "room" ? DEFAULT_ROOM_VALUES.ROOM_TYPE : null,
      keywords: null,
      aliases: null,
      connection: [],
      cx: Math.round(cx),
      cy: Math.round(cy),
    };
  }

  /**
   * Creates an edge between two vertices
   */
  createEdge(vertexA: Vertex, vertexB: Vertex): Edge {
    const [a, b] = [vertexA.id, vertexB.id].sort();
    return {
      id: `${a}_to_${b}`,
      from: a,
      to: b,
    };
  }

  /**
   * Creates a path of junctions between two points
   */
  createPath(
    p1: Point,
    p2: Point,
    pixelSpacing: number,
    startNode: Vertex | null = null,
    endNode: Vertex | null = null,
  ): { vertices: Vertex[]; edges: Edge[] } {
    const interval = pixelSpacing || 40;
    const dist = distance(p1, p2);
    const count = Math.max(2, Math.floor(dist / interval));

    const vertices: Vertex[] = [];
    const edges: Edge[] = [];
    const segment: Vertex[] = [];

    for (let i = 0; i < count; i++) {
      if (i === 0 && startNode) {
        segment.push(startNode);
        continue;
      }
      if (i === count - 1 && endNode) {
        segment.push(endNode);
        continue;
      }

      const t = i / (count - 1);
      const vertex = this.createVertex(
        "junction",
        p1.x + (p2.x - p1.x) * t,
        p1.y + (p2.y - p1.y) * t,
      );
      vertices.push(vertex);
      segment.push(vertex);
    }

    // Create edges between segment vertices
    for (let i = 0; i < segment.length - 1; i++) {
      edges.push(this.createEdge(segment[i], segment[i + 1]));
    }

    return { vertices, edges };
  }

  /**
   * Finds nearby vertex within threshold
   */
  findNearestVertex(
    point: Point,
    vertices: Vertex[],
    scale: number = 1,
  ): Vertex | undefined {
    const threshold = SNAP_THRESHOLD / scale;
    return vertices.find(
      (v) => distance(point, { x: v.cx, y: v.cy }) < threshold,
    );
  }

  /**
   * Finds vertices within a rectangular bounds
   */
  findVerticesInRect(
    x: number,
    y: number,
    w: number,
    h: number,
    vertices: Vertex[],
  ): Vertex[] {
    return vertices.filter(
      (v) => v.cx >= x && v.cx <= x + w && v.cy >= y && v.cy <= y + h,
    );
  }

  /**
   * Updates vertex position(s)
   */
  updateVertexPosition(vertex: Vertex, dx: number, dy: number): Vertex {
    return {
      ...vertex,
      cx: vertex.cx + dx,
      cy: vertex.cy + dy,
    };
  }

  /**
   * Updates vertices property (for bulk operations)
   */
  updateVertexProperty(
    vertex: Vertex,
    field: keyof Vertex,
    value: any,
  ): Vertex {
    const updated = { ...vertex, [field]: value || null };

    // Auto-update slug when label, floor, or wings change
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

  /**
   * Deletes vertices and their associated edges
   */
  deleteVertices(
    vertices: Vertex[],
    edges: Edge[],
    vertexIds: string[],
  ): { vertices: Vertex[]; edges: Edge[] } {
    const filteredVertices = vertices.filter((v) => !vertexIds.includes(v.id));
    const filteredEdges = edges.filter(
      (e) => !vertexIds.includes(e.from) && !vertexIds.includes(e.to),
    );

    return { vertices: filteredVertices, edges: filteredEdges };
  }

  /**
   * Adds an edge between two vertices if it doesn't exist
   */
  addEdge(edges: Edge[], vertexA: Vertex, vertexB: Vertex): Edge[] {
    const [a, b] = [vertexA.id, vertexB.id].sort();
    const edgeId = `${a}_to_${b}`;

    // Prevent duplicate edges
    if (edges.some((e) => e.id === edgeId)) {
      return edges;
    }

    return [...edges, { id: edgeId, from: a, to: b }];
  }

  /**
   * Converts vertices to graph payload for API
   */
  verticesToGraphPayload(vertices: Vertex[], edges: Edge[]): GraphPayload[] {
    return vertices.map((v) => ({
      id: v.id,
      type: v.type,
      connection: edges
        .filter((e) => e.from === v.id || e.to === v.id)
        .map((e) => (e.from === v.id ? e.to : e.from)),
      cx: v.cx,
      cy: v.cy,
    }));
  }

  /**
   * Converts vertices to metadata payload for API
   */
  verticesToMetadataPayload(vertices: Vertex[]): MetadataPayload[] {
    return vertices
      .filter((v) => {
        if (v.type === "room") return true;

        // Junctions only included if they have content
        const hasContent =
          (v.label && v.label.trim() !== "") ||
          (v.description_id && v.description_id.trim() !== "") ||
          (v.description_en && v.description_en.trim() !== "");

        return hasContent;
      })
      .map((v) => ({
        id: v.id,
        type: v.type,
        slug: v.slug || "",
        label: v.label || "",
        floor: String(v.floor || ""),
        wings: v.wings || "",
        "room-type": v["room-type"] || (v.type === "room" ? "PUBLIC" : null),
        keywords: v.keywords || "",
        aliases: v.aliases || "",
        description_id: v.description_id || "",
        description_en: v.description_en || "",
      }));
  }

  /**
   * Imports vertices from JSON data
   */
  importVerticesFromJson(data: any[]): Vertex[] {
    return data.map((v: any) => {
      const tempId = v.id || generateUid();
      return {
        id: tempId,
        type: v.type || "junction",
        slug:
          v.slug ||
          generateSlug(
            v.floor || DEFAULT_ROOM_VALUES.FLOOR,
            v.wings || DEFAULT_ROOM_VALUES.WINGS,
            v.label ?? null,
            v.type || "junction",
            tempId,
          ),
        floor: v.floor || DEFAULT_ROOM_VALUES.FLOOR,
        wings: v.wings || DEFAULT_ROOM_VALUES.WINGS,
        label: v.label ?? null,
        description_id: v.description_id ?? null,
        description_en: v.description_en ?? null,
        "room-type":
          v["room-type"] ?? v.categoryId ?? DEFAULT_ROOM_VALUES.ROOM_TYPE,
        keywords: v.keywords ?? null,
        aliases: Array.isArray(v.aliases)
          ? v.aliases.join(", ")
          : v.aliases || null,
        connection: v.connection || [],
        cx: v.cx,
        cy: v.cy,
      };
    });
  }

  /**
   * Imports edges from vertices (deduplicates and normalizes)
   */
  importEdgesFromVertices(vertices: Vertex[]): Edge[] {
    const edges: Edge[] = [];
    const seenEdges = new Set<string>();

    vertices.forEach((v) => {
      if (Array.isArray(v.connection)) {
        v.connection.forEach((targetId: string) => {
          const [a, b] = [v.id, targetId].sort();
          const edgeId = `${a}_to_${b}`;

          if (!seenEdges.has(edgeId)) {
            seenEdges.add(edgeId);
            edges.push({ id: edgeId, from: a, to: b });
          }
        });
      }
    });

    return edges;
  }
}

// Export singleton instance
export const mapDataService = new MapDataService();
