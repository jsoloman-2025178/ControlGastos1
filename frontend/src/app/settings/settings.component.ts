import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SidebarComponent } from '../shared/components/sidebar/sidebar.component';
import { AuthService } from '../services/auth.service';
import { GoalService } from '../services/goal.service';

const MONEDA_KEY = 'cg_moneda';
const BUDGET_KEY = 'cg_presupuestos';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit, OnDestroy {
  userName = '';
  userEmail = '';
  userRole = '';
  userPicture = '';
  isGoogleUser = false;

  // Preferencias
  moneda = 'Q';
  readonly monedas = [
    { code: 'Q', label: 'Quetzal (Q)' },
    { code: '$', label: 'Dólar ($)' },
    { code: '€', label: 'Euro (€)' }
  ];
  autoRefresh = true;
  saveMessage = '';
  saveMessageType: 'success' | 'error' = 'success';

  // Datos
  presupuestosCount = 0;
  metasCount = 0;

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
        this.userRole = user.role || 'USER';
        this.userPicture = user.picture || '';
        this.isGoogleUser = !!user.picture;
      } catch {}
    }

    const savedMoneda = localStorage.getItem(MONEDA_KEY);
    if (savedMoneda) this.moneda = savedMoneda;
    this.autoRefresh = localStorage.getItem('cg_auto_refresh') !== 'false';

    const budgets = localStorage.getItem(BUDGET_KEY);
    try {
      this.presupuestosCount = budgets ? JSON.parse(budgets).length : 0;
    } catch {
      this.presupuestosCount = 0;
    }

    this.goalService.fetchGoals();
    this.goalsSub = this.goalService.getGoals().subscribe(g => {
      this.metasCount = g.length;
    });
  }

  ngOnDestroy(): void {
    this.goalsSub?.unsubscribe();
  }

  get initials(): string {
    const parts = this.userName.trim().split(/\s+/);
    return (parts.slice(0, 2).map(p => p.charAt(0)).join('') || 'US').toUpperCase();
  }

  guardarMoneda(): void {
    localStorage.setItem(MONEDA_KEY, this.moneda);
    this.saveMessageType = 'success';
    this.saveMessage = 'Moneda guardada correctamente.';
    setTimeout(() => { this.saveMessage = ''; }, 3000);
  }

  savePreferences(): void {
    localStorage.setItem(MONEDA_KEY, this.moneda);
    localStorage.setItem('cg_auto_refresh', String(this.autoRefresh));
    this.saveMessageType = 'success';
    this.saveMessage = 'Preferencias guardadas correctamente.';
    setTimeout(() => { this.saveMessage = ''; }, 3000);
  }

  resetBudgets(): void {
    if (!confirm('¿Deseas restablecer todos tus presupuestos locales? Esta acción no se puede deshacer.')) return;
    localStorage.removeItem(BUDGET_KEY);
    this.presupuestosCount = 0;
    this.saveMessageType = 'success';
    this.saveMessage = 'Presupuestos restablecidos.';
    setTimeout(() => { this.saveMessage = ''; }, 3000);
  }

  clearLocalData(): void {
    if (!confirm('¿Deseas eliminar TODOS los datos locales (preferencias y presupuestos)? Tus transacciones y metas en el servidor no se verán afectadas.')) return;
    localStorage.removeItem(BUDGET_KEY);
    localStorage.removeItem(MONEDA_KEY);
    localStorage.removeItem('cg_auto_refresh');
    this.presupuestosCount = 0;
    this.moneda = 'Q';
    this.autoRefresh = true;
    this.saveMessageType = 'success';
    this.saveMessage = 'Datos locales eliminados.';
    setTimeout(() => { this.saveMessage = ''; }, 3000);
  }

  logout(event?: Event): void {
    if (event) event.preventDefault();
    this.authService.logout('Sesión cerrada correctamente');
    this.router.navigate(['/login']);
  }
}
