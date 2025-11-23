import { createStore, StoreApi } from 'zustand/vanilla';
import { GridModel } from './GridModel';
import { Viewport } from './Viewport';
import { CanvasRenderer } from '../renderer/CanvasRenderer';
import { InputController } from './InputController';
import { AIStreamer } from '../services/AIStreamer';
import { GridSelection, GridTheme } from '../types/grid';

export interface GridEngineState {
    selection: GridSelection | null;
    isDragging: boolean;
    isFilling: boolean;
    fillRange: GridSelection | null;
    hoverPosition: { x: number; y: number } | null;  // For tooltips
    editingCell: { col: number; row: number } | null;
}

export class GridEngine {
    // Core components
    public model: GridModel;
    public viewport: Viewport;
    public store: StoreApi<GridEngineState>;
    public theme: GridTheme;

    // Rendering
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private renderer: CanvasRenderer | null = null;
    private rafId: number | null = null;

    // Input
    private inputController: InputController | null = null;

    // AI
    public aiStreamer: AIStreamer | null = null;

    constructor() {
        this.model = new GridModel();
        this.viewport = new Viewport({
            width: 800,
            height: 600
        });

        this.theme = {
            headerHeight: 40,
            rowHeight: 32,
            rowHeaderWidth: 50,
            borderColor: '#e5e7eb',
            gridLineColor: 'rgba(0, 0, 0, 0.05)',
            headerBackgroundColor: '#f9fafb',
            selectionColor: 'rgba(59, 130, 246, 0.1)',
            selectionBorderColor: '#3b82f6',
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
            headerFontFamily: 'Inter, sans-serif',
            headerFontSize: 12,
        };

        this.store = createStore<GridEngineState>(() => ({
            selection: null,
            isDragging: false,
            isFilling: false,
            fillRange: null,
            hoverPosition: null,
            editingCell: null,
        }));
    }

    // --- Initialization ---
    mount(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d', { alpha: false });
        this.ctx = ctx;

        if (this.ctx) {
            this.renderer = new CanvasRenderer(this, this.ctx);
        }
        this.inputController = new InputController(this);
        this.inputController.mount(canvas);
        this.aiStreamer = new AIStreamer(this);
        this.startLoop();
    }

    unmount() {
        this.stopLoop();
        if (this.inputController && this.canvas) {
            this.inputController.unmount(this.canvas);
            this.inputController = null;
        }
        this.canvas = null;
        this.ctx = null;
        this.renderer = null;
    }

    // --- Render Loop ---
    private startLoop() {
        if (this.rafId) return;
        const loop = () => {
            this.render();
            this.rafId = requestAnimationFrame(loop);
        };
        this.rafId = requestAnimationFrame(loop);
    }

    private stopLoop() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    private render() {
        if (this.renderer) {
            this.renderer.render();
        }
    }

    // --- Actions ---
    resize(width: number, height: number) {
        this.viewport.updateState({ width, height });
    }

    scroll(scrollTop: number, scrollLeft: number) {
        this.viewport.updateState({ scrollTop, scrollLeft });
    }
}
