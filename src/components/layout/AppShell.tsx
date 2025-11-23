import React from 'react';
import { Sidebar } from './Sidebar';
import { Toolbar } from './Toolbar';

interface AppShellProps {
    children: React.ReactNode;
    onAddColumn: () => void;
    onAddRow?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({ children, onAddColumn, onAddRow }) => {
    return (
        <div className="flex w-screen h-screen bg-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col h-full min-w-0">
                <Toolbar onAddColumn={onAddColumn} onAddRow={onAddRow} />
                <main className="flex-1 relative overflow-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
};
