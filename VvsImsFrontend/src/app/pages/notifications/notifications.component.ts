import { Inject } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { NotificationService, Notification } from '@services/notification.service';
import { API_ROUTES, API_ROUTES_TOKEN } from '@services/app.global';
import { ApiService } from '@services/api.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit {
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  selectedNotification: Notification | null = null;
  loading = true;
  activeFilter: string = 'all';
  searchTerm: string = '';

  filters = [
    { key: 'all', label: 'All', count: 0 },
    { key: 'unread', label: 'Unread', count: 0 },
    { key: 'order', label: 'Orders', count: 0 },
    // { key: 'inventory', label: 'Inventory', count: 0 },
    // { key: 'system', label: 'System', count: 0 }
  ];

  listInventory: any[] = [];
  constructor(
    private notificationService: NotificationService,
    private router: Router,
    private route: ActivatedRoute,
    @Inject(API_ROUTES_TOKEN) private config: typeof API_ROUTES,
    private API: ApiService,
  ) { }

  ngOnInit(): void {
    this.loadNotifications();
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.openNotificationDetails(parseInt(params['id']));
      }
    });
  }

  loadNotifications(): void {
    this.loading = true;
    this.notificationService.getAllNotifications(100).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.notifications = res.data;
          this.applyFilters();
          this.updateFilterCounts();
        }
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading notifications:', error);
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.notifications];

    // Apply type filter
    if (this.activeFilter !== 'all') {
      if (this.activeFilter === 'unread') {
        filtered = filtered.filter(n => !n.isRead);
      } else {
        filtered = filtered.filter(n => n.type.toLowerCase() === this.activeFilter);
      }
    }

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(term) ||
        n.message.toLowerCase().includes(term) ||
        (n.relatedEntity && n.relatedEntity.toLowerCase().includes(term))
      );
    }

    this.filteredNotifications = filtered;
  }

  updateFilterCounts(): void {
    this.filters[0].count = this.notifications.length;
    this.filters[1].count = this.notifications.filter(n => !n.isRead).length;
    this.filters[2].count = this.notifications.filter(n => n.type === 'Order').length;
    // this.filters[3].count = this.notifications.filter(n => n.type === 'Inventory').length;
    // this.filters[4].count = this.notifications.filter(n => n.type === 'System').length;
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.applyFilters();
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.applyFilters();
  }

  openNotificationDetails(notification: Notification | number): void {
    if (typeof notification === 'number') {
      const found = this.notifications.find(n => n.id === notification);
      if (found) {
        this.selectedNotification = found;
        this.markAsRead(found);
      }
    } else {
      this.selectedNotification = notification;
      this.markAsRead(notification);
    }
  }

  closeNotificationDetails(): void {
    this.selectedNotification = null;
    this.router.navigate(['/view/notifications']);
  }

  markAsRead(notification: Notification): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe();
      notification.isRead = true;
      this.updateFilterCounts();
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.isRead = true);
        this.updateFilterCounts();
        this.applyFilters();
      }
    });
  }

  refreshNotifications(): void {
    this.loadNotifications();
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'Order': return 'fa fa-shopping-cart text-primary';
      case 'Inventory': return 'fa fa-boxes text-warning';
      case 'System': return 'fa fa-cog text-info';
      default: return 'fa fa-bell text-secondary';
    }
  }

  getNotificationBadgeClass(type: string): string {
    switch (type) {
      case 'Order': return 'bg-primary';
      case 'Inventory': return 'bg-warning text-dark';
      case 'System': return 'bg-info';
      default: return 'bg-secondary';
    }
  }

  getFilterIcon(key: string): string {
    switch (key) {
      case 'all': return 'fa fa-list text-primary';
      case 'unread': return 'fa fa-envelope text-warning';
      case 'order': return 'fa fa-shopping-cart text-success';
      case 'inventory': return 'fa fa-boxes text-info';
      case 'system': return 'fa fa-cog text-secondary';
      default: return 'fa fa-circle text-muted';
    }
  }

  getFilterBadgeClass(key: string): string {
    switch (key) {
      case 'all': return 'bg-primary';
      case 'unread': return 'bg-warning text-dark';
      case 'order': return 'bg-success';
      case 'inventory': return 'bg-info';
      case 'system': return 'bg-secondary';
      default: return 'bg-dark';
    }
  }
}