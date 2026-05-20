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
import { API_ROUTES } from '@services/app.global';
import { DataTableService } from '@services/data-table.service';
import { GvarService } from '@services/gvar.service';
import { DataTableDirective, DataTablesModule } from 'angular-datatables';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import {
  AllCommunityModule,
  ColDef,
  ModuleRegistry,
  GridReadyEvent,
  GridApi,
  ColumnState,
  GridOptions,
} from 'ag-grid-community';
import { ImeiCellRendererComponent } from '../imei-editor/imei-editor.component';
ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-outgoing-new',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DataTablesModule,
    NgxSkeletonLoaderModule,
    AgGridAngular,
  ],
  templateUrl: './outgoing-new.component.html',
  styleUrl: './outgoing-new.component.scss',
})
export class OutgoingNewComponent {
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

  public colDefs: ColDef[] = [
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
      headerName: 'Order Status',
      field: 'orderStatus',
      width: 140,
    },
    {
      field: 'imei',
      headerName: 'IMEI',
      sortable: true,
      filter: true,
      editable: true,
      cellRenderer: ImeiCellRendererComponent,
      cellEditor: ImeiCellRendererComponent,
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

  public gridOptions: GridOptions = {
    enableCellTextSelection: true,
    ensureDomOrder: true,
    suppressCopyRowsToClipboard: false,
    suppressClipboardPaste: true,

    context: { filteredImeis: [] },

    onCellClicked: (event) => {
      if (event.colDef.field === 'imei') {
        this.onImeiInputFocus(event.data); // ← row data pass
      }
    },
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
    (API_ROUTES_TOKEN) private config: typeof API_ROUTES,
    private GV: GvarService,
    private API: ApiService,
    private modalService: NgbModal,
    private router: Router,
    private toastr: ToastrService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.getProducts();
    this.initializeDataTable();
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

  getProducts() {
    this.isLoading = true;

    this.API.getDataWithParams(this.config.GET_PRODUCTS)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (data: any) => {
          if (data) {
            this.listProducts = data.filter(
              (x: any) =>
                x.orderNo != null && x.orderStatus === 'Order received'
            );
            this.listProducts.sort(
              (a: any, b: any) =>
                new Date(b.dateSold || '').getTime() -
                new Date(a.dateSold || '').getTime()
            );
            this.rowData = this.listProducts;
            this.rerenderTable();
            this.allStock = data;
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
    this.dtTrigger.unsubscribe();
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

    // Agar click input ya dropdown ke andar nahi hua, toh sab suggestions hide karo
    if (!target.closest('.imei-input-container')) {
      this.rowData.forEach((row) => (row.showSuggestionList = false));
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
          !p.orderNo;
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
        imei.toLowerCase().includes(search)
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
      (p: any) => p.imei === row.newImei && !p.orderNo
    );
    row.showSuggestionList = false;

    if (matched) {
      this.toastr.success(`✅ IMEI ${row.newImei} is valid and selected.`);
    } else {
      this.toastr.error(`❌ Invalid IMEI. No matching record found.`);
      row.newImei = '';
    }
  }

  submitUpdateAll() {
    if (!this.rowData?.length) {
      this.toastr.warning('No data to update', 'Validation');
      return;
    }

    // Send all rows, whether updated or not
    const updates = this.rowData.map((r: any) => ({
      OldImei: r.imei,
      NewImei: r.newImei || r.imei, // use new IMEI if entered, otherwise keep old
      OrderNo: r.orderNo,
      // Backend will handle IsManualImei / OrderStatus
    }));

    const payload = { Updates: updates };

    console.log('Bulk IMEI Payload:', payload);

    this.isSubmitting = true;

    // this.API.postData(this.config.IMEI_UPDATE, payload)
    //   .pipe(finalize(() => this.isSubmitting = false))
    //   .subscribe({
    //     next: (res: any) => {
    //       this.toastr.success(res?.message ?? 'IMEIs updated successfully', 'Success');
    //       this.getProducts(); // refresh grid
    //     },
    //     error: (err: any) => {
    //       const msg = err?.error?.message ?? 'Failed to update IMEIs';
    //       this.toastr.error(msg, 'Error');
    //     }
    //   });
  }

  onImeiInputFocus(row: any) {
    if (!this.allStock?.length) {
      this.gridOptions.context.filteredImeis = [];
      return;
    }

    const normalize = (v: any) =>
      v != null ? String(v).trim().toLowerCase() : '';

    const sku = normalize(row.sku);
    const model = normalize(row.model);
    const storage = normalize(row.storage);
    const color = normalize(row.color);
    const grade = normalize(row.gradeName || row.grade);

    const imeis = this.allStock
      .filter((p: any) => {
        const pSku = normalize(p.sku);
        const pModel = normalize(p.model);
        const pStorage = normalize(p.storage);
        const pColor = normalize(p.color);
        const pGrade = normalize(p.gradeName || p.grade);
        const pOrderNo = p.orderNo ? p.orderNo.trim() : '';

        const match =
          pSku === sku &&
          pModel === model &&
          pStorage === storage &&
          pColor === color &&
          pGrade === grade &&
          !pOrderNo; // only check orderNo

        if (match) console.log('Matching IMEI:', p.imei, p);
        return match;
      })
      .map((p: any) => p.imei)
      .filter((x: any) => x && x.trim() !== '');

    this.gridOptions.context.filteredImeis = imeis;

    console.log('Available IMEIs for this row:', imeis);
  }
}
