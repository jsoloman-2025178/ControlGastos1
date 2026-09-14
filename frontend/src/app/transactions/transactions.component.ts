import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { SidebarComponent } from '../shared/components/sidebar/sidebar.component';
import { TransactionService, Transaction } from '../services/transaction.service';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SidebarComponent],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.css']
})
export class TransactionsComponent implements OnInit, OnDestroy {
  allTransactions: Transaction[] = [];
  transactions: Transaction[] = [];

  showModal = false;
  editingId: string | null = null;
  loading = false;

  // Form fields
  description = '';
  category = 'Comida';
  type: 'Ingreso' | 'Gasto' = 'Gasto';
  amount: number | null = null;
  date = '';
  maxDate = '';
  dateError = '';

  // Filters
  filterType: 'Todos' | 'Ingreso' | 'Gasto' = 'Todos';
  filterCategory = 'Todas';
  searchTerm = '';
  sortField: 'date' | 'amount' | 'description' = 'date';
  sortDir: 'asc' | 'desc' = 'desc';

  // Summary
  totalIngresos = 0;
  totalGastos = 0;
  balance = 0;

  // Totales globales (sin filtros) para validar el saldo
  globalIngresos = 0;
  globalGastos = 0;
  amountError = '';

  readonly categories = ['Comida', 'Transporte', 'Servicios', 'Entretenimiento', 'Salud', 'Vivienda', 'Ingresos', 'Otros'];
  readonly filterCategories = ['Todas', ...this.categories];

  private sub!: Subscription;

  constructor(private transactionService: TransactionService) {}

  ngOnInit(): void {
    this.transactionService.fetchTransactions();
    this.sub = this.transactionService.getTransactions().subscribe(data => {
      this.allTransactions = data;
      this.applyFilters();
      this.calculateGlobalTotals();
      this.validateAmount();
    });

    this.maxDate = this.getTodayLocal();
    this.date = this.maxDate;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // ─── Filters ───────────────────────────────────────

  applyFilters(): void {
    let result = [...this.allTransactions];

    if (this.filterType !== 'Todos') {
      result = result.filter(t => t.type === this.filterType);
    }

    if (this.filterCategory !== 'Todas') {
      result = result.filter(t => t.category === this.filterCategory);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(t =>
        t.description.toLowerCase().includes(term) ||
        t.category.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (this.sortField === 'date') {
        cmp = String(a.date).localeCompare(String(b.date));
      } else if (this.sortField === 'amount') {
        cmp = Number(a.amount) - Number(b.amount);
      } else {
        cmp = a.description.localeCompare(b.description);
      }
      return this.sortDir === 'asc' ? cmp : -cmp;
    });

    this.transactions = result;
    this.calculateSummary(result);
  }

  toggleSort(field: 'date' | 'amount' | 'description'): void {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = 'desc';
    }
    this.applyFilters();
  }

  clearFilters(): void {
    this.filterType = 'Todos';
    this.filterCategory = 'Todas';
    this.searchTerm = '';
    this.sortField = 'date';
    this.sortDir = 'desc';
    this.applyFilters();
  }

  // ─── Summary ───────────────────────────────────────

  calculateSummary(txs: Transaction[]): void {
    this.totalIngresos = txs.filter(t => t.type === 'Ingreso').reduce((s, t) => s + Number(t.amount), 0);
    this.totalGastos = txs.filter(t => t.type === 'Gasto').reduce((s, t) => s + Number(t.amount), 0);
    this.balance = this.totalIngresos - this.totalGastos;
  }

  /** Totales de TODAS las transacciones (sin filtros), base para la validación de saldo */
  private calculateGlobalTotals(): void {
    this.globalIngresos = this.allTransactions.filter(t => t.type === 'Ingreso').reduce((s, t) => s + Number(t.amount), 0);
    this.globalGastos = this.allTransactions.filter(t => t.type === 'Gasto').reduce((s, t) => s + Number(t.amount), 0);
  }

  /**
   * Saldo disponible real: ingresos globales - gastos globales.
   * Al editar, el monto original del gasto en edición no cuenta en contra.
   */
  get saldoDisponible(): number {
    let gastos = this.globalGastos;
    if (this.editingId) {
      const original = this.allTransactions.find(t => t.id === this.editingId);
      if (original && original.type === 'Gasto') {
        gastos -= Number(original.amount);
      }
    }
    return this.globalIngresos - gastos;
  }

  /** Valida en vivo que un gasto no supere el saldo disponible */
  validateAmount(): void {
    this.amountError = '';
    if (this.type !== 'Gasto' || !this.amount || this.amount <= 0) return;

    if (this.amount > this.saldoDisponible) {
      this.amountError =
        `Saldo insuficiente para realizar gasto. Solo puedes gastar hasta ${this.saldoDisponible.toFixed(2)}.`;
    }
  }

  // ─── Modal ─────────────────────────────────────────

  openModal(): void {
    this.resetForm();
    this.showModal = true;
  }

  openEditModal(t: Transaction): void {
    this.editingId = t.id;
    this.description = t.description;
    this.category = t.category;
    this.type = t.type;
    this.amount = Number(t.amount);
    this.date = String(t.date).slice(0, 10);
    this.amountError = '';
    this.showModal = true;
    this.validateAmount();
    this.validateDate();
  }

  closeModal(): void {
    this.showModal = false;
    this.editingId = null;
    this.resetForm();
  }

  resetForm(): void {
    this.description = '';
    this.category = 'Comida';
    this.type = 'Gasto';
    this.amount = null;
    this.date = this.maxDate || new Date().toISOString().split('T')[0];
    this.amountError = '';
    this.dateError = '';
  }

  /** Fecha de hoy en formato yyyy-mm-dd usando la zona horaria local */
  private getTodayLocal(): string {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }

  /** Valida que la fecha no sea posterior a hoy */
  validateDate(): void {
    this.dateError = '';
    if (!this.date) return;
    if (this.date > this.maxDate) {
      this.dateError = 'La fecha no puede ser posterior a hoy.';
    }
  }

  onSubmit(form: NgForm): void {
    if (form.invalid || !this.amount) return;

    // Regla de negocio: no se puede gastar más de lo que se ingresa
    this.validateAmount();
    if (this.amountError) return;

    // Regla de negocio: la fecha no puede ser futura
    this.validateDate();
    if (this.dateError) return;

    this.loading = true;
    const payload = {
      description: this.description,
      category: this.category,
      type: this.type,
      amount: this.amount,
      date: this.date
    };

    if (this.editingId) {
      this.transactionService.updateTransaction(this.editingId, payload).subscribe({
        next: () => { this.loading = false; this.closeModal(); },
        error: (err) => { this.loading = false; console.error('Error updating transaction', err); }
      });
    } else {
      this.transactionService.addTransaction(payload).subscribe({
        next: () => { this.loading = false; this.closeModal(); },
        error: (err) => { this.loading = false; console.error('Error saving transaction', err); }
      });
    }
  }

  deleteTransaction(id: string): void {
    if (!confirm('¿Estás seguro de que deseas eliminar esta transacción?')) return;
    this.transactionService.deleteTransaction(id).subscribe({
      next: () => {},
      error: (err) => console.error('Error deleting transaction', err)
    });
  }

  // ─── Helpers ───────────────────────────────────────

  getCategoryColor(name: string): string {
    const COLORS: Record<string, string> = {
      'Comida': '#EC4899', 'Transporte': '#8B5CF6', 'Servicios': '#3B82F6',
      'Entretenimiento': '#F59E0B', 'Salud': '#10B981', 'Vivienda': '#22D3EE',
      'Otros': '#F97316', 'Ingresos': '#10B981'
    };
    return COLORS[name] || '#A855F7';
  }
}
