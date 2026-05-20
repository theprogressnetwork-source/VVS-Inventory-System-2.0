import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NotificationService, Notification } from '@services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss']
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  notificationsOpen = false;
  notifications: Notification[] = [];
  unreadCount = 0;
  loading = false;

  private subscriptions: Subscription[] = [];

  constructor(
    public notificationService: NotificationService,
    private router: Router
  ) {}
ngOnInit(): void {
    this.notificationService.refreshAll();
    
    this.subscriptions.push(
      this.notificationService.notifications$.subscribe(
        notifications => this.notifications = notifications
      ),
      
      this.notificationService.unreadCount$.subscribe(
        count => this.unreadCount = count
      )
    );

    this.notificationService.startAutoRefresh();
  }

  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation();
    this.notificationsOpen = !this.notificationsOpen;
    if (this.notificationsOpen) {
      this.notificationService.refreshAll();
    }
  }

  openNotification(notification: Notification, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe();
    }

    this.handleNotificationClick(notification);
  }

  markAllRead(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.notificationService.markAsRead().subscribe();
  }

  openAllNotifications(): void {
    this.notificationsOpen = false;
    this.router.navigate(['/view/notifications']);
  }

  refreshNotifications(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.loading = true;
    this.notificationService.refreshAll();
    setTimeout(() => this.loading = false, 1000);
  }

  private handleNotificationClick(notification: Notification): void {
    this.notificationsOpen = false;
    
    switch (notification.type) {
      case 'Order':
        this.router.navigate(['/view/notifications', notification.relatedEntity]);
        break;
      case 'Inventory':
        this.router.navigate(['/view/inventory', notification.relatedEntity]);
        break;
      default:
        console.log('Notification clicked:', notification);
    }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'Order': return 'fa fa-shopping-cart text-primary';
      case 'Inventory': return 'fa fa-boxes text-warning';
      case 'System': return 'fa fa-cog text-info';
      default: return 'fa fa-bell text-secondary';
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.notificationsOpen) {
      this.notificationsOpen = false;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}