import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { HeroBackgroundComponent } from '../shared/components/hero-background/hero-background.component';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, HeroBackgroundComponent],
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent implements OnInit {
  username = '';
  role = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    const user = localStorage.getItem('user');
    if (user) {
      this.username = JSON.parse(user).username;
      this.role = JSON.parse(user).role;
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}