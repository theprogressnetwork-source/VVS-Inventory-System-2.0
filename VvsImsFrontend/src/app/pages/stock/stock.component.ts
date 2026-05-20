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
  selector: 'app-stock',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DataTablesModule, NgxSkeletonLoaderModule, AgGridAngular],
  templateUrl: './stock.component.html',
  styleUrl: './stock.component.scss'
})
export class StockComponent {
  @ViewChild('modalTemplate') modalTemplate!: TemplateRef<any>;
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
      headerName: 'Actions',
      cellRenderer: (params: any) => {
        return `
        <button class="btn btn-outline-primary btn-sm rounded-circle mr-2 edit-btn" title="Edit Record">
          <i class="fa fa-cube fa-xs"></i>
        </button>
      `;
      }
    },
    { field: 'sku', headerName: 'SKU', sortable: true, filter: true, },
    { field: 'model', headerName: 'Model', sortable: true, filter: true },
    { field: 'storage', headerName: 'Storage', sortable: true, filter: true },
    { field: 'color', headerName: "Color", sortable: true, filter: true },
    { field: 'gradeName', headerName: "Grade", sortable: true, filter: true },
    { field: 'cost', headerName: 'Cost', sortable: true, filter: true },
    { field: 'imei', headerName: 'IMEI', sortable: true, filter: true },
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
    this.initilizationForms();
    this.getProducts();
  }

  initilizationForms() {
    const today = new Date().toISOString().split('T')[0];
    this.orderForm = this.fb.group({
      orderNo: ['', Validators.required],
      productTitle: [''],
      imei: [''],
      date: [today, Validators.required]
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
  openAddModal(content: any) {
    this.modalRef = this.modalService.open(content, { centered: false, backdrop: 'static', keyboard: false, size: 'lg' });
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

  getProducts() {
    this.isLoading = true;
    this.API.getData(this.config.GET_PRODUCTS)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (data: any) => {
          if (data != null) {
            // Filter unsold products (orderNo == null)
            this.listProducts = data
              .filter((x: any) => x.orderNo == null)
              // Sort by dateAdded (latest first)
              .sort((a: any, b: any) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());

          }
        },
        error: (error) => {
          if (error?.error?.message) {
            this.toastr.error(error.error.message, 'Error');
          }
        }
      });
  }

  editOrder(data: any): void {
    console.log(data);
    this.orderForm.patchValue(data)
    this.orderForm.controls['productTitle'].setValue(data.model);
    this.modalRef = this.modalService.open(this.modalTemplate, {
      centered: false,
      backdrop: 'static',
      keyboard: false,
      size: 'sm'
    });
  }
  onSubmitOrder() {
    const singleRecord = this.orderForm.value;
    // Wrap it in an array
    const payload: any[] = [singleRecord];
    this.API.postData(this.config.SAVE_ORDER, payload).subscribe({
      next: (data: any) => {
        if (data.status == 200) {
          this.toastr.success(data.message, 'Success');
          this.getProducts();
          this.modalRef?.close();
          return
        }
      },
      error: (error) => {
        if (error.error) {
          this.toastr.error(error.error.message, 'Error');
        }
      }
    });
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
  onCellClicked(event: any) {
    if (event.colDef.headerName === 'Actions') {
      const rowData = event.data;
      console.log('Row Data:', rowData);
      if (event.event.target.closest('.edit-btn')) {
        this.editOrder(rowData);
      }
    }
  }


}
