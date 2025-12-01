import React, { useState, useMemo, useEffect } from 'react';
import { GridEngine } from '@grid-engine/core';
import { GridContainer } from '@grid-engine/react';
import { MockBackendAdapter } from '@grid-engine/core';
import { generateMockData } from '../../../stories/examples/mockData';

import { ContextMenu } from './ContextMenu';

export const TripleDemo: React.FC = () => {
    const [renderer, setRenderer] = useState<'canvas' | 'html' | 'react'>('canvas');
    
    // Shared Data Adapter to persist data across renderer switches
    const adapter = useMemo(() => {
        const initialData = generateMockData(1000);
        return new MockBackendAdapter(initialData);
    }, []);

    // Re-create engine when renderer changes
    const engine = useMemo(() => {
        return new GridEngine({
            renderer,
            dataSource: {
                mode: 'local',
                adapter // Reuse adapter to keep data
            },
            features: {
                columns: {
                    allowResize: true,
                    allowReorder: true,
                    allowHide: true,
                    allowDelete: true,
                    allowAdd: true,
                    allowRename: true,
                    allowPin: true,
                    allowGroups: true,
                    minWidth: 50,
                    maxWidth: 500,
                    defaults: { width: 150 }
                },
                rows: {
                    allowAdd: true,
                    allowDelete: true,
                    allowReorder: true,
                    allowBulkDelete: true,
                    allowBulkUpdate: true,
                    rowHeight: 36, 
                    allowVariableHeight: false,
                    allowMultiSelect: true,
                    bufferSize: 5,
                    actions: [
                        { id: 'enrich', icon: 'sparkles', label: 'Enrich' },
                        { id: 'detail', icon: 'maximize', label: 'Open' }
                    ]
                },
                cells: {
                    enabled: true,
                    mode: 'doubleClick',
                    startEditOnType: true,
                    validateOnChange: true,
                    validateOnBlur: true,
                    autoSave: true,
                    autoSaveDebounce: 500
                },
                sorting: {
                    mode: 'local',
                    multiColumn: true,
                    strategy: 'indices',
                    debounceMs: 200
                },
                selection: {
                    mode: 'multi',
                    allowRanges: true
                },
                ai: {
                    enabled: true,
                    streamingEnabled: true
                }
            },
            ui: {
                theme: {
                    headerHeight: 44,
                    rowHeight: 36,
                    fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
                    fontSize: 13,
                    selectionColor: 'rgba(59, 130, 246, 0.15)',
                    selectionBorderColor: '#3b82f6'
                },
                confirmDelete: true,
                enableContextMenus: true,
                showErrorTooltips: true,
                showCellTooltips: true
            }
        });
    }, [renderer, adapter]);

    useEffect(() => {
        const unsub = engine.on('cell:action', (payload) => {
            console.log('Action Clicked:', payload);
            alert(`Action: ${payload.action}\nPayload: ${JSON.stringify(payload.payload)}`);
        });
        return unsub;
    }, [engine]);

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Toolbar */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm z-20">
                <div className="flex items-center gap-4">
                    <h2 className="text-sm font-semibold text-gray-600">Renderer:</h2>
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                renderer === 'canvas' 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                            onClick={() => setRenderer('canvas')}
                        >
                            Canvas (Performance)
                        </button>
                        <button
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                renderer === 'html' 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                            onClick={() => setRenderer('html')}
                        >
                            HTML (DOM)
                        </button>
                        <button
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                renderer === 'react' 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                            onClick={() => setRenderer('react')}
                        >
                            React (Virtual)
                        </button>
                    </div>
                </div>
                <div className="text-xs text-gray-400">
                    {renderer === 'canvas' && 'Best for 10k+ rows. 60fps scroll.'}
                    {renderer === 'html' && 'Accessible. CSS styling. 5k rows.'}
                    {renderer === 'react' && 'React components. Custom cells. 1k rows.'}
                </div>
            </div>

            {/* Grid Container */}
            <div className="flex-1 relative overflow-hidden">
                <GridContainer key={renderer} engine={engine} />
                <ContextMenu engine={engine} />
            </div>
        </div>
    );
};
