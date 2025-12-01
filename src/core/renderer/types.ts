/**
 * Renderer Types - Interfaces for pluggable rendering
 * 
 * The GridRenderer interface allows different rendering implementations
 * (Canvas, React/HTML, WebGL, etc.) to be used interchangeably.
 */

import type { GridTheme } from '../types/grid';
import type { GridEngine } from '../engine/GridEngine';

// ============================================================================
// Grid Renderer Interface
// ============================================================================

export interface GridRenderer {
  /**
   * Attach the renderer to a container element
   */
  attach(container: HTMLElement): void;
  
  /**
   * Detach the renderer and clean up
   */
  detach(): void;
  
  /**
   * Render a frame
   */
  render(): void;
  
  /**
   * Get the canvas/container element (for input handling)
   */
  getElement(): HTMLElement | null;
  
  /**
   * Set the device pixel ratio (for HiDPI displays)
   */
  setPixelRatio?(ratio: number): void;
  
  /**
   * Force a full repaint (e.g., after theme change)
   */
  invalidate?(): void;
}

/**
 * Base class for renderers to share common logic
 */
export abstract class BaseRenderer implements GridRenderer {
    protected engine: GridEngine;
    protected container: HTMLElement | null = null;

    constructor(engine: GridEngine) {
        this.engine = engine;
    }

    abstract attach(container: HTMLElement): void;
    abstract detach(): void;
    abstract render(): void;
    abstract getElement(): HTMLElement | null;
    
    setPixelRatio(ratio: number): void {
        // Default no-op
    }

    invalidate(): void {
        this.render();
    }

    // Helper to get theme
    protected get theme(): GridTheme {
        return this.engine.theme;
    }
}

// ============================================================================
// Input Events - What the renderer captures and passes to the engine
// ============================================================================

export interface GridInputEvent {
  type: 'mousedown' | 'mouseup' | 'mousemove' | 'dblclick' | 'wheel' | 'keydown' | 'keyup';
  x: number;
  y: number;
  button?: number;
  modifiers: {
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
  };
  key?: string;
  deltaX?: number;
  deltaY?: number;
  originalEvent: Event;
}

export interface GridInputHandler {
  handleMouseDown(event: GridInputEvent): void;
  handleMouseMove(event: GridInputEvent): void;
  handleMouseUp(event: GridInputEvent): void;
  handleDoubleClick(event: GridInputEvent): void;
  handleWheel(event: GridInputEvent): void;
  handleKeyDown(event: GridInputEvent): void;
  handleKeyUp(event: GridInputEvent): void;
}

// ============================================================================
// Theme Extensions for Renderers
// ============================================================================

export interface RendererTheme extends GridTheme {
  // Canvas-specific
  antialiasing?: boolean;
  
  // Animation
  animationDuration?: number;
  
  // Shadows
  shadowColor?: string;
  shadowBlur?: number;
}

// ============================================================================
// Factory Types
// ============================================================================

export type GridRendererFactory = () => GridRenderer;

export interface RendererOptions {
  pixelRatio?: number;
  antialiasing?: boolean;
  theme?: Partial<RendererTheme>;
}
