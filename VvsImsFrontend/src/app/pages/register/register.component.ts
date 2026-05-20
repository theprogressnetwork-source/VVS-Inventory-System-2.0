import { Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Component, HostListener, TemplateRef, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from '@services/api.service';
import { API_ROUTES, API_ROUTES_TOKEN } from '@services/app.global';
import { DataTableService } from '@services/data-table.service';
import { GvarService } from '@services/gvar.service';
import { DataTableDirective, DataTablesModule } from 'angular-datatables';
import { ToastrService } from 'ngx-toastr';
import { finalize, Subject } from 'rxjs';
import { AgGridAngular } from 'ag-grid-angular';
import { AllCommunityModule, ColDef, ModuleRegistry, GridReadyEvent, GridApi, ColumnState, GridOptions } from 'ag-grid-community';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
ModuleRegistry.registerModules([AllCommunityModule])
@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DataTablesModule, NgxSkeletonLoaderModule, RouterModule, AgGridAngular],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  @ViewChild('addModal') addModal!: TemplateRef<any>;
  @ViewChild('deleteModal') deleteModal!: TemplateRef<any>;

  isLoading = true;
  @ViewChild(DataTableDirective, { static: false })
  dtElement!: DataTableDirective;
  dtTrigger: Subject<any> = new Subject();
  dtOptions = {};
  modalRef: NgbModalRef;
  userId: number;
  isEdit: boolean = false;
  public router: Router;
  public userForm: FormGroup;
  listUsers: any = [];

  // --- AG Grid Integration Start ---
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
    { headerName: 'First Name', field: 'userFirstName', sortable: true, filter: true },
    { headerName: 'Last Name', field: 'userLastName', sortable: true, filter: true },
    { headerName: 'Email', field: 'userEmail', sortable: true, filter: true },
    { headerName: 'Phone', field: 'userPhone', sortable: true, filter: true },
    { headerName: 'Role', field: 'roleName', sortable: true, filter: true },
    {
      headerName: 'Active',
      field: 'isActive',
      sortable: true,
      filter: true,
      cellRenderer: (params: any) => {
        if (params.value) {
          return `
        <span class="badge rounded-pill bg-light text-success border border-success px-3 py-1">
          <i class="fa fa-check-circle me-1"></i> Active
        </span>
      `;
        } else {
          return `
        <span class="badge rounded-pill bg-light text-danger border border-danger px-3 py-1">
          <i class="fa fa-times-circle me-1"></i> Inactive
        </span>
      `;
        }
      }
    }
  ];
  dropdownOpen = false;
  defaultColDef: ColDef = { flex: 1, minWidth: 100, sortable: true, resizable: true };
  allColumns = this.colDefs.map(c => ({ field: c.field!, headerName: c.headerName!, visible: true }));
  rowData: any[];
  gridApi!: GridApi;


  constructor(router: Router,
    private fb: FormBuilder,
    @Inject(API_ROUTES_TOKEN) private config: typeof API_ROUTES,
    private GV: GvarService,
    private API: ApiService,
    private modalService: NgbModal,
    private dataTableService: DataTableService,
    private toastr: ToastrService
  ) {
    this.router = router;
  }

  ngOnInit(): void {
    this.initialization();
    this.getUsers();
  }
  initialization() {
    this.userForm = this.fb.group({
      userId: [0],
      userFirstName: ['', Validators.compose([Validators.required, Validators.minLength(3)])],
      userLastName: [''],
      userPhone: ['', Validators.compose([Validators.required])],
      userEmail: ['', Validators.compose([Validators.required, emailValidator])],
      roleId: [0],
      isActive: [false],
      password: ['', Validators.required],
      confirmPassword: ['', Validators.required]
    }, { validator: matchingPasswords('password', 'confirmPassword') });


    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 10,
      processing: true,
      responsive: true,
      // Add more options as needed
    };
  }
  public onSubmit(): void {
    if (this.userForm.valid) {
      if (this.userForm.controls['userId'].value == null || this.userForm.controls['userId'].value == "") {
        this.userForm.controls['userId'].setValue(0);
        console.log(this.userForm.controls['userId'].value)
      }
      this.API.postData(this.config.SAVE_USER, this.userForm.value).subscribe({
        next: (data: any) => {
          if (data != null) {
            this.getUsers();
            this.modalRef.close();
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
  }
  public updateUser(): void {
    this.API.postData(this.config.UPDATE_USER, this.userForm.value).subscribe({
      next: (data: any) => {
        if (data != null) {
          this.getUsers();
          this.modalRef.close();
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
  getUsers() {
    this.isLoading = true;
    this.API.getData(this.config.GET_ALL_USERS).pipe(finalize(() => this.isLoading = false)).subscribe({
      next: (data: any) => {
        if (data != null) {
          this.listUsers = data;
          this.rowData = data; // AG Grid row data
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
  getUsersById(userId: number) {
    this.API.getData(this.config.GET_USER_BY_ID + userId).subscribe({
      next: (data: any) => {
        if (data != null) {
          this.isEdit = true;
          this.modalRef = this.modalService.open(this.addModal, {
            centered: false,
            backdrop: 'static',
            keyboard: false,
            size: 'md'
          }); this.userForm.patchValue(data);
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
    if (this.dtElement.dtInstance) {
      this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
        dtInstance.destroy();
        this.dtTrigger.next(null);
      });
    } else {
      this.dtTrigger.next(null);
    }
  }

  ngOnDestroy(): void {
    this.dtTrigger.unsubscribe();
  }

  openAddModal() {
    this.userForm.reset();
    this.isEdit = false;
    this.modalRef = this.modalService.open(this.addModal, {
      centered: false,
      backdrop: 'static',
      keyboard: false,
      size: 'md'
    });
  }
  deleteRecord(userId: number) {
    this.userId = userId;
    this.modalRef = this.modalService.open(this.deleteModal, {
      centered: false,
      backdrop: 'static',
      keyboard: false,
      size: 'md'
    });
  }
  onDeleteConfirmed() {
    const endpoint = `${this.config.DELETE_USER}${this.userId}`;
    this.API.removeData(endpoint).subscribe({
      next: (data: any) => {
        this.getUsers();
        this.modalRef.close();
        this.toastr.success(data.messsage, 'Success');
      },
      error: (error) => {
        this.toastr.error(error?.error?.messsage || 'Delete failed', 'Error');
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

  @HostListener('window:resize')
  onResize() {
    if (this.gridApi) {
      this.gridApi.sizeColumnsToFit();
    }
  }

  onCellClicked(event: any) {
    if (event.colDef.headerName === 'Actions') {
      if (event.event.target.closest('.edit-btn')) {
        this.getUsersById(event.data.userId);
      } else if (event.event.target.closest('.delete-btn')) {
        this.deleteRecord(event.data.userId);
      }
    }
  }
}

export function emailValidator(control: AbstractControl): ValidationErrors | null {
  const emailRegexp = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}$/;
  if (control.value && !emailRegexp.test(control.value)) {
    return { invalidEmail: true };
  }
  return null;
}

export function matchingPasswords(passwordKey: string, passwordConfirmationKey: string) {
  return (group: FormGroup) => {
    let password = group.controls[passwordKey];
    let passwordConfirmation = group.controls[passwordConfirmationKey];
    if (password.value !== passwordConfirmation.value) {
      return passwordConfirmation.setErrors({ mismatchedPasswords: true })
    }
  }
}
