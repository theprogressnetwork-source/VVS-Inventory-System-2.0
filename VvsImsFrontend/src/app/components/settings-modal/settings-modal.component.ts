import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface SettingsSummary {
    hasColumnSettings: boolean;
    hasSearchFilter: boolean;
    hasCustomSettings: boolean;
    hiddenColumnsCount: number;
    modifiedColumnsCount: number;
    searchText: string;
    totalColumns: number;
    visibleColumns: number;
}

@Component({
    selector: 'app-settings-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './settings-modal.component.html',
    styleUrl: './settings-modal.component.scss',
})
export class SettingsModalComponent {
    @Input() componentName: string = 'Component';
    @Input() settingsSummary: SettingsSummary = {
        hasColumnSettings: false,
        hasSearchFilter: false,
        hasCustomSettings: false,
        hiddenColumnsCount: 0,
        modifiedColumnsCount: 0,
        searchText: '',
        totalColumns: 0,
        visibleColumns: 0,
    };

    @Output() resetColumns = new EventEmitter<void>();
    @Output() resetSearch = new EventEmitter<void>();
    @Output() resetWidths = new EventEmitter<void>();
    @Output() resetAll = new EventEmitter<void>();
    @Output() close = new EventEmitter<void>();

    isVisible: boolean = false;

    open() {
        this.isVisible = true;
    }

    closeModal() {
        this.isVisible = false;
        this.close.emit();
    }

    onResetColumns() {
        this.resetColumns.emit();
    }

    onResetSearch() {
        this.resetSearch.emit();
    }

    onResetWidths() {
        this.resetWidths.emit();
    }

    onResetAll() {
        this.resetAll.emit();
    }
}
