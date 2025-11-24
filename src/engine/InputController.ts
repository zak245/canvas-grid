import { GridEngine } from './GridEngine';
import { KeyboardHandler } from './KeyboardHandler';
import { MouseHandler } from './MouseHandler';

/**
 * InputController - Coordinates mouse and keyboard input
 * Delegates to specialized handlers for cleaner separation of concerns
 */
export class InputController {
    private keyboardHandler: KeyboardHandler;
    private mouseHandler: MouseHandler;

    constructor(engine: GridEngine) {
        this.keyboardHandler = new KeyboardHandler(engine);
        this.mouseHandler = new MouseHandler(engine);
    }

    mount(canvas: HTMLCanvasElement) {
        // Mouse events
        canvas.addEventListener('mousedown', this.mouseHandler.handleMouseDown);
        canvas.addEventListener('mousemove', this.mouseHandler.handleMouseMove);
        canvas.addEventListener('mouseup', this.mouseHandler.handleMouseUp);
        canvas.addEventListener('dblclick', this.mouseHandler.handleDoubleClick); // Added

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
        canvas.removeEventListener('dblclick', this.mouseHandler.handleDoubleClick); // Added
        canvas.removeEventListener('keydown', this.keyboardHandler.handleKeyDown);

        document.removeEventListener('copy', this.handleCopy);
        document.removeEventListener('cut', this.handleCut);
        document.removeEventListener('paste', this.handlePaste);
    }

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
