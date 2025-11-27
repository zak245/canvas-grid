import React, { useState, useRef, useEffect } from 'react';

// EditorProps interface for custom editors
export interface EditorProps {
    value: any;
    onChange?: (value: any) => void;
    onComplete?: () => void;
    onCommit?: (value: any) => void;
    onCancel?: () => void;
    width: number;
    height: number;
    x: number;
    y: number;
}

// Define the option shape
export interface TagOption {
    id: string;
    label: string;
    color: string;
}

// Sample options (normally passed via configuration)
export const SAMPLE_TAGS: TagOption[] = [
    { id: 'active', label: 'Active', color: '#22c55e' }, 
    { id: 'pending', label: 'Pending', color: '#eab308' }, 
    { id: 'archived', label: 'Archived', color: '#6b7280' }, 
    { id: 'error', label: 'Error', color: '#ef4444' }, 
    { id: 'review', label: 'In Review', color: '#3b82f6' }, 
];

/**
 * A Fancy Inline Editor Example
 * Renders a custom dropdown that floats over the cell
 */
export const TagEditor: React.FC<EditorProps> = ({
    value,
    width,
    onCommit,
    onCancel
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(() => {
        const index = SAMPLE_TAGS.findIndex(t => t.label === value);
        return index >= 0 ? index : 0;
    });

    // Focus container on mount
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.focus();
        }
    }, []);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                // If we click outside, we commit the current value (no change) or cancel?
                // Excel commits.
                onCommit?.(value);
            }
        };
        // Use capture to catch clicks before other handlers might stop propagation
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [value, onCommit]);

    const handleSelect = (option: TagOption) => {
        onCommit?.(option.label); // commit the value
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Stop propagation to prevent grid navigation
        e.stopPropagation();

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(prev => (prev + 1) % SAMPLE_TAGS.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(prev => (prev - 1 + SAMPLE_TAGS.length) % SAMPLE_TAGS.length);
                break;
            case 'Enter':
                e.preventDefault();
                handleSelect(SAMPLE_TAGS[activeIndex]);
                break;
            case 'Escape':
                e.preventDefault();
                onCancel?.();
                break;
        }
    };

    return (
        <div 
            ref={containerRef}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            className="fixed bg-white shadow-xl border border-gray-200 rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100 outline-none"
            style={{
                // We ignore the passed height to let the dropdown expand
                // We respect the width but enforce a minimum
                width: Math.max(width, 180),
                // We position it relative to the parent portal (which is already at cell X/Y)
                // But wait, the parent portal has `top/left` set on the wrapper div.
                // TextEditor uses absolute positioning inside that wrapper?
                // No, CellEditorOverlay sets `top/left` on the WRAPPER div.
                // The Editor component is rendered INSIDE that wrapper.
                // So `position: absolute` here is relative to the wrapper.
                // But wait, CellEditorOverlay wrapper has `position: fixed`.
                // So `position: relative` (default) here starts at 0,0 of the wrapper.
                
                // To make it pop "over", we can just render.
                marginTop: 0,
            }}
        >
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Select Status
            </div>
            <div className="max-h-60 overflow-y-auto p-1">
                {SAMPLE_TAGS.map((option, index) => (
                    <button
                        key={option.id}
                        onClick={() => handleSelect(option)}
                        className={`
                            w-full text-left px-2 py-1.5 rounded-md flex items-center gap-2 transition-colors text-sm
                            ${value === option.label ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                            ${index === activeIndex ? 'bg-gray-100' : 'hover:bg-gray-50'}
                        `}
                    >
                        <div 
                            className="w-2.5 h-2.5 rounded-full" 
                            style={{ backgroundColor: option.color }} 
                        />
                        <span>{option.label}</span>
                        {value === option.label && (
                            <span className="ml-auto text-blue-600 font-bold">✓</span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

