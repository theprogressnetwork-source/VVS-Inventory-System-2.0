import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NotificationService } from '../../../services/notification.service'; // ensure path correct

import { trigger, state, style, transition, animate } from '@angular/animations';
import { Settings, SettingsService } from '@services/settings.service';
import { MenuService } from '@services/menu.service';
import { AuthService } from '@services/auth.service';
import { NgClass } from '@angular/common';
import { UserMenuComponent } from '@components/user-menu/user-menu.component';
import { HorizontalMenuComponent } from '@components/menu/horizontal-menu/horizontal-menu.component';
import { VerticalMenuComponent } from '@components/menu/vertical-menu/vertical-menu.component';
import { NotificationBellComponent } from '@components/notification-bell/notification-bell.component';

@Component({
    selector: 'app-header',
    imports: [
        NgClass,
        UserMenuComponent,
        HorizontalMenuComponent,
        VerticalMenuComponent,
        NotificationBellComponent,
        RouterLink
    ],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        trigger('showInfo', [
            state('1', style({ transform: 'rotate(180deg)' })),
            state('0', style({ transform: 'rotate(0deg)' })),
            transition('1 => 0', animate('400ms')),
            transition('0 => 1', animate('400ms'))
        ])
    ]
})
export class HeaderComponent {
  public showHorizontalMenu: boolean = true;
  public showInfoContent: boolean = false;
  public settings: Settings;
  public menuItems: Array<any>;


  constructor(
    public settingsService: SettingsService,
    public menuService: MenuService,
    private authService: AuthService,
    private notifSvc: NotificationService,
    private router: Router,
    private elRef: ElementRef
  ) {
    this.settings = this.settingsService.settings;
    this.menuItems = this.menuService.getHorizontalMenuItems();
  }






  public closeSubMenus() {
    let menu = document.querySelector("#menu0");
    if (menu) {
      for (let i = 0; i < menu.children.length; i++) {
        let child = menu.children[i].children[1];
        if (child) {
          if (child.classList.contains('show')) {
            child.classList.remove('show');
            menu.children[i].children[0].classList.add('collapsed');
          }
        }
      }
    }
  }

  public onLogout(event: Event): void {
    event.preventDefault();
    this.authService.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  @HostListener('window:resize')
  public onWindowResize(): void {
    if (window.innerWidth <= 768) {
      this.showHorizontalMenu = false;
    }
    else {
      this.showHorizontalMenu = true;
    }
  }
}
