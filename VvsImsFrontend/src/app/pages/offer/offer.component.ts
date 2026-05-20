import { Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Component, HostListener, TemplateRef, ViewChild } from '@angular/core';
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
import { AllCommunityModule, ColDef, ModuleRegistry, GridReadyEvent, GridApi, ColumnState } from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);
interface Car {
  make: string;
  model: string;
  price: number;
}
@Component({
  selector: 'app-offer',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DataTablesModule, NgxSkeletonLoaderModule, AgGridAngular],
  templateUrl: './offer.component.html',
  styleUrl: './offer.component.scss'
})
export class OfferComponent {
  @ViewChild('modalTemplate') modalTemplate!: TemplateRef<any>;
  isLoading = true;
  @ViewChild(DataTableDirective, { static: false })
  dtElement!: DataTableDirective;
  dtTrigger: Subject<any> = new Subject();
  dtOptions = {};
  modalRef: NgbModalRef;

  selectedFile: File | null = null;
  listInventory: any = [];
  listInventoryList = [
    {
      sku: 'IPH-13-128',
      title: 'iPhone 13 128GB',
      winning: 'Y',
      winnerPrice: 750,
      price: 820,
      liveQuantity: 5,
      quantityInHand: 12,
      available: 'Yes',
      cost: 700,
      sellingPrice: 820
    },
    {
      sku: 'SAM-S21-256',
      title: 'Samsung S21 256GB',
      winning: 'N',
      winnerPrice: 650,
      price: 720,
      liveQuantity: 2,
      quantityInHand: 0,
      available: 'No',
      cost: 600,
      sellingPrice: 720
    },
    {
      sku: 'OP-9PRO-128',
      title: 'OnePlus 9 Pro 128GB',
      winning: 'Y',
      winnerPrice: 500,
      price: 580,
      liveQuantity: 8,
      quantityInHand: 15,
      available: 'Yes',
      cost: 450,
      sellingPrice: 580
    },
    {
      sku: 'XI-MI11-256',
      title: 'Xiaomi Mi 11 256GB',
      winning: 'N',
      winnerPrice: 420,
      price: 480,
      liveQuantity: 3,
      quantityInHand: 7,
      available: 'Yes',
      cost: 400,
      sellingPrice: 480
    },
    {
      sku: 'REAL-8-64',
      title: 'Realme 8 64GB',
      winning: 'Y',
      winnerPrice: 220,
      price: 250,
      liveQuantity: 10,
      quantityInHand: 0,
      available: 'No',
      cost: 200,
      sellingPrice: 250
    },
    {
      sku: 'NOK-7.2-128',
      title: 'Nokia 7.2 128GB',
      winning: 'N',
      winnerPrice: 300,
      price: 340,
      liveQuantity: 4,
      quantityInHand: 11,
      available: 'Yes',
      cost: 280,
      sellingPrice: 340
    }
  ];

  colDefs: ColDef[] = [
    {
      headerName: 'Actions',
      cellRenderer: (params: any) => {
        return `
        <button class="btn btn-outline-primary btn-sm rounded-circle mr-2 edit-btn" title="Edit Record">
          <i class="fa fa-edit fa-xs"></i>
        </button>
        <button class="btn btn-outline-danger btn-sm rounded-circle delete-btn" title="Delete Record">
          <i class="fa fa-trash fa-xs"></i>
        </button>
      `;
      }
    },
    { field: 'sku', headerName: 'SKU', sortable: true, filter: true, },
    { field: 'title', headerName: 'Title', sortable: true, filter: true },
    { field: 'winning', headerName: 'Winning', sortable: true, filter: true, cellClass: 'text-center' },
    { field: 'winnerPrice', headerName: "Winner's Price", sortable: true, filter: true },
    { field: 'price', headerName: 'Price', sortable: true, filter: true },
    { field: 'liveQuantity', headerName: 'Live Quantity', sortable: true, filter: true },
    { field: 'quantityInHand', headerName: 'Quantity in Hand', sortable: true, filter: true },
    {
      field: 'available',
      headerName: 'Available',
      sortable: true,
      filter: true,
      cellClass: params => params.value === 'Yes' ? 'text-success font-weight-bold text-center' : 'text-danger font-weight-bold text-center'
    },
    {
      headerName: 'Breakeven',
      valueGetter: params => params.data.cost / 0.9,
      valueFormatter: params => params.value.toFixed(0),
      cellClass: 'text-right text-primary'
    },
    {
      headerName: 'Net',
      valueGetter: params => params.data.sellingPrice * 0.9,
      valueFormatter: params => params.value.toFixed(0),
      cellClass: 'bg-light text-dark text-right'
    },
    {
      headerName: 'Gross Profit',
      valueGetter: params => (params.data.sellingPrice * 0.9 - params.data.cost),
      valueFormatter: params => params.value.toFixed(0),
      cellClass: 'bg-light text-dark text-right'
    }
  ];


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
    private dataTableService: DataTableService,
    private toastr: ToastrService
  ) {

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

  @HostListener('window:resize')
  onResize() {
    if (this.gridApi) {
      this.gridApi.sizeColumnsToFit();
    }
  }

  onCellClicked(event: any) {
    if (event.colDef.headerName === 'Actions') {
      if (event.event.target.closest('.edit-btn')) {
        this.editRecord(event.data);
      } else if (event.event.target.closest('.delete-btn')) {
        this.deleteRecord(event.data.sku);
      }
    }
  }

  // Example edit/delete functions
  editRecord(row: any) {
    console.log("Edit row:", row);
    // yahan apna modal ya logic call karo
  }

  deleteRecord(id: number) {
    console.log("Delete id:", id);
    // API call ya confirmation logic yahan rakho
  }
  ngOnInit(): void {
    this.initializeDataTable();
    this.getInvertory();
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

  getInvertory() {
    this.isLoading = true;
    this.API.getData(this.config.GET_ALL_INVENTORY)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (data: any) => {
          if (data != null) {
            this.listInventory = data;
            this.rowData = this.listInventory;
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

  openAddModal() {
    this.modalRef = this.modalService.open(this.modalTemplate, {
      centered: false,
      backdrop: 'static',
      keyboard: false,
      size: 'lg'
    });
  }

  onSubmit() {

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
    console.log("Selected file:", file.name, file.size);
  }

  removeFile() {
    this.selectedFile = null;
  }
}
