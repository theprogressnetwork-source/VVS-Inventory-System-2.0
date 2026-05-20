// ============================================================
// VVS IMS — Notification Service (Migrated)
// FIX: Replaced serverURL/serverURLLogin with environment.apiUrl
// FIX: Added withCredentials: true for cookie-based auth
// ============================================================
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, interval } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  relatedEntity: string;
  isRead: boolean;
  createdAt: string;
  timeAgo: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly API_URL = environment.apiUrl;
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);

  public notifications$ = this.notificationsSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) { }

  // Get ALL notifications (no user restrictions)
  getAllNotifications(limit: number = 50): Observable<any> {
    return this.http
      .get(`${this.API_URL}/notifications/all?limit=${limit}`, {
        withCredentials: true,
      })
      .pipe(
        tap((res: any) => {
          if (res.success) {
            const notifications = this.processNotifications(res.data);
            this.notificationsSubject.next(notifications);
          }
        })
      );
  }

  // Get unread count (general)
  getUnreadCount(): Observable<any> {
    return this.http
      .get(`${this.API_URL}/notifications/unread-count`, {
        withCredentials: true,
      })
      .pipe(
        tap((res: any) => {
          if (res.success) {
            this.unreadCountSubject.next(res.count);
          }
        })
      );
  }

  // Mark as read
  markAsRead(notificationId?: number): Observable<any> {
    const payload = notificationId ? { notificationId } : {};
    return this.http
      .post(`${this.API_URL}/notifications/mark-read`, payload, {
        withCredentials: true,
      })
      .pipe(
        tap(() => {
          if (notificationId) {
            const notifications = this.notificationsSubject.value.map((n) =>
              n.id === notificationId ? { ...n, isRead: true } : n
            );
            this.notificationsSubject.next(notifications);
          } else {
            const notifications = this.notificationsSubject.value.map((n) => ({
              ...n,
              isRead: true,
            }));
            this.notificationsSubject.next(notifications);
          }
          this.getUnreadCount().subscribe();
        })
      );
  }

  // Create notification (for testing)
  createNotification(notificationData: any): Observable<any> {
    return this.http.post(
      `${this.API_URL}/notifications/create`,
      notificationData,
      { withCredentials: true }
    );
  }

  // Start auto refresh (every 15 minutes)
  startAutoRefresh(): void {
    interval(15 * 60 * 1000)
      .pipe(switchMap(() => this.getUnreadCount()))
      .subscribe();
  }

  // Get user-specific notifications - using /user endpoint
  getUserNotifications(limit: number = 50): Observable<any> {
    return this.http
      .get(`${this.API_URL}/notifications/user?limit=${limit}`, {
        withCredentials: true,
      })
      .pipe(
        tap((res: any) => {
          if (res.success) {
            const notifications = this.processNotifications(res.data);
            this.notificationsSubject.next(notifications);
          }
        })
      );
  }

  // Manual refresh
  refreshNotifications(): void {
    this.getUnreadCount().subscribe();
    this.getUserNotifications().subscribe();
  }

  // Alias for notification-bell.component.ts compatibility
  refreshAll(): void {
    this.refreshNotifications();
  }

  private processNotifications(data: any[]): Notification[] {
    if (!data) return [];
    return data.map((item) => ({
      id: item.id,
      title: item.title || 'Notification',
      message: item.message || '',
      type: item.type || 'info',
      relatedEntity: item.relatedEntity || '',
      isRead: item.isRead || false,
      createdAt: item.createdAt || new Date().toISOString(),
      timeAgo: item.timeAgo || 'Just now',
    }));
  }
}
