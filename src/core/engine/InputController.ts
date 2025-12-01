import { GridEngine } from './GridEngine';
import { KeyboardHandler } from './KeyboardHandler';
import { MouseHandler } from './MouseHandler';

/**
 * InputController - Coordinates mouse and keyboard input
 * Delegates to specialized handlers for cleaner separation of concerns
 */
export class InputController {
    public keyboardHandler: KeyboardHandler;
    public mouseHandler: MouseHandler;

    constructor(engine: GridEngine) {
        this.keyboardHandler = new KeyboardHandler(engine);
        this.mouseHandler = new MouseHandler(engine);
    }

    mount(canvas: HTMLCanvasElement) {
        // Mouse events
        canvas.addEventListener('mousedown', this.mouseHandler.handleMouseDown);
        canvas.addEventListener('mousemove', this.mouseHandler.handleMouseMove);
        canvas.addEventListener('mouseup', this.mouseHandler.handleMouseUp);
        canvas.addEventListener('dblclick', this.mouseHandler.handleDoubleClick);
        canvas.addEventListener('contextmenu', this.mouseHandler.onContextMenu);
        canvas.addEventListener('wheel', this.handleWheel, { passive: false }); // Added

        // Keyboard events (Canvas focus)
        canvas.addEventListener('keydown', this.keyboardHandler.handleKeyDown);

        // Clipboard events (Global)
        // We listen globally because clicking headers removes focus from canvas
        document.addEventListener('copy', this.handleCopy);
        document.addEventListener('cut', this.handleCut);
        document.addEventListener('paste', this.handlePaste);

        // Make canvas focusable
        canvas.tabIndex = 0;
        canvas.focus();
    }

    unmount(canvas: HTMLCanvasElement) {
        canvas.removeEventListener('mousedown', this.mouseHandler.handleMouseDown);
        canvas.removeEventListener('mousemove', this.mouseHandler.handleMouseMove);
        canvas.removeEventListener('mouseup', this.mouseHandler.handleMouseUp);
        canvas.removeEventListener('dblclick', this.mouseHandler.handleDoubleClick);
        canvas.removeEventListener('contextmenu', this.mouseHandler.onContextMenu);
        canvas.removeEventListener('wheel', this.handleWheel); // Added
        canvas.removeEventListener('keydown', this.keyboardHandler.handleKeyDown);

        document.removeEventListener('copy', this.handleCopy);
        document.removeEventListener('cut', this.handleCut);
        document.removeEventListener('paste', this.handlePaste);
    }

    private handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        
        const { scrollTop, scrollLeft } = this.engine.viewport.getState();
        const { deltaX, deltaY } = e;

        // Simple scrolling with debug
        const newTop = Math.max(0, scrollTop + deltaY);
        const newLeft = Math.max(0, scrollLeft + deltaX);

        this.engine.scroll(newTop, newLeft);
    };


    private handleCopy = (e: ClipboardEvent) => {
        if (this.isInputEvent(e)) return;
        this.keyboardHandler.onCopy(e);
    };

    private handleCut = (e: ClipboardEvent) => {
        if (this.isInputEvent(e)) return;
        this.keyboardHandler.onCut(e);
    };

    private handlePaste = (e: ClipboardEvent) => {
        if (this.isInputEvent(e)) return;
        this.keyboardHandler.onPaste(e);
    };

    private isInputEvent(e: Event): boolean {
        const target = e.target as HTMLElement;
        return target.tagName === 'INPUT' || 
               target.tagName === 'TEXTAREA' || 
               target.isContentEditable;
    }
}
