import { Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, finalize } from 'rxjs';
import { DataTablesModule } from 'angular-datatables';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { NgbDropdownModule, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from '@services/api.service';
import { API_ROUTES, API_ROUTES_TOKEN } from '@services/app.global';
import { ToastrService } from 'ngx-toastr';
import * as XLSX from 'xlsx';
import {
  SettingsModalComponent,
  SettingsSummary,
} from '../../components/settings-modal/settings-modal.component';
import { SessionPersistenceService } from '@services/session-persistence.service';

declare var $: any;

@Component({
  selector: 'app-orderreceived',
  imports: [
    CommonModule,
    FormsModule,
    DataTablesModule,
    NgxSkeletonLoaderModule,
    NgbDropdownModule,
    SettingsModalComponent,
  ],
  templateUrl: './orderreceived.component.html',
  styleUrl: './orderreceived.component.scss',
})
export class OrderreceivedComponent implements OnDestroy {
  @ViewChild(SettingsModalComponent) settingsModal!: SettingsModalComponent;
  @ViewChild('updateImeiModal') updateImeiModal!: TemplateRef<any>;
  @ViewChild('failedIMEIList') failedIMEIList!: TemplateRef<any>;
  @ViewChild('excelUploadModal') excelUploadModal!: TemplateRef<any>;

  dataTable: any;
  modalRef: NgbModalRef | null = null;
  isLoading = true;
  isSubmitting = false;
  isSubmittingExcel = false;

  rowData: any[] = [];
  allStock: any[] = [];
  selectedFile: File | null = null;
  imeiReport: any;

  searchText = '';
  searchDebounceTimer: any;

  allColumns: any[] = [
    { field: 'channel', headerName: 'Channel', visible: true, index: 0 },
    { field: 'orderNo', headerName: 'Order No#', visible: true, index: 1 },
    { field: 'orderDate', headerName: 'Order Date', visible: true, index: 2 },
    { field: 'sku', headerName: 'SKU', visible: true, index: 3 },
    { field: 'lineNo', headerName: 'Line', visible: true, index: 4 },
    { field: 'imeiInput', headerName: 'IMEI Input', visible: true, index: 5 },
    { field: 'model', headerName: 'Model', visible: true, index: 6 },
    { field: 'storage', headerName: 'Storage', visible: true, index: 7 },
    { field: 'gradeName', headerName: 'Grade', visible: true, index: 8 },
    { field: 'color', headerName: 'Color', visible: true, index: 9 },
    { field: 'cost', headerName: 'Cost', visible: true, index: 10 },
    { field: 'createdAt', headerName: 'Created At', visible: true, index: 11 },
  ];

  constructor(
    @Inject(API_ROUTES_TOKEN) private config: typeof API_ROUTES,
    private api: ApiService,
    private toastr: ToastrService,
    private modalService: NgbModal,
    private persistence: SessionPersistenceService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    if (this.dataTable) {
      this.dataTable.destroy();
    }

    clearTimeout(this.searchDebounceTimer);
    $('#orderReceivedTable').off('search.dt');
  }

  loadData() {
    this.isLoading = true;

    const params = {
      page: 1,
      pageSize: 200,
      pendingOnly: true,
    };

    forkJoin({
      orders: this.api.getDataWithParams(this.config.GET_ORDER_RECEIVED_LIST, params),
      stock: this.api.getData(this.config.GET_PRODUCTS),
    })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res: any) => {
          const orders = res?.orders?.data ?? res?.orders?.Data ?? [];
          this.allStock = Array.isArray(res?.stock) ? res.stock : [];
          this.rowData = this.expandRowsByQuantity(orders);
          setTimeout(() => this.initDataTable());
        },
        error: (error) => {
          this.toastr.error(error?.error?.message ?? 'Failed to load order received data', 'Error');
        },
      });
  }

  expandRowsByQuantity(orders: any[]): any[] {
    const expandedRows: any[] = [];
    for (const order of orders ?? []) {
      const quantity = Number(order?.quantity ?? 0);
      const safeQty = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 0;
      for (let index = 0; index < safeQty; index++) {
        expandedRows.push({
          ...order,
          lineNo: index + 1,
          quantity: 1,
          newImei: '',
          filteredImeis: [],
          showSuggestionList: false,
          model: '',
          storage: '',
          gradeName: '',
          color: '',
          cost: null,
        });
      }
    }
    return expandedRows;
  }

  initDataTable() {
    if (this.dataTable) {
      this.dataTable.clear();
      this.dataTable.destroy();
    }

    const savedColumns = this.persistence.loadColumnVisibility('order_received');
    if (savedColumns) {
      this.allColumns = savedColumns;
    }

    const savedSearch = this.persistence.loadSearchText('order_received');
    this.searchText = savedSearch || '';

    this.dataTable = $('#orderReceivedTable').DataTable({
      pagingType: 'full_numbers',
      pageLength: 50,
      searching: true,
      paging: true,
      info: true,
      responsive: false,
      autoWidth: false,
      scrollX: true,
      scrollCollapse: true,
      search: {
        search: this.searchText,
      },
    });

    setTimeout(() => {
      if (this.dataTable) {
        this.dataTable.columns.adjust().draw();
      }
    }, 100);

    if (this.dataTable) {
      this.allColumns.forEach((col) => {
        const column = this.dataTable.column(col.index);
        if (column.visible() !== col.visible) {
          column.visible(col.visible);
        }
      });
    }

    $('#orderReceivedTable').on('search.dt', () => {
      const searchValue = this.dataTable.search();
      if (this.searchText !== searchValue) {
        this.searchText = searchValue;
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = setTimeout(() => {
          this.persistence.saveSearchText('order_received', this.searchText);
        }, 500);
      }
    });
  }

  toggleColumnVisibility(index: number) {
    if (!this.dataTable) {
      return;
    }

    const colIndex = this.allColumns.findIndex((c) => c.index === index);
    if (colIndex > -1) {
      const newVisibility = !this.allColumns[colIndex].visible;
      this.allColumns[colIndex].visible = newVisibility;

      const column = this.dataTable.column(index);
      column.visible(newVisibility, false);
      this.dataTable.columns.adjust().draw(false);

      this.persistence.saveColumnVisibility('order_received', this.allColumns);
    }
  }

  openSettingsModal() {
    if (this.settingsModal) {
      this.settingsModal.settingsSummary = this.getSettingsSummary();
      this.settingsModal.componentName = 'Order Received';
      this.settingsModal.open();
    }
  }

  getSettingsSummary(): SettingsSummary {
    const hiddenCount = this.allColumns.filter((c) => !c.visible).length;
    const visibleCount = this.allColumns.filter((c) => c.visible).length;
    const hasSearch = !!this.searchText && this.searchText.trim().length > 0;
    const hasColumnSettings = hiddenCount > 0;

    return {
      hasColumnSettings: hasColumnSettings,
      hasSearchFilter: hasSearch,
      hasCustomSettings: hasColumnSettings || hasSearch,
      hiddenColumnsCount: hiddenCount,
      modifiedColumnsCount: 0,
      searchText: this.searchText,
      totalColumns: this.allColumns.length,
      visibleColumns: visibleCount,
    };
  }

  resetColumnsOnly() {
    this.allColumns = this.allColumns.map((col) => ({ ...col, visible: true }));
    this.persistence.saveColumnVisibility('order_received', this.allColumns);

    if (this.dataTable) {
      this.allColumns.forEach((col) => {
        this.dataTable.column(col.index).visible(true);
      });
    }

    this.toastr.success('Column visibility reset', 'Success');
    if (this.settingsModal) {
      this.settingsModal.settingsSummary = this.getSettingsSummary();
    }
  }

  resetSearchOnly() {
    this.searchText = '';
    this.persistence.saveSearchText('order_received', '');

    if (this.dataTable) {
      this.dataTable.search('').draw();
    }

    this.toastr.success('Search filter cleared', 'Success');
    if (this.settingsModal) {
      this.settingsModal.settingsSummary = this.getSettingsSummary();
    }
  }

  resetWidthsOnly() {
    this.toastr.info('Column width reset not applicable for this table', 'Info');
  }

  resetSettings() {
    this.persistence.clearAllSettings('order_received');

    this.allColumns = this.allColumns.map((col) => ({ ...col, visible: true }));
    if (this.dataTable) {
      this.allColumns.forEach((col) => {
        this.dataTable.column(col.index).visible(true);
      });

      this.searchText = '';
      this.dataTable.search('').draw();
    }

    this.toastr.success('All settings reset successfully', 'Success');
    if (this.settingsModal) {
      this.settingsModal.settingsSummary = this.getSettingsSummary();
    }
  }

  getAvailableStockForRow(row: any): any[] {
    const sku = (row?.sku || '').trim().toLowerCase();
    const selectedByOtherRows = new Set(
      this.rowData
        .filter((r) => r !== row && r.newImei)
        .map((r) => String(r.newImei).trim().toLowerCase())
    );

    return this.allStock.filter((stock: any) => {
      const stockSku = (stock?.sku || '').trim().toLowerCase();
      const imei = (stock?.imei || '').trim();
      if (!imei) return false;
      if (stockSku !== sku) return false;

      const isAvailable =
        (!stock?.orderNo || String(stock.orderNo).trim() === '') &&
        !stock?.dateSold &&
        (!stock?.orderStatus || String(stock.orderStatus).toLowerCase() === 'available');

      if (!isAvailable) return false;
      return !selectedByOtherRows.has(imei.toLowerCase());
    });
  }

  showSuggestions(row: any) {
    this.rowData.forEach((r) => {
      if (r !== row) r.showSuggestionList = false;
    });

    const search = (row?.newImei || '').trim().toLowerCase();
    const availableStock = this.getAvailableStockForRow(row);
    const availableImeis = availableStock
      .map((stock: any) => String(stock?.imei || '').trim())
      .filter((imei: string) => imei);

    row.filteredImeis = search
      ? availableImeis.filter((imei: string) => imei.toLowerCase().includes(search))
      : availableImeis;

    row.showSuggestionList = true;
  }

  filterImeis(row: any) {
    this.showSuggestions(row);
    if (!row?.newImei) {
      this.clearSelectedStockFields(row);
    }
  }

  closeSuggestions(row: any) {
    row.showSuggestionList = false;
  }

  selectImei(imei: string, row: any) {
    const stock = this.getAvailableStockForRow(row).find(
      (s: any) => String(s?.imei || '').trim().toLowerCase() === imei.trim().toLowerCase()
    );
    if (!stock) {
      this.toastr.error('Selected IMEI is not available for this SKU', 'Error');
      return;
    }

    row.newImei = stock.imei;
    row.showSuggestionList = false;
    this.bindSelectedStockToRow(row, stock);
  }

  onImeiEnter(row: any) {
    const typedImei = (row?.newImei || '').trim();
    row.showSuggestionList = false;

    if (!typedImei) {
      this.clearSelectedStockFields(row);
      return;
    }

    const stock = this.getAvailableStockForRow(row).find(
      (s: any) => String(s?.imei || '').trim().toLowerCase() === typedImei.toLowerCase()
    );

    if (!stock) {
      this.toastr.error(`Invalid IMEI for SKU ${row?.sku}`, 'Error');
      row.newImei = '';
      this.clearSelectedStockFields(row);
      return;
    }

    row.newImei = stock.imei;
    this.bindSelectedStockToRow(row, stock);
  }

  bindSelectedStockToRow(row: any, stock: any) {
    row.model = stock?.model || '';
    row.storage = stock?.storage || '';
    row.gradeName = stock?.gradeName || stock?.grade || '';
    row.color = stock?.color || '';
    row.cost = stock?.cost ?? null;
  }

  clearSelectedStockFields(row: any) {
    row.model = '';
    row.storage = '';
    row.gradeName = '';
    row.color = '';
    row.cost = null;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.imei-input-container')) {
      this.rowData.forEach((row) => (row.showSuggestionList = false));
    }
  }

  confirmModal() {
    if (!this.rowData?.length) {
      this.toastr.warning('No pending rows available for processing', 'Validation');
      return;
    }

    this.modalRef = this.modalService.open(this.updateImeiModal, {
      centered: false,
      backdrop: 'static',
      keyboard: false,
      size: 'md',
    });
  }

  submitUpdateAll() {
    if (!this.rowData?.length) {
      this.toastr.warning('No rows to process', 'Validation');
      return;
    }

    const updates = this.rowData.map((row: any) => ({
      orderNo: row.orderNo,
      sku: row.sku,
      newImei: row.newImei ? String(row.newImei).trim() : null,
    }));

    this.isSubmitting = true;

    this.api
      .postData(this.config.ORDER_RECEIVED_IMEI_UPDATE, updates)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (res: any) => {
          const failed = res?.failed ?? [];
          const processedCount = Number(res?.summary?.processed ?? 0);
          const failedCount = Number(res?.summary?.failed ?? failed.length ?? 0);

          this.imeiReport = {
            summary: {
              successCount: processedCount,
              failedCount: failedCount,
              failedList: failed,
            },
            failed,
            processed: res?.processed ?? [],
          };

          if (failedCount > 0) {
            this.modalService.open(this.failedIMEIList, {
              size: 'lg',
              centered: false,
              backdrop: 'static',
            });
          }

          if (processedCount > 0) {
            this.toastr.success(`${processedCount} line(s) processed successfully`, 'Success');
          }

          if (failedCount === 0) {
            this.modalRef?.close();
          }

          this.selectedFile = null;
          this.loadData();
        },
        error: (err: any) => {
          const msg = err?.error?.message ?? 'Failed to process order received rows';
          this.toastr.error(msg, 'Error');
        },
      });
  }

  openExcelUploadModal() {
    this.modalRef = this.modalService.open(this.excelUploadModal, {
      size: 'lg',
      centered: false,
      backdrop: 'static',
    });
  }

  onFileChange(event: any) {
    const file = event?.target?.files?.[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  removeFile() {
    this.selectedFile = null;
  }

  submitUpdateExcel() {
    if (!this.selectedFile) {
      this.toastr.warning('Please select an Excel file', 'Validation');
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.isSubmittingExcel = true;

    this.api
      .postDataForm(this.config.ORDER_RECEIVED_IMEI_UPDATE_EXCEL, formData)
      .pipe(finalize(() => (this.isSubmittingExcel = false)))
      .subscribe({
        next: (res: any) => {
          const failed = res?.failed ?? [];
          const processedCount = Number(res?.summary?.processed ?? 0);
          const failedCount = Number(res?.summary?.failed ?? failed.length ?? 0);

          this.imeiReport = {
            summary: {
              successCount: processedCount,
              failedCount: failedCount,
              failedList: failed,
            },
            failed,
            processed: res?.processed ?? [],
          };

          if (failedCount > 0) {
            this.modalService.open(this.failedIMEIList, {
              size: 'lg',
              centered: false,
              backdrop: 'static',
            });
          }

          if (processedCount > 0) {
            this.toastr.success(`${processedCount} line(s) processed successfully`, 'Success');
          }

          this.selectedFile = null;
          this.modalRef?.close();
          this.loadData();
        },
        error: (err: any) => {
          const msg = err?.error?.message ?? 'Excel processing failed';
          this.toastr.error(msg, 'Error');
        },
      });
  }

  exportExcel() {
    if (!this.rowData?.length) {
      return;
    }

    const formattedRows = this.rowData.map((row) => ({
      Channel: row.channel,
      'Order No#': row.orderNo,
      'Order Date': row.orderDate ? new Date(row.orderDate).toLocaleDateString() : '',
      SKU: row.sku,
      Line: row.lineNo,
      IMEI: row.newImei || '',
      Model: row.model || '',
      Storage: row.storage || '',
      Grade: row.gradeName || '',
      Color: row.color || '',
      Cost: row.cost ?? '',
      'Created At': row.createdAt ? new Date(row.createdAt).toLocaleString() : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Order Received');
    XLSX.writeFile(workbook, 'Order-Received.xlsx');
  }
}
