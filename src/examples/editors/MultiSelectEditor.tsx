import React, { useState, useRef, useEffect } from 'react';
import { EditorProps } from '../../types/grid';

export interface MultiSelectOption {
    id: string;
    label: string;
    color: string;
}

export const SAMPLE_MULTI_OPTIONS: MultiSelectOption[] = [
    { id: 'urgent', label: 'Urgent', color: '#ef4444' },
    { id: 'bug', label: 'Bug', color: '#ef4444' },
    { id: 'feature', label: 'Feature', color: '#3b82f6' },
    { id: 'enhancement', label: 'Enhancement', color: '#22c55e' },
    { id: 'documentation', label: 'Documentation', color: '#eab308' },
    { id: 'design', label: 'Design', color: '#8b5cf6' },
    { id: 'question', label: 'Question', color: '#6b7280' },
];

export const MultiSelectEditor: React.FC<EditorProps> = ({
    value,
    width,
    onCommit,
    onCancel
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Ensure value is an array
    const [selected, setSelected] = useState<string[]>(() => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string' && value) return [value];
        return [];
    });

    const [focusedIndex, setFocusedIndex] = useState(0);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.focus();
        }
    }, []);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            // If clicking inside, do nothing (handled by buttons)
            // If clicking outside, assume commit? Or cancel?
            // For a complex dropdown, clicking outside usually commits current selection.
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                onCommit(selected);
            }
        };
        // Use capture to catch clicks before other handlers might stop propagation
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [selected, onCommit]);

    const toggleOption = (label: string) => {
        setSelected(prev => {
            if (prev.includes(label)) {
                return prev.filter(item => item !== label);
            } else {
                return [...prev, label];
            }
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Stop propagation to prevent grid navigation
        e.stopPropagation();

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setFocusedIndex(prev => (prev + 1) % SAMPLE_MULTI_OPTIONS.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setFocusedIndex(prev => (prev - 1 + SAMPLE_MULTI_OPTIONS.length) % SAMPLE_MULTI_OPTIONS.length);
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                toggleOption(SAMPLE_MULTI_OPTIONS[focusedIndex].label);
                break;
            case 'Tab': 
                e.preventDefault();
                onCommit(selected, true); // Commit and move next
                break;
            case 'Escape':
                e.preventDefault();
                onCancel(); // Cancel changes
                break;
        }
    };

    const isSelected = (label: string) => selected.includes(label);

    return (
        <div 
            ref={containerRef}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            className="fixed bg-white shadow-xl border border-gray-200 rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100 outline-none flex flex-col"
            style={{
                // Use a slightly wider width than the cell if it's too narrow
                width: Math.max(width, 220),
                // Render relative to the parent portal (which is positioned at the cell)
                marginTop: 0,
                maxHeight: 300
            }}
        >
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider flex justify-between items-center">
                <span>Select Tags</span>
                <span className="text-[10px] font-normal text-gray-400">{selected.length} selected</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-1">
                {SAMPLE_MULTI_OPTIONS.map((option, index) => {
                    const active = isSelected(option.label);
                    const focused = index === focusedIndex;
                    
                    return (
                        <button
                            key={option.id}
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent click outside logic?
                                // Actually click outside handles clicks *outside*.
                                // This is inside.
                                toggleOption(option.label);
                            }}
                            onMouseEnter={() => setFocusedIndex(index)}
                            className={`
                                w-full text-left px-2 py-1.5 rounded-md flex items-center gap-2 transition-colors text-sm mb-0.5
                                ${focused ? 'bg-gray-100' : 'hover:bg-gray-50'}
                            `}
                        >
                            <div className={`
                                w-4 h-4 rounded border flex items-center justify-center transition-colors
                                ${active ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}
                            `}>
                                {active && <span className="text-white text-xs font-bold">✓</span>}
                            </div>
                            
                            <div 
                                className="w-2 h-2 rounded-full mx-1" 
                                style={{ backgroundColor: option.color }} 
                            />
                            
                            <span className={active ? 'text-gray-900 font-medium' : 'text-gray-600'}>
                                {option.label}
                            </span>
                        </button>
                    );
                })}
            </div>
            
            <div className="p-2 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
                 <button 
                    onClick={(e) => { e.stopPropagation(); onCancel(); }}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 rounded hover:bg-gray-200"
                 >
                    Cancel
                 </button>
                 <button 
                    onClick={(e) => { e.stopPropagation(); onCommit(selected); }}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                 >
                    Done
                 </button>
            </div>
        </div>
    );
};

