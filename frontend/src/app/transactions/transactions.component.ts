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

  readonly categories = ['Comida', 'Transporte', 'Servicios', 'Entretenimiento', 'Salud', 'Vivienda', 'Ingresos', 'Otros'];
  readonly filterCategories = ['Todas', ...this.categories];

  private sub!: Subscription;

  constructor(private transactionService: TransactionService) {}

  ngOnInit(): void {
    this.transactionService.fetchTransactions();
    this.sub = this.transactionService.getTransactions().subscribe(data => {
      this.allTransactions = data;
      this.applyFilters();
    });

    const today = new Date();
    this.date = today.toISOString().split('T')[0];
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
    this.showModal = true;
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
    this.date = new Date().toISOString().split('T')[0];
  }

  onSubmit(form: NgForm): void {
    if (form.invalid || !this.amount) return;

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
