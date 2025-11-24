/**
 * Backend Adapter
 * 
 * Connects the grid to the Node.js backend API.
 * Implements the DataAdapter interface for seamless integration.
 */

import { DataAdapter } from './DataAdapter';
import type { GridColumn, GridRow, CellValue } from '../types/grid';
import type { FetchParams, GridData, CellUpdate, ColumnSort } from '../types/platform';

export interface BackendAdapterConfig {
  baseUrl: string;         // Backend API URL (e.g., http://localhost:3001)
  gridId: string;          // Grid ID to load
  enableLogs?: boolean;    // Console logging
}

export class BackendAdapter implements DataAdapter {
  private config: BackendAdapterConfig;
  private rowIdCache: Map<number, string> = new Map(); // Cache rowIndex -> rowId mapping
  
  constructor(config: BackendAdapterConfig) {
    this.config = {
      enableLogs: true,
      ...config,
    };
  }

  // ===== INTERNAL HELPERS =====

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.config.baseUrl}/api/v1${endpoint}`;
    
    if (this.config.enableLogs) {
      console.log(`[BackendAdapter] ${options?.method || 'GET'} ${endpoint}`);
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  private transformRowFromBackend(row: any): GridRow {
    // Transform plain values to GridCell objects
    const cellsMap = new Map();
    Object.entries(row.cells || {}).forEach(([columnId, value]) => {
      cellsMap.set(columnId, {
        value: value,  // Wrap plain value in GridCell object
      });
    });
    
    console.log('[BackendAdapter] Transforming row:', {
      rowId: row.id,
      cellsObject: row.cells,
      cellsMapSize: cellsMap.size,
      firstCellTransformed: cellsMap.values().next().value,
    });
    
    return {
      id: row.id,
      cells: cellsMap,
    };
  }

  private transformRowToBackend(row: Partial<GridRow>): any {
    const cells: Record<string, any> = {};
    if (row.cells) {
      row.cells.forEach((value, key) => {
        cells[key] = value;
      });
    }
    return { cells };
  }

  // ===== DATA FETCHING =====

  async fetchData(params: FetchParams): Promise<GridData> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());

    const data = await this.request<any>(
      `/grids/${this.config.gridId}/data?${queryParams.toString()}`
    );

    console.log('[BackendAdapter] Received data from API:', {
      totalRows: data.totalRows,
      rowCount: data.rows.length,
      firstRow: data.rows[0],
    });

    const transformedRows = data.rows.map((row: any) => this.transformRowFromBackend(row));
    
    // Cache rowId mappings for efficient cell updates (additive - don't overwrite)
    const startIndex = (data.page - 1) * data.pageSize;
    transformedRows.forEach((row, idx) => {
      this.rowIdCache.set(startIndex + idx, row.id);
    });
    
    console.log('[BackendAdapter] Transformed rows:', {
      count: transformedRows.length,
      firstTransformed: transformedRows[0],
      cacheSize: this.rowIdCache.size,
    });

    return {
      columns: data.columns,
      rows: transformedRows,
      totalRows: data.totalRows,
      page: data.page,
      pageSize: data.pageSize,
    };
  }

  // ===== ROW OPERATIONS =====

  async addRow(row: Partial<GridRow>): Promise<GridRow> {
    const data = await this.request<any>(
      `/grids/${this.config.gridId}/rows`,
      {
        method: 'POST',
        body: JSON.stringify(this.transformRowToBackend(row)),
      }
    );

    return this.transformRowFromBackend(data);
  }

  async updateRow(rowId: string, changes: Partial<GridRow>): Promise<GridRow> {
    const data = await this.request<any>(
      `/grids/${this.config.gridId}/rows/${rowId}`,
      {
        method: 'PUT',
        body: JSON.stringify(this.transformRowToBackend(changes)),
      }
    );

    return this.transformRowFromBackend(data);
  }

  async deleteRow(rowId: string): Promise<void> {
    await this.request(
      `/grids/${this.config.gridId}/rows/${rowId}`,
      { method: 'DELETE' }
    );
  }

  async bulkUpdateRows(updates: Array<{ rowId: string; changes: Partial<GridRow> }>): Promise<GridRow[]> {
    const transformedUpdates = updates.map((update) => ({
      rowId: update.rowId,
      cells: this.transformRowToBackend(update.changes).cells,
    }));

    const data = await this.request<any>(
      `/grids/${this.config.gridId}/rows/bulk-update`,
      {
        method: 'POST',
        body: JSON.stringify({ updates: transformedUpdates }),
      }
    );

    return data.results.map((row: any) => this.transformRowFromBackend(row));
  }

  async bulkDeleteRows(rowIds: string[]): Promise<void> {
    await this.request(
      `/grids/${this.config.gridId}/rows/bulk-delete`,
      {
        method: 'POST',
        body: JSON.stringify({ rowIds }),
      }
    );
  }

  // ===== COLUMN OPERATIONS =====

  async addColumn(column: GridColumn): Promise<GridColumn> {
    const data = await this.request<GridColumn>(
      `/grids/${this.config.gridId}/columns`,
      {
        method: 'POST',
        body: JSON.stringify(column),
      }
    );

    return data;
  }

  async updateColumn(columnId: string, changes: Partial<GridColumn>): Promise<GridColumn> {
    const data = await this.request<GridColumn>(
      `/grids/${this.config.gridId}/columns/${columnId}`,
      {
        method: 'PUT',
        body: JSON.stringify(changes),
      }
    );

    return data;
  }

  async deleteColumn(columnId: string): Promise<void> {
    await this.request(
      `/grids/${this.config.gridId}/columns/${columnId}`,
      { method: 'DELETE' }
    );
  }

  async reorderColumns(order: string[]): Promise<void> {
    await this.request(
      `/grids/${this.config.gridId}/columns/reorder`,
      {
        method: 'POST',
        body: JSON.stringify({ order }),
      }
    );
  }

  async resizeColumn(columnId: string, width: number): Promise<void> {
    await this.updateColumn(columnId, { width });
  }

  async hideColumn(columnId: string): Promise<void> {
    await this.updateColumn(columnId, { visible: false });
  }

  async pinColumn(columnId: string, pin: 'left' | 'right' | null): Promise<void> {
    // Not yet implemented in backend schema, but method exists for interface
    console.warn('pinColumn not yet implemented in backend');
  }

  // ===== CELL OPERATIONS =====

  async updateCell(rowIndex: number, columnId: string, value: CellValue): Promise<void> {
    // Use cached rowId mapping
    const rowId = this.rowIdCache.get(rowIndex);
    
    if (!rowId) {
      console.warn(`[BackendAdapter] Row ${rowIndex} not in cache (cache has ${this.rowIdCache.size} entries)`);
      // Fallback: fetch the specific page containing this row
      const pageSize = 50; // Match default page size
      const page = Math.floor(rowIndex / pageSize) + 1;
      const data = await this.fetchData({ page, pageSize });
      const localIndex = rowIndex % pageSize;
      const row = data.rows[localIndex];
      if (!row) {
        throw new Error(`Row at index ${rowIndex} not found`);
      }
      await this.updateCellByRowId(row.id, columnId, value);
      return;
    }

    console.log(`[BackendAdapter] Updating cell for row ${rowIndex} (${rowId}), column ${columnId}`);
    await this.updateCellByRowId(rowId, columnId, value);
  }

  async updateCellByRowId(rowId: string, columnId: string, value: CellValue): Promise<void> {
    await this.request(
      `/grids/${this.config.gridId}/cells`,
      {
        method: 'PUT',
        body: JSON.stringify({ rowId, columnId, value }),
      }
    );
  }

  async bulkUpdateCells(updates: CellUpdate[]): Promise<void> {
    // Transform updates from rowIndex to rowId
    const transformedUpdates = updates.map(update => {
      const rowId = this.rowIdCache.get(update.rowIndex);
      if (!rowId) {
        console.warn(`[BackendAdapter] Row ${update.rowIndex} not in cache for bulk update`);
        return null;
      }
      return {
        rowId,
        columnId: update.columnId,
        value: update.value,
      };
    }).filter(u => u !== null);

    if (transformedUpdates.length === 0) {
      console.warn('[BackendAdapter] No valid updates to send (all rows missing from cache)');
      return;
    }

    console.log(`[BackendAdapter] Bulk updating ${transformedUpdates.length} cells`);
    
    await this.request(
      `/grids/${this.config.gridId}/cells/bulk-update`,
      {
        method: 'POST',
        body: JSON.stringify({ updates: transformedUpdates }),
      }
    );
  }

  // ===== SORTING =====

  async sort(sortState: ColumnSort[]): Promise<GridData | void> {
    // For backend mode, we re-fetch data with sort params
    // This is a simplified implementation
    const data = await this.fetchData({
      sort: sortState,
    });
    return data;
  }

  // ===== METADATA =====

  async getColumnSchema(): Promise<GridColumn[]> {
    const data = await this.fetchData({});
    return data.columns;
  }

  async getRowCount(): Promise<number> {
    const data = await this.fetchData({});
    return data.totalRows || 0;
  }

  // ===== ENRICHMENT OPERATIONS =====

  /**
   * Find work emails for selected rows
   */
  async enrichFindEmail(params: {
    rowIds: string[];
    firstName: string;
    lastName: string;
    company?: string;
    domain?: string;
    targetColumn: string;
  }): Promise<{ jobId: string; status: string }> {
    const data = await this.request<any>(
      '/enrich/find-email',
      {
        method: 'POST',
        body: JSON.stringify({
          gridId: this.config.gridId,
          ...params,
        }),
      }
    );

    return data;
  }

  /**
   * Enrich company details
   */
  async enrichCompanyDetails(params: {
    rowIds: string[];
    domain?: string;
    company?: string;
    outputs: {
      industry?: string;
      size?: string;
      revenue?: string;
      description?: string;
      founded?: string;
      location?: string;
    };
  }): Promise<{ jobId: string; status: string }> {
    const data = await this.request<any>(
      '/enrich/company-details',
      {
        method: 'POST',
        body: JSON.stringify({
          gridId: this.config.gridId,
          ...params,
        }),
      }
    );

    return data;
  }

  /**
   * Enrich person details
   */
  async enrichPersonDetails(params: {
    rowIds: string[];
    email?: string;
    firstName?: string;
    lastName?: string;
    outputs: {
      title?: string;
      linkedin?: string;
      location?: string;
      seniority?: string;
      department?: string;
    };
  }): Promise<{ jobId: string; status: string }> {
    const data = await this.request<any>(
      '/enrich/person-details',
      {
        method: 'POST',
        body: JSON.stringify({
          gridId: this.config.gridId,
          ...params,
        }),
      }
    );

    return data;
  }

  /**
   * AI-powered research
   */
  async enrichAIResearch(params: {
    rowIds: string[];
    prompt: string;
    context: string[];
    targetColumn: string;
  }): Promise<{ jobId: string; status: string }> {
    const data = await this.request<any>(
      '/enrich/ai-research',
      {
        method: 'POST',
        body: JSON.stringify({
          gridId: this.config.gridId,
          ...params,
        }),
      }
    );

    return data;
  }

  /**
   * Get enrichment job status
   */
  async getJobStatus(jobId: string): Promise<{
    id: string;
    operation: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: {
      total: number;
      completed: number;
      failed: number;
      percentage: number;
    };
    results: any[];
    error?: string;
  }> {
    const data = await this.request<any>(`/jobs/${jobId}`);
    return data;
  }

  /**
   * Poll job until completed (utility method)
   */
  async waitForJob(jobId: string, onProgress?: (progress: any) => void): Promise<any> {
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max

    while (attempts < maxAttempts) {
      const status = await this.getJobStatus(jobId);

      if (onProgress) {
        onProgress(status);
      }

      if (status.status === 'completed') {
        return status;
      }

      if (status.status === 'failed') {
        throw new Error(status.error || 'Job failed');
      }

      // Wait 1 second before next poll
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error('Job timeout');
  }
}

