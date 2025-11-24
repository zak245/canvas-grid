import { useEffect, useRef, useState } from 'react';
import { GridEngine } from '../engine/GridEngine';
import type { GridConfig } from '../config/GridConfig';

export function useGridEngine(configOrEngine?: Partial<GridConfig> | GridEngine) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [engine] = useState(() => {
        if (configOrEngine instanceof GridEngine) {
             console.log('[useGridEngine] Reusing existing engine');
             return configOrEngine;
        }
        console.log('[useGridEngine] Creating NEW engine');
        return configOrEngine ? new GridEngine(configOrEngine) : new GridEngine();
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        engine.mount(canvas);

        const handleResize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                const { clientWidth, clientHeight } = parent;
                // Update canvas size for DPR
                const dpr = window.devicePixelRatio || 1;
                canvas.width = clientWidth * dpr;
                canvas.height = clientHeight * dpr;
                canvas.style.width = `${clientWidth}px`;
                canvas.style.height = `${clientHeight}px`;

                engine.resize(clientWidth, clientHeight);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial size

        return () => {
            window.removeEventListener('resize', handleResize);
            engine.unmount();
        };
    }, [engine]);

    return { canvasRef, engine };
}
