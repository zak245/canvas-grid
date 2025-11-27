import React from 'react';
import { Home, Database, Settings, Users, BarChart3, Layers } from 'lucide-react';

export const Sidebar: React.FC = () => {
    return (
        <div className="w-16 h-full bg-[#1a1a1a] flex flex-col items-center py-6 border-r border-gray-800 z-50">
            <div className="mb-8 p-2 bg-blue-600 rounded-lg">
                <Database className="text-white w-6 h-6" />
            </div>

            <nav className="flex flex-col gap-6 w-full items-center">
                <NavItem icon={<Home />} active />
                <NavItem icon={<Users />} />
                <NavItem icon={<BarChart3 />} />
                <NavItem icon={<Layers />} />
            </nav>

            <div className="mt-auto flex flex-col gap-6 w-full items-center">
                <NavItem icon={<Settings />} />
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500" />
            </div>
        </div>
    );
};

const NavItem: React.FC<{ icon: React.ReactNode; active?: boolean }> = ({ icon, active }) => (
    <button
        className={`p-3 rounded-xl transition-all ${active
                ? 'bg-white/10 text-white shadow-lg'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
    >
        {React.isValidElement(icon) 
            ? React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 20 })
            : icon}
    </button>
);
