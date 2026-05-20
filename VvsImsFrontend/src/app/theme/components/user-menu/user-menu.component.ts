// ============================================================
// VVS IMS — User Menu Component (Migrated)
// FIX: Replaced localStorage reads with AuthService observables
// ============================================================
import { Component, ViewEncapsulation, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-user-menu',
  templateUrl: './user-menu.component.html',
  styleUrls: ['./user-menu.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class UserMenuComponent implements OnInit, OnDestroy {
  userName: string = 'User';
  roleName: string = 'User';

  private subs: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // ── Subscribe to in-memory auth state (NOT localStorage) ──
    this.subs.push(
      this.authService.userName$.subscribe(
        (name) => (this.userName = name || 'User')
      ),
      this.authService.userRole$.subscribe(
        (role) => (this.roleName = role || 'User')
      )
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  onLogout(event: Event): void {
    event.preventDefault();
    this.authService.logout().subscribe({
      complete: () => {
        this.router.navigate(['/login'], { replaceUrl: true });
      },
    });
  }
}
