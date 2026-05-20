import { Injectable } from '@angular/core';
import { ColumnState } from 'ag-grid-community';

@Injectable({
    providedIn: 'root',
})
export class SessionPersistenceService {
    private readonly PREFIX = 'ims_';

    constructor() { }

    /**
     * Save column visibility settings
     */
    saveColumnVisibility(page: string, columns: any[]): void {
        try {
            const key = this.getKey(page, 'columns');
            localStorage.setItem(key, JSON.stringify(columns));
        } catch (error) {
            console.error('Error saving column visibility:', error);
        }
    }

    /**
     * Load column visibility settings
     */
    loadColumnVisibility(page: string): any[] | null {
        try {
            const key = this.getKey(page, 'columns');
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading column visibility:', error);
            return null;
        }
    }

    /**
     * Save AG Grid column state (width, order, visibility)
     */
    saveGridState(page: string, state: ColumnState[]): void {
        try {
            const key = this.getKey(page, 'grid_state');
            localStorage.setItem(key, JSON.stringify(state));
        } catch (error) {
            console.error('Error saving grid state:', error);
        }
    }

    /**
     * Load AG Grid column state
     */
    loadGridState(page: string): ColumnState[] | null {
        try {
            const key = this.getKey(page, 'grid_state');
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading grid state:', error);
            return null;
        }
    }

    /**
     * Clear AG Grid state
     */
    clearGridState(page: string): void {
        try {
            const key = this.getKey(page, 'grid_state');
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Error clearing grid state:', error);
        }
    }

    /**
     * Save search/filter text
     */
    saveSearchText(page: string, text: string): void {
        try {
            const key = this.getKey(page, 'search');
            localStorage.setItem(key, text);
        } catch (error) {
            console.error('Error saving search text:', error);
        }
    }

    /**
     * Load search/filter text
     */
    loadSearchText(page: string): string {
        try {
            const key = this.getKey(page, 'search');
            return localStorage.getItem(key) || '';
        } catch (error) {
            console.error('Error loading search text:', error);
            return '';
        }
    }

    /**
     * Clear all settings for a specific page or all pages
     */
    clearAllSettings(page?: string): void {
        try {
            if (page) {
                // Clear specific page settings
                localStorage.removeItem(this.getKey(page, 'columns'));
                localStorage.removeItem(this.getKey(page, 'grid_state'));
                localStorage.removeItem(this.getKey(page, 'search'));
            } else {
                // Clear all IMS settings
                const keys = Object.keys(localStorage);
                keys.forEach((key) => {
                    if (key.startsWith(this.PREFIX)) {
                        localStorage.removeItem(key);
                    }
                });
            }
        } catch (error) {
            console.error('Error clearing settings:', error);
        }
    }

    /**
     * Generate localStorage key
     */
    private getKey(page: string, type: string): string {
        return `${this.PREFIX}${page}_${type}`;
    }
}
