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
import {
  AllCommunityModule,
  ColDef,
  ModuleRegistry,
  GridReadyEvent,
  GridApi,
  ColumnState,
  GridOptions,
} from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);
interface InventoryReportFilters {
  status?: string;
  channel?: string;
  dateFrom?: string | null;
  dateTo?: string | null;
}

interface InventoryReportDto {
  orderNo?: string;
  soldDate?: string;
  returnDate?: string;
  status: string;
  channel?: string;
  quantity: number;
}
@Component({
  selector: 'app-product-variants',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DataTablesModule,
    NgxSkeletonLoaderModule,
    AgGridAngular,
  ],
  templateUrl: './product-variants.component.html',
  styleUrl: './product-variants.component.scss',
})
export class ProductVariantsComponent {
  filters: InventoryReportFilters = {
    status: '',
    channel: '',
    dateFrom: null,
    dateTo: null,
  };

  // Channel dropdown list (dynamic OR static)
  channels: string[] = ['Bestbuy', 'Shopify', 'Amazon'];

  // Report result data
  reportData: InventoryReportDto[] = [];

  totalCount: number = 0;
  fetched: number = 0;
  message: string = '';

  @ViewChild(DataTableDirective, { static: false })
  dtElement!: DataTableDirective;
  dtTrigger: Subject<any> = new Subject();
  dtOptions = {};
  modalRef: NgbModalRef;
  orderForm!: FormGroup;
  isLoading = true;
  listProducts: any = [];

  colDefs: ColDef[] = [
    {
      field: 'sku',
      headerName: 'SKU',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'model',
      headerName: 'Model',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'cost',
      headerName: 'Cost',
      sortable: true,
      filter: true,
      width: 150,
    },

    {
      field: 'imei',
      headerName: 'IMEI',
      sortable: true,
      filter: true,
      width: 180,
    },

    {
      field: 'orderNo',
      headerName: 'Order No',
      sortable: true,
      filter: true,
      width: 150,
    },

    {
      field: 'soldDate',
      headerName: 'Sold Date',
      sortable: true,
      filter: true,
      width: 160,
      valueFormatter: (params) =>
        params.value ? new Date(params.value).toLocaleDateString() : '',
    },

    {
      field: 'returnDate',
      headerName: 'Return Date',
      sortable: true,
      filter: true,
      width: 160,
      valueFormatter: (params) =>
        params.value ? new Date(params.value).toLocaleDateString() : '',
    },

    {
      field: 'status',
      headerName: 'Status',
      sortable: true,
      filter: true,
      width: 130,
      cellClass: (params) => {
        switch (params.value) {
          case 'SOLD':
            return 'text-success fw-semibold';
          case 'UNSOLD':
            return 'text-primary fw-semibold';
          case 'RETURNED':
            return 'text-warning fw-semibold';
          case 'CANCELED':
            return 'text-danger fw-semibold';
          default:
            return '';
        }
      },
    },

    {
      field: 'channel',
      headerName: 'Channel',
      sortable: true,
      filter: true,
      width: 130,
    },

    {
      field: 'quantity',
      headerName: 'Qty',
      sortable: true,
      filter: true,
      width: 100,
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
  constructor(
    private fb: FormBuilder,
    @Inject(API_ROUTES_TOKEN) private config: typeof API_ROUTES,
    private GV: GvarService,
    private API: ApiService,
    private modalService: NgbModal,
    private toastr: ToastrService,
    private dataTableService: DataTableService
  ) {}

  ngOnInit(): void {
    this.getReport();
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

  getReport() {
    const payload = {
      Status: this.filters.status || null,
      Channel: this.filters.channel || null,
      DateFrom: this.filters.dateFrom
        ? this.filters.dateFrom.split('T')[0]
        : null,
      DateTo: this.filters.dateTo ? this.filters.dateTo.split('T')[0] : null,
    };

    this.API.postData<any>(this.config.GET_INVENTORY_REPORT, payload).subscribe(
      {
        next: (res) => {
          this.reportData = res.data ?? [];
          this.totalCount = res.totalCount ?? 0;
          this.fetched = res.fetched ?? 0;
          this.message = res.message ?? '';
        },
        error: (err) => {
          console.error('API Error:', err);
        },
      }
    );
  }

  // RESET BUTTON
  resetFilters() {
    this.filters = {
      status: '',
      channel: '',
      dateFrom: null,
      dateTo: null,
    };

    this.reportData = [];
    this.totalCount = 0;
    this.fetched = 0;
    this.message = '';

    this.getReport();
  }
}
