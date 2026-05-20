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
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { AgGridAngular } from 'ag-grid-angular';
import { AllCommunityModule, ColDef, ModuleRegistry, GridReadyEvent, GridApi, ColumnState, GridOptions } from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-colors',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DataTablesModule, NgxSkeletonLoaderModule, AgGridAngular],
  templateUrl: './colors.component.html',
  styleUrl: './colors.component.scss'
})
export class ColorsComponent {
  @ViewChild('modalTemplate') modalTemplate!: TemplateRef<any>;
  @ViewChild('deleteModal') deleteModal!: TemplateRef<any>;
  @ViewChild(DataTableDirective, { static: false })
  dtElement!: DataTableDirective;
  dtTrigger: Subject<any> = new Subject();
  dtOptions = {};
  modalRef: NgbModalRef | null = null;
  isLoading = true;
  colorList: any = [];
  hideShowBtn: boolean = false;

  modelForm: FormGroup;

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
    { field: 'value', headerName: 'Colors', sortable: true, filter: true, },

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

  modelsList: any[] = [];

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
    this.getColors();

  }

  initilization() {
    this.modelForm = this.fb.group({
      models: [[], Validators.required],
      id: [0],
      value: ['', [Validators.required, Validators.minLength(3)]],
      // isActive: [false]
    });
  }
  get f() {
    return this.modelForm.controls;
  }
  getColors() {
    this.isLoading = true;
    this.API.getData(this.config.GET_COLORS)
      .pipe(finalize(() => this.isLoading = false)).subscribe({
        next: (data: any) => {
          if (data.success) {
            this.colorList = data.data;
          }
        },
        error: (error) => {
          if (error.error != undefined) {
            this.toastr.error(error.error.message, 'Error');
          }
        }
      });
  }
  getModels() {
    this.isLoading = true;
    this.API.getData(this.config.GET_MODELS)
      .pipe(finalize(() => this.isLoading = false)).subscribe({
        next: (data: any) => {
          if (data.success) {
            this.modelsList = data.data;
          }
        },
        error: (error) => {
          if (error.error != undefined) {
            this.toastr.error(error.error.message, 'Error');
          }
        }
      });
  }
  onModelCheckboxChange(event: any) {
    const models: number[] = this.modelForm.value.models || [];
    if (event.target.checked) {
      models.push(+event.target.value);
    } else {
      const idx = models.indexOf(+event.target.value);
      if (idx > -1) models.splice(idx, 1);
    }
    this.modelForm.get('models')?.setValue(models);
    this.modelForm.get('models')?.markAsTouched();
  }
  openAddModal() {
    this.modelForm.reset();
    this.modelForm.get('id')?.setValue(0); // <-- Add this line
    this.hideShowBtn = false;
    this.modalRef = this.modalService.open(this.modalTemplate, {
      centered: false,
      backdrop: 'static',
      keyboard: false,
      size: 'sm'
    });
  }
  submitData() {
    console.log(this.modelForm.value);
    this.API.postData(this.config.SAVE_COLORS, this.modelForm.value).subscribe({
      next: (data: any) => {
        if (data.success) {
          this.getColors();
          this.modalRef?.close();
          this.toastr.success(data.message, 'Success');
        }
      },
      error: (error) => {
        if (error.error != undefined) {
          this.toastr.error(error.error.message, 'Error');
        }
      }
    });
  }
  editRecord(data: any) {
    this.hideShowBtn = true;
    this.modelForm.patchValue(data);
    this.modalRef = this.modalService.open(this.modalTemplate, {
      centered: false,
      backdrop: 'static',
      keyboard: false,
      size: 'sm'
    });
  }
  updateData() {
    this.API.putData(this.config.SAVE_COLORS + '/' + this.modelForm.controls['id'].value, this.modelForm.value).subscribe({
      next: (data: any) => {
        if (data.success) {
          this.getColors();
          this.modalRef?.close();
          this.toastr.success(data.message, 'Success');
        }
      },
      error: (error) => {
        if (error.error != undefined) {
          this.toastr.error(error.error.message, 'Error');
        }
      }
    });
  }
  deleteRecord(id: number) {
    this.modelForm.controls['id'].setValue(id);
    this.modalRef = this.modalService.open(this.deleteModal, {
      centered: true,
      backdrop: 'static',
      keyboard: false
    });
  }
  onDeleteConfirmed() {
    this.API.deleteData(this.config.SAVE_COLORS + '/' + this.modelForm.controls['id'].value).subscribe({
      next: (data: any) => {
        if (data.success) {
          this.getModels();
          this.modalRef?.close();
          this.toastr.success(data.message, 'Success');
        }
      },
      error: (error) => {
        if (error.error != undefined) {
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
      if (event.event.target.closest('.edit-btn')) {
        this.editRecord(event.data); // pura row ka data bhej diya
      } else if (event.event.target.closest('.delete-btn')) {
        this.deleteRecord(event.data.id); // id delete ke liye use ho rahi hai
      }
    }
  }
}
