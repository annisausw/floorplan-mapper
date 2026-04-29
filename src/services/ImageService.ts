/**
 * @file Image Service
 * @description Service for handling image operations (upload, fetch, download)
 */

import { API_URL, API_ENDPOINTS } from "../constants";
import { SessionManager } from "./SessionManager";

interface UploadImageResult {
  url: string;
  canvasW?: number;
  canvasH?: number;
}

/**
 * ImageService
 * Manages image uploads, retrievals, and downloads
 */
export class ImageService {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Uploads an SVG background image for a project
   */
  async uploadSvgBackground(
    projectId: string,
    file: File,
  ): Promise<UploadImageResult> {
    const formData = new FormData();
    formData.append("file", file);

    const url = `${this.baseUrl}${API_ENDPOINTS.UPLOAD_SVG(projectId)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SessionManager.getToken()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Image upload failed");
    }

    return response.json();
  }

  /**
   * Generates a cropped image between two focus points
   */
  async generateCroppedImage(
    projectId: string,
    focusFrom: string,
    focusTo: string,
  ): Promise<string> {
    const url = `${this.baseUrl}${API_ENDPOINTS.GENERATE_IMAGE(projectId)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: SessionManager.getAuthHeaders(),
      body: JSON.stringify({ focusFrom, focusTo }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Image generation failed");
    }

    const data = await response.json();
    return data.url;
  }

  /**
   * Fetches a secure image blob by URL
   */
  async fetchSecureImage(imageUrl: string): Promise<Blob> {
    const response = await fetch(imageUrl, {
      headers: SessionManager.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch image");
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
export const imageService = new ImageService();
