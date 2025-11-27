/**
 * Enrichment Progress Component
 * 
 * Shows real-time progress of enrichment jobs
 */

import { useState, useEffect } from 'react';
import { BackendAdapter } from '../core/adapters/BackendAdapter';
import { X, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface EnrichmentProgressProps {
    jobId: string;
    gridId: string;
    backendUrl: string;
    onClose: () => void;
    onComplete?: () => void;
}

export function EnrichmentProgress({
    jobId,
    gridId,
    backendUrl,
    onClose,
    onComplete,
}: EnrichmentProgressProps) {
    const [status, setStatus] = useState<any>(null);
    const [isPolling, setIsPolling] = useState(true);

    useEffect(() => {
        const adapter = new BackendAdapter({
            baseUrl: backendUrl,
            gridId,
            enableLogs: false,
        });

        let pollInterval: any; // Using any to avoid NodeJS.Timeout issue in browser env

        const pollStatus = async () => {
            try {
                const jobStatus = await adapter.getJobStatus(jobId);
                setStatus(jobStatus);

                if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
                    setIsPolling(false);
                    clearInterval(pollInterval);

                    if (jobStatus.status === 'completed' && onComplete) {
                        // Wait a bit before calling onComplete to show the success state
                        setTimeout(() => {
                            onComplete();
                        }, 1500);
                    }
                }
            } catch (error) {
                console.error('Failed to poll job status:', error);
            }
        };

        // Initial poll
        pollStatus();

        // Poll every second
        pollInterval = setInterval(pollStatus, 1000);

        return () => {
            clearInterval(pollInterval);
        };
    }, [jobId, gridId, backendUrl, onComplete]);

    if (!status) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <div className="flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                    <p className="text-center text-gray-600 mt-4">Loading job status...</p>
                </div>
            </div>
        );
    }

    const percentage = status.progress?.percentage || 0;
    const completed = status.progress?.completed || 0;
    const total = status.progress?.total || 0;
    const failed = status.progress?.failed || 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {status.operation.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={isPolling}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Status Icon */}
                    <div className="flex justify-center mb-4">
                        {status.status === 'completed' ? (
                            <CheckCircle className="w-16 h-16 text-green-500" />
                        ) : status.status === 'failed' ? (
                            <XCircle className="w-16 h-16 text-red-500" />
                        ) : (
                            <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
                        )}
                    </div>

                    {/* Status Text */}
                    <div className="text-center mb-6">
                        {status.status === 'completed' ? (
                            <div>
                                <p className="text-lg font-semibold text-green-600 mb-1">Complete!</p>
                                <p className="text-sm text-gray-600">
                                    Successfully enriched {completed} of {total} rows
                                </p>
                            </div>
                        ) : status.status === 'failed' ? (
                            <div>
                                <p className="text-lg font-semibold text-red-600 mb-1">Failed</p>
                                <p className="text-sm text-gray-600">{status.error || 'Unknown error'}</p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-lg font-semibold text-gray-900 mb-1">Processing...</p>
                                <p className="text-sm text-gray-600">
                                    {completed} of {total} rows complete
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span>Progress</span>
                            <span>{Math.round(percentage)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 ${
                                    status.status === 'completed'
                                        ? 'bg-green-500'
                                        : status.status === 'failed'
                                        ? 'bg-red-500'
                                        : 'bg-blue-600'
                                }`}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">{total}</div>
                            <div className="text-xs text-gray-500">Total</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{completed}</div>
                            <div className="text-xs text-gray-500">Completed</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">{failed}</div>
                            <div className="text-xs text-gray-500">Failed</div>
                        </div>
                    </div>

                    {/* Results (if completed) */}
                    {status.status === 'completed' && status.results && status.results.length > 0 && (
                        <div className="mt-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Sample Results:</p>
                            <div className="bg-gray-50 rounded p-3 max-h-32 overflow-y-auto">
                                {status.results.slice(0, 3).map((result: any, idx: number) => (
                                    <div key={idx} className="text-xs text-gray-600 mb-1">
                                        {result.success ? '✅' : '❌'} Row {idx + 1}
                                        {result.data && (
                                            <span className="ml-2 text-gray-500">
                                                {JSON.stringify(result.data).slice(0, 50)}...
                                            </span>
                                        )}
                                    </div>
                                ))}
                                {status.results.length > 3 && (
                                    <div className="text-xs text-gray-500 mt-1">
                                        ...and {status.results.length - 3} more
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Action Button */}
                    <div className="mt-6">
                        {status.status === 'completed' || status.status === 'failed' ? (
                            <button
                                onClick={onClose}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Close
                            </button>
                        ) : (
                            <p className="text-center text-sm text-gray-500">
                                Please wait while we enrich your data...
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

