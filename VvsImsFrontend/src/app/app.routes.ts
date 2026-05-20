import { Routes } from '@angular/router';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
    {
        path: 'view',
        canActivate: [authGuard],
        loadChildren: () => import('./pages/pages.routes').then(p => p.routes)
    },
    {
        path: '',
        loadComponent: () => import('./pages/login/login.component').then(c => c.LoginComponent),
    },
    {
        path: 'login',
        loadComponent: () => import('./pages/login/login.component').then(c => c.LoginComponent),
    },
    {
        path: '**',
        loadComponent: () => import('./pages/errors/not-found/not-found.component').then(c => c.NotFoundComponent)
    }
]; 
