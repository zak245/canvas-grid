/**
 * Adapters - Data Access Layer
 * 
 * Centralized exports for all adapter implementations
 */

export { DataAdapter } from './DataAdapter';
export { LocalAdapter } from './LocalAdapter';
export { MockBackendAdapter, type MockBackendConfig } from './MockBackendAdapter';
export { BackendAdapter, type BackendAdapterConfig } from './BackendAdapter';

