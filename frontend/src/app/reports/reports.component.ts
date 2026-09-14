import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SidebarComponent } from '../shared/components/sidebar/sidebar.component';
import { TransactionService, Transaction } from '../services/transaction.service';

interface TrendMonth {
  label: string;
  ingresos: number;
  gastos: number;
}

interface CategoryRow {
  name: string;
  amount: number;
  color: string;
  pct: number;
}

type Periodo = 'mes' | '3m' | '6m' | 'anio' | 'todo';

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_COMPLETOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const CATEGORY_COLORS: Record<string, string> = {
  'Comida': '#EC4899',
  'Transporte': '#8B5CF6',
  'Servicios': '#3B82F6',
  'Entretenimiento': '#F59E0B',
  'Salud': '#10B981',
  'Vivienda': '#22D3EE',
  'Otros': '#F97316',
  'Ingresos': '#10B981'
};

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css'
})
export class ReportsComponent implements OnInit, OnDestroy {
  transactions: Transaction[] = [];
  filtered: Transaction[] = [];

  periodo: Periodo = 'mes';
  filterCategory = 'Todas';
  readonly filterCategories = ['Todas', 'Comida', 'Transporte', 'Servicios', 'Entretenimiento', 'Salud', 'Vivienda', 'Otros'];

  currentMonthLabel = '';

  totalIngresos = 0;
  totalGastos = 0;
  balance = 0;
  promedioGastoMes = 0;
  tasaAhorro = 0;

  monthly: TrendMonth[] = [];
  categoryRows: CategoryRow[] = [];
  totalCategorias = 0;
  topMovements: Transaction[] = [];
  categoriaPrincipal = '';

  // Constantes del gráfico SVG
  readonly PLOT_LEFT = 60;
  readonly PLOT_RIGHT = 500;
  readonly PLOT_TOP = 20;
  readonly PLOT_BOTTOM = 220;

  private sub!: Subscription;

  constructor(private transactionService: TransactionService) {}

  ngOnInit(): void {
    const now = new Date();
    this.currentMonthLabel = `${MESES_COMPLETOS[now.getMonth()]} ${now.getFullYear()}`;

    this.transactionService.fetchTransactions();
    this.sub = this.transactionService.getTransactions().subscribe(data => {
      this.transactions = data;
      this.applyFilters();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  /** Fecha límite según el período seleccionado */
  private getPeriodStart(): Date | null {
    const now = new Date();
    switch (this.periodo) {
      case 'mes': return new Date(now.getFullYear(), now.getMonth(), 1);
      case '3m': return new Date(now.getFullYear(), now.getMonth() - 2, 1);
      case '6m': return new Date(now.getFullYear(), now.getMonth() - 5, 1);
      case 'anio': return new Date(now.getFullYear(), 0, 1);
      default: return null;
    }
  }

  applyFilters(): void {
    const start = this.getPeriodStart();
    this.filtered = this.transactions.filter(t => {
      const d = new Date(String(t.date).slice(0, 10) + 'T00:00:00');
      if (isNaN(d.getTime())) return false;
      if (start && d < start) return false;
      if (this.filterCategory !== 'Todas' && t.category !== this.filterCategory) return false;
      return true;
    });
    this.calculateReport();
  }

  setPeriodo(p: Periodo): void {
    this.periodo = p;
    this.applyFilters();
  }

  private calculateReport(): void {
    let ing = 0, gas = 0;
    this.filtered.forEach(t => {
      const amount = Number(t.amount);
      if (t.type === 'Ingreso') ing += amount; else gas += amount;
    });
    this.totalIngresos = ing;
    this.totalGastos = gas;
    this.balance = ing - gas;
    this.tasaAhorro = ing > 0 ? Math.round(((ing - gas) / ing) * 100) : 0;

    // Meses del período seleccionado
    const now = new Date();
    const monthsCount: Record<Periodo, number> = { 'mes': 1, '3m': 3, '6m': 6, 'anio': 12, 'todo': 12 };
    const trendMap = new Map<string, TrendMonth>();
    const n = monthsCount[this.periodo];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      trendMap.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, {
        label: MESES_CORTOS[d.getMonth()], ingresos: 0, gastos: 0
      });
    }
    const start = this.getPeriodStart();
    this.transactions.forEach(t => {
      const d = new Date(String(t.date).slice(0, 10) + 'T00:00:00');
      if (isNaN(d.getTime())) return;
      if (start && d < start) return;
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const tm = trendMap.get(k);
      if (!tm) return;
      if (t.type === 'Ingreso') tm.ingresos += Number(t.amount); else tm.gastos += Number(t.amount);
    });
    this.monthly = Array.from(trendMap.values());
    const mesesConMovimiento = this.monthly.filter(m => m.ingresos > 0 || m.gastos > 0).length || 1;
    this.promedioGastoMes = Math.round(this.monthly.reduce((s, m) => s + m.gastos, 0) / mesesConMovimiento);

    // Gastos por categoría (solo del período filtrado)
    const catMap = new Map<string, number>();
    this.filtered.filter(t => t.type === 'Gasto').forEach(t => {
      catMap.set(t.category, (catMap.get(t.category) || 0) + Number(t.amount));
    });
    this.totalCategorias = Array.from(catMap.values()).reduce((s, v) => s + v, 0);
    this.categoryRows = Array.from(catMap.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        color: CATEGORY_COLORS[name] || '#A855F7',
        pct: this.totalCategorias > 0 ? Math.round((amount / this.totalCategorias) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
    this.categoriaPrincipal = this.categoryRows.length > 0 ? this.categoryRows[0].name : '';

    // Top movimientos por monto
    this.topMovements = [...this.filtered].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 8);
  }

  getCategoryColor(name: string): string {
    return CATEGORY_COLORS[name] || '#A855F7';
  }

  getRecentDateLabel(date: string): string {
    const d = new Date(String(date).slice(0, 10) + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    return `${d.getDate()} ${MESES_CORTOS[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
  }

  // ===== Gráfico de barras SVG =====
  get chartMax(): number {
    let max = 0;
    this.monthly.forEach(m => { max = Math.max(max, m.ingresos, m.gastos); });
    return max || 1;
  }

  getGroupWidth(): number {
    const n = this.monthly.length || 1;
    return (this.PLOT_RIGHT - this.PLOT_LEFT) / n;
  }

  getBarWidth(): number {
    return Math.min(24, this.getGroupWidth() * 0.3);
  }

  getBarX(index: number, isGasto: boolean): number {
    const centerX = this.PLOT_LEFT + index * this.getGroupWidth() + this.getGroupWidth() / 2;
    const w = this.getBarWidth();
    return isGasto ? centerX + 2 : centerX - w - 2;
  }

  getBarHeight(value: number): number {
    return Math.round((value / this.chartMax) * (this.PLOT_BOTTOM - this.PLOT_TOP));
  }

  getBarY(value: number): number {
    return this.PLOT_BOTTOM - this.getBarHeight(value);
  }

  getGridY(k: number): number {
    return this.PLOT_TOP + k * ((this.PLOT_BOTTOM - this.PLOT_TOP) / 5);
  }

  getGridLabel(k: number): string {
    const v = Math.round(this.chartMax * (1 - k / 5));
    return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`;
  }

  getGroupCenterX(index: number): number {
    return this.PLOT_LEFT + index * this.getGroupWidth() + this.getGroupWidth() / 2;
  }

  // ===== Exportación CSV =====
  exportCsv(): void {
    if (this.filtered.length === 0) return;
    const rows = [['Descripcion', 'Categoria', 'Tipo', 'Monto', 'Fecha']];
    this.filtered.forEach(t => {
      rows.push([t.description, t.category, t.type, String(t.amount), String(t.date).slice(0, 10)]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-${this.periodo}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
