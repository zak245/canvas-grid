export class ImageCache {
    private static cache: Map<string, HTMLImageElement> = new Map();
    private static pending: Set<string> = new Set();

    /**
     * Get image from cache.
     * If not found, starts loading and returns null.
     * @param url The image URL
     * @param onLoad Optional callback to trigger when image loads (e.g. trigger render)
     */
    static get(url: string, onLoad?: () => void): HTMLImageElement | null {
        if (!url) return null;

        if (this.cache.has(url)) {
            return this.cache.get(url)!;
        }

        if (!this.pending.has(url)) {
            this.pending.add(url);
            const img = new Image();
            img.crossOrigin = 'Anonymous'; // Important for canvas to avoid tainting
            img.src = url;
            img.onload = () => {
                this.cache.set(url, img);
                this.pending.delete(url);
                if (onLoad) onLoad();
            };
            img.onerror = () => {
                console.warn(`Failed to load image: ${url}`);
                this.pending.delete(url);
            };
        }

        return null;
    }

    static clear() {
        this.cache.clear();
        this.pending.clear();
    }
}



