import { Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Component, HostListener, ViewChild } from '@angular/core';
import { finalize, Subject } from 'rxjs';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from '@services/api.service';
import { API_ROUTES, API_ROUTES_TOKEN } from '@services/app.global';
import { DataTableService } from '@services/data-table.service';
import { GvarService } from '@services/gvar.service';
import { DataTableDirective, DataTablesModule } from 'angular-datatables';
import { ToastrService } from 'ngx-toastr';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { AgGridAngular } from 'ag-grid-angular';
import { AllCommunityModule, ColDef, ModuleRegistry, GridReadyEvent, GridApi, ColumnState, GridOptions } from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);
@Component({
  selector: 'app-pending',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DataTablesModule, NgxSkeletonLoaderModule, AgGridAngular],
  templateUrl: './pending.component.html',
  styleUrl: './pending.component.scss'
})
export class PendingProductsComponent {
  isLoading = true;
  @ViewChild(DataTableDirective, { static: false })
  dtElement!: DataTableDirective;
  dtTrigger: Subject<any> = new Subject();
  dtOptions = {};
  modalRef: NgbModalRef;

  colDefs: ColDef[] = [
    { field: 'productTitle', headerName: 'Product', sortable: true, filter: true, },
    { field: 'imei', headerName: 'IMEI', sortable: true, filter: true },
    { field: 'orderNo', headerName: 'Order No#', sortable: true, filter: true, },
    {
      field: 'dateAdded', headerName: 'Date', sortable: true, filter: true,
      valueFormatter: params => {
        if (!params.value) return '';
        // Angular style formatting
        return new Date(params.value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    },
  ];

  gridOptions: GridOptions = {
    
    enableCellTextSelection: true, // <-- allows text selection
    ensureDomOrder: true,          // fixes selection bug with overlays
    suppressCopyRowsToClipboard: false,
    suppressClipboardPaste: true,
  };
  dropdownOpen = false;
  defaultColDef: ColDef = { flex: 1, minWidth: 100, sortable: true, resizable: true };
  allColumns = this.colDefs.map(c => ({ field: c.field!, headerName: c.headerName!, visible: true }));
  rowData: any[];
  gridApi!: GridApi;

  listInventory: any = [];
  constructor(
    private fb: FormBuilder,
    @Inject(API_ROUTES_TOKEN) private config: typeof API_ROUTES,
    private GV: GvarService,
    private API: ApiService,
    private modalService: NgbModal,
    private dataTableService: DataTableService,
    private toastr: ToastrService
  ) {

  }

  ngOnInit(): void {
    this.initializeDataTable();
    this.getPendingProducts();
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
          text: '<i class="fa fa-copy"></i> Copy'
        },
        {
          extend: 'excel',
          text: '<i class="fa fa-file-excel-o"></i> Excel'
        },
        {
          extend: 'print',
          text: '<i class="fa fa-print"></i> Print'
        }
      ]
    };
  }

  getPendingProducts() {
    this.isLoading = true;
    this.API.getData(this.config.GET_PENDING_PRODUCT)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (data: any) => {
          if (data != null) {
            this.listInventory = data;
            this.rerenderTable()
          }
        },
        error: (error) => {
          if (error.error != undefined) {
            this.toastr.error(error.error.message, 'Error');
          }
        }
      });
  }


  ngAfterViewInit(): void {
    this.dtTrigger.next(null);
  }

  rerenderTable(): void {
    if (this.dtElement && this.dtElement.dtInstance) {
      this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
        dtInstance.destroy();        // pehle destroy
        this.dtTrigger.next(null);   // phir trigger re-init
      });
    } else {
      // agar pehli baar call ho rahi ho ya dtElement undefined ho
      setTimeout(() => this.dtTrigger.next(null), 0);
    }
  }


  ngOnDestroy(): void {
    this.dtTrigger.unsubscribe();
  }


  onColumnToggle(field: string, event: any) {
    const visible = event.target.checked;

    this.colDefs = this.colDefs.map(col => ({
      ...col,
      hide: col.field === field ? !visible : col.hide
    }));

    const col = this.allColumns.find(c => c.field === field);
    if (col) col.visible = visible;

    this.gridApi.setGridOption("columnDefs", this.colDefs);

    setTimeout(() => {
      this.gridApi.sizeColumnsToFit(); // fill full width
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
    this.colDefs = this.colDefs.map(col => ({
      ...col,
      hide: col.field === field ? !visible : col.hide
    }));

    const col = this.allColumns.find(c => c.field === field);
    if (col) col.visible = visible;

    setTimeout(() => {
      this.gridApi.sizeColumnsToFit(); // adjust again
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
}
