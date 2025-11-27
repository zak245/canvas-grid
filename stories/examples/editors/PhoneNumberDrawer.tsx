import React, { useState, useEffect, useRef } from 'react';
import { Trash, Plus, Check, X, Phone, Star } from 'lucide-react';

// EditorProps interface for custom editors
export interface EditorProps {
    value: any;
    onChange?: (value: any) => void;
    onComplete?: () => void;
    onCommit?: (value: any) => void;
    onCancel?: () => void;
    width?: number;
    height?: number;
    x?: number;
    y?: number;
}

interface PhoneNumber {
    id: string;
    number: string;
    type: string; // 'Mobile', 'Home', 'Work'
    isPrimary: boolean;
}

export const PhoneNumberDrawer: React.FC<EditorProps> = ({
    value,
    onCommit,
    onCancel,
}) => {
    const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
    const drawerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try {
            if (value) {
                // Try to parse JSON, if it's a simple string, treat as single number
                if (value.trim().startsWith('[')) {
                    const parsed = JSON.parse(value);
                    if (Array.isArray(parsed)) {
                        setNumbers(parsed);
                        return;
                    }
                } else if (value.trim()) {
                    setNumbers([{
                        id: crypto.randomUUID(),
                        number: value,
                        type: 'Mobile',
                        isPrimary: true
                    }]);
                    return;
                }
            }
        } catch (e) {
            // Ignore parse error
        }
        setNumbers([]);
    }, [value]);

    useEffect(() => {
        // Focus drawer on mount
        if (drawerRef.current) {
            drawerRef.current.focus();
        }
        
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onCancel?.();
            }
            // Allow Enter to save if Cmd/Ctrl is pressed
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.stopPropagation();
                handleSave();
            }
        };
        
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, []);

    const handleAdd = () => {
        setNumbers([
            ...numbers, 
            { 
                id: crypto.randomUUID(), 
                number: '', 
                type: 'Mobile', 
                isPrimary: numbers.length === 0 
            }
        ]);
    };

    const handleChange = (id: string, field: keyof PhoneNumber, val: any) => {
        setNumbers(nums => nums.map(n => {
            if (n.id !== id) return n;
            return { ...n, [field]: val };
        }));
    };

    const handleSetPrimary = (id: string) => {
        setNumbers(nums => nums.map(n => ({
            ...n,
            isPrimary: n.id === id
        })));
    };

    const handleDelete = (id: string) => {
        setNumbers(nums => nums.filter(n => n.id !== id));
    };

    const handleSave = () => {
        onCommit?.(JSON.stringify(numbers));
    };

    const handleDrawerClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <div 
            ref={drawerRef}
            className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 border-l border-gray-200 z-[10001]"
            onClick={handleDrawerClick}
            onMouseDown={(e) => e.stopPropagation()} // Prevent grid from catching mousedown
            tabIndex={-1}
        >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2 text-gray-700 font-semibold">
                    <Phone size={18} />
                    <span>Phone Numbers</span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleSave} 
                        className="p-1.5 hover:bg-green-100 text-green-600 rounded-md transition-colors"
                        title="Save (Cmd+Enter)"
                    >
                        <Check size={18} />
                    </button>
                    <button 
                        onClick={onCancel} 
                        className="p-1.5 hover:bg-red-100 text-red-600 rounded-md transition-colors"
                        title="Cancel (Esc)"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {numbers.map((num, index) => (
                    <div key={num.id} className="p-3 border border-gray-200 rounded-lg bg-white shadow-sm group hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="relative flex-1">
                                <input 
                                    type="text" 
                                    value={num.number}
                                    onChange={e => handleChange(num.id, 'number', e.target.value)}
                                    placeholder="+1 (555) 000-0000"
                                    className="w-full pl-8 pr-2 py-1.5 border border-gray-300 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                    autoFocus={index === numbers.length - 1 && !num.number}
                                />
                                <Phone size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                            <button 
                                onClick={() => handleDelete(num.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                title="Delete"
                            >
                                <Trash size={14} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 font-medium">Type:</span>
                                <select 
                                    value={num.type}
                                    onChange={e => handleChange(num.id, 'type', e.target.value)}
                                    className="bg-gray-50 border border-gray-200 rounded px-2 py-0.5 outline-none cursor-pointer hover:border-gray-300 focus:border-blue-400 text-gray-700"
                                >
                                    <option value="Mobile">Mobile</option>
                                    <option value="Home">Home</option>
                                    <option value="Work">Work</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <button 
                                onClick={() => handleSetPrimary(num.id)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-full transition-all border ${
                                    num.isPrimary 
                                        ? 'bg-yellow-50 text-yellow-700 border-yellow-200 font-medium' 
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <Star size={10} fill={num.isPrimary ? "currentColor" : "none"} />
                                {num.isPrimary ? 'Primary' : 'Set Primary'}
                            </button>
                        </div>
                    </div>
                ))}

                {numbers.length === 0 && (
                    <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-lg border border-dashed border-gray-200">
                        <Phone size={24} className="mx-auto mb-2 opacity-20" />
                        No phone numbers added yet.
                    </div>
                )}

                <button 
                    onClick={handleAdd}
                    className="w-full py-2.5 border border-dashed border-blue-200 rounded-lg text-blue-600 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center justify-center gap-2 text-sm font-medium mt-2"
                >
                    <Plus size={16} />
                    Add Phone Number
                </button>
            </div>
            
            <div className="p-3 border-t border-gray-200 bg-white text-xs text-gray-400 text-center flex justify-center gap-4">
                <span><kbd className="font-sans bg-gray-100 px-1 rounded border border-gray-200">⌘</kbd> + <kbd className="font-sans bg-gray-100 px-1 rounded border border-gray-200">Enter</kbd> to save</span>
                <span><kbd className="font-sans bg-gray-100 px-1 rounded border border-gray-200">Esc</kbd> to cancel</span>
            </div>
        </div>
    );
};