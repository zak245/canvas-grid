import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface HeaderRenameInputProps {
    x: number;
    y: number;
    width: number;
    height: number;
    initialValue: string;
    onSave: (newValue: string) => void;
    onCancel: () => void;
}

export const HeaderRenameInput: React.FC<HeaderRenameInputProps> = ({
    x,
    y,
    width,
    height,
    initialValue,
    onSave,
    onCancel
}) => {
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus on mount
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, []);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
                onSave(value); 
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [value, onSave]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onSave(value);
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    return createPortal(
        <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="fixed z-[10000] px-2 py-1 text-sm font-semibold text-gray-900 bg-white border-2 border-blue-500 rounded-sm shadow-lg outline-none"
            style={{
                top: y,
                left: x,
                width: width,
                height: height,
                fontFamily: 'Inter, sans-serif', // Match theme
                fontSize: '12px' // Match theme
            }}
        />,
        document.body
    );
};

