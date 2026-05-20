import { Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Component, HostListener, TemplateRef, ViewChild } from '@angular/core';
import { filter, finalize, Subject, Subscription } from 'rxjs';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgbDropdownModule, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from '@services/api.service';
import { API_ROUTES, API_ROUTES_TOKEN } from '@services/app.global';
import { DataTableService } from '@services/data-table.service';
import { GvarService } from '@services/gvar.service';
import { DataTableDirective, DataTablesModule } from 'angular-datatables';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ImeiCellRendererComponent } from '../imei-editor/imei-editor.component';
import { SessionPersistenceService } from '@services/session-persistence.service';
import { SettingsModalComponent, SettingsSummary } from '../../components/settings-modal/settings-modal.component';
declare var $: any;
@Component({
  selector: 'app-outgoing-new',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DataTablesModule,
    NgxSkeletonLoaderModule,
    SettingsModalComponent,
    NgbDropdownModule
  ],
  templateUrl: './outgoing-new.component.html',
  styleUrl: './outgoing-new.component.scss',
})
export class OutgoingNewComponent {
  @ViewChild('modalTemplate') modalTemplate!: TemplateRef<any>;
  @ViewChild('updateImeiModal') updateImeiModal!: TemplateRef<any>;
  @ViewChild('failedIMEIList') failedIMEIList!: TemplateRef<any>;
  @ViewChild(SettingsModalComponent) settingsModal!: SettingsModalComponent;
  dataTable: any;
  modalRef: NgbModalRef | null = null;
  isLoading = true;
  listProducts: any = [];
  selectedFile: File | null = null;
  pdfData: any[] = [];
  imeiReport: any;
  columns: string[] = [];
  rows: any[] = [];
  orderForm!: FormGroup;
  private modalOpening = false;
  private routerSub!: Subscription;
  today: string = new Date().toISOString().split('T')[0];

  public editingRow?: any;
  public newImei = '';
  public isSubmitting = false;
  public isSubmittingExcel = false;
  public isSubmittingOrderCancel = false;
  allStock: any = [];
  unsoldImeis: any = [];
  public rowData: any[] = [];
  filteredImeis: string[] = [];
  showSuggestionList: boolean = false;
  searchText: string = '';
  searchDebounceTimer: any;

  // Must stay aligned with table <th> order in template
  allColumns: any[] = this.getDefaultColumns();

  constructor(
    private fb: FormBuilder,
    @Inject(API_ROUTES_TOKEN) private config: typeof API_ROUTES,
    private GV: GvarService,
    private API: ApiService,
    private modalService: NgbModal,
    private router: Router,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private persistence: SessionPersistenceService
  ) { }

  ngOnInit(): void {
    this.getProducts();
    this.initializeForm();
  }
  initializeForm() {
    this.orderForm = this.fb.group({
      stockId: [null, Validators.required], // 🔒 hidden
      sku: [{ value: '', disabled: true }, Validators.required], // 🔒 readonly
      returnOrderNo: [{ value: '', disabled: true }, Validators.required], // 🧾 order no
      reason: ['CANCEL', Validators.required], // RETURN / CANCEL
      channel: [''], // Amazon / Shopify
      quantity: [1, [Validators.required, Validators.min(1)]],
      imei: [{ value: '', disabled: true }], // 🔒 readonly
    });
  }

  getProducts() {
    this.isLoading = true;

    this.API.getDataWithParams(this.config.GET_PRODUCTS)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (data: any) => {
          if (data) {
            this.listProducts = data.filter(
              (x: any) =>
                x.orderNo != null && x.orderStatus === 'Order received',
            );
            this.listProducts.sort(
              (a: any, b: any) =>
                new Date(b.dateSold || '').getTime() -
                new Date(a.dateSold || '').getTime(),
            );
            this.rowData = this.listProducts;
            this.allStock = data;
            setTimeout(() => {
              this.initDataTable();
            });
          }
        },
        error: (error) => {
          this.toastr.error(error.error?.message ?? 'Error', 'Failed');
        },
      });
  }

  initDataTable() {
    if (this.dataTable) {
      this.dataTable.clear();
      this.dataTable.destroy();
    }

    // Restore settings before init
    const savedColumns = this.persistence.loadColumnVisibility('outgoing_new');
    this.allColumns = this.normalizeColumnVisibility(savedColumns);

    const savedSearch = this.persistence.loadSearchText('outgoing_new');
    this.searchText = savedSearch || '';

    this.dataTable = $('#productsTable').DataTable({
      pagingType: 'full_numbers',
      pageLength: 50,
      searching: true,
      paging: true,
      info: true,
      responsive: false, // Disable responsive plugin to handle scroll manually
      autoWidth: false, // Let browser handle width
      scrollX: true, // Enable scroll only if needed (DataTables handles this if constrained)
      scrollCollapse: true, // Allow height to collapse if rows are few
      search: {
        search: this.searchText
      }
    });

    // Fix width after init
    setTimeout(() => {
      if (this.dataTable) {
        this.dataTable.columns.adjust().draw();
      }
    }, 100);

    // Apply column visibility
    if (this.dataTable) {
      this.allColumns.forEach(col => {
        // DataTables uses 0-based index. Our columns are mapped by index.
        const column = this.dataTable.column(col.index);
        if (column.visible() !== col.visible) {
          column.visible(col.visible);
        }
      });
    }

    // Listen for search changes
    $('#productsTable').on('search.dt', () => {
      const searchValue = this.dataTable.search();
      if (this.searchText !== searchValue) {
        this.searchText = searchValue;
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = setTimeout(() => {
          this.persistence.saveSearchText('outgoing_new', this.searchText);
        }, 500);
      }
    });
  }

  private getDefaultColumns() {
    return [
      { field: 'actions', headerName: 'Actions', visible: true, index: 0 },
      { field: 'dateAdded', headerName: 'Created On', visible: true, index: 1 },
      { field: 'dateSold', headerName: 'Sold On', visible: true, index: 2 },
      { field: 'orderNo', headerName: 'Order No#', visible: true, index: 3 },
      { field: 'sku', headerName: 'SKU', visible: true, index: 4 },
      {
        field: 'attachedImei',
        headerName: 'Attached IMEI',
        visible: true,
        index: 5,
      },
      { field: 'imei', headerName: 'IMEI', visible: true, index: 6 },
      { field: 'model', headerName: 'Model', visible: true, index: 7 },
      { field: 'storage', headerName: 'Storage', visible: true, index: 8 },
      { field: 'color', headerName: 'Color', visible: true, index: 9 },
      { field: 'gradeName', headerName: 'Grade', visible: true, index: 10 },
      { field: 'cost', headerName: 'Cost', visible: true, index: 11 },
      {
        field: 'isManualImei',
        headerName: 'IMEI Updated',
        visible: true,
        index: 12,
      },
      {
        field: 'orderStatus',
        headerName: 'Order Status',
        visible: true,
        index: 13,
      },
    ];
  }

  private normalizeColumnVisibility(savedColumns: any[] | null | undefined) {
    const defaults = this.getDefaultColumns();
    if (!Array.isArray(savedColumns) || savedColumns.length === 0) {
      return defaults;
    }

    const savedByField = new Map(
      savedColumns
        .filter((c: any) => !!c?.field)
        .map((c: any) => [String(c.field), c]),
    );

    return defaults.map((col) => {
      const match = savedByField.get(col.field);
      return {
        ...col,
        visible: typeof match?.visible === 'boolean' ? match.visible : col.visible,
      };
    });
  }

  openSettingsModal() {
    if (this.settingsModal) {
      this.settingsModal.settingsSummary = this.getSettingsSummary();
      this.settingsModal.componentName = 'Outgoing Inventory';
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
      modifiedColumnsCount: 0, // Resizing not supported yet for DataTable
      searchText: this.searchText,
      totalColumns: this.allColumns.length,
      visibleColumns: visibleCount,
    };
  }

  resetColumnsOnly() {
    this.allColumns = this.allColumns.map(col => ({ ...col, visible: true }));
    this.persistence.saveColumnVisibility('outgoing_new', this.allColumns);

    // Apply to DataTable
    if (this.dataTable) {
      this.allColumns.forEach(col => {
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
    this.persistence.saveSearchText('outgoing_new', '');

    if (this.dataTable) {
      this.dataTable.search('').draw();
    }

    this.toastr.success('Search filter cleared', 'Success');
    if (this.settingsModal) {
      this.settingsModal.settingsSummary = this.getSettingsSummary();
    }
  }

  resetWidthsOnly() {
    // Not applicable for DataTable in this implementation
    this.toastr.info('Column width reset not applicable for this table', 'Info');
  }

  resetSettings() {
    this.persistence.clearAllSettings('outgoing_new');

    // Reset columns
    this.allColumns = this.allColumns.map(col => ({ ...col, visible: true }));
    if (this.dataTable) {
      this.allColumns.forEach(col => {
        this.dataTable.column(col.index).visible(true);
      });

      // Reset search
      this.searchText = '';
      this.dataTable.search('').draw();
    }

    this.toastr.success('All settings reset successfully', 'Success');
    if (this.settingsModal) {
      this.settingsModal.settingsSummary = this.getSettingsSummary();
    }
  }

  toggleColumnVisibility(index: number) {
    // Used by Manage Columns dropdown if I add one
    const colIndex = this.allColumns.findIndex(c => c.index === index);
    if (colIndex > -1) {
      const newVisibility = !this.allColumns[colIndex].visible;
      this.allColumns[colIndex].visible = newVisibility;

      if (this.dataTable) {
        const column = this.dataTable.column(index);
        column.visible(newVisibility);
      }

      this.persistence.saveColumnVisibility('outgoing_new', this.allColumns);
    }
  }

  exportExcel() {
    if (!this.rowData?.length) return;

    // Define headers based on your table columns
    const headers = [
      { field: 'imei', headerName: 'IMEI' },
      { field: 'isManualImei', headerName: 'IMEI Updated' },
      { field: 'orderStatus', headerName: 'Order Status' },
      { field: 'orderNo', headerName: 'Order No#' },
      { field: 'dateSold', headerName: 'Sold On' },
      { field: 'dateAdded', headerName: 'Created On' },
      { field: 'sku', headerName: 'SKU' },
      { field: 'model', headerName: 'Model' },
      { field: 'storage', headerName: 'Storage' },
      { field: 'color', headerName: 'Color' },
      { field: 'gradeName', headerName: 'Grade' },
      { field: 'cost', headerName: 'Cost' },
    ];

    // Map rowData to formatted export rows
    const formattedRows = this.rowData.map((row) => {
      const newRow: any = {};

      headers.forEach((col) => {
        let value = row[col.field];

        // Custom export logic
        if (col.field === 'isManualImei')
          value = row.isManualImei ? 'Yes' : 'No';
        if (col.field === 'imei') value = row.isManualImei ? row.imei : '--';
        if (col.field === 'dateSold')
          value = row.dateSold
            ? new Date(row.dateSold).toLocaleDateString()
            : '';

        newRow[col.headerName] = value;
      });

      return newRow;
    });

    // Convert to worksheet
    const worksheet = XLSX.utils.json_to_sheet(formattedRows);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Outgoing Inventory');

    // Export file
    XLSX.writeFile(workbook, 'Outgoing-Inventory.xlsx');
  }

  exportToPDF() {
    if (!this.pdfData || this.pdfData.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.text('Manifest', pageWidth / 2, 15, { align: 'center' });

    const today = new Date().toLocaleDateString();
    doc.setFontSize(10);
    doc.text(`Date: ${today}`, pageWidth / 2, 22, { align: 'center' });

    // PDF columns – same as backend response keys
    const columns = [
      'Order#',
      'Product',
      'IMEI',
      'Cost',
      'Cost + Hst',
      'RMA',
      'Processed',
    ];
    const body = this.pdfData.map((row: any) => [
      row.orderNo,
      row.productTitle,
      row.imei,
      row.cost,
      row.costHst,
      row.rma ? 'Y' : 'N',
      row.processed ? 'Y' : 'N',
    ]);

    autoTable(doc, {
      startY: 30,
      head: [columns],
      body: body,
    });

    doc.save('Manifest.pdf');
    // Open in new tab
    // const pdfBlobUrl = doc.output("bloburl");
    // window.open(pdfBlobUrl, "_blank");
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    // Agar click input ya dropdown ke andar nahi hua, toh sab suggestions hide karo
    if (!target.closest('.imei-input-container')) {
      this.rowData.forEach((row) => (row.showSuggestionList = false));
    }
  }

  submitUpdateImei() {
    if (!this.editingRow) return;

    const enteredImei = this.newImei?.trim();

    //Basic validation
    if (!enteredImei || enteredImei.length < 4) {
      this.toastr.warning('Please provide a valid IMEI', 'Validation');
      return;
    }

    //Check if unsold list is available
    if (!this.unsoldImeis || this.unsoldImeis.length === 0) {
      this.toastr.warning(
        'Unsold IMEI list is empty. Please refresh or check stock data.',
        'Warning',
      );
      return;
    }

    //Check if the IMEI exists in unsold list
    const isValidUnsold = this.unsoldImeis.includes(enteredImei);

    if (!isValidUnsold) {
      this.toastr.error(
        `Invalid IMEI: "${enteredImei}". Please select an IMEI from the unsold list.`,
        'Validation Error',
      );
      return;
    }

    // Prepare payload for backend
    const payload = {
      OrderNo: this.editingRow.orderNo,
      OldImei: this.editingRow.imei ?? '',
      NewImei: enteredImei,
    };

    // API call
    this.isSubmitting = true;
    this.API.postData(this.config.IMEI_UPDATE, payload)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (res: any) => {
          this.toastr.success(
            res?.message ?? 'IMEI updated successfully',
            'Success',
          );
          this.getProducts(); // refresh grid
          this.modalRef?.close();
        },
        error: (err: any) => {
          const msg = err?.error?.message ?? 'Failed to update IMEI';
          this.toastr.error(msg, 'Error');
        },
      });
  }

  showSuggestions(row: any) {
    // Hide suggestions for all other rows
    this.rowData.forEach((r) => {
      if (r !== row) r.showSuggestionList = false;
    });

    // Generate suggestions for this row
    const normalize = (v: any) =>
      v != null ? String(v).trim().toLowerCase() : '';

    const sku = normalize(row.sku);
    const model = normalize(row.model);
    const storage = normalize(row.storage);
    const color = normalize(row.color);
    const grade = normalize(row.gradeName || row.grade);

    row.filteredImeis = this.allStock
      .filter((p: any) => {
        const match =
          normalize(p.sku) === sku &&
          normalize(p.model) === model &&
          normalize(p.storage) === storage &&
          normalize(p.color) === color &&
          normalize(p.gradeName || p.grade) === grade &&
          !p.orderNo && // No order assigned
          p.orderStatus?.toLowerCase() !== 'Sold'; // Exclude sold items

        return match;
      })
      .map((p: any) => p.imei)
      .filter((x: any) => x && x.trim() !== '');

    row.showSuggestionList = true;
  }

  filterImeis(row: any) {
    const search = (row.newImei || '').trim().toLowerCase();

    if (!search) {
      // Show all available IMEIs for this row
      row.showSuggestionList = true;
    } else {
      // Filter the row-specific IMEIs
      row.filteredImeis = row.filteredImeis.filter((imei: string) =>
        imei.toLowerCase().includes(search),
      );
    }
  }

  closeSuggestions(row: any) {
    row.showSuggestionList = false;
  }

  selectImei(imei: string, row: any) {
    row.newImei = imei;
    row.showSuggestionList = false;
  }

  onImeiEnter(row: any) {
    const matched = this.allStock.some(
      (p: any) => p.imei === row.newImei && !p.orderNo,
    );
    row.showSuggestionList = false;

    if (matched) {
      this.toastr.success(`✅ IMEI ${row.newImei} is valid and selected.`);
    } else {
      this.toastr.error(`❌ Invalid IMEI. No matching record found.`);
      row.newImei = '';
    }
  }
  confirmModal() {
    this.modalRef = this.modalService.open(this.updateImeiModal, {
      centered: false,
      backdrop: 'static',
      keyboard: false,
      size: 'md',
    });
  }

  submitUpdateAll() {
    if (!this.rowData?.length) {
      this.toastr.warning('No data to update', 'Validation');
      return;
    }

    const updates = this.rowData.map((r: any) => ({
      OldImei: r.imei,
      NewImei: r.newImei || null,
      OrderNo: r.orderNo,
    }));

    this.isSubmitting = true;

    this.API.postData(this.config.IMEI_UPDATE, { Updates: updates })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (res: any) => {
          if (!res || !res.results) {
            this.toastr.error(res?.message ?? 'IMEI update failed', 'Error');
            return;
          }

          const results = res.results;
          const failedList = results.filter((r: any) => !r.success);
          const successList = results.filter((r: any) => r.success);

          const failedCount = failedList.length;
          const successCount = successList.length;

          // Prepare report for modal
          this.imeiReport = {
            results,
            summary: { successCount, failedCount, failedList },
          };

          // Show failed modal if any failures
          if (failedCount > 0) {
            this.modalRef = this.modalService.open(this.failedIMEIList, {
              size: 'lg',
              centered: false,
              backdrop: 'static',
            });
          }

          // Show success toaster only for successful updates
          if (successCount > 0) {
            this.toastr.success(
              `${successCount} IMEI(s) updated successfully`,
              'Success',
            );
            this.modalRef?.close();
          }

          this.getProducts(); // refresh grid
        },
        error: (err: any) => {
          const msg = err?.error?.message ?? 'Failed to update IMEIs';
          this.toastr.error(msg, 'Error');
        },
      });
  }

  submitUpdateExcel() {
    if (!this.selectedFile) {
      this.toastr.warning('Please select an Excel file', 'Validation');
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.isSubmittingExcel = true;

    this.API.postDataForm(this.config.IMEI_UPDATE_EXCEL, formData)
      .pipe(finalize(() => (this.isSubmittingExcel = false)))
      .subscribe({
        next: (res: any) => {
          if (!res) {
            this.toastr.error('No response from server', 'Error');
            return;
          }

          // New API shape: { success: boolean, successfulRows, failedRows, failedDetails: [...] }
          if (
            typeof res.success === 'boolean' &&
            (Array.isArray(res.failedDetails) || 'successfulRows' in res || 'failedRows' in res)
          ) {
            const successCount = Number(res.successfulRows ?? 0);
            const failedCount = Number(res.failedRows ?? (res.failedDetails?.length ?? 0));

            const failedList = (res.failedDetails || []).map((d: any) => ({
              orderNo: d.orderNo || d.OrderNo || '',
              newImei: d.excelImei || d.NewImei || d.newImei || '',
              message: d.reason || d.message || '',
            }));

            this.imeiReport = {
              results: res.failedDetails || [],
              summary: { successCount, failedCount, failedList },
            };

            if (failedCount > 0) {
              this.modalService.open(this.failedIMEIList, {
                size: 'lg',
                centered: false,
                backdrop: 'static',
              });
            }

            if (successCount > 0) {
              this.toastr.success(
                `${successCount} IMEI(s) updated successfully`,
                'Success',
              );
            }

            this.getProducts();
            this.selectedFile = null;
            return;
          }

          // If backend sends single success/error (non-array)
          if (typeof res.success === 'boolean' && !Array.isArray(res.results)) {
            if (res.success) {
              this.toastr.success(
                res.message || 'IMEI(s) updated successfully',
                'Success',
              );
            } else {
              this.toastr.error(res.message || 'IMEI update failed', 'Error');
            }
            this.getProducts();
            this.selectedFile = null;
            return;
          }

          // Excel batch → results array (legacy shape)
          const results = res?.results ?? [];

          const failedList = results.filter((r: any) => !r.success);
          const successCount = results.filter((r: any) => r.success).length;
          const failedCount = failedList.length;

          this.imeiReport = {
            results,
            summary: { successCount, failedCount, failedList },
          };

          if (failedCount > 0) {
            // ❌ Show modal for failed IMEIs
            this.modalService.open(this.failedIMEIList, {
              size: 'lg',
              centered: false,
              backdrop: 'static',
            });
          }

          if (successCount > 0) {
            // ✅ Show success toast only for successful updates
            this.toastr.success(
              `${successCount} IMEI(s) updated successfully`,
              'Success',
            );
          }

          this.getProducts(); // refresh grid
          this.selectedFile = null;
        },
        error: (err: any) => {
          const msg = err?.error?.message ?? 'Excel IMEI update failed';
          this.toastr.error(msg, 'Error');
        },
      });
  }

  openAddModalBulk() {
    this.modalRef = this.modalService.open(this.modalTemplate, {
      size: 'lg',
      centered: false,
      backdrop: 'static',
    });
  }

  returnOrder(content: any, data: any): void {
    console.log(data);
    this.orderForm.patchValue(data);
    this.orderForm.controls['returnOrderNo'].setValue(data.orderNo);
    this.orderForm.controls['stockId'].setValue(data.id);
    this.modalRef = this.modalService.open(content, {
      centered: false,
      backdrop: 'static',
      keyboard: false,
      size: 'sm',
    });
  }

  submitReturn() {
    if (this.orderForm.invalid) return;

    const payload = {
      ...this.orderForm.getRawValue(), // includes disabled fields
    };

    this.isSubmittingOrderCancel = true;

    this.API.postData(this.config.RETURN_ORDERS, payload)
      .pipe(finalize(() => (this.isSubmittingOrderCancel = false)))
      .subscribe({
        next: (data: any) => {
          if (data?.success) {
            this.toastr.success(
              data.message || 'Operation successful',
              'Success',
            );

            this.modalRef?.close();
            this.getProducts();
          } else {
            this.toastr.error(data?.message || 'Operation failed', 'Error');
          }
        },
        error: (error) => {
          this.toastr.error(
            error?.error?.message || 'Server error occurred',
            'Error',
          );
        },
      });
  }
}
