/**
 * @file Authentication Service
 * @description Handles authentication logic and session management
 */

import { STORAGE_KEYS } from "../constants";
import { AuthRequest, AuthResponse } from "../types";
import { apiService } from "./APIService";

/**
 * AuthService
 * Manages user authentication, token storage, and session
 */
export class AuthService {
  /**
   * Gets the current authenticated user
   */
  getSession(): string | null {
    return sessionStorage.getItem(STORAGE_KEYS.USER);
  }

  /**
   * Sets the current user session
   */
  setSession(username: string): void {
    sessionStorage.setItem(STORAGE_KEYS.USER, username);
  }

  /**
   * Gets the stored JWT token
   */
  getToken(): string | null {
    return sessionStorage.getItem(STORAGE_KEYS.TOKEN);
  }

  /**
   * Sets the JWT token
   */
  setToken(token: string): void {
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, token);
  }

  /**
   * Checks if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getSession() && !!this.getToken();
  }

  /**
   * Registers a new user
   */
  async register(request: AuthRequest): Promise<void> {
    const response = await apiService.register(request);
    // Registration successful, user needs to login
  }

  /**
   * Logs in a user
   */
  async login(request: AuthRequest): Promise<string> {
    const response = await apiService.login(request);
    this.setToken(response.token);
    this.setSession(response.username);
    return response.username;
  }

  /**
   * Logs out the current user
   */
  logout(): void {
    sessionStorage.removeItem(STORAGE_KEYS.SESSION);
    sessionStorage.removeItem(STORAGE_KEYS.USER);
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
  }

  /**
   * Clears all session data
   */
  clearSession(): void {
    this.logout();
  }
}

// Export singleton instance
export const authService = new AuthService();
