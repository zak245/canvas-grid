import { useEffect, useRef, useState } from 'react';
import { GridEngine } from '../engine/GridEngine';

export function useGridEngine() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [engine] = useState(() => new GridEngine());

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
