import { MenuItem } from '../types/platform';

export type ContextType = 'cell' | 'row-header' | 'column-header' | 'selection' | 'grid-body';

export interface MenuContext {
    type: ContextType;
    row?: number;
    col?: number;
    columnId?: string;
    selection?: any;
}

export interface MenuProvider {
    id: string;
    getMenuItems: (context: MenuContext) => MenuItem[];
}

/**
 * ContextMenuManager - Manages context menu registration and retrieval
 */
export class ContextMenuManager {
    private providers: Map<string, MenuProvider> = new Map();

    /**
     * Register a new menu provider
     */
    registerProvider(provider: MenuProvider): void {
        this.providers.set(provider.id, provider);
    }

    /**
     * Unregister a menu provider
     */
    unregisterProvider(providerId: string): void {
        this.providers.delete(providerId);
    }

    /**
     * Get all applicable menu items for a given context
     */
    getMenuForContext(context: MenuContext): MenuItem[] {
        let items: MenuItem[] = [];

        // Collect items from all providers
        for (const provider of this.providers.values()) {
            const providerItems = provider.getMenuItems(context);
            if (providerItems && providerItems.length > 0) {
                // Add separator if needed before appending new group
                if (items.length > 0) {
                    items.push({ 
                        id: `sep-${Date.now()}-${Math.random()}`, 
                        label: '', 
                        onClick: () => {}, 
                        separator: true 
                    });
                }
                items = [...items, ...providerItems];
            }
        }

        return items;
    }
}

