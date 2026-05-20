import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import {
  FormArray,
  FormBuilder,
  FormGroup,
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
import { filter, finalize } from 'rxjs/operators';
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
import { HttpResponse } from '@angular/common/http';
ModuleRegistry.registerModules([AllCommunityModule]);
type ProductRow = {
  id: number;
  sku: string;
  model: string;
  storage: string;
  color: string;
  grade: number;
  cost: number | null;
  vendor: string;
  invoiceNumber: string;
  phoneCheck: boolean;
  imei: string;
};
@Component({
  selector: 'app-input',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DataTablesModule,
    NgxSkeletonLoaderModule,
    AgGridAngular,
  ],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
})
export class InputComponent {
  @ViewChild('modalTemplate') modalTemplate!: TemplateRef<any>;
  @ViewChild('modalTemplateSKU') modalTemplateSKU!: TemplateRef<any>;
  @ViewChild('orderModal') orderModal!: TemplateRef<any>;
  @ViewChild('deleteModal') deleteModal!: TemplateRef<any>;
  @ViewChild('propagationModal') propagationModal!: TemplateRef<any>; // <-- new
  selectedRowGroup!: FormGroup;
  isLoading = true;

  @ViewChild(DataTableDirective, { static: false })
  dtElement!: DataTableDirective;
  dtTrigger: Subject<any> = new Subject();
  dtOptions = {};
  modalRef: NgbModalRef | null = null;
  modalRefSku: NgbModalRef | null = null;
  private modalOpening = false;
  private routerSub!: Subscription;

  form = this.fb.group({
    products: this.fb.array<FormGroup>([]),
  });

  models: any = [];
  storages: any = [];
  colors: any = [];
  grades: any = [];
  savedList: ProductRow[] = [];
  editIndex: number | null = null;
  listProducts: any = [];
  orderForm!: FormGroup;
  isSaveMode: boolean = true;
  stockId: number;
  id: string | null = null;

  skuForm!: FormGroup;
  selectedRowIndex: number | null = null;
  messageNoSku = false;
  messageAutoFilled = false;
  listSkus: any;
  @ViewChild('closeSkuModalBtn')
  closeSkuModalBtn!: ElementRef<HTMLButtonElement>;

  colDefs: ColDef[] = [
    {
      headerName: 'Actions',
      cellRenderer: (params: any) => {
        return `
        <button class="btn btn-outline-primary btn-sm rounded-circle mr-1 edit-btn" title="Edit Record">
          <i class="fa fa-edit fa-xs"></i>
        </button>
        <button class="btn btn-outline-danger btn-sm rounded-circle mr-1 delete-btn" title="Delete Record">
          <i class="fa fa-trash fa-xs"></i>
        </button>
           <button class="btn btn-outline-success btn-sm rounded-circle mr-1 order-btn" title="Placed Order">
          <i class="fa fa-cube fa-xs"></i>
        </button>
      `;
      },
    },
    { field: 'sku', headerName: 'SKU', sortable: true, filter: true },
    { field: 'model', headerName: 'Model', sortable: true, filter: true },
    { field: 'storage', headerName: 'Storage', sortable: true, filter: true },
    { field: 'color', headerName: 'Color', sortable: true, filter: true },
    { field: 'gradeName', headerName: 'Grade', sortable: true, filter: true },
    { field: 'cost', headerName: 'Cost', sortable: true, filter: true },
    { field: 'vendor', headerName: 'Vendor', sortable: true, filter: true },
    {
      field: 'invoiceNumber',
      headerName: 'Invoice Number',
      sortable: true,
      filter: true,
    },
    {
      field: 'phoneCheck',
      headerName: 'Phone Check',
      sortable: true,
      filter: true,
      cellRenderer: (params: any) => {
        if (params.value) {
          return `<span style="color: green; font-weight: bold;">Pass</span>`;
        } else {
          return `<span style="color: red; font-weight: bold;">Fail</span>`;
        }
      },
    },
    { field: 'imei', headerName: 'IMEI', sortable: true, filter: true },
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
  propagation: any = null;
  now = new Date();
  isDeleting = false;
  constructor(
    private fb: FormBuilder,
    (API_ROUTES_TOKEN) private config: typeof API_ROUTES,
    private GV: GvarService,
    private API: ApiService,
    private modalService: NgbModal,
    private router: Router,
    private toastr: ToastrService,
    private dataTableService: DataTableService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initilizationForms();
    this.getModels();
    this.getStorage();
    this.getGrades();
    //this.getBaseSkus();
    this.getProducts();
    this.getSkus();
    // this.getCSV("17079821", 6)

    // first load ke liye
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
    if (url.includes('/view/input/1') && !this.modalRef && !this.modalOpening) {
      this.modalOpening = true; // prevent re-entrance

      setTimeout(() => {
        this.modalRef = this.modalService.open(this.modalTemplate, {
          centered: false,
          backdrop: 'static',
          keyboard: false,
          size: 'xl',
        });
        if (this.products.length === 0) {
          this.addRow();
        }

        // modal close hone par flags reset
        this.modalRef.result.finally(() => {
          this.modalRef = null;
          this.modalOpening = false;
        });
      });
    }
    // dusre route pe modal close
    else if (!url.includes('/view/input/1') && this.modalRef) {
      this.modalRef.close();
      this.modalRef = null;
      this.modalOpening = false;
    }
  }

  initilizationForms() {
    const today = new Date().toISOString().split('T')[0];
    this.orderForm = this.fb.group({
      orderNo: ['', Validators.required],
      productTitle: [''],
      imei: [''],
      date: [today, Validators.required],
    });
    this.skuForm = this.fb.group({
      sku: ['', Validators.required],
      model: ['', Validators.required],
      storage: ['', Validators.required],
      color: ['', Validators.required],
      grade: [null, Validators.required],
    });
  }

  openAddModal() {
    this.products.clear();
    this.isSaveMode = true;
    this.modalRef = this.modalService.open(this.modalTemplate, {
      centered: false,
      backdrop: 'static',
      keyboard: false,
      size: 'xl',
    });
    if (this.products.length === 0) {
      this.addRow();
    }
  }

  ngAfterViewInit(): void {
    this.dtTrigger.next(null);
  }

  ngOnDestroy(): void {
    this.dtTrigger.unsubscribe();
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }

  get products(): FormArray<FormGroup> {
    return this.form.get('products') as FormArray<FormGroup>;
  }

  createGroup(values?: Partial<ProductRow>) {
    const today = new Date().toISOString().slice(0, 10);
    return this.fb.group({
      id: [values?.id ?? ''],
      sku: [values?.sku ?? '', Validators.required],
      model: [values?.model ?? '', Validators.required],
      storage: [values?.storage ?? '', Validators.required],
      grade: [values?.grade ?? '', Validators.required],
      color: [values?.color ?? '', Validators.required],
      cost: [values?.cost ?? null, Validators.required],
      vendor: [values?.vendor ?? ''],
      invoiceNumber: [values?.invoiceNumber ?? ''],
      phoneCheck: [values?.phoneCheck ?? false],
      imei: [values?.imei ?? ''],
    });
  }

  addRow(): void {
    if (this.products.length === 0) {
      this.products.push(this.createGroup());
      return;
    }

    const lastIndex = this.products.length - 1;
    const last = this.products.at(lastIndex).value as ProductRow;

    // duplicate form values
    const duplicate: Partial<ProductRow> = { ...last, imei: '' };
    this.products.push(this.createGroup(duplicate));

    const newIndex = this.products.length - 1;

    //IMPORTANT: copy per-row colors also
    this.colors[newIndex] = [...(this.colors[lastIndex] ?? [])];

    // Duplicate row ke liye SKU recalc
    this.updateSkuByFields(newIndex);
  }

  removeRow(index: number): void {
    this.products.removeAt(index);
  }

  save(): void {
    const payload = this.products.value as ProductRow[];

    // show loader
    this.isLoading = true;

    this.API.postData(this.config.SAVE_PRODUCTS, payload)
      .pipe(finalize(() => (this.isLoading = false))) // ensure loader hides on complete/error
      .subscribe({
        next: (data: any) => {
          if (data.status == 200) {
            this.toastr.success(data.message, 'Success');
            this.getProducts();

            // show propagation modal if backend returned propagation info
            if (data?.propagation) {
              this.handlePropagation(data);
            }

            this.products.clear(); // reset form
            this.modalRef?.close();
          }
        },
        error: (error) => {
          if (error.error) {
            if (error.error.message) {
              this.toastr.error(error.error.message, 'Error');
            } else if (error.error.errors) {
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
            } else {
              this.toastr.error(error.error, 'Error');
            }
          } else {
            this.toastr.error(
              'Something went wrong, please try again.',
              'Error'
            );
          }
        },
      });
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
              .filter((x: any) => x.orderNo == null)
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

  editRecord(index: number): void {
    this.editIndex = index;
    this.isSaveMode = false;

    this.products.clear();
    const row = this.listProducts[index];
    this.products.push(this.createGroup(row));

    this.modalRef = this.modalService.open(this.modalTemplate, {
      centered: false,
      backdrop: 'static',
      keyboard: false,
      size: 'xl',
    });

    const grp = this.products.at(0) as FormGroup;
    grp.patchValue({ model: row.model });

    const modelObj = this.models.find((m: any) => m.value === row.model);
    const modelId = modelObj?.id;

    if (modelId) {
      this.API.getData(
        this.config.GET_COLORS_BY_MODEL + '/' + modelId
      ).subscribe({
        next: (data: any) => {
          // ❗ FIX: colors array MUST be 2D (only index 0 in edit mode)
          this.colors[0] = data?.data ?? [];

          // Patch saved color
          grp.patchValue({ color: row.color ?? '' });
        },
        error: () => {
          grp.patchValue({ color: row.color ?? '' });
        },
      });
    } else {
      this.colors[0] = [];
      grp.patchValue({ color: row.color ?? '' });
    }
  }

  updateProduct(): void {
    const payload = this.products.value[0];

    // show loader while updating
    this.isLoading = true;

    this.API.postData(this.config.UPDATE_PRODUCTS, payload)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (data: any) => {
          if (data.status == 200) {
            this.toastr.success(data.message, 'Success');
            this.getProducts();
            this.products.clear(); // reset form
            this.modalRef?.close();
          }
        },
        error: (error) => {
          if (error.error) {
            this.toastr.error(error.error.message, 'Error');
          }
        },
      });
  }
  deleteRecord(stockId: number) {
    this.stockId = stockId;
    this.modalRef = this.modalService.open(this.deleteModal, {
      centered: false,
      backdrop: 'static',
      keyboard: false,
      size: 'md',
    });
  }

  onDeleteConfirmed() {
    this.isDeleting = true;
    this.API.removeData(this.config.DELETE_PRODUCT + this.stockId)
      .pipe(finalize(() => (this.isDeleting = false)))
      .subscribe({
        next: (data: any) => {
          if (data != null) {
            this.getProducts();
            this.modalRef?.close();
            this.toastr.success(data.message, 'Success');

            if (data?.data?.propagation) {
              this.handlePropagation(data);
            }
          }
        },
        error: (error) => {
          this.isDeleting = false;
          if (error.error != undefined) {
            this.toastr.error(
              typeof error.error === 'string'
                ? error.error
                : error.error.message,
              'Error'
            );
          }
        },
      });
  }

  // New: show propagation summary modal
  handlePropagation(response: any) {
    let prop: any = null;

    if (!response) {
      prop = null;
    } else if (response.data && response.data.propagation) {
      prop = response.data.propagation;
    } else if (response.propagation) {
      prop = response.propagation;
    } else if (response.data) {
      prop = response.data;
    }

    // -------------------------------
    // MULTI-SKU SUPPORT ADDED HERE
    // -------------------------------
    if (!prop) {
      this.propagation = [];
    } else if (Array.isArray(prop)) {
      // Already multiple SKUs → use directly
      this.propagation = prop;
    } else if (prop.result || prop.systemSku || prop.processed || prop.errors) {
      // Single object → wrap in array
      this.propagation = [prop];
    } else {
      this.propagation = [];
    }

    // normalize counts for every SKU and map processed/skipped/errors properly
    this.propagation = this.propagation.map((item: any) => {
      const result = item.result ?? item;

      // map processed array
      const processed = (result.processed ?? []).map((p: any) => ({
        channel: p.channel,
        platformSku: p.platformSku,
        currentCount: p.currentCount,
        delta: p.delta,
        msg: p.msg,
      }));

      // map skipped array (customize if needed)
      const skipped = (result.skipped ?? []).map((s: any) => s);

      // map errors array
      const errors = (result.errors ?? []).map((e: any) => ({
        channel: e.channel,
        platformSku: e.platformSku,
        currentCount: e.currentCount,
        delta: e.delta,
        msg: e.msg ?? e.exception ?? '',
      }));

      return {
        ok: item.ok ?? true,
        result: {
          systemSku: result.systemSku,
          currentCount: result.currentCount ?? '-',
          delta: result.delta ?? '-',
          processed,
          skipped,
          errors,
          processedCount: processed.length,
          skippedCount: skipped.length,
          errorsCount: errors.length,
        },
      };
    });

    // open modal
    if (this.propagationModal && this.propagation.length > 0) {
      this.modalService.open(this.propagationModal, {
        size: 'xl',
        backdrop: 'static',
      });
    } else {
      this.toastr.info('Propagation completed', 'Info');
    }
  }

  copyPropagationJson() {
    try {
      const text = JSON.stringify(
        this.propagation?.result ?? this.propagation,
        null,
        2
      );
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
        this.toastr.success('Propagation JSON copied to clipboard', 'Copied');
      } else {
        // fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        this.toastr.success('Propagation JSON copied to clipboard', 'Copied');
      }
    } catch {
      this.toastr.error('Unable to copy JSON', 'Error');
    }
  }
  trackByIndex(i: number): number {
    return i;
  }
  editOrder(content: any, data: any): void {
    this.orderForm.patchValue(data);
    this.orderForm.controls['productTitle'].setValue(data.model);
    this.modalRef = this.modalService.open(content, {
      centered: false,
      backdrop: 'static',
      keyboard: false,
      size: 'sm',
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
          return;
        }
      },
      error: (error) => {
        if (error.error) {
          this.toastr.error(error.error.message, 'Error');
        }
      },
    });
  }

  // yeh function dropdowns change hote hi call hoga
  updateSkuByFields(index: number) {
    const group = this.products.at(index);
    const model = group.get('model')?.value;
    const storage = group.get('storage')?.value;
    const color = group.get('color')?.value;
    const grade = group.get('grade')?.value;
    console.log('Searching for SKU with:', { model, storage, color, grade });
    if (model && storage && color && grade !== null && grade !== '') {
      const match = this.listSkus.find(
        (s: any) =>
          s.model?.toString().trim().toLowerCase() ===
            model.toString().trim().toLowerCase() &&
          s.storage?.toString().trim().toLowerCase() ===
            storage.toString().trim().toLowerCase() &&
          s.color?.toString().trim().toLowerCase() ===
            color.toString().trim().toLowerCase() &&
          s.grade == grade // Loose equality for grade
      );
      console.log('Found match:', match);
      if (match) {
        group.get('sku')?.setValue(match.sku);
      } else {
        group.get('sku')?.setValue('');
      }
    } else {
      group.get('sku')?.setValue('');
    }
  }

  // jab user + button click kare to modal open ho
  openSkuModal(index: number, data: any) {
    this.selectedRowIndex = index;
    this.skuForm.patchValue(data.value);
    this.modalRefSku = this.modalService.open(this.modalTemplateSKU, {
      centered: false,
      backdrop: 'static',
      keyboard: false,
      size: 'lg',
    });
  }
  get f() {
    return this.skuForm.controls;
  }

  getSkus() {
    this.isLoading = true;
    this.API.getData(this.config.GET_SKU).subscribe({
      next: (data: any) => {
        if (data != null) {
          this.listSkus = data.data;
        }
      },
      error: (error) => {
        if (error.error != undefined) {
          this.toastr.error(error.error.message, 'Error');
        }
      },
    });
  }
  submitData() {
    const formValue = { ...this.skuForm.value };
    this.API.postData(this.config.SAVE_SKU, formValue).subscribe({
      next: (data: any) => {
        if (data.status === 200) {
          this.toastr.success('SKU saved successfully.', 'Success');
          if (this.selectedRowIndex !== null) {
            const rowGroup = this.products.at(
              this.selectedRowIndex
            ) as FormGroup;
            rowGroup.get('sku')?.setValue(data.data.sku);
            rowGroup.get('model')?.setValue(data.data.model);
            rowGroup.get('storage')?.setValue(data.data.storage);
            rowGroup.get('color')?.setValue(data.data.color);
            rowGroup.get('grade')?.setValue(data.data.grade);
          }
          this.getSkus();
          this.modalRefSku?.close();
        } else {
          this.toastr.warning(data.message, 'Alert');
        }
      },
      error: (error) => {
        if (error.error) {
          this.toastr.error(error.error.message, 'Error');
        }
      },
    });
  }
  onImeiEntered(index: number) {
    const group = this.products.at(index);
    const imei = group.get('imei')?.value;

    if (imei && imei.trim() !== '') {
      // Agar IMEI entered hai, to auto naya row add karo
      if (index === this.products.length - 1) {
        this.addRow();
        // optional: focus next row IMEI
        setTimeout(() => {
          const inputs = document.querySelectorAll(
            'input[formControlName="imei"]'
          );
          const nextInput = inputs[inputs.length - 1] as HTMLElement;
          nextInput?.focus();
        });
      }
    }
  }
  getBaseSkus() {
    this.isLoading = true;
    this.API.getData(this.config.GET_BASE_PROP).subscribe({
      next: (data: any) => {
        if (data != null) {
          this.models = data.data.models;
          this.storages = data.data.storages;
          this.colors = data.data.colors;
          this.grades = data.data.grades;
        }
      },
      error: (error) => {
        if (error.error != undefined) {
          this.toastr.error(error.error.message, 'Error');
        }
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
      const rowIndex = event.rowIndex; // ya event.node.rowIndex
      if (event.event.target.closest('.edit-btn')) {
        this.editRecord(rowIndex); // ab index pass kar rahe hain
      } else if (event.event.target.closest('.delete-btn')) {
        this.deleteRecord(event.data.id);
      } else if (event.event.target.closest('.order-btn')) {
        this.placeOrder(event.data);
      }
    }
  }
  placeOrder(data: any): void {
    console.log(data);
    this.orderForm.patchValue(data);
    this.orderForm.controls['productTitle'].setValue(data.model);
    this.modalRef = this.modalService.open(this.orderModal, {
      centered: false,
      backdrop: 'static',
      keyboard: false,
      size: 'sm',
    });
  }
  getModels() {
    this.API.getData(this.config.GET_MODELS).subscribe({
      next: (data: any) => {
        if (data != null) {
          this.models = data.data;
        }
      },
      error: (error) => {
        if (error.error != undefined) {
          this.toastr.error(error.error.message, 'Error');
        }
      },
    });
  }
  getColors(rowIndex: number) {
    const selectedValue = this.products.at(rowIndex).get('model')?.value;
    const selectedId = this.models.find(
      (x: any) => x.value === selectedValue
    )?.id;

    if (!selectedId) {
      this.colors[rowIndex] = [];
      return;
    }

    this.API.getData(
      this.config.GET_COLORS_BY_MODEL + '/' + selectedId
    ).subscribe({
      next: (data: any) => {
        if (data.success) {
          // FIX: overwrite ONLY this row's colors, not whole array
          this.colors[rowIndex] = data.data;

          // FIX: color select options ko per-row bind karne ke liye correct reference
          const rowColors = this.colors[rowIndex];

          // 1 color mila → auto select
          if (rowColors.length === 1) {
            this.products
              .at(rowIndex)
              .patchValue({ color: rowColors[0].value });
          } else {
            this.products.at(rowIndex).patchValue({ color: '' });
          }
        }
      },
      error: (error) => {
        if (error.error != undefined) {
          this.toastr.error(error.error.message, 'Error');
        }
      },
    });
  }

  getColors2() {
    const selectedValue = this.skuForm.controls['model'].value;
    const selectedId = this.models.find(
      (x: any) => x.value === selectedValue
    )?.id;
    if (!selectedId) {
      this.colors = [];
      return;
    }
    this.API.getData(
      this.config.GET_COLORS_BY_MODEL + '/' + selectedId
    ).subscribe({
      next: (data: any) => {
        if (data.success) {
          this.colors = data.data;
          if (this.colors.length === 1) {
            this.skuForm.patchValue({ color: this.colors[0].value });
          } else {
            this.skuForm.patchValue({ color: '' }); // reset dropdown
          }
        }
      },
      error: (error) => {
        if (error.error != undefined) {
          this.toastr.error(error.error.message, 'Error');
        }
      },
    });
  }
  getStorage() {
    this.API.getData(this.config.GET_STORAGE).subscribe({
      next: (data: any) => {
        if (data != null) {
          this.storages = data.data;
        }
      },
      error: (error) => {
        if (error.error != undefined) {
          this.toastr.error(error.error.message, 'Error');
        }
      },
    });
  }
  getGrades() {
    this.API.getData(this.config.GET_GRADES).subscribe({
      next: (data: any) => {
        if (data != null) {
          this.grades = data.data;
        }
      },
      error: (error) => {
        if (error.error != undefined) {
          this.toastr.error(error.error.message, 'Error');
        }
      },
    });
  }

  getCSV(sku?: string, qty?: number) {
    if (!sku) {
      this.toastr.error('SKU required to download CSV', 'Error');
      return;
    }

    this.API.downloadFile(this.config.GET_CSV, { sku, qty }).subscribe({
      next: (res: HttpResponse<Blob>) => {
        const blob = res.body;
        if (!blob) {
          this.toastr.error('Empty file received', 'Error');
          return;
        }

        // try extract filename from Content-Disposition
        let filename = `stock.csv`;
        const cd =
          res.headers.get('content-disposition') ||
          res.headers.get('Content-Disposition');
        if (cd) {
          const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/.exec(cd);
          if (match && match[1]) filename = decodeURIComponent(match[1]);
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.toastr.error('Failed to download CSV', 'Error');
      },
    });
  }
}
