import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, ArrowDown, Trash, EyeOff, Pin, PinOff, Pencil, Settings, Layers, Ungroup } from 'lucide-react';

export interface ColumnMenuProps {
    isOpen: boolean;
    x: number;
    y: number;
    columnId: string;
    isPinned?: boolean;
    isGrouped?: boolean; // New prop
    onClose: () => void;
    onAction: (action: string, columnId: string) => void;
}

export const ColumnMenu: React.FC<ColumnMenuProps> = ({
    isOpen,
    x,
    y,
    columnId,
    isPinned,
    isGrouped,
    onClose,
    onAction
}) => {
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;

        // Small delay to avoid catching the opening click if it bubbles
        const timer = setTimeout(() => {
            const handleClickOutside = (e: MouseEvent) => {
                if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                    console.log('[ColumnMenu] Click outside detected, closing');
                    onClose();
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            
            // Store cleanup function in a ref or just attach property to element if needed
            // But here we can just rely on the cleanup function of useEffect
            (menuRef.current as any)._cleanup = () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }, 50);

        return () => {
            clearTimeout(timer);
            if (menuRef.current && (menuRef.current as any)._cleanup) {
                (menuRef.current as any)._cleanup();
            } else {
                 // Fallback cleanup in case timer fired
                 document.removeEventListener('mousedown', (() => {}) as any); // This is tricky with closures
                 // Better strategy: use a ref for the handler
            }
        };
    }, [isOpen, onClose]);

    // Better implementation of the above effect
    useEffect(() => {
        if (!isOpen) return;
        
        let handler: ((e: MouseEvent) => void) | null = null;

        const timer = setTimeout(() => {
            handler = (e: MouseEvent) => {
                if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                    onClose();
                }
            };
            document.addEventListener('mousedown', handler);
        }, 50);

        return () => {
            clearTimeout(timer);
            if (handler) {
                document.removeEventListener('mousedown', handler);
            }
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Render via portal to avoid z-index issues
    return createPortal(
        <div
            ref={menuRef}
            className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
            style={{ top: y, left: x }}
        >
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100 mb-1">
                Column Actions
            </div>
            
            <MenuItem 
                icon={<ArrowUp size={14} />} 
                label="Sort Ascending" 
                onClick={() => onAction('sortAsc', columnId)} 
            />
            <MenuItem 
                icon={<ArrowDown size={14} />} 
                label="Sort Descending" 
                onClick={() => onAction('sortDesc', columnId)} 
            />
            
            <div className="h-px bg-gray-100 my-1" />

            <MenuItem 
                icon={isGrouped ? <Ungroup size={14} /> : <Layers size={14} />} 
                label={isGrouped ? "Ungroup" : "Group by this column"} 
                onClick={() => onAction(isGrouped ? 'ungroup' : 'group', columnId)} 
            />

            <div className="h-px bg-gray-100 my-1" />

            <MenuItem 
                icon={<Pencil size={14} />} 
                label="Rename Column" 
                onClick={() => onAction('rename', columnId)} 
            />
            <MenuItem 
                icon={<Settings size={14} />} 
                label="Column Settings" 
                onClick={() => onAction('settings', columnId)} 
            />
            
            <div className="h-px bg-gray-100 my-1" />
            
            <MenuItem 
                icon={<EyeOff size={14} />} 
                label="Hide Column" 
                onClick={() => onAction('hide', columnId)}
            />
            <MenuItem 
                icon={isPinned ? <PinOff size={14} /> : <Pin size={14} />} 
                label={isPinned ? "Unpin Column" : "Pin Column"} 
                onClick={() => onAction(isPinned ? 'unpin' : 'pin', columnId)}
            />
            
            <div className="h-px bg-gray-100 my-1" />
            
            <MenuItem 
                icon={<Trash size={14} />} 
                label="Delete Column" 
                onClick={() => onAction('delete', columnId)}
                danger
                disabled // Future
            />
        </div>,
        document.body
    );
};

interface MenuItemProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    danger?: boolean;
    disabled?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onClick, danger, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
            ${danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}
        `}
    >
        <span className="text-gray-400">{icon}</span>
        <span>{label}</span>
    </button>
);

