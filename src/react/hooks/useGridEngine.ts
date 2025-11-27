import { useEffect, useRef } from 'react';
import { GridEngine } from '../../core/engine/GridEngine';

/**
 * Hook to manage the lifecycle of a GridEngine instance.
 * Handles mounting/unmounting and resize events.
 * 
 * @param engine - The GridEngine instance to manage
 * @returns A ref to attach to the canvas element
 */
export function useGridEngine(engine: GridEngine) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        engine.mount(canvas);

        const handleResize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                const { clientWidth, clientHeight } = parent;
                const dpr = window.devicePixelRatio || 1;
                canvas.width = clientWidth * dpr;
                canvas.height = clientHeight * dpr;
                canvas.style.width = `${clientWidth}px`;
                canvas.style.height = `${clientHeight}px`;

                engine.resize(clientWidth, clientHeight);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
            engine.unmount();
        };
    }, [engine]);

    return canvasRef;
}
