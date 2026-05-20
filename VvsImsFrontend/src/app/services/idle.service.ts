import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Idle, DEFAULT_INTERRUPTSOURCES } from '@ng-idle/core';
import { Keepalive } from '@ng-idle/keepalive';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class IdleService {
    private readonly IDLE_TIME = 1 * 60 * 60;
    private readonly TIMEOUT_TIME = 60;       // 1 minute after idle
    private readonly SESSION_EXPIRE_ALERT = true;

    constructor(
        private idle: Idle,
        private keepalive: Keepalive,
        private router: Router,
        private authService: AuthService
    ) {
        this.configureIdleSettings();
    }

    private configureIdleSettings(): void {
        // Set idle timeout
        this.idle.setIdle(this.IDLE_TIME);           // Time before considered idle
        this.idle.setTimeout(this.TIMEOUT_TIME);     // Time before logout after idle
        this.idle.setInterrupts(DEFAULT_INTERRUPTSOURCES); // Mouse, keyboard, etc.

        this.idle.onIdleStart.subscribe(() => {
            if (this.SESSION_EXPIRE_ALERT) {
                alert('You have been inactive for 4 hours. You will be logged out in 1 minute.');
            }
        });

        this.idle.onTimeoutWarning.subscribe((countdown: number) => {
            console.log(`Auto logout in ${countdown} seconds.`);
        });

        this.idle.onTimeout.subscribe(() => {
            alert('Session expired due to inactivity.');
            this.logout();
        });

        this.resetIdleTimer();
    }

    resetIdleTimer(): void {
        this.idle.watch();
        console.log('Idle session tracking started');
    }

    stopIdleTimer(): void {
        this.idle.stop();
        console.log('Idle session tracking stopped');
    }

    logout(): void {
        this.authService.logout();
        this.stopIdleTimer();
        this.router.navigate(['/login'], { replaceUrl: true });
    }
}
