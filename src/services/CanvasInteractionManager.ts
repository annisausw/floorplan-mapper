/**
 * @file Canvas Interaction Manager
 * @description Manages canvas interaction state and logic
 */

import { Point, Vertex, PreviewLine, MarqueeRect } from "../types";

/**
 * CanvasInteractionManager
 * Encapsulates canvas interaction state and logic
 */
export class CanvasInteractionManager {
  private isDrawing: boolean = false;
  private isDragging: boolean = false;
  private isPanning: boolean = false;
  private isSelecting: boolean = false;
  private snapStart: Vertex | null = null;
  private interactStart: {
    x: number;
    y: number;
    tx?: number;
    ty?: number;
  } | null = null;

  /**
   * Sets drawing state
   */
  setDrawing(value: boolean): void {
    this.isDrawing = value;
  }

  /**
   * Gets drawing state
   */
  getDrawing(): boolean {
    return this.isDrawing;
  }

  /**
   * Sets dragging state
   */
  setDragging(value: boolean): void {
    this.isDragging = value;
  }

  /**
   * Gets dragging state
   */
  getDragging(): boolean {
    return this.isDragging;
  }

  /**
   * Sets panning state
   */
  setPanning(value: boolean): void {
    this.isPanning = value;
  }

  /**
   * Gets panning state
   */
  getPanning(): boolean {
    return this.isPanning;
  }

  /**
   * Sets selecting state
   */
  setSelecting(value: boolean): void {
    this.isSelecting = value;
  }

  /**
   * Gets selecting state
   */
  getSelecting(): boolean {
    return this.isSelecting;
  }

  /**
   * Sets the snapping start vertex
   */
  setSnapStart(vertex: Vertex | null): void {
    this.snapStart = vertex;
  }

  /**
   * Gets the snapping start vertex
   */
  getSnapStart(): Vertex | null {
    return this.snapStart;
  }

  /**
   * Sets the interaction start point
   */
  setInteractStart(
    point: { x: number; y: number; tx?: number; ty?: number } | null,
  ): void {
    this.interactStart = point;
  }

  /**
   * Gets the interaction start point
   */
  getInteractStart(): {
    x: number;
    y: number;
    tx?: number;
    ty?: number;
  } | null {
    return this.interactStart;
  }

  /**
   * Resets all interaction states
   */
  reset(): void {
    this.isDrawing = false;
    this.isDragging = false;
    this.isPanning = false;
    this.isSelecting = false;
    this.snapStart = null;
    this.interactStart = null;
  }

  /**
   * Gets all interaction states as an object
   */
  getState() {
    return {
      isDrawing: this.isDrawing,
      isDragging: this.isDragging,
      isPanning: this.isPanning,
      isSelecting: this.isSelecting,
      snapStart: this.snapStart,
      interactStart: this.interactStart,
    };
  }
}
