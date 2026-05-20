import { Inject } from '@angular/core';
import { Component, OnInit, ViewEncapsulation, ElementRef, Input } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Menu } from '@models/menu.model';
import { ApiService } from '@services/api.service';
import { API_ROUTES, API_ROUTES_TOKEN } from '@services/app.global';
import { MenuService } from '@services/menu.service';
import { Settings, SettingsService } from '@services/settings.service';
declare var jQuery: any;

@Component({
  selector: 'app-horizontal-menu',
  standalone: true,
  templateUrl: './horizontal-menu.component.html',
  styleUrls: ['./horizontal-menu.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class HorizontalMenuComponent implements OnInit {
  @Input('menuItems') menuItems: Menu[];
  public settings: Settings;
  constructor(public settingsService: SettingsService,
    private menuService: MenuService,
    private router: Router,
    private elementRef: ElementRef,
    private API: ApiService,
    @Inject(API_ROUTES_TOKEN) private config: typeof API_ROUTES) {

    this.settings = this.settingsService.settings;
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        window.scrollTo(0, 0);
        let activeLink: any = this.menuService.getActiveLink(this.menuItems);
        this.menuService.setActiveLink(this.menuItems, activeLink);
        jQuery('.tooltip').tooltip('hide');
      }
    });
  }
  ngOnInit() {
    let menu_wrapper = this.elementRef.nativeElement.children[0];
    this.menuService.createMenu(this.menuItems, menu_wrapper, 'horizontal');

    if (this.settings.theme.menuType == 'mini')
      jQuery('.menu-item-link').tooltip();
    // this.loadAllCounts().then((counts) => {

    //   this.menuItems.forEach(item => {
    //     if (item.title === 'Unsold') {
    //       item.count = counts.unsold;
    //     }
    //     if (item.title === 'Outgoing') {
    //       item.count = counts.outgoing;
    //       item.count2 = counts.pending;
    //     }
    //   });


    // });
  }


  ngAfterViewInit() {
    let activeLink: any = this.menuService.getActiveLink(this.menuItems);
    this.menuService.setActiveLink(this.menuItems, activeLink);
  }

  loadAllCounts(): Promise<{ unsold: number, outgoing: number, pending: number }> {
    return new Promise((resolve) => {
      this.API.getData(this.config.GET_PRODUCTS).subscribe({
        next: (data: any) => {
          if (!data) return resolve({ unsold: 0, outgoing: 0, pending: 0 });

          const unsold = data.filter((x: any) => x.orderNo == null).length;
          const outgoing = data.filter((x: any) => x.isShipped === true && x.orderNo != null).length;
          const pending = data.filter((x: any) => x.isShipped === false && x.orderNo != null).length;

          resolve({ unsold, outgoing, pending });
        },
        error: () => resolve({ unsold: 0, outgoing: 0, pending: 0 })
      });
    });
  }
}