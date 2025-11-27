export interface GridCommand {
    type: string;
    execute: () => Promise<void> | void;
    undo: () => Promise<void> | void;
}

/**
 * HistoryManager - Manages Undo/Redo stack using Command Pattern
 */
export class HistoryManager {
    private undoStack: GridCommand[] = [];
    private redoStack: GridCommand[] = [];
    private maxHistorySize: number = 50;

    constructor(maxHistorySize: number = 50) {
        this.maxHistorySize = maxHistorySize;
    }

    /**
     * Execute a command and add it to the undo stack
     */
    async execute(command: GridCommand): Promise<void> {
        await command.execute();
        this.undoStack.push(command);
        
        // Clear redo stack on new action
        this.redoStack = [];
        
        // Limit stack size
        if (this.undoStack.length > this.maxHistorySize) {
            this.undoStack.shift();
        }
    }

    /**
     * Undo the last command
     */
    async undo(): Promise<void> {
        const command = this.undoStack.pop();
        if (command) {
            await command.undo();
            this.redoStack.push(command);
        }
    }

    /**
     * Redo the last undone command
     */
    async redo(): Promise<void> {
        const command = this.redoStack.pop();
        if (command) {
            await command.execute();
            this.undoStack.push(command);
        }
    }

    /**
     * Check if undo is available
     */
    canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    /**
     * Check if redo is available
     */
    canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    /**
     * Clear history
     */
    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
    }
}

