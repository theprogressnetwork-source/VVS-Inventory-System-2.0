// ============================================================
// VVS IMS — Global Variable Service (Migrated)
// FIX: Replaced serverURL/serverURLLogin with environment.apiUrl
// ============================================================
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Menu } from '../common/models/menu.model';

@Injectable({
  providedIn: 'root',
})
export class GvarService {
  apiUrl: string = environment.apiUrl;

  locationID: number;

  constructor() { }
}
