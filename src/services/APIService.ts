/**
 * @file API Service
 * @description Centralized API client for backend communication
 */

import { API_URL, API_ENDPOINTS } from "../constants";
import { SessionManager } from "./SessionManager";
import {
  MapProject,
  MapData,
  Vertex,
  Edge,
  GraphPayload,
  MetadataPayload,
  AuthRequest,
  AuthResponse,
} from "../types";

export interface CreateMapPayload {
  name: string;
  hospitalId: string;
  hospitalName: string;
  buildingId: string;
  buildingName: string;
}

/**
 * APIService
 * Handles all backend API communication with proper error handling
 */
export class APIService {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: SessionManager.getAuthHeaders(),
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // ==========================================
  // AUTHENTICATION
  // ==========================================

  async register(request: AuthRequest): Promise<AuthResponse> {
    return this.fetch<AuthResponse>(API_ENDPOINTS.AUTH_REGISTER, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async login(request: AuthRequest): Promise<AuthResponse> {
    return this.fetch<AuthResponse>(API_ENDPOINTS.AUTH_LOGIN, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  // ==========================================
  // PROJECTS / MAPS
  // ==========================================

  async listMaps(): Promise<MapProject[]> {
    return this.fetch<MapProject[]>(API_ENDPOINTS.MAPS);
  }

  async getMapDetail(mapId: string): Promise<MapData> {
    return this.fetch<MapData>(API_ENDPOINTS.MAP_DETAIL(mapId));
  }

  async createMap(payload: CreateMapPayload) {
    const token = localStorage.getItem("token");
    const response = await fetch(`${this.baseUrl}/maps`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      try {
        const errorData = await response.json();

        throw new Error(
          errorData.error || errorData.message || `Error ${response.status}`,
        );
      } catch (parseError) {
        throw new Error(`Request failed with status ${response.status}`);
      }
    }

    return response.json();
  }

  async deleteMap(mapId: string): Promise<void> {
    await this.fetch<void>(API_ENDPOINTS.MAP_DELETE(mapId), {
      method: "DELETE",
    });
  }

  // ==========================================
  // GRAPH & SPATIAL DATA
  // ==========================================

  async syncGraphData(
    mapId: string,
    graphPayload: GraphPayload[],
  ): Promise<void> {
    await this.fetch<void>(API_ENDPOINTS.MAP_GRAPH(mapId), {
      method: "PUT",
      body: JSON.stringify({ graph: graphPayload }),
    });
  }

  async syncMetadata(
    mapId: string,
    metadataPayload: MetadataPayload[],
  ): Promise<void> {
    await this.fetch<void>(API_ENDPOINTS.MAP_ROOMS(mapId), {
      method: "PUT",
      body: JSON.stringify({ rooms: metadataPayload }),
    });
  }

  async syncBothGraphAndMetadata(
    mapId: string,
    graph: GraphPayload[],
    rooms: MetadataPayload[],
  ): Promise<void> {
    const results = await Promise.all([
      this.syncGraphData(mapId, graph),
      this.syncMetadata(mapId, rooms),
    ]);

    if (!results) {
      throw new Error("Sync failed on one or more endpoints.");
    }
  }

  // ==========================================
  // SVG & IMAGES
  // ==========================================

  async uploadSvgBackground(
    mapId: string,
    file: File,
  ): Promise<{ url: string; canvasW: number; canvasH: number }> {
    const formData = new FormData();
    formData.append("svgFile", file);

    const url = `${this.baseUrl}${API_ENDPOINTS.MAP_SVG(mapId)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SessionManager.getToken()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload SVG");
    }

    return response.json();
  }

  async generateCroppedImage(
    mapId: string,
    fromNodeId: string,
    toNodeId: string,
  ): Promise<string> {
    const data = await this.fetch<{ url?: string; data?: { url: string } }>(
      API_ENDPOINTS.MAP_CROP(mapId),
      {
        method: "POST",
        body: JSON.stringify({ from: fromNodeId, to: toNodeId }),
      },
    );
    return data.url || data.data?.url || "";
  }

  async fetchSecureImage(imageUrl: string): Promise<Blob> {
    const response = await fetch(imageUrl, {
      headers: SessionManager.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Could not fetch protected image");
    }

    return response.blob();
  }

  // ==========================================
  // EXPORTS
  // ==========================================

  async exportGraphJson(mapId: string): Promise<Blob> {
    const response = await fetch(
      `${this.baseUrl}${API_ENDPOINTS.MAP_EXPORT(mapId, "graph")}`,
      { headers: this.getAuthHeaders() },
    );
    return response.blob();
  }

  async exportDatabaseJson(mapId: string): Promise<Blob> {
    const response = await fetch(
      `${this.baseUrl}${API_ENDPOINTS.MAP_EXPORT(mapId, "db")}`,
      { headers: this.getAuthHeaders() },
    );
    return response.blob();
  }

  // ==========================================
  // HELPER UTILITIES
  // ==========================================

  /**
   * Downloads a blob as a file
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

// Export singleton instance
export const apiService = new APIService();
