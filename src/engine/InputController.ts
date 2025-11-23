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

        // Keyboard events
        canvas.addEventListener('keydown', this.keyboardHandler.handleKeyDown);

        // Make canvas focusable
        canvas.tabIndex = 0;
        canvas.focus();
    }

    unmount(canvas: HTMLCanvasElement) {
        canvas.removeEventListener('mousedown', this.mouseHandler.handleMouseDown);
        canvas.removeEventListener('mousemove', this.mouseHandler.handleMouseMove);
        canvas.removeEventListener('mouseup', this.mouseHandler.handleMouseUp);
        canvas.removeEventListener('keydown', this.keyboardHandler.handleKeyDown);
    }
}
