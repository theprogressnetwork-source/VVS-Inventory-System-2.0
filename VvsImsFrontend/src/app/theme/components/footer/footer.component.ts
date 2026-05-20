import { Component, ViewEncapsulation } from '@angular/core';
import { Settings, SettingsService } from '@services/settings.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class FooterComponent {
  public settings: Settings;
  constructor(public settingsService: SettingsService) {
    this.settings = this.settingsService.settings;
  }
}
