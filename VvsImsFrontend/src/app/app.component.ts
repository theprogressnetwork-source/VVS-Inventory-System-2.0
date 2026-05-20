import { NgClass } from '@angular/common';
import { Component, HostListener, OnDestroy } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '@services/auth.service';
import { IdleService } from '@services/idle.service';
import { Settings, SettingsService } from '@services/settings.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    NgClass
  ],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnDestroy {
  public settings: Settings;
  private preloaderTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(
    public settingsService: SettingsService,
    public translate: TranslateService,
    private idleService: IdleService,
    private authService: AuthService,
    private router: Router
  ) {
    this.settings = this.settingsService.settings;
    translate.addLangs(['en', 'de', 'fr', 'ru', 'tr']);
    translate.setDefaultLang('en');
    translate.use('en');
  }

  ngOnInit(): void {
    this.dismissPreloader();
    this.idleService.resetIdleTimer(); // Start session monitoring
    this.enforceAuthOnProtectedUrl();
  }

  ngOnDestroy(): void {
    if (this.preloaderTimeoutId) {
      clearTimeout(this.preloaderTimeoutId);
    }
  }

  // ── Dismiss the static #preloader from index.html ──────────
  // FIX: Preloader was only dismissed by LoginComponent, which
  // may never render (lazy-load failure, route hang, etc.).
  // Now dismissed here (AppComponent always renders) with a
  // three-second safety timeout as a fallback.
  private dismissPreloader(): void {
    const hide = () => {
      const preloader = document.getElementById('preloader');
      if (preloader) {
        preloader.classList.add('hide');
      }
    };

    // Dismiss immediately — AppComponent is the first component to render
    hide();

    // Safety timeout: force-dismiss after three seconds in case
    // the initial call was too early (before DOM paint)
    this.preloaderTimeoutId = setTimeout(hide, 3000);
  }

  @HostListener('window:pageshow')
  onPageShow(): void {
    this.enforceAuthOnProtectedUrl();
  }

  @HostListener('window:popstate')
  onPopState(): void {
    this.enforceAuthOnProtectedUrl();
  }

  private enforceAuthOnProtectedUrl(): void {
    const path = window.location.pathname.toLowerCase();
    const isProtectedRoute = path.includes('/view');
    if (isProtectedRoute && !this.authService.hasValidSession()) {
      this.authService.logout();
      this.router.navigate(['/login'], { replaceUrl: true });
    }
  }
}
