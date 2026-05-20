import { Injectable } from '@angular/core';

export class Settings {
  constructor(public name: string,
              public title: string,
              public theme:{
                  menu: string,
                  menuType: string,
                  showMenu: boolean,
                  navbarIsFixed: boolean,
                  footerIsFixed: boolean,
                  sidebarIsFixed: boolean,
                  showSideChat: boolean,
                  sideChatIsHoverable: boolean,
                  skin:string
              }) { }
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  public settings = new Settings(
    'IMS',
    'Angular Admin Template with Bootstrap 4',
    {
      menu: 'vertical', //horizontal , vertical
      menuType: 'default', //default, compact, mini
      showMenu: true,
      navbarIsFixed: true,
      footerIsFixed: false,
      sidebarIsFixed: true,
      showSideChat: false,
      sideChatIsHoverable: true,
      skin: 'blue'  //light , dark, blue, green, combined, purple, orange, brown, grey, pink          
    }
  )
}
