import { Inject } from '@angular/core';
import { Component, OnInit, ViewEncapsulation, Input } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Menu } from '@models/menu.model';
import { ApiService } from '@services/api.service';
import { API_ROUTES, API_ROUTES_TOKEN } from '@services/app.global';
import { MenuService } from '@services/menu.service';
import { Settings, SettingsService } from '@services/settings.service';
import { NgScrollbarModule } from 'ngx-scrollbar';
declare var jQuery: any;

@Component({
  selector: 'app-vertical-menu',
  imports: [
    NgScrollbarModule
  ],
  templateUrl: './vertical-menu.component.html',
  styleUrls: ['./vertical-menu.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class VerticalMenuComponent implements OnInit {
  @Input('menuItems') menuItems: Menu[];
  public settings: Settings;

  constructor(private API: ApiService, @Inject(API_ROUTES_TOKEN) private config: typeof API_ROUTES, public settingsService: SettingsService, private menuService: MenuService, private router: Router) {
    this.settings = this.settingsService.settings;
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        window.scrollTo(0, 0);
        let activeLink: any = this.menuService.getActiveLink(this.menuItems);
        this.menuService.setActiveLink(this.menuItems, activeLink);
        jQuery('.tooltip').tooltip('hide');
        if (window.innerWidth <= 768) {
          this.settings.theme.showMenu = false;
        }
      }
    });
  }

  ngOnInit() {
    let menu_wrapper = document.getElementById('vertical-menu');
    this.menuService.createMenu(this.menuItems, menu_wrapper, 'vertical');

    if (this.settings.theme.menuType == 'mini')
      jQuery('.menu-item-link').tooltip();

    // this.loadAllCounts().then((counts) => {
    //   this.menuItems.forEach(item => {
    //     if (item.title === 'Unsold') {
    //       item.count = counts.unsold;
    //     }
    //     if (item.title === 'Outgoing') {
    //       item.count = counts.outgoing;
    //     }
    //     if (item.title === 'Sold') {
    //       item.count = counts.sold;
    //     }
    //      if (item.title === 'Pending') {
    //       item.count = counts.pending;
    //     }
    //   });

    // });
  }

  ngAfterViewInit() {
    this.menuService.showActiveSubMenu(this.menuItems);
    let activeLink: any = this.menuService.getActiveLink(this.menuItems);
    this.menuService.setActiveLink(this.menuItems, activeLink);
  }

  loadAllCounts(): Promise<{ unsold: number, outgoing: number, pending: number, sold: number }> {
    return new Promise((resolve) => {
      this.API.getData(this.config.GET_PRODUCTS).subscribe({
        next: (data: any) => {
          if (!data) return resolve({ unsold: 0, outgoing: 0, pending: 0, sold: 0 });

          const unsold = data.filter((x: any) => x.orderNo == null).length;
          const outgoing = data.filter((x: any) => x.orderStatus == 'Order received').length;
          const pending = data.filter((x: any) => x.orderStatus == 'Pending').length;
          const sold = data.filter((x: any) => x.orderStatus == 'Sold').length;

          resolve({ unsold, outgoing, pending, sold });
        },
        error: () => resolve({ unsold: 0, outgoing: 0, pending: 0, sold: 0 })
      });
    });
  }



}