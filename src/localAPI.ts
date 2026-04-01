// src/localApi.ts
const API_BASE = 'http://localhost:3001/api';

export async function saveMapToCloud(projectId: string, data: any) {
  try {
    await fetch(`${API_BASE}/maps/${projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error("Failed to save to local API:", error);
  }
}

export async function loadMapFromCloud(projectId: string) {
  try {
    const res = await fetch(`${API_BASE}/maps/${projectId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Failed to load from local API:", error);
    return null;
  }
}

export async function uploadSvgToCloud(projectId: string, svgContent: string): Promise<string | null> {
  if (!svgContent) return null;
  try {
    const res = await fetch(`${API_BASE}/maps/${projectId}/svg`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ svgContent }),
    });
    const data = await res.json();
    return data.url; // Returns the local URL (e.g., http://localhost:3001/data/floor-1.svg)
  } catch (error) {
    console.error("Failed to upload SVG locally:", error);
    return null;
  }
}