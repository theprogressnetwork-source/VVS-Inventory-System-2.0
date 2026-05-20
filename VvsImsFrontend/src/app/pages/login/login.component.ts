// ============================================================
// VVS IMS — Login Component (Migrated)
// CRITICAL-009 FIX: No more localStorage token writes.
// Access token stored in-memory via AuthService.
// Refresh token handled by httpOnly cookie (server-set).
// ============================================================
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '@services/auth.service';
import { API_ROUTES } from '@services/app.global';
import { GvarService } from '@services/gvar.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  public form: FormGroup;
  public userEmail: FormControl;
  public password: FormControl;
  isSubmitting = false;

  constructor(
    public router: Router,
    public fb: FormBuilder,
    private authService: AuthService,
    private GV: GvarService,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group({
      userEmail: [
        null,
        Validators.compose([Validators.required, emailValidator]),
      ],
      password: [
        null,
        Validators.compose([Validators.required, Validators.minLength(6)]),
      ],
    });

    this.userEmail = this.form.controls['userEmail'] as FormControl;
    this.password = this.form.controls['password'] as FormControl;
  }

  public onSubmit(values: any): void {
    if (this.form.valid) {
      this.isSubmitting = true;

      this.authService
        .login({
          email: values['userEmail'],
          password: values['password'],
        })
        .pipe(finalize(() => (this.isSubmitting = false)))
        .subscribe({
          next: (data) => {
            // ── Token is now stored in-memory by AuthService ──
            // ── Refresh token is set as httpOnly cookie by backend ──
            this.router.navigate(['/view'], { replaceUrl: true });
            this.toastr.success(data.message || 'Login successful', 'Success');
          },
          error: (error) => {
            this.toastr.error(
              error?.error?.message || 'Login failed',
              'Error'
            );
          },
        });
    }
  }

  ngAfterViewInit() {
    const preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.classList.add('hide');
    }
  }
}

export function emailValidator(
  control: AbstractControl
): ValidationErrors | null {
  const emailRegexp = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
  if (control.value && !emailRegexp.test(control.value)) {
    return { invalidEmail: true };
  }
  return null;
}
