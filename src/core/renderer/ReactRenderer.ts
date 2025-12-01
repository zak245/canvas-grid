import { BaseRenderer } from './types';
import { GridEngine } from '../engine/GridEngine';

/**
 * ReactRenderer - Bridge for React-based rendering
 * 
 * This renderer doesn't directly manipulate DOM or mount React components (to avoid circular dependencies).
 * Instead, it manages the container and signals the external React layer when to update.
 * 
 * The actual React component tree (GridReact) will subscribe to the engine's events
 * and render into the container provided by this renderer.
 */
export class ReactRenderer extends BaseRenderer {
    private containerElement: HTMLElement | null = null;
    private reactRoot: HTMLElement | null = null;

    constructor(engine: GridEngine) {
        super(engine);
    }

    attach(container: HTMLElement): void {
        this.containerElement = container;
        
        // Create a root for React to mount into
        this.reactRoot = document.createElement('div');
        this.reactRoot.className = 'ds-grid-react-root';
        this.reactRoot.style.width = '100%';
        this.reactRoot.style.height = '100%';
        this.reactRoot.style.position = 'relative';
        this.reactRoot.style.overflow = 'hidden';
        this.reactRoot.tabIndex = 0; // Focusable
        this.reactRoot.style.outline = 'none';
        
        this.containerElement.appendChild(this.reactRoot);
        
        // We emit an event that the React layer can listen to "renderer:attached"
        // passing the container so it can create a Portal or Root.
        this.engine.eventBus.emit('renderer:attached', { 
            container: this.reactRoot,
            type: 'react'
        });
    }

    detach(): void {
        this.engine.eventBus.emit('renderer:detached', { type: 'react' });
        
        if (this.reactRoot && this.containerElement) {
            this.containerElement.removeChild(this.reactRoot);
        }
        this.reactRoot = null;
        this.containerElement = null;
    }

    getElement(): HTMLElement | null {
        return this.reactRoot;
    }

    render(): void {
        // React is reactive. We don't imperatively "render".
        // However, we can emit a sync signal or update a store value that triggers components.
        // For high-performance scrolling (virtualization), the React components 
        // should likely subscribe to the viewport directly or via a fast signal.
        
        // Trigger a signal that "External" views should update if they depend on render loop
        this.engine.eventBus.emit('render');
    }
}

