import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { DataTableDirective } from 'angular-datatables';
declare var $: any;

@Injectable({
  providedIn: 'root',
})
export class DataTableService {
  private dtOptions: any = {};
  private dtTrigger: Subject<any> = new Subject();

  constructor() {}

  // Initialize DataTable options
  initDataTableOptions(): void {
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 10,
      serverSide: false,
      processing: true,
      responsive: true,
      dom: '<"top"lBf>rt<"bottom"ip><"clear">',
      buttons: ['copy', 'print', 'excel'],
      info: true,
      autoWidth: false,
      scrollY: 'calc(100vh - 200px)', // Dynamic height based on viewport
      scrollCollapse: true,
      fixedHeader: {
        header: true,
        headerOffset: 0
      },
      language: {
        search: 'Filter:',
        paginate: {
          first: '«',
          last: '»',
          next: '›',
          previous: '‹'
        }
      },
      initComplete: (settings: any, json: any) => {
        // const api = new $.fn.dataTable.Api(settings) as DataTables.Api;
        // api.columns().every(function(this: DataTables.ColumnMethods) {
        //   const column = this;
        //   const header = $(column.header());
          
        //   if (!header.data('title') || header.data('title') !== 'Actions') {
        //     $('<input type="text" placeholder="Search"/>')
        //       .appendTo($(column.header()).empty())
        //       .on('keyup change', function(this: HTMLInputElement) {
        //         if (column.search() !== this.value) {
        //           column.search(this.value).draw();
        //         }
        //       });
        //   } else {
        //     header.html('Actions');
        //   }
        // });
      },
      columnDefs: [{
        targets: -1,
        title: 'Actions',
        orderable: false,
        className: 'action-column'
      }]
    };
  }

  // Rerender DataTable
  rerenderTable(dtElement: DataTableDirective): void {
    dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
      dtInstance.destroy();
      this.dtTrigger.next(null);
    });
  }

  // Expose dtTrigger
  getDtTrigger() {
    return this.dtTrigger;
  }

  // Provide options for the DataTable
  getDtOptions() {
    return this.dtOptions;
  }
}
