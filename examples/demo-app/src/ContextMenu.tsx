import React, { useEffect, useState } from 'react';
import { GridEngine } from '@grid-engine/core';
import type { MenuItem } from '@grid-engine/core/types/platform';
import { Scissors, Copy, Clipboard, Trash, Layers, Ungroup, Plus } from 'lucide-react';

interface ContextMenuProps {
    engine: GridEngine;
}

const ICON_MAP: Record<string, React.ReactNode> = {
    'scissors': <Scissors size={14} />,
    'copy': <Copy size={14} />,
    'clipboard': <Clipboard size={14} />,
    'trash': <Trash size={14} />,
    'group': <Layers size={14} />,
    'ungroup': <Ungroup size={14} />,
    'plus': <Plus size={14} />
};

export const ContextMenu: React.FC<ContextMenuProps> = ({ engine }) => {
    const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);

    useEffect(() => {
        const unsubscribe = engine.on('context-menu', (payload) => {
            setMenu({
                x: payload.x,
                y: payload.y,
                items: payload.items
            });
        });

        const closeMenu = () => setMenu(null);
        window.addEventListener('click', closeMenu);
        
        return () => {
            unsubscribe();
            window.removeEventListener('click', closeMenu);
        };
    }, [engine]);

    if (!menu) return null;

    // Adjust position to keep in viewport
    const x = Math.min(menu.x, window.innerWidth - 200);
    const y = Math.min(menu.y, window.innerHeight - (menu.items.length * 36));

    return (
        <div 
            className="fixed bg-white shadow-lg border border-gray-200 rounded-md py-1 z-[9999] min-w-[180px]"
            style={{ top: y, left: x }}
            onClick={(e) => e.stopPropagation()} 
        >
            {menu.items.map((item, i) => (
                <React.Fragment key={i}>
                    {item.separator && (
                        <div className="h-px bg-gray-100 my-1" />
                    )}
                    {!item.separator && (
                        <button
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            onClick={() => {
                                item.onClick();
                                setMenu(null);
                            }}
                        >
                            {/* Icon Handling */}
                            {item.icon && (
                                <span className="w-4 h-4 flex items-center justify-center">
                                    {typeof item.icon === 'string' && ICON_MAP[item.icon] 
                                        ? ICON_MAP[item.icon] 
                                        : item.icon}
                                </span>
                            )}
                            <span className="flex-1">{item.label}</span>
                            {item.shortcut && <span className="text-xs text-gray-400 ml-4">{item.shortcut}</span>}
                        </button>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

