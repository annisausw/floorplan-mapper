/**
 * @file Project Manager
 * @description Service for managing project/map operations
 */

import { MapProject } from "../types";
import { apiService } from "./APIService";

/**
 * ProjectManager
 * Handles project/map CRUD operations and management
 */
export class ProjectManager {
  /**
   * Fetches all projects for the current user
   */
  async listProjects(): Promise<MapProject[]> {
    const projects = await apiService.listMaps();
    return projects.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Creates a new project with the given name
   */
  async createProject(name: string): Promise<string> {
    const result = await apiService.createMap(name);
    return result.mapId;
  }

  /**
   * Deletes a project by ID
   */
  async deleteProject(projectId: string): Promise<void> {
    await apiService.deleteMap(projectId);
  }

  /**
   * Prompts user for project name and creates a new project
   */
  async createProjectInteractive(): Promise<string | null> {
    const name = prompt("Enter new map name:", "Floor 1 Map");
    if (!name) return null;

    try {
      return await this.createProject(name);
    } catch (err) {
      console.error("Failed to create project:", err);
      alert("Failed to create map");
      return null;
    }
  }

  /**
   * Prompts user for confirmation and deletes a project
   */
  async deleteProjectInteractive(projectId: string): Promise<boolean> {
    if (
      !confirm(
        "Are you sure you want to delete this map? This cannot be undone.",
      )
    ) {
      return false;
    }

    try {
      await this.deleteProject(projectId);
      return true;
    } catch (err) {
      console.error("Failed to delete project:", err);
      alert("Failed to delete map");
      return false;
    }
  }
}

// Create singleton instance
export const projectManager = new ProjectManager();
