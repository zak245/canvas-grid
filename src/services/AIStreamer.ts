import { GridEngine } from '../core/engine/GridEngine';

export class AIStreamer {
    private engine: GridEngine;
    private activeStreams: Map<string, boolean> = new Map();

    constructor(engine: GridEngine) {
        this.engine = engine;
    }

    /**
     * Simulates streaming data into a cell.
     * @param rowIndex Row index
     * @param colId Column ID
     * @param prompt Prompt to simulate response for
     */
    streamCell(rowIndex: number, colId: string, prompt: string) {
        const cellKey = `${rowIndex}:${colId}`;
        if (this.activeStreams.get(cellKey)) return;

        this.activeStreams.set(cellKey, true);

        // Simulate network delay
        setTimeout(() => {
            this.startStreaming(rowIndex, colId, prompt);
        }, 500);
    }

    private startStreaming(rowIndex: number, colId: string, prompt: string) {
        const cellKey = `${rowIndex}:${colId}`;
        let content = '';
        const response = this.generateMockResponse(prompt);
        const tokens = response.split(' ');
        let tokenIndex = 0;

        const interval = setInterval(() => {
            if (tokenIndex >= tokens.length) {
                clearInterval(interval);
                this.activeStreams.delete(cellKey);
                return;
            }

            content += (tokenIndex > 0 ? ' ' : '') + tokens[tokenIndex];
            this.engine.model.setCellValue(rowIndex, colId, content);

            // Force render? The loop handles it, but we might need to ensure
            // the model update triggers a "dirty" flag if we optimize rendering later.

            tokenIndex++;
        }, 100); // Stream every 100ms
    }

    private generateMockResponse(prompt: string): string {
        if (prompt.includes('email')) return "john.doe@example.com";
        if (prompt.includes('company')) return "Acme Corp";
        if (prompt.includes('summary')) return "This company is a leading provider of widgets and gadgets, focusing on innovation and customer satisfaction.";
        return "AI Generated Content for " + prompt;
    }
}
