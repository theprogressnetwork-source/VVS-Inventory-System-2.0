import { Inject } from '@angular/core';
import { Component, HostListener, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { API_ROUTES, API_ROUTES_TOKEN } from '@services/app.global';
import { GvarService } from '@services/gvar.service';
import { ApiService } from '@services/api.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AgGridAngular } from 'ag-grid-angular';
import {
  AllCommunityModule,
  ColDef,
  ModuleRegistry,
  GridReadyEvent,
  GridApi,
  ColumnState,
  GridOptions,
} from 'ag-grid-community';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { finalize } from 'rxjs';
import * as XLSX from 'xlsx';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
ModuleRegistry.registerModules([AllCommunityModule]);
@Component({
  selector: 'app-sku-mapping',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgxSkeletonLoaderModule,
    AgGridAngular,
  ],
  templateUrl: './sku-mapping.component.html',
  styleUrl: './sku-mapping.component.scss',
})
export class SkuMappingComponent {
  @ViewChild('deleteModal') deleteModal!: TemplateRef<any>;
  modalRef: NgbModalRef | null = null;
  colDefs: ColDef[] = [
    {
      headerName: 'Actions',
      cellRenderer: (params: any) => {
        return `
        <button class="btn btn-outline-danger btn-sm rounded-circle delete-btn" title="Delete Record">
          <i class="fa fa-trash fa-xs"></i>
        </button>
      `;
      },
    },
    {
      field: 'channelName',
      headerName: 'Channel Name',
      sortable: true,
      filter: true,
    },
    {
      field: 'channelSKU',
      headerName: 'Channel SKU',
      sortable: true,
      filter: true,
    },
    {
      field: 'systemSKU',
      headerName: 'System SKU',
      sortable: true,
      filter: true,
    },
    {
      field: 'createdAt',
      headerName: 'Created On',
      sortable: true,
      filter: true,
      valueFormatter: function (params) {
        if (!params.value) return '';
        const date = new Date(params.value);
        return date.toLocaleDateString('fr-CA'); // DD/MM/YYYY
      },
    },
  ];

  gridOptions: GridOptions = {
    enableCellTextSelection: true, // <-- allows text selection
    ensureDomOrder: true, // fixes selection bug with overlays
    suppressCopyRowsToClipboard: false,
    suppressClipboardPaste: true,
  };

  dropdownOpen = false;
  defaultColDef: ColDef = {
    flex: 1,
    minWidth: 100,
    sortable: true,
    resizable: true,
  };
  allColumns = this.colDefs.map((c) => ({
    field: c.field!,
    headerName: c.headerName!,
    visible: true,
  }));
  rowData: any[];
  gridApi!: GridApi;

  isLoading = true;
  listMappingSKU: any = [];
  mappingID: any;
  listSkus: any = [];

  channels = ['Amazon', 'Shopify', 'BestBuy'];

  newMapping = { ChannelName: '', ChannelSKU: '', SystemSKU: '', ShopSKU: '' };
  listBestBuySkus: any = [];
  filteredBestBuySkus: any = [];
  highlightedIndex: number = -1;
  showDropdown: boolean = false;

  filteredSystemSkus: any[] = [];
  systemHighlightedIndex: number = -1;
  showSystemDropdown: boolean = false;

  isChannelSkuValid = false;
  isSystemSkuValid = false;
  errorMessage = '';

  listChannelSkus: any[] = [];
  filteredChannelSkus: any[] = [];

  constructor(
    private fb: FormBuilder,
    @Inject(API_ROUTES_TOKEN) private config: typeof API_ROUTES,
    private GV: GvarService,
    private API: ApiService,
    private modalService: NgbModal,
    private router: Router,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer
  ) {}
  ngOnInit(): void {
    this.getSkus();
    this.getMappings();
    //this.getLatestOrder();
  }
  exportExcel() {
    if (!this.gridApi) return;

    const columnDefs: any[] = this.gridApi.getColumnDefs() ?? [];

    // Extract only real columns (skip actions)
    const exportColumns = columnDefs
      .filter((col) => col.field)
      .map((col) => ({
        field: col.field,
        headerName: col.headerName || col.field,
      }));

    // Get all row data
    const rows: any[] = [];
    this.gridApi.forEachNode((node) => node.data && rows.push(node.data));

    // Make formatted export rows
    const formattedRows = rows.map((row) => {
      const newRow: any = {};

      exportColumns.forEach((col) => {
        let value = row[col.field];
        newRow[col.headerName] = value; // use frontend header
      });

      return newRow;
    });

    // Convert to Excel
    const worksheet = XLSX.utils.json_to_sheet(formattedRows);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SKU-Mappings');

    XLSX.writeFile(workbook, 'SKU-Mappings.xlsx');
  }
  getMappings() {
    this.isLoading = true;
    this.API.getData(this.config.GET_MAPPINGS)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (data: any) => {
          if (data != null && data.data) {
            // Sort by createdAt (latest first)
            this.listMappingSKU = data.data.sort(
              (a: any, b: any) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            );
          }
        },
        error: (error) => {
          if (error?.error?.message) {
            this.toastr.error(error.error.message, 'Error');
          }
        },
      });
  }

  onColumnToggle(field: string, event: any) {
    const visible = event.target.checked;

    this.colDefs = this.colDefs.map((col) => ({
      ...col,
      hide: col.field === field ? !visible : col.hide,
    }));

    const col = this.allColumns.find((c) => c.field === field);
    if (col) col.visible = visible;

    this.gridApi.setGridOption('columnDefs', this.colDefs);

    setTimeout(() => {
      this.gridApi.sizeColumnsToFit();
    }, 50);
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;

    // full width adjust at start
    setTimeout(() => {
      this.gridApi.sizeColumnsToFit();
    }, 50);
  }

  toggleColumn(field: string, visible: boolean) {
    this.colDefs = this.colDefs.map((col) => ({
      ...col,
      hide: col.field === field ? !visible : col.hide,
    }));

    const col = this.allColumns.find((c) => c.field === field);
    if (col) col.visible = visible;

    setTimeout(() => {
      this.gridApi.sizeColumnsToFit();
    }, 50);
  }

  onQuickFilterChanged(event: any) {
    const value = event.target.value;
    if (this.gridApi) {
      this.gridApi.setGridOption('quickFilterText', value);
    }
  }
  @HostListener('window:resize')
  onResize() {
    if (this.gridApi) {
      this.gridApi.sizeColumnsToFit(); // responsive adjustment
    }
  }
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    // Agar click dropdown ke andar nahi hua toh close kar do
    if (!target.closest('.multi-select')) {
      this.dropdownOpen = false;
    }
  }

  onCellClicked(event: any) {
    if (event.colDef.headerName === 'Actions') {
      const rowIndex = event.rowIndex; // ya event.node.rowIndex
      if (event.event.target.closest('.delete-btn')) {
        this.deleteRecord(event.data.mappingId);
      }
    }
  }
  deleteRecord(mappingID: number) {
    this.mappingID = mappingID;
    this.modalRef = this.modalService.open(this.deleteModal, {
      centered: false,
      backdrop: 'static',
      keyboard: false,
      size: 'md',
    });
  }
  onDeleteConfirmed() {
    this.API.deleteData(this.config.DELETE_MAPPING + this.mappingID).subscribe({
      next: (data: any) => {
        if (data != null) {
          this.getMappings();
          this.modalRef?.close();
          this.toastr.success(data.message, 'Success');
        }
      },
      error: (error) => {
        if (error.error != undefined) {
          this.toastr.error(error.error.message, 'Error');
        }
      },
    });
  }

  addMapping() {
    if (
      !this.newMapping.ChannelName ||
      !this.newMapping.ChannelSKU ||
      !this.newMapping.SystemSKU
    ) {
      this.toastr.error('Please fill all fields', 'Error');
      return;
    }
    if (!this.isChannelSkuValid) {
      this.toastr.error(
        'Please select a valid Channel SKU from suggestions.',
        'Error'
      );
      return;
    }
    if (!this.isSystemSkuValid) {
      this.toastr.error(
        'Please select a valid System SKU from suggestions.',
        'Error'
      );
      return;
    }

    this.API.postData(this.config.SAVE_MAPPINGS, this.newMapping).subscribe({
      next: (data: any) => {
        if (data.success) {
          this.toastr.success(data.message, 'Success');
          this.getMappings();
          this.newMapping = {
            ChannelName: '',
            ChannelSKU: '',
            SystemSKU: '',
            ShopSKU: '',
          };
        }
      },
      error: (error) => {
        if (error.error) {
          this.toastr.error(error.error.message, 'Error');
        }
      },
    });
  }
  getSkus() {
    this.isLoading = true;
    this.API.getData(this.config.GET_SKU).subscribe({
      next: (data: any) => {
        if (data.data != null) {
          this.listSkus = data.data;
          this.filteredBestBuySkus = [...data.data];
        }
      },
      error: (error) => {
        if (error.error != undefined) {
          this.toastr.error(error.error.message, 'Error');
        }
      },
    });
  }

  getLatestOrder() {
    this.API.getData(this.config.GET_LATEST_ORDERS).subscribe({
      next: (data: any) => {
        if (data != null) {
        }
      },
      error: (error) => {
        if (error.error != undefined) {
          this.toastr.error(error.error.message, 'Error');
        }
      },
    });
  }

  getChannelSkus(channel: string) {
    if (!channel) return;

    const cacheKey = `${channel.toLowerCase()}_skus_cache`;
    const apiMap: any = {
      BestBuy: this.config.GET_BESTBUY_SKUS,
      Shopify: this.config.GET_SHOPIFY_SKUS,
      Amazon: this.config.GET_AMAZON_SKUS,
    };

    const apiUrl = apiMap[channel];
    if (!apiUrl) {
      console.warn(`⚠️ No API configured for channel: ${channel}`);
      this.listChannelSkus = [];
      this.filteredChannelSkus = [];
      return;
    }

    // ✅ Check cache first
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      const cacheAgeMinutes = (Date.now() - parsed.timestamp) / 60000;

      if (cacheAgeMinutes < 360 && parsed.data?.length) {
        console.log(`✅ Loaded ${channel} SKUs from cache`);
        this.listChannelSkus = parsed.data;
        this.filteredChannelSkus = [...parsed.data];
        return;
      }
    }

    // Fetch fresh data if cache expired or not found
    console.log(`Fetching ${channel} SKUs from API...`);
    const channelRequest =
      channel === 'BestBuy'
        ? this.API.getTextData(apiUrl)
        : this.API.getData(apiUrl);

    channelRequest.subscribe({
      next: (response: any) => {
        // 🔧 FIX: Normalize Amazon response
        let normalizedResponse = response;
        if (channel === 'BestBuy' && typeof response === 'string') {
          normalizedResponse = this.parseTextResponse(response);
        }

        const data = this.normalizeChannelSkuResponse(normalizedResponse);

        if (data?.length) {
          this.listChannelSkus = data;
          this.filteredChannelSkus = [...data];

          // Cache results for 6 hours
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              timestamp: Date.now(),
              data,
            })
          );
        } else {
          this.listChannelSkus = [];
          this.filteredChannelSkus = [];
        }
      },
      error: (error) => {
        this.listChannelSkus = [];
        this.filteredChannelSkus = [];
        this.toastr.error(this.getChannelSkuErrorMessage(error, channel), 'Error');
      },
    });
  }

  private normalizeChannelSkuResponse(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (response && typeof response === 'object') {
      return [response];
    }

    return [];
  }

  private parseTextResponse(response: string): any {
    const trimmedResponse = response?.trim();

    if (!trimmedResponse) {
      return [];
    }

    if (trimmedResponse.startsWith('<')) {
      throw new Error('Server returned HTML instead of JSON.');
    }

    try {
      return JSON.parse(trimmedResponse);
    } catch {
      throw new Error('Unable to parse server response.');
    }
  }

  private getChannelSkuErrorMessage(error: unknown, channel: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 504) {
        return `${channel} SKUs service timed out (504). Please try again in a moment.`;
      }

      if (
        typeof error.error === 'string' &&
        error.error.trim().startsWith('<')
      ) {
        return `${channel} SKUs service returned an invalid server error page.`;
      }

      if (
        typeof error.error?.message === 'string' &&
        error.error.message.trim()
      ) {
        return error.error.message;
      }

      if (typeof error.message === 'string' && error.message.trim()) {
        return error.message;
      }
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return `Failed to load ${channel} SKUs`;
  }

  onChannelChange() {
    const selectedChannel = this.newMapping.ChannelName;

    //Always reset SKU input and dropdown on channel change
    this.newMapping.ChannelSKU = '';
    this.listChannelSkus = [];
    this.filteredChannelSkus = [];
    this.showDropdown = false;
    this.isChannelSkuValid = false;

    //If no channel selected → just stop here
    if (!selectedChannel) return;

    // Fetch SKUs for the newly selected channel
    this.getChannelSkus(selectedChannel);
  }

  filterChannelSkus() {
    const selectedChannel = this.newMapping.ChannelName;
    const query = this.newMapping.ChannelSKU?.toLowerCase() || '';

    // ⚠️ Show message if user didn't select a channel
    if (!selectedChannel) {
      this.toastr.warning('Please select a channel first.', 'Channel Required');
      this.newMapping.ChannelSKU = ''; // clear input
      this.filteredChannelSkus = [];
      this.showDropdown = false;
      this.isChannelSkuValid = false;
      return;
    }

    if (!query) {
      this.filteredChannelSkus = [];
      this.showDropdown = false;
      this.isChannelSkuValid = false;
      return;
    }

    // Filter SKUs within the selected channel
    const listToFilter = this.listChannelSkus || [];
    if (!listToFilter.length) {
      this.filteredChannelSkus = [];
      this.showDropdown = true;
      this.isChannelSkuValid = false;
      return;
    }

    const columnMap: any = {
      BestBuy: { sku: 'product_sku', title: 'product_title' },
      Shopify: { sku: 'sku', title: 'name' },
      Amazon: { sku: 'sku', title: 'name' },
    };
    const cols = columnMap[selectedChannel] || { sku: 'sku', title: 'title' };

    this.filteredChannelSkus = listToFilter.filter(
      (sku: any) =>
        sku[cols.sku]?.toLowerCase().includes(query) ||
        sku[cols.title]?.toLowerCase().includes(query)
    );

    this.highlightedIndex = -1;
    this.showDropdown = true;
    this.isChannelSkuValid = this.filteredChannelSkus.length > 0;
  }

  /*Helper for displaying correct SKU + title dynamically */
  getDisplaySku(sku: any): string {
    const channel = this.newMapping.ChannelName;
    const columnMap: any = {
      BestBuy: { sku: 'product_sku', title: 'product_title' },
      Shopify: { sku: 'sku', title: 'name' },
    };
    const cols = columnMap[channel] || { sku: 'sku', title: 'name' };
    return `${sku[cols.sku] ?? ''} - ${sku[cols.title] ?? ''}`;
  }

  // Highlight matched part
  highlightMatch(text: string): SafeHtml {
    const query = this.newMapping.ChannelSKU?.trim();
    if (!query) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    const highlighted = text.replace(
      regex,
      `<strong style="color:#007bff;">$1</strong>`
    );

    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }

  // Select SKU
  selectSku(sku: any) {
    console.log('Selected SKU object:', sku); // 🔍 Check full object
    const channel = this.newMapping.ChannelName;
    const columnMap: any = {
      BestBuy: { sku: 'product_sku' },
      Shopify: { sku: 'sku' },
    };
    const cols = columnMap[channel] || { sku: 'sku' };

    this.newMapping.ChannelSKU = sku[cols.sku];
    this.isChannelSkuValid = true;

    // Try to get shopSKU
    if (sku.shop_sku) {
      this.newMapping.ShopSKU = sku.shop_sku;
      console.log('Mapped ShopSKU:', this.newMapping.ShopSKU);
    } else {
      this.newMapping.ShopSKU = '';
      console.log('ShopSKU not found');
    }

    this.showDropdown = false;
    this.highlightedIndex = -1;
  }

  moveSelection(direction: number) {
    const length = this.filteredChannelSkus.length;
    if (length === 0) return;

    this.highlightedIndex =
      (this.highlightedIndex + direction + length) % length;
    const sku = this.filteredChannelSkus[this.highlightedIndex];
    this.newMapping.ChannelSKU = this.getDisplaySku(sku);
  }

  onEnter() {
    if (this.highlightedIndex >= 0 && this.filteredChannelSkus.length > 0) {
      const selectedSku = this.filteredChannelSkus[this.highlightedIndex];
      this.selectSku(selectedSku);
    }
  }

  // Show dropdown on focus
  onInputFocus() {
    if (this.filteredChannelSkus.length > 0) {
      this.showDropdown = true;
    }
  }

  // Hide dropdown on blur (but allow click selection)
  onInputBlur() {
    setTimeout(() => (this.showDropdown = false), 200);
  }

  // Click outside = close dropdown
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.position-relative')) {
      this.showDropdown = false;
      this.showSystemDropdown = false;
    }
  }

  onSystemInputFocus() {
    // jab focus ho, full list show karo
    this.filteredSystemSkus = [...this.listSkus];
    this.showSystemDropdown = true;
  }

  onSystemInputBlur() {
    // thoda delay dena taake click select hone pa hide na ho turant
    setTimeout(() => (this.showSystemDropdown = false), 200);
  }

  filterSystemSkus() {
    const search = (this.newMapping.SystemSKU || '').toLowerCase();
    if (!search) {
      this.filteredSystemSkus = [...this.listSkus]; // empty input par full list
    } else {
      this.filteredSystemSkus = this.listSkus.filter(
        (s: any) =>
          s.sku.toLowerCase().includes(search) ||
          (s.model && s.model.toLowerCase().includes(search)) ||
          (s.color && s.color.toLowerCase().includes(search)) ||
          (s.storage && s.storage.toLowerCase().includes(search)) ||
          (s.gradeName && s.gradeName.toLowerCase().includes(search))
      );
    }
    this.showSystemDropdown = true;
    this.isSystemSkuValid = false;
  }

  selectSystemSku(s: any) {
    this.newMapping.SystemSKU = s.sku;
    this.isSystemSkuValid = true;
    this.showSystemDropdown = false;
  }

  onSystemEnter() {
    if (
      this.systemHighlightedIndex >= 0 &&
      this.systemHighlightedIndex < this.filteredSystemSkus.length
    ) {
      this.selectSystemSku(
        this.filteredSystemSkus[this.systemHighlightedIndex]
      );
    }
  }

  moveSystemSelection(direction: number) {
    const newIndex = this.systemHighlightedIndex + direction;
    if (newIndex >= 0 && newIndex < this.filteredSystemSkus.length) {
      this.systemHighlightedIndex = newIndex;
    }
  }

  highlightSystemMatch(text: string): string {
    const term = this.newMapping.SystemSKU || '';
    if (!term) return text;
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
  combineProductInfo(item: any): string {
    // Jo values exist karti hain unko join kar de
    return [item.gradeName, item.model, item.storage, item.color]
      .filter(Boolean) // null/undefined/empty remove
      .join(' - ');
  }
}
