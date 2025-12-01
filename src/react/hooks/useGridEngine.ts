import { useEffect, useRef } from 'react';
import { GridEngine } from '../../core/engine/GridEngine';

/**
 * Hook to manage the lifecycle of a GridEngine instance.
 * Handles mounting/unmounting and resize events.
 * 
 * @param engine - The GridEngine instance to manage
 * @returns A ref to attach to the container element
 */
export function useGridEngine(engine: GridEngine) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        engine.mount(container);

        const handleResize = () => {
            if (container) {
                const { clientWidth, clientHeight } = container;
                // Canvas resizing is now handled by the renderer or engine if needed
                // We just notify engine of logical size change
                engine.resize(clientWidth, clientHeight);
            }
        };

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);
        handleResize();

        return () => {
            resizeObserver.disconnect();
            engine.unmount();
        };
    }, [engine]);

    return containerRef;
}
