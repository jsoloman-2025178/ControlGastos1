import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { GoalService } from '../../../services/goal.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  userName = '';
  userEmail = '';
  userPicture = '';
  goalsCount = 0;
  private goalsSub?: Subscription;

  constructor(
    private authService: AuthService,
    private goalService: GoalService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        this.userName = user.username || '';
        this.userEmail = user.email || '';
        this.userPicture = user.picture || '';
      } catch {}
    }

    this.goalsSub = this.goalService.getGoals().subscribe(goals => {
      this.goalsCount = goals.length;
    });
  }

  ngOnDestroy(): void {
    this.goalsSub?.unsubscribe();
  }

  get initials(): string {
    const parts = this.userName.trim().split(/\s+/);
    return (parts.slice(0, 2).map(p => p.charAt(0)).join('') || 'US').toUpperCase();
  }

  logout(event: Event): void {
    event.preventDefault();
    this.authService.logout('Sesión cerrada correctamente');
    this.router.navigate(['/login']);
  }
}
