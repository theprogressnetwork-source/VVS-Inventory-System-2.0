import { Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Component, HostListener, TemplateRef, ViewChild } from '@angular/core';
import { filter, finalize, Subject, Subscription } from 'rxjs';
import {
  FormBuilder,
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
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

@Component({
  selector: 'app-outgoing',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DataTablesModule,
    NgxSkeletonLoaderModule,
    AgGridAngular,
  ],
  templateUrl: './outgoing.component.html',
  styleUrl: './outgoing.component.scss',
})
export class OutgoingComponent {
  @ViewChild('modalTemplate') modalTemplate!: TemplateRef<any>;
  @ViewChild('modalIMEI') modalIMEI!: TemplateRef<any>;

  @ViewChild(DataTableDirective, { static: false })
  dtElement!: DataTableDirective;
  dtTrigger: Subject<any> = new Subject();
  dtOptions = {};
  modalRef: NgbModalRef | null = null;
  isLoading = true;
  listProducts: any = [];
  selectedFile: File | null = null;
  pdfData: any[] = [];

  columns: string[] = [];
  rows: any[] = [];
  private modalOpening = false;
  private routerSub!: Subscription;
  today: string = new Date().toISOString().split('T')[0];
  dateFrom: string = this.today;
  dateTo: string = this.today;
  shipped: string = 'all';
  public colDefs: ColDef[] = [
    {
      headerName: 'Actions',
      width: 180,
      // pinned: 'left',
      cellRenderer: (params: any) => {
        const hasOrder = !!params.data?.orderNo;
        const shipped = params.data?.isShipped;

        let editBtn = hasOrder
          ? `<button class="btn btn-sm btn-primary edit-btn">Add IMEI</button>`
          : '';

        let shipBtn = !shipped
          ? `<button class="btn btn-sm btn-dark ship-btn">Mark Shipped</button>`
          : ''; // shipped = true → no button here

        return `${editBtn} ${shipBtn}`;
      },
    },
    {
      headerName: 'IMEI Updated',
      field: 'isManualImei',
      width: 120,
      // pinned: 'left',
      cellRenderer: (params: any) => {
        return params.value
          ? '<span style="color: green; font-weight: bold;">✅ Yes</span>'
          : '<span style="color: gray;"><span style="color: red; font-size: 14px;">✖</span> No</span>';
      },
    },

    // ⭐ PERFECT → Only status
    {
      headerName: 'Shipped',
      field: 'isShipped',
      width: 140,
      // pinned: 'left',
      cellRenderer: (params: any) => {
        return params.value
          ? '<span style="color: green; font-weight: bold;">📦 Shipped</span>'
          : '<span style="color: red;">⛔ Pending</span>';
      },
    },
    {
      field: 'imei',
      headerName: 'IMEI',
      sortable: true,
      filter: true,
      cellRenderer: (params: any) => {
        if (params.data?.isManualImei) {
          // If updated manually → show IMEI normally
          return `<span style="color: #0d6efd;">${params.value}</span>`;
        } else {
          // If not updated → show colorful dashed placeholder
          return `<span style="color: #999; font-weight: bold;">--</span>`;
        }
      },
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
  public rowData: any[] = [];
  gridApi!: GridApi;

  public editingRow?: any;
  public newImei = '';
  public isSubmitting = false;
  allStock: any = [];
  unsoldImeis: any = [];

  filteredImeis: string[] = [];
  showSuggestionList: boolean = false;
  constructor(
    private fb: FormBuilder,
    @Inject(API_ROUTES_TOKEN) private config: typeof API_ROUTES,
    private GV: GvarService,
    private API: ApiService,
    private modalService: NgbModal,
    private router: Router,
    private toastr: ToastrService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.getProducts();
    this.checkAndOpenModal(this.router.url);
    this.routerSub = this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd
        )
      )
      .subscribe((event: NavigationEnd) => {
        this.checkAndOpenModal(event.urlAfterRedirects);
      });
  }
  private checkAndOpenModal(url: string): void {
    // sirf /view/input/1 ke liye modal open
    if (
      url.includes('/view/outgoing/1') &&
      !this.modalRef &&
      !this.modalOpening
    ) {
      this.modalOpening = true; // prevent re-entrance

      setTimeout(() => {
        this.columns = [];
        this.rows = [];
        this.modalRef = this.modalService.open(this.modalTemplate, {
          centered: false,
          backdrop: 'static',
          keyboard: false,
          size: 'lg',
        });

        // modal close hone par flags reset
        this.modalRef.result.finally(() => {
          this.modalRef = null;
          this.modalOpening = false;
        });
      });
    }
    // dusre route pe modal close
    else if (!url.includes('/view/outgoing/1') && this.modalRef) {
      this.modalRef.close();
      this.modalRef = null;
      this.modalOpening = false;
    }
  }

  // getProducts() {
  //   this.isLoading = true;
  //   this.API.getData(this.config.GET_TODAY_ORDERS)
  //     .pipe(finalize(() => this.isLoading = false))
  //     .subscribe({
  //       next: (data: any) => {
  //         if (data) {
  //           this.listProducts = data.filter((x: any) => x.orderNo != null);
  //           this.listProducts.sort((a: any, b: any) =>
  //             new Date(b.dateSold || '').getTime() - new Date(a.dateSold || '').getTime()
  //           );

  //           this.rowData = this.listProducts;
  //           this.allStock = data;
  //         }
  //       },
  //       error: (error) => {
  //         if (error.error?.message) {
  //           this.toastr.error(error.error.message, 'Error');
  //         }
  //       }
  //     });
  // }
  getProducts() {
    this.isLoading = true;

    const payload: any = {};
    if (this.dateFrom) payload.dateFrom = this.dateFrom;
    if (this.dateTo) payload.dateTo = this.dateTo;
    if (this.shipped !== 'all') payload.shipped = this.shipped;

    this.API.getDataWithParams(this.config.GET_TODAY_ORDERS, payload)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (data: any) => {
          if (data) {
            this.listProducts = data.filter((x: any) => x.orderNo != null);
            this.listProducts.sort(
              (a: any, b: any) =>
                new Date(b.dateSold || '').getTime() -
                new Date(a.dateSold || '').getTime()
            );
            this.rowData = this.listProducts;
          }
        },
        error: (error) => {
          this.toastr.error(error.error?.message ?? 'Error', 'Failed');
        },
      });
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

        // Custom export formatting for specific fields:
        if (col.field === 'isShipped') {
          value = row.isShipped ? 'Shipped' : 'Pending';
        }

        if (col.field === 'isManualImei') {
          value = row.isManualImei ? 'Yes' : 'No';
        }

        if (col.field === 'imei') {
          value = row.isManualImei ? row.imei : '--';
        }

        newRow[col.headerName] = value; // use frontend header
      });

      return newRow;
    });

    // Convert to Excel
    const worksheet = XLSX.utils.json_to_sheet(formattedRows);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Outgoing Inventory');

    XLSX.writeFile(workbook, 'Outgoing-Inventory.xlsx');
  }

  ngOnDestroy(): void {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }

  openAddModal() {
    this.columns = [];
    this.rows = [];
    this.modalRef = this.modalService.open(this.modalTemplate, {
      centered: false,
      backdrop: 'static',
      keyboard: false,
      size: 'lg',
    });
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

  onSubmitOrder() {
    if (!this.selectedFile) {
      this.toastr.warning('Please select an Excel file first!', 'Alert');
      return;
    }

    const formData = new FormData();
    formData.append('orderFile', this.selectedFile);

    this.API.postDataForm(this.config.OUTGOING_PRODUCT, formData).subscribe({
      next: (data: any) => {
        if (data.status === 200) {
          this.toastr.success(data.message, 'Success');

          // Backend response me saved rows
          this.pdfData = data.data.manifest || []; // assume backend sends "rows" array

          // PDF generate karo backend data se
          this.exportToPDF();

          this.getProducts();
          this.modalRef?.close();
        }
      },
      error: (error) => {
        if (error.error) {
          // 1) agar "message" exist karta hai
          if (error.error.message) {
            this.toastr.error(error.error.message, 'Error');
          }
          // 2) agar "errors" array ya object hai (model validation errors case)
          else if (error.error.errors) {
            if (Array.isArray(error.error.errors)) {
              error.error.errors.forEach((err: string) => {
                this.toastr.error(err, 'Validation Error');
              });
            } else {
              Object.keys(error.error.errors).forEach((key) => {
                const messages = error.error.errors[key];
                messages.forEach((msg: string) => {
                  this.toastr.error(msg, 'Validation Error');
                });
              });
            }
          }
          // 3) agar plain string return hui
          else {
            this.toastr.error(error.error, 'Error');
          }
        } else {
          // fallback error (unexpected)
          this.toastr.error('Something went wrong, please try again.', 'Error');
        }
      },
    });
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
      if (event.event.target.closest('.edit-btn')) {
        this.editRecord(event.data);
      }
      if (event.event.target.closest('.ship-btn')) {
        this.shippedProduct(event.data);
      }
    }
  }
  shippedProduct(row: any) {
    if (!row || !row.id) {
      this.toastr.warning('Invalid stock item.', 'Warning');
      return;
    }

    // Payload agar future me shippedDate waghera bhejna ho
    const payload = {
      id: row.id,
    };

    this.isSubmitting = true;

    this.API.postData(`${this.config.SHIPPED_MARK}/${row.id}`, payload)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (res: any) => {
          this.toastr.success(res?.message ?? 'Marked as shipped', 'Success');
          this.getProducts(); // refresh grid
        },
        error: (err: any) => {
          const msg = err?.error?.message ?? 'Failed to mark shipped';
          this.toastr.error(msg, 'Error');
        },
      });
  }

  editRecord(row: any) {
    this.editingRow = row;
    if (!this.allStock || this.allStock.length === 0) {
      console.warn(
        'allStock is empty. Make sure data is loaded before calling editRecord().'
      );
      this.unsoldImeis = [];
    } else {
      // Normalize helper
      const normalize = (val: any) =>
        val ? String(val).trim().toLowerCase() : '';

      const sku = normalize(row.sku);
      const model = normalize(row.model);
      const storage = normalize(row.storage);
      const color = normalize(row.color);
      const grade = normalize(row.gradeName || row.grade);

      this.unsoldImeis = this.allStock
        .filter((p: any) => {
          const matches =
            normalize(p.sku) === sku &&
            normalize(p.model) === model &&
            normalize(p.storage) === storage &&
            normalize(p.color) === color &&
            (normalize(p.gradeName) === grade ||
              normalize(p.grade) === grade) &&
            (!p.orderNo || p.orderNo === '' || p.orderNo === null) &&
            (!p.dateSold || p.dateSold === '' || p.dateSold === null);

          if (matches) console.log(`Match found:`, p);
          return matches;
        })
        .map((p: any) => p.imei)
        .filter((imei: any) => imei?.trim() !== '');
    }

    console.log('Unsold IMEIs found:', this.unsoldImeis);

    // ALWAYS OPEN MODAL
    this.modalRef = this.modalService.open(this.modalIMEI, {
      centered: false,
      backdrop: 'static',
      keyboard: false,
      size: 'sm',
    });
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
        'Warning'
      );
      return;
    }

    //Check if the IMEI exists in unsold list
    const isValidUnsold = this.unsoldImeis.includes(enteredImei);

    if (!isValidUnsold) {
      this.toastr.error(
        `Invalid IMEI: "${enteredImei}". Please select an IMEI from the unsold list.`,
        'Validation Error'
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
            'Success'
          );
          this.shippedProduct(this.editingRow);
          this.getProducts(); // refresh grid
          this.modalRef?.close();
        },
        error: (err: any) => {
          const msg = err?.error?.message ?? 'Failed to update IMEI';
          this.toastr.error(msg, 'Error');
        },
      });
  }

  // Show suggestions when focused
  showSuggestions() {
    this.showSuggestionList = true;
    this.filterImeis();
  }

  // Hide suggestions when clicked outside
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.form-group')) {
      this.closeSuggestions();
    }
  }

  closeSuggestions() {
    this.showSuggestionList = false;
  }

  // Filter IMEIs dynamically
  filterImeis() {
    const search = this.newImei.trim().toLowerCase();

    if (!search) {
      this.filteredImeis = this.unsoldImeis.slice(0, 10);
    } else {
      this.filteredImeis = this.unsoldImeis
        .filter((imei: any) => imei.toLowerCase().includes(search))
        .slice(0, 10);
    }

    this.showSuggestionList = true;
  }

  // When suggestion is clicked
  selectImei(imei: string) {
    this.newImei = imei;
    this.showSuggestionList = false;
  }

  // When Enter pressed (manual entry or barcode scan)
  onImeiEnter() {
    const matched = this.unsoldImeis.includes(this.newImei.trim());
    this.showSuggestionList = false;

    if (matched) {
      this.toastr.success(`✅ IMEI ${this.newImei} is valid and selected.`);
    } else {
      this.toastr.error(`❌ Invalid IMEI. No matching record found.`);
      this.newImei = '';
    }
  }
}
