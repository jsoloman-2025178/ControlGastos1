import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SidebarComponent } from '../shared/components/sidebar/sidebar.component';
import { TransactionService, Transaction } from '../services/transaction.service';

interface Budget {
  id: string;
  category: string;
  amount: number;
}

const MESES_COMPLETOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const CATEGORY_COLORS: Record<string, string> = {
  'Comida': '#EC4899',
  'Transporte': '#8B5CF6',
  'Servicios': '#3B82F6',
  'Entretenimiento': '#F59E0B',
  'Salud': '#10B981',
  'Vivienda': '#22D3EE',
  'Otros': '#F97316'
};

const GASTABLE_CATEGORIES = ['Comida', 'Transporte', 'Servicios', 'Entretenimiento', 'Salud', 'Vivienda', 'Otros'];

const BUDGET_STORAGE_KEY = 'cg_presupuestos';

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './budgets.component.html',
  styleUrl: './budgets.component.css'
})
export class BudgetsComponent implements OnInit, OnDestroy {
  username = '';
  currentMonthLabel = '';

  budgets: Budget[] = [];
  spentByCategory: Record<string, number> = {};

  totalPresupuesto = 0;
  totalGastado = 0;
  totalDisponible = 0;
  promedioUso = 0;

  // Estado para modal Nuevo/Editar Presupuesto
  showModal = false;
  editingId: string | null = null;
  modalCategory = '';
  modalAmount: number | null = null;
  modalError = '';
  modalLoading = false;

  private sub!: Subscription;

  constructor(private transactionService: TransactionService) {}

  ngOnInit(): void {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { this.username = JSON.parse(stored).username || ''; } catch {}
    }

    const now = new Date();
    this.currentMonthLabel = `${MESES_COMPLETOS[now.getMonth()]} ${now.getFullYear()}`;

    this.loadBudgets();

    this.transactionService.fetchTransactions();
    this.sub = this.transactionService.getTransactions().subscribe(data => {
      this.calculateSpent(data);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  /** Presupuestos guardados en localStorage */
  private loadBudgets(): void {
    try {
      const raw = localStorage.getItem(BUDGET_STORAGE_KEY);
      this.budgets = raw ? JSON.parse(raw) : [];
    } catch {
      this.budgets = [];
    }
  }

  private saveBudgets(): void {
    localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(this.budgets));
  }

  /** Calcula el gasto real del mes en curso por categoría usando las transacciones */
  private calculateSpent(transactions: Transaction[]): void {
    const now = new Date();
    const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const map: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.type !== 'Gasto') return;
      const d = new Date(String(t.date).slice(0, 10) + 'T00:00:00');
      if (isNaN(d.getTime())) return;
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (k !== curKey) return;
      map[t.category] = (map[t.category] || 0) + Number(t.amount);
    });

    this.spentByCategory = map;
    this.calculateSummary();
  }

  private calculateSummary(): void {
    this.totalPresupuesto = this.budgets.reduce((s, b) => s + Number(b.amount), 0);
    this.totalGastado = this.budgets.reduce((s, b) => s + this.getSpent(b.category), 0);
    this.totalDisponible = this.totalPresupuesto - this.totalGastado;
    this.promedioUso = this.totalPresupuesto > 0
      ? Math.round((this.totalGastado / this.totalPresupuesto) * 100)
      : 0;
  }

  getSpent(category: string): number {
    return this.spentByCategory[category] || 0;
  }

  getPercent(budget: Budget): number {
    if (!budget.amount || budget.amount <= 0) return 0;
    return Math.min(100, Math.round((this.getSpent(budget.category) / budget.amount) * 100));
  }

  getRawPercent(budget: Budget): number {
    if (!budget.amount || budget.amount <= 0) return 0;
    return Math.round((this.getSpent(budget.category) / budget.amount) * 100);
  }

  getStatus(budget: Budget): 'ok' | 'warning' | 'danger' {
    const pct = this.getRawPercent(budget);
    if (pct > 100) return 'danger';
    if (pct >= 80) return 'warning';
    return 'ok';
  }

  getStatusLabel(budget: Budget): string {
    const pct = this.getRawPercent(budget);
    if (pct > 100) return 'Excedido';
    if (pct >= 80) return 'En riesgo';
    return 'En control';
  }

  getStatusClass(budget: Budget): string {
    const status = this.getStatus(budget);
    if (status === 'danger') return 'badge-pink';
    if (status === 'warning') return 'badge-yellow';
    return 'badge-green';
  }

  getBarColor(budget: Budget): string {
    const status = this.getStatus(budget);
    if (status === 'danger') return '#EC4899';
    if (status === 'warning') return '#F59E0B';
    return '#10B981';
  }

  getCategoryColor(name: string): string {
    return CATEGORY_COLORS[name] || '#A855F7';
  }

  getCategoriaInicial(name: string): string {
    return (name || '?').charAt(0);
  }

  /** Categorías que aún no tienen presupuesto asignado (para el modal) */
  get availableCategories(): string[] {
    if (this.editingId) return GASTABLE_CATEGORIES;
    const used = new Set(this.budgets.map(b => b.category));
    return GASTABLE_CATEGORIES.filter(c => !used.has(c));
  }

  openCreateModal(): void {
    this.editingId = null;
    this.modalCategory = '';
    this.modalAmount = null;
    this.modalError = '';
    this.modalLoading = false;
    this.showModal = true;
  }

  openEditModal(budget: Budget): void {
    this.editingId = budget.id;
    this.modalCategory = budget.category;
    this.modalAmount = budget.amount;
    this.modalError = '';
    this.modalLoading = false;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingId = null;
  }

  submitModal(): void {
    if (!this.modalCategory) {
      this.modalError = 'Selecciona una categoría';
      return;
    }
    const amount = Number(this.modalAmount);
    if (!amount || amount <= 0) {
      this.modalError = 'El monto del presupuesto debe ser mayor a 0';
      return;
    }

    if (this.editingId) {
      const idx = this.budgets.findIndex(b => b.id === this.editingId);
      if (idx >= 0) {
        this.budgets[idx] = { ...this.budgets[idx], category: this.modalCategory, amount };
      }
    } else {
      this.budgets.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        category: this.modalCategory,
        amount
      });
    }

    this.saveBudgets();
    this.calculateSummary();
    this.closeModal();
  }

  deleteBudget(budget: Budget): void {
    if (!confirm(`¿Deseas eliminar el presupuesto de "${budget.category}"?`)) return;
    this.budgets = this.budgets.filter(b => b.id !== budget.id);
    this.saveBudgets();
    this.calculateSummary();
  }
}
