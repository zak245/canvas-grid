import React, { useState, useEffect, useRef } from 'react';
import { EditorProps } from '../../types/grid';

export const LinkedRecordPicker: React.FC<EditorProps> = ({
    value,
    onCommit,
    onCancel,
    column,
    width
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Parse initial value
    useEffect(() => {
        try {
            if (value) {
                const parsed = JSON.parse(value);
                if (parsed && parsed.id) {
                    setSelectedId(parsed.id);
                    setSearchTerm(parsed.name);
                }
            }
        } catch (e) {
            // Invalid JSON, start empty
        }
    }, []); // Run once on mount

    // Focus input
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, []);

    const options = column.editor?.options || [];
    
    const filteredOptions = options.filter((opt: any) => 
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (option: any) => {
        // option.value is the full object (or we can wrap it)
        // The grid expects a string value for the cell
        const jsonValue = JSON.stringify(option.value);
        onCommit(jsonValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.stopPropagation(); // Prevent grid navigation

        if (e.key === 'Enter') {
            // Commit first match if available
            if (filteredOptions.length > 0) {
                handleSelect(filteredOptions[0]);
            } else {
                onCancel();
            }
        } else if (e.key === 'Escape') {
            onCancel();
        } else if (e.key === 'ArrowDown') {
            // Navigate options (simplified: just focus logic could be added)
            e.preventDefault();
        } else if (e.key === 'ArrowUp') {
             e.preventDefault();
        }
    };

    return (
        <div 
            ref={containerRef}
            className="bg-white border border-blue-500 shadow-lg flex flex-col rounded-sm"
            style={{ width: Math.max(width, 280), maxHeight: '300px' }}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
        >
            <input
                ref={inputRef}
                className="w-full p-2 border-b outline-none text-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search company..."
                onClick={(e) => e.stopPropagation()}
            />
            <div className="overflow-y-auto flex-1 max-h-60">
                {filteredOptions.map((opt: any) => (
                    <div
                        key={opt.value.id}
                        className={`p-2 cursor-pointer hover:bg-blue-50 border-l-4 ${selectedId === opt.value.id ? 'border-blue-500 bg-blue-50' : 'border-transparent'}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(opt);
                        }}
                    >
                        <div className="font-medium text-sm text-gray-900">{opt.label}</div>
                        <div className="text-xs text-gray-500">{opt.value.domain} • {opt.value.employees.toLocaleString()} emp</div>
                    </div>
                ))}
                {filteredOptions.length === 0 && (
                    <div className="p-4 text-gray-400 text-center text-sm">No results found</div>
                )}
            </div>
        </div>
    );
};

