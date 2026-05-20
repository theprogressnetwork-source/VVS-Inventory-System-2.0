import { Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Component, HostListener, TemplateRef, ViewChild } from '@angular/core';
import { finalize, Subject } from 'rxjs';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  NgbDropdownModule,
  NgbModal,
  NgbModalRef,
} from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from '@services/api.service';
import { API_ROUTES, API_ROUTES_TOKEN } from '@services/app.global';
import { DataTableService } from '@services/data-table.service';
import { GvarService } from '@services/gvar.service';
import { DataTableDirective, DataTablesModule } from 'angular-datatables';
import { ToastrService } from 'ngx-toastr';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { SessionPersistenceService } from '@services/session-persistence.service';
import {
  SettingsModalComponent,
  SettingsSummary,
} from '../../components/settings-modal/settings-modal.component';
import { AgGridAngular } from 'ag-grid-angular';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { environment } from '../../../environments/environment';
declare var bootstrap: any;
import {
  AllCommunityModule,
  ColDef,
  ModuleRegistry,
  GridReadyEvent,
  GridApi,
  ColumnState,
  GridOptions,
  ValueGetterParams,
} from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);
@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DataTablesModule,
    NgxSkeletonLoaderModule,
    AgGridAngular,
    AgGridAngular,
    SettingsModalComponent,
    NgbDropdownModule,
  ],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss',
})
export class InventoryComponent {
  isCooldownActive: boolean = false; // 5-minute lock
  cooldownMinutes: number = 5; // Remaining minutes
  cooldownTimer: any;
  autoSyncTimer: any;
  loading: boolean = false;
  syncReport: any = null;
  failedRecords: any[] = [];
  failedSummary: any = null;

  @ViewChild('failedModalRef') failedModalRef!: TemplateRef<any>;
  @ViewChild('syncModal') syncModal!: TemplateRef<any>;
  @ViewChild('modalTemplate') modalTemplate!: TemplateRef<any>;
  @ViewChild(SettingsModalComponent) settingsModal!: SettingsModalComponent;
  isLoading = true;
  isStockSync = false;
  @ViewChild(DataTableDirective, { static: false })
  dtElement!: DataTableDirective;
  dtTrigger: Subject<any> = new Subject();
  dtOptions = {};
  modalRef: NgbModalRef;

  totalSum: number = 0;
  totalSumWithHst: number = 0;
  listInventory: any = [];
  selectedFile: File | null = null;
  // Column definitions
  colDefs: ColDef[] = [
    { field: 'sku', headerName: 'SKU', sortable: true, filter: true },
    { field: 'model', headerName: 'Model', sortable: true, filter: true },
    { field: 'storage', headerName: 'Storage', sortable: true, filter: true }, // uses "512 GB"
    { field: 'color', headerName: 'Color', sortable: true, filter: true },
    { field: 'gradeName', headerName: 'Grade', sortable: true, filter: true },
    {
      field: 'cost',
      headerName: 'Cost',
      sortable: true,
      filter: true,
      cellClass: 'text-center',
    },
    {
      field: 'quantity',
      headerName: 'Qty',
      sortable: true,
      filter: true,
      cellClass: 'text-center',
    },

    // BestBuy Columns
    { field: 'platform', headerName: 'Channel', sortable: true, filter: true },
    {
      field: 'platformPrice',
      headerName: 'Our Price',
      sortable: true,
      filter: true,
      cellClass: 'text-center',
      valueGetter: (params) => this.getEffectivePrice(params.data),
      valueFormatter: (params) => this.formatMoney(params.value),
      headerTooltip:
        'Shows Discount Price if available; otherwise Platform Price',
    },
    {
      field: 'platformWinnerPrice',
      headerName: 'Winner Price',
      sortable: true,
      filter: true,
      cellClass: 'text-center',
    },
    {
      field: 'platformDifference',
      headerName: 'Difference',
      sortable: true,
      filter: true,
      cellClass: 'text-center',
      // THIS FIXES THE DISPLAY ISSUE
      valueFormatter: (params) => {
        if (params.value == null) return '';
        return params.value.toFixed(2);
      },
    },

    // Winning Badge
    {
      field: 'platformWinningOffer',
      headerName: 'Winning',
      sortable: true,
      filter: true,
      cellRenderer: (params: any) => {
        if (params.value) {
          return `<span class="badge rounded-pill bg-light text-success border border-success px-3 py-1">
                  <i class="fa fa-check-circle me-1"></i> Winning
                </span>`;
        } else {
          return `<span class="badge rounded-pill bg-light text-danger border border-danger px-3 py-1">
                  <i class="fa fa-times-circle me-1"></i> Losing
                </span>`;
        }
      },
      cellClass: 'text-center',
    },

    // Calculated Columns
    {
      headerName: 'Value',
      colId: 'value',
      valueGetter: (params) => {
        const cost = this.toNumber(params.data?.cost);
        const qty = this.toNumber(params.data?.quantity);
        return cost * qty;
      },
      valueFormatter: (params) => this.formatMoney(params.value),
      cellClass: 'text-center',
      headerTooltip: 'Value = Cost × Qty',
    },
    {
      headerName: 'Value + HST',
      colId: 'valueWithHst',
      valueGetter: (params) => {
        const cost = this.toNumber(params.data?.cost);
        const qty = this.toNumber(params.data?.quantity);
        return cost * qty * 1.13;
      },
      valueFormatter: (params) => this.formatMoney(params.value),
      cellClass: 'text-center',
      headerTooltip: 'Value + HST = Cost × Qty × 1.13',
    },
    {
      headerName: 'Breakeven',
      colId: 'breakeven',
      valueGetter: (params) => {
        const cost = this.toNumber(params.data?.cost);
        return cost / 0.9;
      },
      valueFormatter: (params) => this.formatMoney(params.value),
      cellClass: 'text-center text-primary',
      headerTooltip: 'Breakeven = Cost ÷ 0.9',
    },
    {
      headerName: 'Net',
      colId: 'net',
      valueGetter: (params) => {
        const price = this.getEffectivePrice(params.data);
        return price > 0 ? price * 0.9 : 0;
      },
      valueFormatter: (params) => this.formatMoney(params.value),
      cellClass: 'bg-light text-dark text-center',
      headerTooltip: 'Net = Effective Price × 0.9',
    },
    {
      headerName: 'Gross Profit',
      colId: 'grossProfit',
      valueGetter: (params) => {
        const price = this.getEffectivePrice(params.data);
        const cost = this.toNumber(params.data?.cost);
        const qty = this.toNumber(params.data?.quantity);
        if (!price || !cost) return 0;
        return price * 0.9 - cost;
      },
      valueFormatter: (params) => this.formatMoney(params.value),
      cellClass: 'bg-light text-dark text-center',
      headerTooltip: 'Gross Profit = (Effective Price × 0.9 − Cost)',
    },
  ];

  gridOptions: GridOptions = {
    enableCellTextSelection: true, // <-- allows text selection
    ensureDomOrder: true, // fixes selection bug with overlays
    suppressCopyRowsToClipboard: false,
    suppressClipboardPaste: true,
    pagination: false,
    quickFilterParser: (text: string) =>
      text.toLowerCase().split(' ').filter(Boolean),

    quickFilterMatcher: (parts, value) => {
      const v = value?.toString().toLowerCase() ?? '';
      return parts.every((p) => v.includes(p));
    },
    isExternalFilterPresent: () => {
      return !!this.searchText && this.searchText.trim().length > 0;
    },
    doesExternalFilterPass: (node) => {
      const search = this.normalizeSearch(this.searchText);
      if (!search) return true;
      const row = node.data || {};
      const parts = search.split(' ').filter(Boolean);
      const model = this.normalizeSearch(row.model);
      if (parts.length > 1 && model.startsWith(search) && model !== search) {
        return false;
      }
      const rawWinning = row.platformWinningOffer ?? row.winning;
      const normalizedWinning =
        rawWinning === true ||
        rawWinning === 1 ||
        rawWinning === '1' ||
        rawWinning === 'true' ||
        rawWinning === 'True' ||
        rawWinning === 'TRUE' ||
        rawWinning === 'Y' ||
        rawWinning === 'y'
          ? 'win'
          : rawWinning === false ||
              rawWinning === 0 ||
              rawWinning === '0' ||
              rawWinning === 'false' ||
              rawWinning === 'False' ||
              rawWinning === 'FALSE' ||
              rawWinning === 'N' ||
              rawWinning === 'n'
            ? 'lose'
            : '';

      const winningText =
        normalizedWinning === 'win'
          ? 'winning win yes true'
          : normalizedWinning === 'lose'
            ? 'losing lose no false'
            : '';
      const haystack = [
        row.sku,
        row.model,
        row.storage,
        row.color,
        row.gradeName,
        row.platform,
        row.platformPrice,
        row.platformWinnerPrice,
        winningText,
      ]
        .map((v: any) => this.normalizeSearch(v))
        .filter(Boolean)
        .join(' ');

      return haystack.includes(search);
    },
    postSortRows: (params) => {
      const term = this.normalizeSearch(this.searchText);
      if (!term) return;
      const parts = term.split(' ').filter(Boolean);
      if (!parts.length) return;

      params.nodes.sort((a, b) => {
        const scoreB = this.getSearchScore(b.data, parts, term);
        const scoreA = this.getSearchScore(a.data, parts, term);
        return scoreB - scoreA;
      });
    },
  };
  searchText: string = ''; // Search input model
  private searchDebounceTimer: any;
  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    getQuickFilterText: (params: any) => {
      return this.normalizeSearch(params.value);
    },
  };
  allColumns = this.colDefs.map((c) => ({
    field: (c.field || c.colId)!,
    headerName: c.headerName || c.field || c.colId || 'Column',
    visible: true,
  }));
  gridApi!: GridApi;
  constructor(
    private fb: FormBuilder,
    @Inject(API_ROUTES_TOKEN) private config: typeof API_ROUTES,
    private GV: GvarService,
    private API: ApiService,
    private modalService: NgbModal,
    private dataTableService: DataTableService,
    private toastr: ToastrService,
    private persistence: SessionPersistenceService,
  ) {}

  ngOnInit(): void {
    this.initializeDataTable();

    // Restore saved column visibility
    const savedColumns = this.persistence.loadColumnVisibility('inventory');
    if (savedColumns) {
      this.allColumns = this.getNormalizedColumns(savedColumns);
      this.updateColDefsFromSavedColumns();
    }

    // Restore saved search text
    this.searchText = this.persistence.loadSearchText('inventory');

    this.getInvertory();
    const lockUntil = Number(localStorage.getItem('stockSyncLockUntil'));
    if (lockUntil && lockUntil > Date.now()) {
      this.isCooldownActive = true;
      this.cooldownMinutes = Math.ceil((lockUntil - Date.now()) / 60000);
      this.resumeStockSyncCooldown();
    }

    if (environment.enableInventoryAutoSync) {
      this.startAutoSync();
    }
  }
  initializeDataTable() {
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 25,
      processing: true,
      responsive: true,
      dom: 'Blfrtip',
      buttons: [
        {
          extend: 'copy',
          text: '<i class="fa fa-copy"></i> Copy',
        },
        {
          extend: 'excel',
          text: '<i class="fa fa-file-excel-o"></i> Excel',
        },
        {
          extend: 'print',
          text: '<i class="fa fa-print"></i> Print',
        },
      ],
    };
  }

  private getExportValue(col: ColDef, row: any): any {
    // CASE 1: valueGetter exists
    if (typeof col.valueGetter === 'function') {
      const params: ValueGetterParams = {
        data: row,
        node: null as any,
        column: null as any,
        colDef: col,
        api: null as any,
        context: null,

        // ✅ REQUIRED by latest AG Grid
        getValue: (field: string) => row?.[field],
      };

      const value = col.valueGetter(params);
      return typeof value === 'number' ? Number(value.toFixed(2)) : value;
    }

    // CASE 2: simple field
    if (col.field) {
      let value = row[col.field];

      // Boolean → Excel friendly
      if (col.field === 'winning') {
        return value ? 'Winning' : 'Losing';
      }

      return value ?? '';
    }

    return '';
  }

  exportExcel() {
    if (!this.listInventory?.length) return;

    // ❗ sirf visible columns export hon
    const exportCols = this.colDefs.filter((c) => c.field || c.valueGetter);

    const formattedRows = this.listInventory.map((row: any) => {
      const newRow: any = {};

      exportCols.forEach((col) => {
        const header = col.headerName || col.field;
        newRow[header!] = this.getExportValue(col, row);
      });

      return newRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedRows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');

    XLSX.writeFile(workbook, 'Inventory.xlsx');
  }

  getInvertory() {
    this.isLoading = true;
    this.API.getData(this.config.GET_ALL_INVENTORY)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (data: any) => {
          if (data != null) {
            this.listInventory = data;
            this.totalSum = this.listInventory.reduce(
              (sum: number, item: any) => {
                return sum + item.cost * item.quantity;
              },
              0,
            );

            this.totalSumWithHst = this.listInventory.reduce(
              (sum: number, item: any) => {
                return sum + item.cost * item.quantity * 1.13;
              },
              0,
            );
            if (this.gridApi && this.searchText) {
              this.gridApi.refreshClientSideRowModel('sort');
            }
            this.rerenderTable();
          }
        },
        error: (error) => {
          if (error.error != undefined) {
            this.toastr.error(error.error.message, 'Error');
          }
        },
      });
  }

  ngAfterViewInit(): void {
    this.dtTrigger.next(null);
  }

  rerenderTable(): void {
    if (this.dtElement && this.dtElement.dtInstance) {
      this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
        dtInstance.destroy(); // pehle destroy
        this.dtTrigger.next(null); // phir trigger re-init
      });
    } else {
      // agar pehli baar call ho rahi ho ya dtElement undefined ho
      setTimeout(() => this.dtTrigger.next(null), 0);
    }
  }

  ngOnDestroy(): void {
    this.dtTrigger.unsubscribe();
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
    }
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
    }
  }

  onColumnToggle(field: string, event: any) {
    const visible = event.target.checked;

    this.colDefs = this.colDefs.map((col) => ({
      ...col,
      hide: (col.field || col.colId) === field ? !visible : col.hide,
    }));

    const col = this.allColumns.find((c) => c.field === field);
    if (col) col.visible = visible;

    this.gridApi.setGridOption('columnDefs', this.colDefs);

    // Save column visibility to localStorage
    this.persistence.saveColumnVisibility('inventory', this.allColumns);
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;

    // Restore saved grid state (column widths, order)
    const savedState = this.persistence.loadGridState('inventory');
    if (savedState && savedState.length > 0) {
      this.gridApi.applyColumnState({ state: savedState, applyOrder: true });
    } else {
      // full width adjust at start if no saved state
      setTimeout(() => {
        this.gridApi.sizeColumnsToFit();
      }, 50);
    }

    // Restore search text if exists
    if (this.searchText) {
      this.gridApi.setGridOption('quickFilterText', '');
      this.gridApi.onFilterChanged();
      this.gridApi.refreshClientSideRowModel('sort');
    }

    // Listen to column changes and auto-save
    params.api.addEventListener('columnResized', (event: any) => {
      if (event.finished) {
        this.saveGridState();
      }
    });

    params.api.addEventListener('columnMoved', (event: any) => {
      if (event.finished) {
        this.saveGridState();
      }
    });
  }

  toggleColumn(field: string, visible: boolean) {
    this.colDefs = this.colDefs.map((col) => ({
      ...col,
      hide: (col.field || col.colId) === field ? !visible : col.hide,
    }));

    const col = this.allColumns.find((c) => c.field === field);
    if (col) col.visible = visible;
  }
  onQuickFilterChanged(value: string) {
    this.searchText = value;
    if (this.gridApi) {
      this.gridApi.setGridOption('quickFilterText', '');
      this.gridApi.onFilterChanged();
      this.gridApi.refreshClientSideRowModel('sort');
    }

    // Debounce save to avoid too frequent writes
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = setTimeout(() => {
      this.persistence.saveSearchText('inventory', value);
    }, 500);
  }

  normalizeSearch(value: any): string {
    if (value == null) return '';

    return value
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .split(' ')
      .filter(Boolean)
      .join(' ');
  }

  private toNumber(value: any): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private formatMoney(value: any): string {
    const n = this.toNumber(value);
    return n.toFixed(2);
  }

  private getEffectivePrice(row: any): number {
    if (!row) return 0;
    const discount = this.toNumber(row.platformDiscountPrice);
    const price = this.toNumber(row.platformPrice);
    if (discount > 0) return discount;
    if (price > 0) return price;
    return 0;
  }

  private getSearchScore(row: any, parts: string[], fullTerm: string): number {
    if (!row) return 0;

    const sku = this.normalizeSearch(row.sku);
    const model = this.normalizeSearch(row.model);
    const storage = this.normalizeSearch(row.storage);
    const color = this.normalizeSearch(row.color);
    const grade = this.normalizeSearch(row.gradeName);
    const platform = this.normalizeSearch(row.platform);

    let score = 0;

    // Strongly prefer exact/full model matches
    if (model === fullTerm) score += 1000;
    else if (model.startsWith(fullTerm)) score += 500;
    parts.forEach((p) => {
      if (sku === p) score += 100;
      else if (sku.startsWith(p)) score += 80;
      else if (sku.includes(p)) score += 60;

      if (model === p) score += 60;
      else if (model.startsWith(p)) score += 40;
      else if (model.includes(p)) score += 25;

      if (storage === p) score += 20;
      if (color === p) score += 10;
      if (grade === p) score += 10;
      if (platform === p) score += 10;
    });

    return score;
  }

  @HostListener('window:resize')
  onResize() {
    if (this.gridApi) {
      this.gridApi.sizeColumnsToFit(); // responsive adjustment
    }
  }

  openAddModal() {
    this.modalRef = this.modalService.open(this.modalTemplate, {
      centered: false,
      backdrop: 'static',
      keyboard: false,
      size: 'lg',
    });
  }

  onBulkSubmit(uploadModal: any) {
    if (!this.selectedFile) {
      this.toastr.warning('Please select an Excel file first!', 'Alert');
      return;
    }

    this.loading = true;

    const formData = new FormData();
    formData.append('inventoryFile', this.selectedFile);

    this.API.postDataForm(this.config.UPLOAD_WININNG_SHEET, formData).subscribe(
      {
        next: (res: any) => {
          this.loading = false;

          const failed = res?.data?.notFoundRecords ?? [];
          const summary = res?.data?.summary ?? null;

          this.failedRecords = failed;
          this.failedSummary = summary;

          uploadModal.close();

          // FULL SUCCESS
          if (failed.length === 0) {
            this.toastr.success('All records updated successfully!', 'Success');
            return;
          }
          this.getInvertory();
          // PARTIAL SUCCESS (200 status but failed rows)
          this.toastr.warning('Some items failed to update.', 'Alert');

          setTimeout(() => {
            this.modalService.open(this.failedModalRef, {
              size: 'lg',
              backdrop: 'static',
            });
          });
        },

        error: (err) => {
          this.loading = false;

          // API error response (like your case status 404)
          const failed = err?.error?.data?.notFoundRecords ?? [];
          const summary = err?.error?.data?.summary ?? null;

          this.failedRecords = failed;
          this.failedSummary = summary;

          uploadModal.close();

          if (failed.length > 0) {
            this.toastr.error('Some items failed. Showing details...', 'Error');

            setTimeout(() => {
              this.modalService.open(this.failedModalRef, {
                size: 'lg',
                backdrop: 'static',
              });
            });
          } else {
            this.toastr.error(
              err.error?.message || 'Something went wrong',
              'Error',
            );
          }
        },
      },
    );
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.add('drag-over');
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.remove('drag-over');
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.remove('drag-over');
    if (event.dataTransfer?.files.length) {
      this.setFile(event.dataTransfer.files[0]);
    }
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.setFile(file);
    }
  }

  setFile(file: File) {
    this.selectedFile = file;
    console.log('Selected file:', file.name, file.size);
  }

  removeFile() {
    this.selectedFile = null;
  }

  downloadFailedExcel() {
    if (!this.failedRecords || this.failedRecords.length === 0) {
      this.toastr.warning('No failed records to download!');
      return;
    }

    const exportData = this.failedRecords.map((x) => ({
      sku: x.bestbuySku || '',
      PRICE: x.bestbuyPrice || '',
      'DISCOUNT-PRICE': x.bestbuyDiscountPrice || '',
      'discount-start-date': x.bestbuyDiscountStartDate || '',
      'discount-end-date': x.bestbuyDiscountEndDate || '',
      quantity: x.bestbuyQuantity || '',
      'UPC Code': x.upc || '',
      'SKU Title': x.bestbuySkuTitle || '',

      // FIXED Y/N issue
      'Winning Offer':
        x.bestbuyWinningOffer === true
          ? 'Y'
          : x.bestbuyWinningOffer === false
            ? 'N'
            : '',

      "Winner's Price": x.bestbuyWinnerPrice || '',
      "Winner's Shipping Price": x.bestbuyWinnerShippingPrice || '',
      Difference: x.bestbuyDifference || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Failed Records');

    XLSX.writeFile(workbook, 'Failed_Records.xlsx');
  }

  syncAllStock() {
    if (!this.listInventory || !this.listInventory.length) {
      this.toastr.warning('No inventory data to sync');
      return;
    }
    if (this.isCooldownActive || this.isStockSync) {
      return;
    }

    const payload = this.listInventory.map((item: any) => ({ Sku: item.sku }));

    this.isStockSync = true;

    this.API.postData(this.config.STOCK_SYNC, payload)
      .pipe(finalize(() => (this.isStockSync = false)))
      .subscribe({
        next: (res: any) => {
          if (!res?.success) {
            this.toastr.error(res?.message || 'Stock sync failed');
            return;
          }
          // ✅ START COOLDOWN (15 min)
          this.startStockSyncCooldown();

          const data = res.data;

          const details: any[] = [];

          // processed
          (data.details?.processed || []).forEach((p: any) => {
            details.push({
              sku: p.platformSku || p.systemSku,
              status: 'Success',
              message: p.msg || 'Stock updated successfully',
            });
          });

          // errors
          (data.details?.errors || []).forEach((e: any) => {
            details.push({
              sku: e.systemSku || e.platformSku,
              status: 'Failed',
              message: e.message || e.exception || 'Error',
            });
          });

          // skipped
          (data.details?.skipped || []).forEach((s: any) => {
            details.push({
              sku: s.systemSku || s.platformSku,
              status: 'Skipped',
              message: s.message || s.reason,
            });
          });

          this.syncReport = {
            totalSkus: data.totalSkus,
            successCount: data.successCount,
            failedCount: data.failedCount,
            skippedCount: data.skippedCount,
            details,
          };

          this.modalService.open(this.syncModal, {
            size: 'lg',
            centered: false,
            backdrop: 'static',
          });

          this.toastr.success('Stock sync completed');
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'Stock sync failed');
          console.error(err);
        },
      });
  }
  startStockSyncCooldown() {
    const lockMinutes = 15;
    const expiresAt = Date.now() + lockMinutes * 60 * 1000;

    localStorage.setItem('stockSyncLockUntil', expiresAt.toString());

    this.isCooldownActive = true;
    this.cooldownMinutes = lockMinutes;
    this.resumeStockSyncCooldown();
  }

  resumeStockSyncCooldown() {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
    }

    this.cooldownTimer = setInterval(() => {
      const remaining =
        Number(localStorage.getItem('stockSyncLockUntil')) - Date.now();

      if (remaining <= 0) {
        clearInterval(this.cooldownTimer);
        localStorage.removeItem('stockSyncLockUntil');
        this.isCooldownActive = false;
        this.cooldownMinutes = 0;
      } else {
        this.isCooldownActive = true;
        this.cooldownMinutes = Math.ceil(remaining / 60000);
      }
    }, 60000);
  }

  startAutoSync() {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
    }

    // auto sync every 15 minutes (when not on cooldown)
    this.autoSyncTimer = setInterval(
      () => {
        if (!this.isCooldownActive && !this.isStockSync) {
          this.syncAllStock();
        }
      },
      24 * 60 * 60 * 1000,
    );
  }

  /**
   * Save current grid state (column widths, order, visibility)
   */
  saveGridState() {
    if (this.gridApi) {
      const state = this.gridApi.getColumnState();
      this.persistence.saveGridState('inventory', state);
    }
  }

  /**
   * Update colDefs based on saved column visibility
   */
  updateColDefsFromSavedColumns() {
    this.colDefs = this.colDefs.map((col) => {
      const key = col.field || col.colId;
      const saved = this.allColumns.find((c) => c.field === key);
      if (saved) {
        return { ...col, hide: !saved.visible };
      }
      return col;
    });
  }

  private getNormalizedColumns(savedColumns: any[]) {
    const defaults = this.colDefs.map((c) => ({
      field: (c.field || c.colId)!,
      headerName: c.headerName || c.field || c.colId || 'Column',
      visible: true,
    }));

    const visibilityMap = new Map<string, boolean>();
    (savedColumns || []).forEach((col: any) => {
      if (col?.field) {
        visibilityMap.set(col.field, !!col.visible);
      }
    });

    return defaults.map((col) => ({
      ...col,
      visible: visibilityMap.has(col.field)
        ? (visibilityMap.get(col.field) as boolean)
        : col.visible,
    }));
  }

  /**
   * Get summary of current settings for Settings Modal
   */
  getSettingsSummary(): SettingsSummary {
    const hiddenCount = this.allColumns.filter((c) => !c.visible).length;
    const visibleCount = this.allColumns.filter((c) => c.visible).length;
    const hasSearch = !!this.searchText && this.searchText.trim().length > 0;
    const hasColumnSettings = hiddenCount > 0;
    const gridState = this.persistence.loadGridState('inventory');
    const hasModifiedWidths = !!gridState && gridState.length > 0;

    return {
      hasColumnSettings: hasColumnSettings,
      hasSearchFilter: hasSearch,
      hasCustomSettings: hasColumnSettings || hasSearch || hasModifiedWidths,
      hiddenColumnsCount: hiddenCount,
      modifiedColumnsCount: hasModifiedWidths ? this.allColumns.length : 0,
      searchText: this.searchText,
      totalColumns: this.allColumns.length,
      visibleColumns: visibleCount,
    };
  }

  /**
   * Open Settings Modal
   */
  openSettingsModal() {
    if (this.settingsModal) {
      this.settingsModal.settingsSummary = this.getSettingsSummary();
      this.settingsModal.componentName = 'Inventory';
      this.settingsModal.open();
    }
  }

  /**
   * Reset only column visibility
   */
  resetColumnsOnly() {
    this.allColumns = this.allColumns.map((col) => ({ ...col, visible: true }));
    this.updateColDefsFromSavedColumns();
    this.persistence.saveColumnVisibility('inventory', this.allColumns);

    if (this.gridApi) {
      this.gridApi.setGridOption('columnDefs', this.colDefs);
      setTimeout(() => {
        this.gridApi.sizeColumnsToFit();
      }, 50);
    }

    this.toastr.success('Column visibility reset', 'Success');
    if (this.settingsModal) {
      this.settingsModal.settingsSummary = this.getSettingsSummary();
    }
  }

  /**
   * Reset only search filter
   */
  resetSearchOnly() {
    this.searchText = '';
    this.persistence.saveSearchText('inventory', '');

    if (this.gridApi) {
      this.gridApi.setGridOption('quickFilterText', '');
    }

    this.toastr.success('Search filter cleared', 'Success');
    if (this.settingsModal) {
      this.settingsModal.settingsSummary = this.getSettingsSummary();
    }
  }

  /**
   * Reset only column widths and order
   */
  resetWidthsOnly() {
    localStorage.removeItem('ims_inventory_grid_state');

    if (this.gridApi) {
      this.gridApi.resetColumnState();
      setTimeout(() => {
        this.gridApi.sizeColumnsToFit();
      }, 50);
    }

    this.toastr.success('Column widths and order reset', 'Success');
    if (this.settingsModal) {
      this.settingsModal.settingsSummary = this.getSettingsSummary();
    }
  }

  /**
   * Reset all saved settings
   */
  resetSettings() {
    this.persistence.clearAllSettings('inventory');

    // Reset to defaults
    this.searchText = '';
    this.allColumns = this.allColumns.map((col) => ({ ...col, visible: true }));
    this.updateColDefsFromSavedColumns();

    if (this.gridApi) {
      this.gridApi.setGridOption('columnDefs', this.colDefs);
      this.gridApi.setGridOption('quickFilterText', '');
      this.gridApi.resetColumnState();
      setTimeout(() => {
        this.gridApi.sizeColumnsToFit();
      }, 50);
    }

    this.toastr.success('All settings reset successfully', 'Success');

    // Update modal summary
    if (this.settingsModal) {
      this.settingsModal.settingsSummary = this.getSettingsSummary();
    }
  }
}
