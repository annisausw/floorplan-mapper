/**
 * @file Export Service
 * @description Service for handling data export operations
 */

import { API_URL, API_ENDPOINTS } from "../constants";
import { SessionManager } from "./SessionManager";

/**
 * ExportService
 * Manages exports of map data in various formats
 */
export class ExportService {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Exports map as graph JSON format
   */
  async exportGraphJson(projectId: string): Promise<Blob> {
    const url = `${this.baseUrl}${API_ENDPOINTS.EXPORT_GRAPH(projectId)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: SessionManager.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to export graph data");
    }

    return response.blob();
  }

  /**
   * Exports map as database JSON format
   */
  async exportDatabaseJson(projectId: string): Promise<Blob> {
    const url = `${this.baseUrl}${API_ENDPOINTS.EXPORT_DB(projectId)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: SessionManager.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to export database data");
    }

    return response.blob();
  }

  /**
   * Downloads a blob as a file
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Create singleton instance
export const exportService = new ExportService();
