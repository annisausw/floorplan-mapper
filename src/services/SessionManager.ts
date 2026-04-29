/**
 * @file Session Manager
 * @description Centralized session and authentication state management
 */

import { STORAGE_KEYS } from "../constants";

/**
 * SessionManager
 * Handles user session, token, and authentication state management
 */
export class SessionManager {
  /**
   * Gets the currently logged-in user from session storage
   */
  static getUser(): string | null {
    return sessionStorage.getItem(STORAGE_KEYS.USER);
  }

  /**
   * Sets the logged-in user in session storage
   */
  static setUser(username: string): void {
    sessionStorage.setItem(STORAGE_KEYS.USER, username);
  }

  /**
   * Gets the authentication token from session storage
   */
  static getToken(): string | null {
    return sessionStorage.getItem(STORAGE_KEYS.TOKEN);
  }

  /**
   * Sets the authentication token in session storage
   */
  static setToken(token: string): void {
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, token);
  }

  /**
   * Checks if user is authenticated
   */
  static isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getUser();
  }

  /**
   * Clears all session data (logout)
   */
  static clearSession(): void {
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.USER);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION);
  }

  /**
   * Gets authorization headers with JWT token
   */
  static getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }
}
