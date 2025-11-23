/**
 * Mock Backend Adapter
 * 
 * Simulates a backend API for POC and testing purposes.
 * Uses LocalAdapter internally but adds network latency simulation.
 * 
 * Features:
 * - Configurable latency (default 300ms)
 * - Console logging of all operations
 * - Error simulation (optional)
 * - All operations return promises like real backend
 * 
 * Use when:
 * - Building POC without real backend
 * - Testing optimistic updates
 * - Developing offline-first features
 * - Demonstrating to stakeholders
 */

import { DataAdapter } from './DataAdapter';
import { LocalAdapter } from './LocalAdapter';
import type { GridColumn, GridRow, CellValue } from '../types/grid';
import type { FetchParams, GridData, CellUpdate, ColumnSort } from '../types/platform';

export interface MockBackendConfig {
  latency: number;          // Network latency in ms
  enableLogs: boolean;      // Console logging
  errorRate: number;        // 0-1, probability of random errors
}

export class MockBackendAdapter implements DataAdapter {
  private localAdapter: LocalAdapter;
  private config: MockBackendConfig;
  
  constructor(initialData: GridData, config?: Partial<MockBackendConfig>) {
    this.localAdapter = new LocalAdapter(initialData);
    this.config = {
      latency: config?.latency ?? 300,
      enableLogs: config?.enableLogs ?? true,
      errorRate: config?.errorRate ?? 0,
    };
  }
  
  // ===== INTERNAL HELPERS =====
  
  private async simulateLatency<T>(
    operation: string,
    fn: () => T | Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    
    if (this.config.enableLogs) {
      console.log(`[MockBackend] ${operation}...`);
    }
    
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, this.config.latency));
    
    // Simulate random errors if configured
    if (this.config.errorRate > 0 && Math.random() < this.config.errorRate) {
      const error = new Error(`[MockBackend] Simulated error for ${operation}`);
      if (this.config.enableLogs) {
        console.error(error);
      }
      throw error;
    }
    
    // Execute operation
    const result = await fn();
    
    const duration = Math.round(performance.now() - startTime);
    if (this.config.enableLogs) {
      console.log(`[MockBackend] ${operation} completed in ${duration}ms`);
    }
    
    return result;
  }
  
  private logData(label: string, data: any) {
    if (this.config.enableLogs) {
      console.log(`[MockBackend] ${label}:`, data);
    }
  }
  
  // ===== DATA FETCHING =====
  
  async fetchData(params: FetchParams): Promise<GridData> {
    this.logData('Fetching data', params);
    
    return this.simulateLatency(
      'fetchData',
      () => this.localAdapter.fetchData(params)
    );
  }
  
  // ===== ROW OPERATIONS =====
  
  async addRow(row: Partial<GridRow>): Promise<GridRow> {
    this.logData('Adding row', { rowId: row.id, cellCount: row.cells?.size || 0 });
    
    return this.simulateLatency(
      'addRow',
      () => this.localAdapter.addRow(row)
    );
  }
  
  async updateRow(rowId: string, changes: Partial<GridRow>): Promise<GridRow> {
    this.logData('Updating row', { rowId, changes });
    
    return this.simulateLatency(
      'updateRow',
      () => this.localAdapter.updateRow(rowId, changes)
    );
  }
  
  async deleteRow(rowId: string): Promise<void> {
    this.logData('Deleting row', { rowId });
    
    return this.simulateLatency(
      'deleteRow',
      () => this.localAdapter.deleteRow(rowId)
    );
  }
  
  async bulkUpdateRows(updates: Array<{ rowId: string; changes: Partial<GridRow> }>): Promise<GridRow[]> {
    this.logData('Bulk updating rows', { count: updates.length });
    
    return this.simulateLatency(
      'bulkUpdateRows',
      () => this.localAdapter.bulkUpdateRows(updates)
    );
  }
  
  async bulkDeleteRows(rowIds: string[]): Promise<void> {
    this.logData('Bulk deleting rows', { count: rowIds.length });
    
    return this.simulateLatency(
      'bulkDeleteRows',
      () => this.localAdapter.bulkDeleteRows(rowIds)
    );
  }
  
  // ===== COLUMN OPERATIONS =====
  
  async addColumn(column: GridColumn): Promise<GridColumn> {
    this.logData('Adding column', { id: column.id, title: column.title, type: column.type });
    
    return this.simulateLatency(
      'addColumn',
      () => this.localAdapter.addColumn(column)
    );
  }
  
  async updateColumn(columnId: string, changes: Partial<GridColumn>): Promise<GridColumn> {
    this.logData('Updating column', { columnId, changes });
    
    return this.simulateLatency(
      'updateColumn',
      () => this.localAdapter.updateColumn(columnId, changes)
    );
  }
  
  async deleteColumn(columnId: string): Promise<void> {
    this.logData('Deleting column', { columnId });
    
    return this.simulateLatency(
      'deleteColumn',
      () => this.localAdapter.deleteColumn(columnId)
    );
  }
  
  async reorderColumns(order: string[]): Promise<void> {
    this.logData('Reordering columns', { newOrder: order });
    
    return this.simulateLatency(
      'reorderColumns',
      () => this.localAdapter.reorderColumns(order)
    );
  }
  
  async resizeColumn(columnId: string, width: number): Promise<void> {
    this.logData('Resizing column', { columnId, width });
    
    return this.simulateLatency(
      'resizeColumn',
      () => this.localAdapter.resizeColumn(columnId, width)
    );
  }
  
  async hideColumn(columnId: string): Promise<void> {
    this.logData('Hiding column', { columnId });
    
    return this.simulateLatency(
      'hideColumn',
      () => this.localAdapter.hideColumn(columnId)
    );
  }
  
  async pinColumn(columnId: string, pin: 'left' | 'right' | null): Promise<void> {
    this.logData('Pinning column', { columnId, pin });
    
    return this.simulateLatency(
      'pinColumn',
      () => this.localAdapter.pinColumn(columnId, pin)
    );
  }
  
  // ===== CELL OPERATIONS =====
  
  async updateCell(rowIndex: number, columnId: string, value: CellValue): Promise<void> {
    this.logData('Updating cell', { rowIndex, columnId, value });
    
    return this.simulateLatency(
      'updateCell',
      () => this.localAdapter.updateCell(rowIndex, columnId, value)
    );
  }
  
  async bulkUpdateCells(updates: CellUpdate[]): Promise<void> {
    this.logData('Bulk updating cells', { count: updates.length });
    
    return this.simulateLatency(
      'bulkUpdateCells',
      () => this.localAdapter.bulkUpdateCells(updates)
    );
  }
  
  // ===== SORTING =====
  
  async sort(sortState: ColumnSort[]): Promise<void> {
    this.logData('Sorting', sortState);
    
    return this.simulateLatency(
      'sort',
      () => this.localAdapter.sort(sortState)
    );
  }
  
  // ===== METADATA =====
  
  async getColumnSchema(): Promise<GridColumn[]> {
    return this.simulateLatency(
      'getColumnSchema',
      () => this.localAdapter.getColumnSchema()
    );
  }
  
  async getRowCount(): Promise<number> {
    return this.simulateLatency(
      'getRowCount',
      () => this.localAdapter.getRowCount()
    );
  }
  
  // ===== TESTING HELPERS =====
  
  /**
   * Change latency at runtime (for testing)
   */
  public setLatency(latency: number): void {
    this.config.latency = latency;
    if (this.config.enableLogs) {
      console.log(`[MockBackend] Latency set to ${latency}ms`);
    }
  }
  
  /**
   * Enable/disable logging
   */
  public setLogging(enabled: boolean): void {
    this.config.enableLogs = enabled;
  }
  
  /**
   * Set error rate (0-1)
   */
  public setErrorRate(rate: number): void {
    this.config.errorRate = Math.max(0, Math.min(1, rate));
    if (this.config.enableLogs) {
      console.log(`[MockBackend] Error rate set to ${rate * 100}%`);
    }
  }
  
  /**
   * Get underlying local adapter (for debugging)
   */
  public getLocalAdapter(): LocalAdapter {
    return this.localAdapter;
  }
  
  /**
   * Simulate a network outage (throws error on all operations)
   */
  public simulateOutage(duration: number): void {
    const originalRate = this.config.errorRate;
    this.config.errorRate = 1;
    
    if (this.config.enableLogs) {
      console.warn(`[MockBackend] Simulating network outage for ${duration}ms`);
    }
    
    setTimeout(() => {
      this.config.errorRate = originalRate;
      if (this.config.enableLogs) {
        console.log('[MockBackend] Network restored');
      }
    }, duration);
  }
}

