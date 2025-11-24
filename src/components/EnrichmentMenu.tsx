/**
 * Enrichment Menu Component
 * 
 * Provides UI to trigger GTM enrichment operations on selected rows
 */

import { useState } from 'react';
import { BackendAdapter } from '../adapters';
import { Sparkles, Building2, User, BrainCircuit, Loader2 } from 'lucide-react';

interface EnrichmentMenuProps {
    selectedRowIds: string[];
    gridId: string;
    backendUrl: string;
    onEnrichmentStart?: (jobId: string) => void;
    onEnrichmentComplete?: () => void;
}

export function EnrichmentMenu({
    selectedRowIds,
    gridId,
    backendUrl,
    onEnrichmentStart,
    onEnrichmentComplete,
}: EnrichmentMenuProps) {
    const [loading, setLoading] = useState(false);
    const [activeOperation, setActiveOperation] = useState<string | null>(null);

    const adapter = new BackendAdapter({
        baseUrl: backendUrl,
        gridId,
        enableLogs: true,
    });

    const handleEnrichment = async (
        operation: string,
        enrichFn: () => Promise<{ jobId: string }>
    ) => {
        try {
            setLoading(true);
            setActiveOperation(operation);

            console.log(`🚀 Starting ${operation} for ${selectedRowIds.length} rows...`);

            // Start enrichment job
            const result = await enrichFn();
            console.log(`✅ Job started: ${result.jobId}`);

            if (onEnrichmentStart) {
                onEnrichmentStart(result.jobId);
            }

            // Wait for completion
            await adapter.waitForJob(result.jobId, (status) => {
                console.log(
                    `📊 Progress: ${status.progress.completed}/${status.progress.total} (${status.progress.percentage}%)`
                );
            });

            console.log(`✅ ${operation} completed!`);

            if (onEnrichmentComplete) {
                onEnrichmentComplete();
            }

            alert(`✅ ${operation} completed successfully!\n\nEnriched ${selectedRowIds.length} rows.`);
        } catch (error: any) {
            console.error(`❌ ${operation} failed:`, error);
            alert(`❌ ${operation} failed:\n\n${error.message}`);
        } finally {
            setLoading(false);
            setActiveOperation(null);
        }
    };

    const handleFindEmails = () => {
        handleEnrichment('Find Emails', () =>
            adapter.enrichFindEmail({
                rowIds: selectedRowIds,
                firstName: 'col_firstName',
                lastName: 'col_lastName',
                domain: 'col_domain',
                targetColumn: 'col_email',
            })
        );
    };

    const handleEnrichCompany = () => {
        handleEnrichment('Enrich Companies', () =>
            adapter.enrichCompanyDetails({
                rowIds: selectedRowIds,
                domain: 'col_domain',
                company: 'col_company',
                outputs: {
                    industry: 'col_industry',
                    size: 'col_size',
                    revenue: 'col_revenue',
                },
            })
        );
    };

    const handleEnrichPerson = () => {
        handleEnrichment('Enrich People', () =>
            adapter.enrichPersonDetails({
                rowIds: selectedRowIds,
                firstName: 'col_firstName',
                lastName: 'col_lastName',
                outputs: {
                    title: 'col_title',
                    linkedin: 'col_linkedin',
                },
            })
        );
    };

    const handleAIResearch = () => {
        handleEnrichment('AI Research', () =>
            adapter.enrichAIResearch({
                rowIds: selectedRowIds,
                prompt: 'Find the latest news and developments about this company',
                context: ['col_company', 'col_domain'],
                targetColumn: 'col_notes',
            })
        );
    };

    const isDisabled = loading || selectedRowIds.length === 0;

    return (
        <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200">
            <div className="flex items-center gap-2 mr-4">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Enrich:</span>
                {selectedRowIds.length > 0 && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                        {selectedRowIds.length} selected
                    </span>
                )}
            </div>

            <div className="flex gap-2">
                <button
                    onClick={handleFindEmails}
                    disabled={isDisabled}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {loading && activeOperation === 'Find Emails' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <User className="w-3.5 h-3.5" />
                    )}
                    Find Emails
                </button>

                <button
                    onClick={handleEnrichCompany}
                    disabled={isDisabled}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {loading && activeOperation === 'Enrich Companies' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Building2 className="w-3.5 h-3.5" />
                    )}
                    Enrich Company
                </button>

                <button
                    onClick={handleEnrichPerson}
                    disabled={isDisabled}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {loading && activeOperation === 'Enrich People' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <User className="w-3.5 h-3.5" />
                    )}
                    Enrich People
                </button>

                <button
                    onClick={handleAIResearch}
                    disabled={isDisabled}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {loading && activeOperation === 'AI Research' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <BrainCircuit className="w-3.5 h-3.5" />
                    )}
                    AI Research
                </button>
            </div>

            {selectedRowIds.length === 0 && (
                <span className="text-xs text-gray-500 ml-2">
                    Select rows to enable enrichment
                </span>
            )}
        </div>
    );
}

