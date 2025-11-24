import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Braces } from 'lucide-react';
import type { EditorProps } from '../../types/grid';

export const LinkedRecordDrawer: React.FC<EditorProps> = ({
    value,
    onCommit,
    onCancel,
}) => {
    const [jsonString, setJsonString] = useState('');
    const [error, setError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        try {
            let val = value;
            // Handle stringified JSON input
            if (typeof val === 'string' && (val.trim().startsWith('{') || val.trim().startsWith('['))) {
                try {
                    val = JSON.parse(val);
                } catch (e) {
                    // treat as string
                }
            }
            
            setJsonString(
                typeof val === 'object' && val !== null
                    ? JSON.stringify(val, null, 2) 
                    : String(val || '')
            );
        } catch (e) {
            setJsonString('');
        }
        
        requestAnimationFrame(() => {
            textareaRef.current?.focus();
        });
    }, [value]);

    const handleSave = () => {
        try {
            // Validate JSON
            const parsed = JSON.parse(jsonString);
            // Commit the stringified JSON
            onCommit(JSON.stringify(parsed));
        } catch (e) {
            setError((e as Error).message);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Allow standard navigation/editing within textarea
        e.stopPropagation(); // Prevent grid from capturing keys
        if (e.key === 'Escape') {
            onCancel();
        }
        // Cmd+Enter to save
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSave();
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] pointer-events-none overflow-hidden">
            {/* Drawer */}
            <div 
                className="absolute right-0 top-0 bottom-0 w-[600px] bg-white shadow-2xl pointer-events-auto flex flex-col animate-in slide-in-from-right duration-300 border-l border-gray-200"
                onKeyDown={handleKeyDown}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg shadow-sm">
                            <Braces size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900 text-lg">Linked Record</h2>
                            <p className="text-xs text-gray-500 font-medium">Advanced Data Editor</p>
                        </div>
                    </div>
                    <button 
                        onClick={onCancel} 
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Editor Area */}
                <div className="flex-1 p-6 bg-gray-50/50 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">JSON Content</label>
                        <span className="text-xs text-gray-400 font-mono">format: json</span>
                    </div>
                    
                    <div className="relative flex-1 shadow-sm border border-gray-200 rounded-lg bg-white overflow-hidden">
                        <textarea
                            ref={textareaRef}
                            value={jsonString}
                            onChange={(e) => setJsonString(e.target.value)}
                            className={`w-full h-full p-4 font-mono text-sm bg-transparent resize-none focus:outline-none
                                ${error ? 'bg-red-50/10' : ''}
                            `}
                            spellCheck={false}
                            placeholder="{ ... }"
                        />
                    </div>
                    
                    {/* Error Message */}
                    {error && (
                        <div className="mt-3 flex items-start gap-2 text-xs text-red-600 font-medium bg-red-50 p-3 rounded-md border border-red-100 animate-in slide-in-from-bottom-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0" />
                            <span>Syntax Error: {error}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
                    <button 
                        onClick={onCancel} 
                        className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave} 
                        className="px-6 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-lg shadow-purple-600/20 flex items-center gap-2 transition-all active:scale-95"
                    >
                        <Save size={16} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};
