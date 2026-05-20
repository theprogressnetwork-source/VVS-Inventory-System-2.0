import { Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Component, HostListener, TemplateRef, ViewChild } from '@angular/core';
import { finalize, Subject } from 'rxjs';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
  selector: 'app-offers',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DataTablesModule, NgxSkeletonLoaderModule, AgGridAngular],
  templateUrl: './offers.component.html',
  styleUrl: './offers.component.scss'
})
export class OffersComponent {
  modalRef: NgbModalRef;
  isLoading = true;

  colDefs: ColDef[] = [

    { field: 'product_sku', headerName: 'Product SKU', sortable: true, filter: true, width: 180 },

    { field: 'product_title', headerName: 'Product Title', sortable: true, filter: true, width: 350 },

    {
      field: 'price', headerName: 'Price', sortable: true, filter: true, width: 140,
      valueFormatter: params => params.value ? '$' + params.value : ''
    },

    { field: 'quantity', headerName: 'Qty', sortable: true, filter: true, width: 100 },
    {
      field: 'active', headerName: 'Active', sortable: true, filter: true, width: 120,
      cellClass: params => params.value ? 'text-success fw-bold' : 'text-danger fw-bold',
      valueFormatter: params => params.value ? 'YES' : 'NO'
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
  constructor(
    private fb: FormBuilder,
    @Inject(API_ROUTES_TOKEN) private config: typeof API_ROUTES,
    private GV: GvarService,
    private API: ApiService,
    private modalService: NgbModal,
    private toastr: ToastrService,
    private dataTableService: DataTableService,
  ) { }

  ngOnInit(): void {
    this.getAllData();
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
    this.colDefs = this.colDefs.map(col => ({
      ...col,
      hide: col.field === field ? !visible : col.hide
    }));

    const col = this.allColumns.find(c => c.field === field);
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


  getAllData() {
    this.isLoading = true;
    this.API.getData<any>(this.config.GET_ALL_OFFERS).pipe(finalize(() => this.isLoading = false)).subscribe({
      next: (data) => {
        this.rowData = data.data;
        var temp = this.rowData.filter(x=> x.product_sku == "17079821");
        console.log(temp)
      },
      error: (err) => {
        console.error('API Error:', err);
      }
    });
  }
}
