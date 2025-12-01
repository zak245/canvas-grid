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
    private engine: GridEngine;

    constructor(engine: GridEngine) {
        this.engine = engine;
        this.keyboardHandler = new KeyboardHandler(engine);
        this.mouseHandler = new MouseHandler(engine);
    }

    mount(element: HTMLElement) {
        // Mouse events
        element.addEventListener('mousedown', this.mouseHandler.handleMouseDown);
        element.addEventListener('mousemove', this.mouseHandler.handleMouseMove);
        element.addEventListener('mouseup', this.mouseHandler.handleMouseUp);
        // element.addEventListener('dblclick', this.mouseHandler.handleDoubleClick); // Handled manually in MouseHandler
        element.addEventListener('contextmenu', this.mouseHandler.onContextMenu);
        element.addEventListener('wheel', this.handleWheel, { passive: false });

        // Keyboard events
        element.addEventListener('keydown', this.keyboardHandler.handleKeyDown);

        // Clipboard events (Global)
        // We listen globally because clicking headers removes focus from canvas
        document.addEventListener('copy', this.handleCopy);
        document.addEventListener('cut', this.handleCut);
        document.addEventListener('paste', this.handlePaste);

        // Make element focusable if it isn't already
        if (element.tabIndex === -1) {
            element.tabIndex = 0;
        }
        element.focus();
    }

    unmount(element: HTMLElement) {
        element.removeEventListener('mousedown', this.mouseHandler.handleMouseDown);
        element.removeEventListener('mousemove', this.mouseHandler.handleMouseMove);
        element.removeEventListener('mouseup', this.mouseHandler.handleMouseUp);
        // element.removeEventListener('dblclick', this.mouseHandler.handleDoubleClick);
        element.removeEventListener('contextmenu', this.mouseHandler.onContextMenu);
        element.removeEventListener('wheel', this.handleWheel);
        element.removeEventListener('keydown', this.keyboardHandler.handleKeyDown);

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
