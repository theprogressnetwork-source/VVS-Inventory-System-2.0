import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-not-found',
    imports: [],
    templateUrl: './not-found.component.html',
    styleUrl: './not-found.component.scss'
})
export class NotFoundComponent {
  router: Router;

  constructor(router: Router) {
    this.router = router;
  }

  searchResult(): void {
    this.router.navigate(['/search']);
  }

  ngAfterViewInit() {
    const preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.classList.add('hide');
    }
  }
}
