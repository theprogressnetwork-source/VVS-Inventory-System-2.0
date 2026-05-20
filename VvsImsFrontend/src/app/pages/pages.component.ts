import { NgClass } from '@angular/common';
import { Component, HostListener, OnInit, ViewEncapsulation } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { BackTopComponent } from '@components/back-top/back-top.component';
import { BreadcrumbComponent } from '@components/breadcrumb/breadcrumb.component';
import { FooterComponent } from '@components/footer/footer.component';
import { HeaderComponent } from '@components/header/header.component';
import { SidebarComponent } from '@components/sidebar/sidebar.component';
import { Settings, SettingsService } from '@services/settings.service';
declare var jQuery:any;

@Component({
    selector: 'app-pages',
    imports: [
        NgClass,
        HeaderComponent,
        SidebarComponent,
        BreadcrumbComponent,
        RouterOutlet,
        FooterComponent,
        BackTopComponent
    ],
    templateUrl: './pages.component.html',
    styleUrl: './pages.component.scss',
    encapsulation: ViewEncapsulation.None
})
export class PagesComponent implements OnInit {
  public showMenu: boolean = false;
  public showSetting: boolean = false;
  public menus = ['vertical', 'horizontal'];
  public menuOption: string;
  public menuTypes = ['default', 'compact', 'mini'];
  public menuTypeOption: string;
  public settings: Settings;
  
  constructor(public settingsService: SettingsService, public router: Router) {
    this.settings = this.settingsService.settings;
    if (sessionStorage["skin"]) {
      this.settings.theme.skin = sessionStorage["skin"];
    }
  }

  ngOnInit() {
    if (window.innerWidth <= 768) {
      this.settings.theme.showMenu = false;
      this.settings.theme.sideChatIsHoverable = false;
    }
    this.showMenu = this.settings.theme.showMenu;
    this.menuOption = this.settings.theme.menu;
    this.menuTypeOption = this.settings.theme.menuType;
  }

  public chooseMenu(menu: string) {
    this.settings.theme.menu = menu;
  }

  public chooseMenuType(menuType: string) {
    this.settings.theme.menuType = menuType;
    if (menuType == 'mini') {
      jQuery('.menu-item-link').tooltip('enable');
    } else {
      jQuery('.menu-item-link').tooltip('disable');
    }
  }

  public changeTheme(theme: string) {
    this.settings.theme.skin = theme;
    sessionStorage["skin"] = theme;
  }

  ngAfterViewInit() {
    const preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.classList.add('hide');
    }
  }


  @HostListener('window:resize')
  public onWindowResize(): void {
    let showMenu = !this._showMenu();

    if (this.showMenu !== showMenu) {
      this.showMenuStateChange(showMenu);
    }
    this.showMenu = showMenu;
  }

  public showMenuStateChange(showMenu: boolean): void {
    this.settings.theme.showMenu = showMenu;
  }

  private _showMenu(): boolean {
    return window.innerWidth <= 768;
  }

}
