import React, { useState, useEffect } from 'react';
import { X, Save, Braces } from 'lucide-react';

interface JsonEditorDrawerProps {
    isOpen: boolean;
    title: string;
    initialData: any;
    onSave: (data: any) => void;
    onClose: () => void;
}

export const JsonEditorDrawer: React.FC<JsonEditorDrawerProps> = ({
    isOpen,
    title,
    initialData,
    onSave,
    onClose
}) => {
    const [jsonString, setJsonString] = useState('');
    const [error, setError] = useState<string | null>(null);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen) {
            try {
                // Handle both object and string inputs
                let val = initialData;
                if (typeof initialData === 'string' && (initialData.startsWith('{') || initialData.startsWith('['))) {
                    try {
                        val = JSON.parse(initialData);
                    } catch (e) {
                        // It's just a string
                    }
                }
                
                setJsonString(
                    typeof val === 'object' 
                        ? JSON.stringify(val, null, 2) 
                        : String(val)
                );
            } catch (e) {
                setJsonString('');
            }
            setError(null);
            
            // Auto-focus
            requestAnimationFrame(() => {
                textareaRef.current?.focus();
            });
        }
    }, [isOpen, initialData]);

    const handleSave = () => {
        try {
            // Validate JSON
            const parsed = JSON.parse(jsonString);
            // We save back the stringified version usually, or object if your data model supports it
            // Here we assume string storage for simplicity
            onSave(JSON.stringify(parsed)); 
            onClose();
        } catch (e) {
            setError((e as Error).message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] pointer-events-none overflow-hidden">
            {/* Drawer */}
            <div className="absolute right-0 top-0 bottom-0 w-[600px] bg-white shadow-2xl pointer-events-auto flex flex-col animate-in slide-in-from-right duration-300 border-l border-gray-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg shadow-sm">
                            <Braces size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900 text-lg">{title}</h2>
                            <p className="text-xs text-gray-500 font-medium">Advanced Data Editor</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
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
                        onClick={onClose} 
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

