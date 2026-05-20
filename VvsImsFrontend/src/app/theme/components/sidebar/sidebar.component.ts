import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { VerticalMenuComponent } from '@components/menu/vertical-menu/vertical-menu.component';
import { Menu } from '@models/menu.model';
import { MenuService } from '@services/menu.service';
import { Settings, SettingsService } from '@services/settings.service';

@Component({
    selector: 'app-sidebar',
    imports: [
        VerticalMenuComponent
    ],
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class SidebarComponent implements OnInit {
  public settings: Settings;
  public menuItems: Array<any>;
  
  constructor(public settingsService: SettingsService, public menuService: MenuService) {
    this.settings = this.settingsService.settings;
    this.menuItems = this.menuService.getVerticalMenuItems();
  }

  ngOnInit() {
    const userMenuItems = sessionStorage["userMenuItems"];
    if (!userMenuItems) {
      return;
    }
    let ids = JSON.parse(userMenuItems);
    let newArr: Menu[] = [];
    ids.forEach((id: any) => {
      let newMenuItem = this.menuItems.filter(mail => mail.id == id);
      newArr.push(newMenuItem[0]);
    });
    this.menuItems = newArr;
  }

  public closeSubMenus() {
    const menu = document.querySelector("#menu0");
    if (!menu) {
      return;
    }
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
