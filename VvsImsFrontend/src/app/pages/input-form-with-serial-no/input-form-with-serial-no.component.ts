import { Inject } from '@angular/core';
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
import { API_ROUTES, API_ROUTES_TOKEN } from '@services/app.global';
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
import { NgSelectModule } from '@ng-select/ng-select';
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
  selector: 'app-input-form',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DataTablesModule,
    NgxSkeletonLoaderModule,
    NgSelectModule,
  ],
  templateUrl: './input-form-with-serial-no.component.html',
  styleUrl: './input-form-with-serial-no.component.scss',
})
export class SerialInputFormComponent {
  @ViewChild('modalTemplate') modalTemplate!: TemplateRef<any>;
  @ViewChild('modalTemplateSKU') modalTemplateSKU!: TemplateRef<any>;
  @ViewChild('propagationModal') propagationModal!: TemplateRef<any>; // <-- new
  selectedRowGroup!: FormGroup;
  isLoading = false;
  private imeiDeleting = false;
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
  colorsModal: any = [];
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

  propagation: any = null;
  now = new Date();
  isDeleting = false;
  constructor(
    private fb: FormBuilder,
    @Inject(API_ROUTES_TOKEN) private config: typeof API_ROUTES,
    private GV: GvarService,
    private API: ApiService,
    private modalService: NgbModal,
    private router: Router,
    private toastr: ToastrService,
    private dataTableService: DataTableService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.initilizationForms();
    this.getModels();
    this.getStorage();
    this.getGrades();
    this.getSkus();
    if (this.products.length === 0) {
      this.addRow();
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

  ngAfterViewInit(): void {
    this.dtTrigger.next(null);
  }

  get products(): FormArray<FormGroup> {
    return this.form.get('products') as FormArray<FormGroup>;
  }

  createGroup(values?: Partial<ProductRow>) {
    const today = new Date().toISOString().slice(0, 10);
    return this.fb.group({
      id: [values?.id ?? ''],
      sku: [values?.sku ?? '', Validators.required],
      model: [values?.model ?? null, Validators.required],
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
  onImeiKeydown(event: KeyboardEvent): void {
    const key = event.key;
    this.imeiDeleting = key === 'Backspace' || key === 'Delete';
  }
  onImeiInput(index: number): void {
    const control = this.products.at(index).get('imei');
    if (!control) return;

    let value: string = control.value || '';

    // Allow deletion naturally
    if (this.imeiDeleting) {
      this.imeiDeleting = false;
      return;
    }

    // Only remove spaces (nothing else)
    value = value.replace(/\s+/g, '');

    // Split by comma (comma-separated values)
    const parts = value.split(',');

    const cleanedParts: string[] = [];

    for (let part of parts) {
      // NO length limit
      // NO character restriction
      cleanedParts.push(part);
    }

    // Join back with comma
    const finalValue = cleanedParts.join(',');

    // NO auto-comma logic
    control.setValue(finalValue, { emitEvent: false });
  }

  save(): void {
    const rows = this.products.value as ProductRow[];

    if (!rows || rows.length === 0) {
      this.toastr.warning('No products to save.', 'Warning');
      return;
    }

    const finalPayload: ProductRow[] = [];
    const imeiSet = new Set<string>(); // GLOBAL DUPLICATE CHECK
    const duplicateImeis: string[] = []; // for toaster

    rows.forEach((row) => {
      const imeis = (row.imei || '')
        .split(',')
        .map((i) => i.trim())
        .filter((i) => i.length > 0); //only empty values removed

      if (imeis.length === 0) {
        return;
      }

      // SAME ROW DUPLICATE CHECK
      const localSet = new Set<string>();
      imeis.forEach((i) => {
        if (localSet.has(i)) {
          duplicateImeis.push(i);
        }
        localSet.add(i);
      });

      // GLOBAL DUPLICATE CHECK (ACROSS ALL ROWS)
      imeis.forEach((singleImei) => {
        if (imeiSet.has(singleImei)) {
          duplicateImeis.push(singleImei);
        } else {
          imeiSet.add(singleImei);

          finalPayload.push({
            ...row,
            imei: singleImei,
          });
        }
      });
    });

    // DUPLICATES FOUND → STOP HERE
    if (duplicateImeis.length > 0) {
      const uniqueDuplicates = [...new Set(duplicateImeis)];
      this.toastr.error(
        `Duplicate IMEI found: ${uniqueDuplicates.join(', ')}`,
        'IMEI must be unique',
      );
      return;
    }

    if (finalPayload.length === 0) {
      this.toastr.error('No valid IMEI found.', 'Error');
      return;
    }

    // SAFE TO HIT API
    this.isLoading = true;
    console.log('FINAL PAYLOAD:', finalPayload);

    this.API.postData(this.config.SAVE_PRODUCTS, finalPayload, {
      'x-module-name': 'inventory',
      'x-action-name': 'add-products',
      'x-source-component': 'input-form-with-serial-no',
    })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res: any) => {
          if (res?.success === false) {
            this.toastr.error(res.message || 'Operation failed.', 'Error');
            return;
          }

          this.toastr.success(
            res.message || 'Products saved successfully.',
            'Success',
          );

          this.products.clear();
          this.addRow();

          if (Array.isArray(res?.propagation) && res.propagation.length > 0) {
            this.handlePropagation(res);
          }
        },
        error: () => {
          this.toastr.error('Something went wrong. Please try again.', 'Error');
        },
      });
  }

  // New: show propagation summary modal
  handlePropagation(response: any) {
    let prop: any = null;

    if (!response) {
      prop = null;
    } else if (response.propagation) {
      prop = response.propagation;
    } else if (response.data?.propagation) {
      prop = response.data.propagation;
    }

    if (!prop) {
      this.propagation = [];
      return;
    }

    // Always treat as array
    const arr = Array.isArray(prop) ? prop : [prop];

    this.propagation = arr.map((item: any) => {
      const result = item.result ?? item;

      const processed = (result.processed || []).map((x: any) => ({
        channel: x.channel,
        platformSku: x.platformSku,
        currentCount: x.currentCount ?? '-',
        delta: x.delta ?? '-',
        msg: x.msg ?? '',
      }));

      const skipped = (result.skipped || []).map((s: any) => s);

      const errors = (result.errors || []).map((e: any) => ({
        channel: e.channel,
        platformSku: e.platformSku,
        currentCount: e.currentCount ?? '-',
        delta: e.delta ?? '-',
        msg: e.msg ?? '',
      }));

      return {
        ok: item.ok ?? true,
        result: {
          systemSku: result.systemSku ?? processed[0]?.platformSku ?? '',
          processed,
          skipped,
          errors,
          processedCount: processed.length,
          skippedCount: skipped.length,
          errorsCount: errors.length,
        },
      };
    });

    this.modalService.open(this.propagationModal, {
      size: 'xl',
      backdrop: 'static',
    });
  }

  copyPropagationJson() {
    try {
      const text = JSON.stringify(
        this.propagation?.result ?? this.propagation,
        null,
        2,
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

  // yeh function dropdowns change hote hi call hoga
  updateSkuByFields(index: number) {
    const group = this.products.at(index);
    const model = group.get('model')?.value;
    const storage = group.get('storage')?.value;
    const color = group.get('color')?.value;

    // Normalize grade as STRING
    const grade = group.get('grade')?.value?.toString().trim().toLowerCase();

    console.log('Searching for SKU with:', { model, storage, color, grade });

    if (model && storage && color && grade) {
      const match = this.listSkus.find(
        (s: any) =>
          s.model?.toString().trim().toLowerCase() ===
            model.toString().trim().toLowerCase() &&
          s.storage?.toString().trim().toLowerCase() ===
            storage.toString().trim().toLowerCase() &&
          s.color?.toString().trim().toLowerCase() ===
            color.toString().trim().toLowerCase() &&
          s.grade?.toString().trim().toLowerCase() === grade,
      );

      console.log('MATCH FOUND:', match);

      group.get('sku')?.setValue(match ? match.sku : '');
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
      size: 'md',
    });
  }
  get f() {
    return this.skuForm.controls;
  }

  getSkus() {
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
              this.selectedRowIndex,
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
  onImeiKeyDown(event: KeyboardEvent, index: number) {
    if (event.key !== 'Enter' && event.key !== 'Tab') {
      return;
    }

    const group = this.products.at(index);
    const imei = group.get('imei')?.value;

    if (!imei || imei.trim() === '') {
      return;
    }

    // 🔹 API CALL
    this.getOtherDetails(imei, index);

    // 🔹 Enter par next row add karo
    if (event.key === 'Enter' && index === this.products.length - 1) {
      this.addRow();

      // focus next row IMEI
      setTimeout(() => {
        const inputs = document.querySelectorAll(
          'input[formControlName="imei"]',
        );
        const nextInput = inputs[inputs.length - 1] as HTMLElement;
        nextInput?.focus();
      });
    }

    // 🔹 Tab ka default behaviour allow rehne do
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
  getColors(rowIndex: number): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const selectedValue = this.products.at(rowIndex).get('model')?.value;
      const selectedId = this.models.find(
        (x: any) => x.value === selectedValue,
      )?.id;

      this.colors[rowIndex] = [];
      this.colors = [...this.colors];

      if (!selectedId) {
        resolve([]);
        return;
      }

      this.API.getData(
        this.config.GET_COLORS_BY_MODEL + '/' + selectedId,
      ).subscribe({
        next: (data: any) => {
          if (data.success) {
            this.colors[rowIndex] = data.data;
            this.colors = [...this.colors];
            resolve(this.colors[rowIndex]);
          } else {
            resolve([]);
          }
        },
        error: (err) => {
          reject(err);
        },
      });
    });
  }

  getColors2() {
    const selectedValue = this.skuForm.controls['model'].value;
    const selectedId = this.models.find(
      (x: any) => x.value === selectedValue,
    )?.id;
    if (!selectedId) {
      this.colorsModal = [];
      return;
    }
    this.API.getData(
      this.config.GET_COLORS_BY_MODEL + '/' + selectedId,
    ).subscribe({
      next: (data: any) => {
        if (data.success) {
          this.colorsModal = data.data;
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
  resetTable() {
    // Confirmation dialog
    if (
      !confirm(
        'Are you sure you want to reset the entire table? All data will be lost.',
      )
    ) {
      return;
    }

    // 1. Clear FormArray
    this.products.clear();

    // 2. Reset colors array
    this.colors = [];

    // 3. Add one empty row (optional)
    this.addRow();

    // 4. Show success message
    this.toastr.success('Table has been reset successfully', 'Reset Complete');
  }

  async getOtherDetails(imei: string, index: number) {
    const row = this.products.at(index);

    // Reset all relevant fields first
    row.patchValue({
      cost: '',
      vendor: '',
      invoiceNumber: '',
      model: '',
      color: '',
      storage: '',
      grade: '',
      sku: '',
    });

    this.API.getData(this.config.GET_INVENTORY_BY_IMEI + '/' + imei).subscribe({
      next: async (data: any) => {
        if (!data) {
          // No data found → all fields remain empty
          return;
        }

        /* ===============================
         SIMPLE FIELDS
      ================================*/
        row.patchValue({
          cost: data.cost ?? '',
          vendor: data.vendor ?? '',
          invoiceNumber: data.invoiceNo ?? '',
        });

        /* ===============================
         MODEL + COLOR
      ================================*/
        if (
          data.modal &&
          this.models.some(
            (m: any) =>
              m.value.trim().toLowerCase() === data.modal.trim().toLowerCase(),
          )
        ) {
          row.get('model')?.setValue(data.modal);

          // await color load
          await this.getColors(index);

          // patch color if exists
          const apiColor = data.color?.trim().toLowerCase();
          const matchedColor = this.colors[index]?.find(
            (c: any) => c.value.trim().toLowerCase() === apiColor,
          );

          if (matchedColor) {
            row.get('color')?.setValue(matchedColor.value);
          }
        }

        /* ===============================
         STORAGE
      ================================*/
        if (
          data.storage &&
          this.storages.some(
            (s: any) =>
              s.value.trim().toLowerCase() ===
              data.storage.trim().toLowerCase(),
          )
        ) {
          row.get('storage')?.setValue(data.storage);
        }

        /* ===============================
         GRADE (TEXT → ID)
      ================================*/
        if (data.grade) {
          const matchedGrade = this.grades.find(
            (g: any) =>
              g.value.trim().toLowerCase() === data.grade.trim().toLowerCase(),
          );

          if (matchedGrade) {
            row.get('grade')?.setValue(matchedGrade.id);
          }
        }

        /* ===============================
         SKU
      ================================*/
        this.updateSkuByFields(index);
      },

      error: () => {
        this.toastr.error('Failed to fetch IMEI data', 'Error');
      },
    });
  }
}
