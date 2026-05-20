import { Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Component, HostListener, TemplateRef, ViewChild } from '@angular/core';
import { finalize, Subject } from 'rxjs';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from '@services/api.service';
import { API_ROUTES, API_ROUTES_TOKEN } from '@services/app.global';
import { DataTableService } from '@services/data-table.service';
import { GvarService } from '@services/gvar.service';
import { DataTableDirective, DataTablesModule } from 'angular-datatables';
import { ToastrService } from 'ngx-toastr';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { AgGridAngular } from 'ag-grid-angular';
import * as XLSX from 'xlsx';
import {
  AllCommunityModule,
  ColDef,
  ModuleRegistry,
  GridReadyEvent,
  GridApi,
  ColumnState,
  GridOptions,
} from 'ag-grid-community';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { SessionPersistenceService } from '@services/session-persistence.service';
import { SettingsModalComponent, SettingsSummary } from '../../components/settings-modal/settings-modal.component';

ModuleRegistry.registerModules([AllCommunityModule]);
@Component({
  selector: 'app-sold',
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
  templateUrl: './sold.component.html',
  styleUrl: './sold.component.scss',
})
export class SoldComponent {
  @ViewChild('modalTemplate') modalTemplate!: TemplateRef<any>;
  @ViewChild(SettingsModalComponent) settingsModal!: SettingsModalComponent;
  @ViewChild(DataTableDirective, { static: false })
  dtElement!: DataTableDirective;
  dtTrigger: Subject<any> = new Subject();
  dtOptions = {};
  modalRef: NgbModalRef;
  orderForm!: FormGroup;
  isLoading = true;
  isSubmitting = false;
  listProducts: any = [];

  public colDefs: ColDef[] = [
    {
      headerName: 'Actions',
      cellRenderer: (params: any) => {
        return `
        <button class="btn btn-outline-success btn-sm rounded-circle mr-1 order-btn" title="Return/Cancel Order">
          <i class="fa fa-cube fa-xs"></i>
        </button>
      `;
      },
    },
    {
      headerName: 'Order Status',
      field: 'orderStatus',
      width: 100,
    },
    {
      field: 'imei',
      headerName: 'IMEI',
      sortable: true,
      filter: true,
    },
    { field: 'orderNo', headerName: 'Order No#', sortable: true, filter: true },
    {
      field: 'dateSold',
      headerName: 'Date',
      sortable: true,
      filter: true,
      valueFormatter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      },
    },
    { field: 'sku', headerName: 'SKU', sortable: true, filter: true },
    { field: 'model', headerName: 'Model', sortable: true, filter: true },
    {
      field: 'storage',
      headerName: 'Storage',
      sortable: true,
      filter: true,
      cellClass: 'text-center',
    },
    { field: 'color', headerName: 'Color', sortable: true, filter: true },
    { field: 'gradeName', headerName: 'Grade', sortable: true, filter: true },
    { field: 'cost', headerName: 'Cost', sortable: true, filter: true },
  ];
  gridOptions: GridOptions = {
    enableCellTextSelection: true, // <-- allows text selection
    ensureDomOrder: true, // fixes selection bug with overlays
    suppressCopyRowsToClipboard: false,
    suppressClipboardPaste: true,
  };

  defaultColDef: ColDef = {
    flex: 1,
    minWidth: 100,
    sortable: true,
    filter: true,
    resizable: true,
  };
  allColumns = this.colDefs.map((c) => ({
    field: c.field!,
    headerName: c.headerName!,
    visible: true,
  }));
  rowData: any[];
  gridApi!: GridApi;
  searchText = '';
  constructor(
    private fb: FormBuilder,
    @Inject(API_ROUTES_TOKEN) private config: typeof API_ROUTES,
    private GV: GvarService,
    private API: ApiService,
    private modalService: NgbModal,
    private toastr: ToastrService,
    private dataTableService: DataTableService,
    private persistence: SessionPersistenceService
  ) { }

  ngOnInit(): void {
    this.initilizationForms();
    this.getProducts();
  }

  initilizationForms() {
    const today = new Date().toISOString().split('T')[0];
    this.orderForm = this.fb.group({
      stockId: [null, Validators.required], // 🔒 hidden
      sku: [{ value: '', disabled: true }, Validators.required], // 🔒 readonly
      returnOrderNo: [{ value: '', disabled: true }, Validators.required], // 🧾 order no
      reason: ['RETURN', Validators.required], // RETURN / CANCEL
      channel: [''], // Amazon / Shopify
      quantity: [1, [Validators.required, Validators.min(1)]],
      imei: [{ value: '', disabled: true }], // 🔒 readonly
    });

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
  openAddModal(content: any) {
    this.modalRef = this.modalService.open(content, {
      centered: false,
      backdrop: 'static',
      keyboard: false,
      size: 'lg',
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
  }

  getProducts() {
    this.isLoading = true;
    this.API.getData(this.config.GET_PRODUCTS)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (data: any) => {
          if (data != null) {
            // Filter unsold products (orderNo == null)
            this.listProducts = data
              .filter((x: any) => x.orderStatus === 'Sold')
              // Sort by dateAdded (latest first)
              .sort(
                (a: any, b: any) =>
                  new Date(b.dateAdded).getTime() -
                  new Date(a.dateAdded).getTime()
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

  submitReturn() {
    if (this.orderForm.invalid) return;

    const payload = {
      ...this.orderForm.getRawValue(), // includes disabled fields
    };

    this.isSubmitting = true;

    this.API.postData(this.config.RETURN_ORDERS, payload)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (data: any) => {
          if (data?.success) {
            this.toastr.success(
              data.message || 'Operation successful',
              'Success'
            );
            this.getProducts();
            this.modalRef?.close();
          } else {
            this.toastr.error(data?.message || 'Operation failed', 'Error');
          }
        },
        error: (error) => {
          this.toastr.error(
            error?.error?.message || 'Server error occurred',
            'Error'
          );
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

    // Save to persistence
    this.saveGridState();

    setTimeout(() => {
      this.gridApi.sizeColumnsToFit();
    }, 50);
  }

  saveGridState() {
    const columnState = this.gridApi.getColumnState();
    this.persistence.saveGridState('sold', columnState);
    this.persistence.saveColumnVisibility('sold', this.allColumns);
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;

    // Restore saved grid state
    const savedState = this.persistence.loadGridState('sold');
    if (savedState && savedState.length > 0) {
      this.gridApi.applyColumnState({ state: savedState, applyOrder: true });

      // Sync visual checkboxes
      this.allColumns.forEach((col) => {
        const savedCol = savedState.find((s: any) => s.colId === col.field);
        if (savedCol) {
          col.visible = !savedCol.hide;
        }
      });
    } else {
      // ONLY if no saved state, fit columns
      setTimeout(() => {
        this.gridApi.sizeColumnsToFit();
      }, 50);
    }

    // Restore search text
    const savedSearch = this.persistence.loadSearchText('sold');
    this.searchText = savedSearch || '';
    if (this.searchText) {
      this.gridApi.setGridOption('quickFilterText', this.searchText);
    }

    // Auto-save on resize/move
    params.api.addEventListener('columnResized', (event: any) => {
      if (event.finished) this.saveGridState();
    });

    params.api.addEventListener('columnMoved', (event: any) => {
      if (event.finished) this.saveGridState();
    });
  }

  openSettingsModal() {
    if (this.settingsModal) {
      this.settingsModal.settingsSummary = this.getSettingsSummary();
      this.settingsModal.componentName = 'Sold Inventory';
      this.settingsModal.open();
    }
  }

  getSettingsSummary(): SettingsSummary {
    const visibleColumns = this.allColumns.filter((c) => c.visible).length;
    const hiddenColumns = this.allColumns.length - visibleColumns;
    const searchText = this.gridApi
      ? this.gridApi.getGridOption('quickFilterText')
      : '';
    const gridState = this.persistence.loadGridState('sold');
    const hasModifiedWidths = !!gridState && gridState.length > 0;

    return {
      totalColumns: this.allColumns.length,
      visibleColumns: visibleColumns,
      hiddenColumnsCount: hiddenColumns,
      modifiedColumnsCount: hasModifiedWidths ? this.allColumns.length : 0,
      searchText: searchText || '',
      hasSearchFilter: !!searchText,
      hasColumnSettings: hiddenColumns > 0,
      hasCustomSettings:
        hiddenColumns > 0 || !!searchText || hasModifiedWidths,
    };
  }

  resetColumnsOnly() {
    this.gridApi.applyColumnState({
      defaultState: { hide: false },
    });

    this.allColumns.forEach(c => c.visible = true);
    this.saveGridState();

    this.toastr.success('Columns reset successfully', 'Success');
    if (this.settingsModal) {
      this.settingsModal.settingsSummary = this.getSettingsSummary();
    }
  }

  resetSearchOnly() {
    this.gridApi.setGridOption('quickFilterText', '');
    this.persistence.saveSearchText('sold', '');

    this.toastr.success('Search filter cleared', 'Success');
    if (this.settingsModal) {
      this.settingsModal.settingsSummary = this.getSettingsSummary();
    }
  }

  resetWidthsOnly() {
    this.persistence.clearGridState('sold');
    this.gridApi.resetColumnState();
    setTimeout(() => {
      this.gridApi.sizeColumnsToFit();
    }, 50);
    this.toastr.success('Column widths reset', 'Success');
    if (this.settingsModal) {
      this.settingsModal.settingsSummary = this.getSettingsSummary();
    }
  }

  resetSettings() {
    this.resetColumnsOnly();
    this.resetSearchOnly();
    this.toastr.info('All settings have been reset');
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

  onQuickFilterChanged(value: string) {
    if (this.gridApi) {
      this.gridApi.setGridOption('quickFilterText', value);

      // Debounced save
      this.persistence.saveSearchText('sold', value);
    }
  }
  @HostListener('window:resize')
  onResize() {
    if (this.gridApi) {
      this.gridApi.sizeColumnsToFit(); // responsive adjustment
    }
  }

  onCellClicked(event: any) {
    if (event.colDef.headerName === 'Actions') {
      const rowData = event.node.data; // always correct row
      if (event.event.target.closest('.order-btn')) {
        this.returnOrder(rowData);
      }
    }
  }
  returnOrder(data: any): void {
    console.log(data);
    this.orderForm.patchValue(data);
    this.orderForm.controls['returnOrderNo'].setValue(data.orderNo);
    this.orderForm.controls['stockId'].setValue(data.id);
    this.modalRef = this.modalService.open(this.modalTemplate, {
      centered: false,
      backdrop: 'static',
      keyboard: false,
      size: 'sm',
    });
  }
  exportExcel() {
    if (!this.listProducts?.length) return;

    // Define headers based on your table columns
    const headers = [
      { field: 'imei', headerName: 'IMEI' },
      { field: 'orderStatus', headerName: 'Order Status' },
      { field: 'orderNo', headerName: 'Order No#' },
      { field: 'dateSold', headerName: 'Date' },
      { field: 'sku', headerName: 'SKU' },
      { field: 'model', headerName: 'Model' },
      { field: 'storage', headerName: 'Storage' },
      { field: 'color', headerName: 'Color' },
      { field: 'gradeName', headerName: 'Grade' },
      { field: 'cost', headerName: 'Cost' },
    ];

    // Map rowData to formatted export rows
    const formattedRows = this.listProducts.map((row: any) => {
      const newRow: any = {};

      headers.forEach((col) => {
        let value = row[col.field];

        newRow[col.headerName] = value;
      });

      return newRow;
    });

    // Convert to worksheet
    const worksheet = XLSX.utils.json_to_sheet(formattedRows);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sold Inventory');

    // Export file
    XLSX.writeFile(workbook, 'Sold-Inventory.xlsx');
  }
}
