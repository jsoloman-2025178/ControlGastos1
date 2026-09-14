import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // La raíz siempre muestra el login
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'welcome',
    loadComponent: () => import('./welcome/welcome.component').then(m => m.WelcomeComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'transacciones',
    canActivate: [authGuard],
    loadComponent: () => import('./transactions/transactions.component').then(m => m.TransactionsComponent)
  },
  {
    path: 'presupuestos',
    canActivate: [authGuard],
    loadComponent: () => import('./budgets/budgets.component').then(m => m.BudgetsComponent)
  },
  {
    path: 'reportes',
    canActivate: [authGuard],
    loadComponent: () => import('./reports/reports.component').then(m => m.ReportsComponent)
  },
  {
    path: 'configuracion',
    canActivate: [authGuard],
    loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent)
  },
  {
    path: 'metas',
    canActivate: [authGuard],
    loadComponent: () => import('./goals/goals.component').then(m => m.GoalsComponent)
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];