import { Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Component, HostListener, TemplateRef, ViewChild } from '@angular/core';
import { filter, finalize, Subject, Subscription } from 'rxjs';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from '@services/api.service';
import { API_ROUTES, API_ROUTES_TOKEN } from '@services/app.global';
import { DataTableService } from '@services/data-table.service';
import { GvarService } from '@services/gvar.service';
import { DataTableDirective, DataTablesModule } from 'angular-datatables';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { AgGridAngular } from 'ag-grid-angular';
import { AllCommunityModule, ColDef, ModuleRegistry, GridReadyEvent, GridApi, ColumnState, GridOptions } from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-sku',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DataTablesModule, NgxSkeletonLoaderModule, AgGridAngular],
  templateUrl: './sku.component.html',
  styleUrl: './sku.component.scss'
})
export class SKUComponent {
  @ViewChild('modalTemplate') modalTemplate!: TemplateRef<any>;
  @ViewChild('modalTemplateBulk') modalTemplateBulk!: TemplateRef<any>;
  @ViewChild(DataTableDirective, { static: false })
  dtElement!: DataTableDirective;
  dtTrigger: Subject<any> = new Subject();
  dtOptions = {};
  modalRef: NgbModalRef | null = null;
  isLoading = true;
  isSubmit = false;
  listSkus: any = [];
  selectedSku: any;
  models: any = [];
  storages: any = [];
  colors: any = [];
  grades: any = [];
  skuForm: FormGroup;
  selectedFile: File | null = null;

  colDefs: ColDef[] = [
    {
      headerName: 'Actions',
      cellRenderer: (params: any) => {
        return `
        <button class="btn btn-outline-primary btn-sm rounded-circle mr-2 edit-btn" title="Edit Record">
          <i class="fa fa-edit fa-xs"></i>
        </button>
      `;
      }
    },
    { field: 'sku', headerName: 'SKU', sortable: true, filter: true, },
    { field: 'model', headerName: 'Model', sortable: true, filter: true },
    { field: 'storage', headerName: 'Storage', sortable: true, filter: true, cellClass: 'text-center' },
    { field: 'color', headerName: "Color", sortable: true, filter: true },
    { field: 'gradeName', headerName: "Grade", sortable: true, filter: true },
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
    private router: Router,
    private toastr: ToastrService,
    private route: ActivatedRoute
  ) {

  }

  ngOnInit(): void {
    this.initilization();
    this.getModels();
    this.getStorage();
    this.getGrades();
    this.getSkus();

  }

  initilization() {
    this.skuForm = this.fb.group({
      sku: ['', Validators.required],
      model: ['', Validators.required],
      storage: ['', Validators.required],
      color: ['', Validators.required],
      grade: [null, Validators.required],
    });
  }
  get f() {
    return this.skuForm.controls;
  }
  getSkus() {
    this.isLoading = true;
    this.API.getData(this.config.GET_SKU)
      .pipe(finalize(() => this.isLoading = false)).subscribe({
        next: (data: any) => {
          if (data != null) {
            this.listSkus = data.data;
            this.rerenderTable();
          }
        },
        error: (error) => {
          if (error.error != undefined) {
            this.toastr.error(error.error.message, 'Error');
          }
        }
      });
  }
  submitData() {
    const formValue = { ...this.skuForm.value };
    const isUpdate = !!this.selectedSku;
    let apiUrl = this.config.SAVE_SKU;
    let payload: any = { ...formValue };
    if (isUpdate) {
      apiUrl = this.config.UPDATE_SKU;
      payload = {
        oldSku: this.selectedSku,
        newSku: formValue.sku
      };
    }
    this.API.postData(apiUrl, payload).subscribe({
      next: (data: any) => {
        if (data.status == 200) {
          this.toastr.success(
            isUpdate ? "SKU updated successfully." : "SKU saved successfully.",
            'Success'
          );
          this.getSkus();
          this.modalRef?.close();
        } else {
          this.toastr.warning(data.message, 'Alert');
        }
      },
      error: (error) => {
        if (error.error) {
          this.toastr.error(error.error.message, 'Error');
        }
      }
    });
  }

  editRecord(data: any) {
    // open modal
    this.modalRef = this.modalService.open(this.modalTemplate, {
      centered: false,
      backdrop: 'static',
      keyboard: false,
      size: 'md'
    });

    // set selected SKU and populate form
    this.selectedSku = data.sku;
    this.skuForm.patchValue(data);

    // --- Logic to load related colors based on model ---
    const modelValue = data.model;
    if (modelValue) {
      // find model object from available model list
      const modelObj = this.models.find((m: any) => m.value === modelValue);
      const modelId = modelObj?.id;

      if (modelId) {
        // call API to get colors for this model
        this.API.getData(this.config.GET_COLORS_BY_MODEL + '/' + modelId).subscribe({
          next: (response: any) => {
            // set available colors
            this.colors = response?.data ?? response ?? [];

            // patch saved color into form after colors are loaded
            this.skuForm.patchValue({ color: data.color ?? '' });
          },
          error: () => {
            // even if error occurs, patch saved color
            this.skuForm.patchValue({ color: data.color ?? '' });
          }
        });
      } else {
        // no model id found
        this.colors = [];
        this.skuForm.patchValue({ color: data.color ?? '' });
      }
    } else {
      // no model selected
      this.colors = [];
      this.skuForm.patchValue({ color: data.color ?? '' });
    }
  }


  ngAfterViewInit(): void {
    this.dtTrigger.next(null);
  }

  rerenderTable(): void {
    if (this.dtElement && this.dtElement.dtInstance) {
      this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
        dtInstance.destroy();
        this.dtTrigger.next(null);
      });
    } else {
      setTimeout(() => this.dtTrigger.next(null), 0);
    }
  }

  ngOnDestroy(): void {
    this.dtTrigger.unsubscribe();
  }

  openAddModal() {
    this.skuForm.reset();
    this.modalRef = this.modalService.open(this.modalTemplate, {
      centered: false,
      backdrop: 'static',
      keyboard: false,
      size: 'md'
    });
  }

  openAddModalBulk() {
    this.skuForm.reset();
    this.modalRef = this.modalService.open(this.modalTemplateBulk, {
      centered: false,
      backdrop: 'static',
      keyboard: false,
      size: 'lg'
    });
  }

  onBulkSubmit() {
    if (!this.selectedFile) {
      this.toastr.warning("Please select an Excel file first!", "Alert");
      return;
    }
    this.isSubmit = true;
    const formData = new FormData();
    formData.append("orderFile", this.selectedFile);

    this.API.postDataForm(this.config.SKU_BULK_UPLOAD, formData).pipe(finalize(() => this.isSubmit = false)).subscribe({
      next: (res: any) => {
        const hasExcel = res?.data?.fileContent && res?.data?.fileName;

        // -----------------------------
        // ✔ SUCCESS CASE
        // -----------------------------
        if (res.success === true || res.status === 200) {
          this.toastr.success(res.message || "File uploaded successfully.", "Success");

          // Agar success ke sath Excel report bheji ho
          if (hasExcel) {
            this.downloadExcelFile(res.data.fileContent, res.data.fileName);
          }

          return;
        }

        // -----------------------------
        // FAILURE CASE (status != 200)
        // -----------------------------
        if (hasExcel) {
          this.downloadExcelFile(res.data.fileContent, res.data.fileName);
          this.toastr.error(res.message || "Validation error report downloaded.", "Error");
        } else {
          // Agar Excel fileContent nahi bheja gaya ho → JSON error ko Excel banao
          this.downloadErrorAsExcel(
            { message: res.message, status: res.status },
            "ErrorReport.xlsx"
          );
          this.toastr.error(res.message || "Error occurred", "Error");
        }
      },

      error: (err) => {
        const apiErr = err.error;
        const hasExcel = apiErr?.data?.fileContent && apiErr?.data?.fileName;

        // API ne Excel bheja hai
        if (hasExcel) {
          this.downloadExcelFile(apiErr.data.fileContent, apiErr.data.fileName);
          this.toastr.error(apiErr.message || "Error report downloaded!", "Error");
          return;
        }

        // API ne Excel nahi bheja → JSON error ko Excel me convert
        this.downloadErrorAsExcel(
          { message: apiErr?.message || "Unknown error", status: apiErr?.status || 500 },
          "ErrorReport.xlsx"
        );

        this.toastr.error(apiErr?.message || "Unknown error", "Error");
      }
    });
  }



  private downloadExcelFile(base64Content: string, fileName: string) {
    try {
      // Clean base64
      const cleaned = base64Content.trim()
        .replace(/[\r\n]/g, '')
        .replace(/^['"]+|['"]+$/g, '');

      // Safety check
      if (!cleaned || cleaned.length === 0) {
        throw new Error('Empty base64 content');
      }

      // Decode
      const byteString = atob(cleaned);
      const byteArray = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        byteArray[i] = byteString.charCodeAt(i);
      }

      // Blob
      const blob = new Blob([byteArray], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      // Download — native way (no saveAs needed)
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'ErrorReport.xlsx';

      // Trigger download
      document.body.appendChild(a);
      a.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      //this.toastr.success(`Downloaded: ${fileName}`, 'Success');

    } catch (err) {
      console.error('Excel download failed:', err);
      this.toastr.error('Failed to generate Excel file. Please try again.', 'Error');
    }
  }


  /**
   * Error JSON ko Excel file bana ke download karne ka helper
   */
  private downloadErrorAsExcel(errorObj: any, fileName: string) {
    const rows: any[] = [];

    for (const key of Object.keys(errorObj)) {
      const value = typeof errorObj[key] === 'object'
        ? JSON.stringify(errorObj[key])
        : errorObj[key];
      rows.push({ Field: key, Value: value });
    }

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(rows);
    const workbook: XLSX.WorkBook = {
      Sheets: { 'ErrorReport': worksheet },
      SheetNames: ['ErrorReport']
    };

    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob: Blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    saveAs(blob, fileName || "ErrorReport.xlsx");
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
      if (event.event.target.closest('.edit-btn')) {
        this.editRecord(event.data);
      }
    }
  }

  getModels() {
    this.API.getData(this.config.GET_MODELS).subscribe({
      next: (data: any) => {
        if (data.success) {
          this.models = data.data;
        }
      },
      error: (error) => {
        if (error.error != undefined) {
          this.toastr.error(error.error.message, 'Error');
        }
      }
    });
  }

  getColors() {
    const selectedValue = this.skuForm.controls['model'].value;
    const selectedId = this.models.find((x: any) => x.value === selectedValue)?.id;
    if (!selectedId) {
      this.colors = [];
      this.isLoading = false;
      return;
    }
    this.API.getData(this.config.GET_COLORS_BY_MODEL + '/' + selectedId)
      .subscribe({
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
        }
      });
  }

  getStorage() {
    this.API.getData(this.config.GET_STORAGE).subscribe({
      next: (data: any) => {
        if (data.success) {
          this.storages = data.data;
        }
      },
      error: (error) => {
        if (error.error != undefined) {
          this.toastr.error(error.error.message, 'Error');
        }
      }
    });
  }
  getGrades() {
    this.API.getData(this.config.GET_GRADES).subscribe({
      next: (data: any) => {
        if (data.success) {
          this.grades = data.data;
        }
      },
      error: (error) => {
        if (error.error != undefined) {
          this.toastr.error(error.error.message, 'Error');
        }
      }
    });
  }
}
