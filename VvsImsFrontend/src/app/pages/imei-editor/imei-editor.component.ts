import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ICellRendererAngularComp } from 'ag-grid-angular';

@Component({
  selector: 'app-imei-editor',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './imei-editor.component.html',
})
export class ImeiCellRendererComponent implements ICellRendererAngularComp {
  @ViewChild('imeiInput') imeiInput!: ElementRef;

  params: any;
  newImei = '';
  imeiList: string[] = [];
  filteredImeis: string[] = [];
  showSuggestionList = false;
  dropdownAbove = false;

  agInit(params: any): void {
    this.params = params;

    this.newImei = params.value || '';
    this.imeiList = params.context.filteredImeis || [];

    this.filterImeis();
  }

  afterGuiAttached(): void {
    setTimeout(() => {
      this.imeiInput.nativeElement.focus();
      this.imeiInput.nativeElement.select();
    });
  }

  getValue() {
    return this.newImei;
  }

  refresh(): boolean {
    return false;
  }

  // ========== FILTER ==========
  filterImeis() {
    const search = this.newImei.trim().toLowerCase();

    this.filteredImeis = search
      ? this.imeiList.filter(i => i.toLowerCase().includes(search)).slice(0, 10)
      : this.imeiList.slice(0, 10);

    this.showSuggestionList = true;
  }

  // ========== SELECT ==========
  // selectImei(imei: string) {
  //   this.newImei = imei;
  //   this.showSuggestionList = false;
  //   this.params.stopEditing();
  // }

  // ========== ENTER ==========
  // onEnter() {
  //   this.showSuggestionList = false;

  //   if (this.imeiList.includes(this.newImei.trim())) {
  //     this.params.stopEditing();
  //   } else {
  //     this.newImei = '';
  //     this.filterImeis();
  //   }
  // }

  // ========== OUTSIDE CLICK ==========
  @HostListener('document:click', ['$event'])
  clickOutside(event: MouseEvent) {
    if (!this.params.eGridCell.contains(event.target)) {
      this.showSuggestionList = false;
    }
  }

  onInput() {
    this.filterImeis();
  }

  // ========== FIX: Always calculate & correct dropdown position ==========
  openSuggestions() {
    this.filterImeis();
    this.adjustDropdownPosition();

    this.showSuggestionList = true;

    // ⭐ Ensures dropdown ALWAYS sticks to current cell (Fix)
    const wrapper = this.params.eGridCell.querySelector('.imei-wrapper') as HTMLElement;
    if (wrapper) {
      wrapper.style.position = 'relative';
      wrapper.style.zIndex = '99999';
    }
  }

adjustDropdownPosition() {
  if (!this.params || !this.params.eGridCell) return;

  const cellRect = this.params.eGridCell.getBoundingClientRect();
  const gridBody = document.querySelector('.ag-center-cols-container'); // ya grid ka parent container

  if (!gridBody) return;
  const gridRect = gridBody.getBoundingClientRect();

  const spaceBelow = gridRect.bottom - cellRect.bottom;
  const spaceAbove = cellRect.top - gridRect.top;

  // Agar neeche kam jaga hai → dropdown upar show hoga
  this.dropdownAbove = spaceBelow < 150 && spaceAbove > spaceBelow;
}


  selectImei(imei: string) {
  this.newImei = imei;
  this.showSuggestionList = false;

  // Update AG-Grid rowData immediately
  this.params.node.setDataValue('newImei', imei);
  this.params.api.stopEditing();
}

onEnter() {
  this.showSuggestionList = false;

  if (this.imeiList.includes(this.newImei.trim())) {
    this.params.node.setDataValue('newImei', this.newImei.trim());
    this.params.api.stopEditing();
  } else {
    this.newImei = '';
    this.filterImeis();
  }
}

}
