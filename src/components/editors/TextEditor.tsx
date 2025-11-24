import React, { useEffect, useRef, useState } from 'react';
import { EditorProps } from '../../types/grid';

export const TextEditor: React.FC<EditorProps> = ({
    value,
    width,
    height,
    onCommit,
    onCancel,
    className
}) => {
    const [currentValue, setCurrentValue] = useState(value ?? '');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onCommit(currentValue, true);
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    return (
        <input
            ref={inputRef}
            type="text"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => onCommit(currentValue)}
            className={`absolute bg-white border-2 border-blue-500 outline-none px-2 py-1 text-sm font-normal text-gray-900 shadow-sm ${className || ''}`}
            style={{
                width,
                height,
                fontFamily: 'Inter, sans-serif',
                top: 0,
                left: 0,
                boxSizing: 'border-box',
                zIndex: 1000
            }}
        />
    );
};
