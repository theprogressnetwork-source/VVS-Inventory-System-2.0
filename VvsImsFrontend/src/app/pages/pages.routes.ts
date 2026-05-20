import { Routes } from '@angular/router';
import { PagesComponent } from './pages.component';
import { authGuard } from '@services/auth.guard';

export const routes: Routes = [
    {
        path: '',
        component: PagesComponent,
        canActivate: [authGuard],
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./dashboard/dashboard.component').then(c => c.DashboardComponent),
                data: { breadcrumb: 'Dashboard' }
            },
            {
                path: '',
                loadComponent: () => import('./inventory/inventory.component').then(c => c.InventoryComponent),
                data: { breadcrumb: 'Inventory' }
            },
            {
                path: 'inventory',
                loadComponent: () => import('./inventory/inventory.component').then(c => c.InventoryComponent),
                data: { breadcrumb: 'Inventory' }
            },
            {
                path: 'offer',
                loadComponent: () => import('./offer/offer.component').then(c => c.OfferComponent),
                data: { breadcrumb: 'Offers' }
            },
            {
                path: 'unsold',
                loadComponent: () => import('./input/input.component').then(c => c.InputComponent),
                data: { breadcrumb: 'Unsold Products' }
            },
            {
                path: 'unsold/:id',
                loadComponent: () => import('./input/input.component').then(c => c.InputComponent),
                data: { breadcrumb: 'Input Products' }
            },
            {
                path: 'stock',
                loadComponent: () => import('./stock/stock.component').then(c => c.StockComponent),
                data: { breadcrumb: 'Unsold Products' }
            },
            {
                path: 'outgoing',
                loadComponent: () => import('./outgoing-new/outgoing-new.component').then(c => c.OutgoingNewComponent),
                data: { breadcrumb: 'Outgoing Products' }
            },
            {
                path: 'outgoing/:id',
                loadComponent: () => import('./outgoing/outgoing.component').then(c => c.OutgoingComponent),
                data: { breadcrumb: 'Outgoing Products' }
            },
            {
                path: 'pending',
                loadComponent: () => import('./pending/pending.component').then(c => c.PendingProductsComponent),
                data: { breadcrumb: 'Pending Products' }
            },
            {
                path: 'blank',
                loadComponent: () => import('./blank/blank.component').then(c => c.BlankComponent),
                data: { breadcrumb: 'Blank page' }
            },
            {
                path: 'search',
                loadComponent: () => import('./search/search.component').then(c => c.SearchComponent),
                data: { breadcrumb: 'Search' }
            },
            {
                path: 'register',
                loadComponent: () => import('./register/register.component').then(c => c.RegisterComponent),
                data: { breadcrumb: 'Users' }
            },
            {
                path: 'sku',
                loadComponent: () => import('./sku/sku.component').then(c => c.SKUComponent),
                data: { breadcrumb: 'SKU' }
            },
            {
                path: 'models',
                loadComponent: () => import('./master/models/models.component').then(c => c.ModelsComponent),
                data: { breadcrumb: 'Models' }
            },
            {
                path: 'storage',
                loadComponent: () => import('./master/storage/storage.component').then(c => c.StorageComponent),
                data: { breadcrumb: 'Storage' }
            },
            {
                path: 'colors',
                loadComponent: () => import('./master/colors/colors.component').then(c => c.ColorsComponent),
                data: { breadcrumb: 'Colors' }
            },
            {
                path: 'grades',
                loadComponent: () => import('./master/grades/grades.component').then(c => c.GradesComponent),
                data: { breadcrumb: 'Grades' }
            },
            {
                path: 'channels',
                loadComponent: () => import('./channels/channels.component').then(c => c.ChannelsComponent),
                data: { breadcrumb: 'Channels' }
            },
            {
                path: 'skumapping',
                loadComponent: () => import('./sku-mapping/sku-mapping.component').then(c => c.SkuMappingComponent),
                data: { breadcrumb: 'SKU Mapping' }
            },
            {
                path: 'notifications',
                loadComponent: () => import('./notifications/notifications.component').then(c => c.NotificationsComponent),
                data: { breadcrumb: 'Notifications' }

            },
            {
                path: 'notifications/:id',
                loadComponent: () => import('./notifications/notifications.component').then(c => c.NotificationsComponent),
                data: { breadcrumb: 'Notifications' }

            },
            {
                path: 'report',
                loadComponent: () => import('./Reports/product-variants/product-variants.component').then(c => c.ProductVariantsComponent),
                data: { breadcrumb: 'Report' }

            },
            {
                path: 'offers',
                loadComponent: () => import('./Reports/offers/offers.component').then(c => c.OffersComponent),
                data: { breadcrumb: 'All Offers' }

            },
            {
                path: 'inputform',
                loadComponent: () => import('./input-form/input-form.component').then(c => c.InputFormComponent),
                data: { breadcrumb: 'Input Products' }
            },
            {
                path: 'sold',
                loadComponent: () => import('./sold/sold.component').then(c => c.SoldComponent),
                data: { breadcrumb: 'Sold Products' }
            },
            {
                path: 'pendingstock',
                loadComponent: () => import('./pending-stock/pending-stock.component').then(c => c.PendingStockComponent),
                data: { breadcrumb: 'Pending Products' }
            },
            {
                path: 'chatbot',
                loadComponent: () => import('./chatbot/chatbot.component').then(c => c.ChatbotComponent),
                data: { breadcrumb: 'Chatbot' }
            },
            {
                path: 'orderreceived',
                loadComponent: () => import('./orderreceived/orderreceived.component').then(c => c.OrderreceivedComponent),
                data: { breadcrumb: 'Order Received' }
            },
            {
                path: 'serialinputform',
                loadComponent: () => import('./input-form-with-serial-no/input-form-with-serial-no.component').then(c => c.SerialInputFormComponent),
                data: { breadcrumb: 'Non-IMEI Input Products' }
            },
        ]
    }
]  




