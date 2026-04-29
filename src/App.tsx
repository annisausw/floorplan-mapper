/**
 * @file Main Application Component
 * @description Root component that orchestrates authentication, project selection, and floorplan editing
 */

import React, { useState, useCallback } from "react";
import { SessionManager } from "./services/SessionManager";
import { AuthScreen } from "./components/AuthScreen";
import { ProjectSelectionScreen } from "./components/ProjectSelectionScreen";
import { FloorplanMapper } from "./components/FloorplanMapper";

interface AppState {
  currentUser: string | null;
  currentProjectId: string | null;
}

/**
 * App Component
 * Main application orchestrator with authentication and project management
 */
export default function App() {
  const [appState, setAppState] = useState<AppState>({
    currentUser: SessionManager.getUser(),
    currentProjectId: null,
  });

  /**
   * Handles user login
   */
  const handleLogin = useCallback((username: string) => {
    setAppState((prev) => ({
      ...prev,
      currentUser: username,
    }));
  }, []);

  /**
   * Handles user logout
   */
  const handleLogout = useCallback(() => {
    SessionManager.clearSession();
    setAppState({
      currentUser: null,
      currentProjectId: null,
    });
  }, []);

  /**
   * Handles project selection
   */
  const handleSelectProject = useCallback((projectId: string) => {
    setAppState((prev) => ({
      ...prev,
      currentProjectId: projectId,
    }));
  }, []);

  /**
   * Handles back from project (return to project selection)
   */
  const handleBackToProjects = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      currentProjectId: null,
    }));
  }, []);

  // ==========================================
  // CONDITIONAL RENDERING BASED ON STATE
  // ==========================================

  // Show auth screen if not logged in
  if (!appState.currentUser) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  // Show project selection if logged in but no project selected
  if (!appState.currentProjectId) {
    return (
      <ProjectSelectionScreen
        user={appState.currentUser}
        onSelectProject={handleSelectProject}
        onLogout={handleLogout}
      />
    );
  }

  // Show floorplan editor if project selected
  return (
    <FloorplanMapper
      user={appState.currentUser}
      projectId={appState.currentProjectId}
      onBack={handleBackToProjects}
    />
  );
}
