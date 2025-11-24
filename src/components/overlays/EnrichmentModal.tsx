import React, { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';

interface EnrichmentModalProps {
    rowIndex: number;
    onClose: () => void;
}

export const EnrichmentModal: React.FC<EnrichmentModalProps> = ({ rowIndex, onClose }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(p => {
                if (p >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return p + 5; // Complete in 2 seconds (20 steps * 100ms)
            });
        }, 100);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-[400px] overflow-hidden transform transition-all">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="flex items-center gap-2 font-semibold text-gray-800">
                        <Sparkles size={18} className="text-blue-500" />
                        <span>Enriching Row {rowIndex + 1}</span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-8 flex flex-col items-center text-center space-y-6">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center animate-pulse">
                            <Sparkles size={32} className="text-blue-500 animate-spin" />
                        </div>
                        {progress < 100 && (
                            <div className="absolute inset-0 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin" />
                        )}
                    </div>
                    
                    <div className="space-y-2">
                        <h3 className="font-medium text-gray-900 text-lg">
                            {progress < 100 ? 'AI Processing in Progress' : 'Enrichment Complete!'}
                        </h3>
                        <p className="text-sm text-gray-500">
                            {progress < 100 
                                ? 'Analyzing data points and generating insights...' 
                                : 'Analysis finished successfully. Review the results below.'}
                        </p>
                    </div>
                    
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-200 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    
                    {progress === 100 && (
                        <button 
                            onClick={onClose}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
                        >
                            View Results
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

