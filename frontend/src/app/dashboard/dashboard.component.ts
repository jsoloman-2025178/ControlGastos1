import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SidebarComponent } from '../shared/components/sidebar/sidebar.component';
import { TransactionService, Transaction } from '../services/transaction.service';
import { GoalService, Goal } from '../services/goal.service';

interface TrendMonth {
  label: string;
  ingresos: number;
  gastos: number;
}

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_COMPLETOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const GOAL_COLORS = ['#A855F7', '#3B82F6', '#10B981', '#F59E0B', '#EC4899'];

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
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  transactions: Transaction[] = [];
  username = '';
  searchTerm = '';

  currentMonthName = '';
  currentMonthLabel = '';

  totalIngresos = 0;
  totalGastos = 0;
  balance = 0;
  ahorro = 0;

  prevIngresos = 0;
  prevGastos = 0;
  prevBalance = 0;

  trend: TrendMonth[] = [];
  trendStep = 2000;
  trendMax = 10000;
  trendLabels: string[] = [];
  miniChartLinePath = '';
  miniChartAreaPath = '';

  recentTransactions: Transaction[] = [];

  goalColors = GOAL_COLORS;
  goals: Goal[] = [];

  categories: { name: string; amount: number; color: string }[] = [];
  totalCategorias = 0;

  // Estado para modal Nueva Meta
  showAddGoalModal = false;
  newGoalName = '';
  newGoalTarget: number | null = null;
  newGoalSaved: number | null = null;
  goalError = '';
  goalLoading = false;

  // Estado para modal Abonar a Meta
  showContributeModal = false;
  selectedGoal: Goal | null = null;
  contributeAmount: number | null = null;
  contributeError = '';
  contributeLoading = false;

  private sub!: Subscription;
  private goalsSub!: Subscription;

  constructor(
    private transactionService: TransactionService,
    private goalService: GoalService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { this.username = JSON.parse(stored).username || ''; } catch {}
    }

    const now = new Date();
    this.currentMonthName = MESES_COMPLETOS[now.getMonth()];
    this.currentMonthLabel = `${this.currentMonthName} ${now.getFullYear()}`;

    // Cargar metas de ahorro desde la base de datos
    this.goalService.fetchGoals();
    this.goalsSub = this.goalService.getGoals().subscribe(data => {
      this.goals = data;
    });

    // Fetch fresh data then subscribe to reactive updates
    this.transactionService.fetchTransactions();
    this.sub = this.transactionService.getTransactions().subscribe(data => {
      this.transactions = data;
      this.calculateSummary();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.goalsSub?.unsubscribe();
  }

  calculateSummary(): void {
    const now = new Date();
    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const curKey = monthKey(now);
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = monthKey(prevDate);

    const trendMap = new Map<string, TrendMonth>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      trendMap.set(monthKey(d), { label: MESES_CORTOS[d.getMonth()], ingresos: 0, gastos: 0 });
    }

    let curIng = 0, curGas = 0, prevIng = 0, prevGas = 0;

    this.transactions.forEach(t => {
      const amount = Number(t.amount);
      const d = new Date(String(t.date).slice(0, 10) + 'T00:00:00');
      if (isNaN(d.getTime())) return;
      const k = monthKey(d);

      if (t.type === 'Ingreso') {
        if (k === curKey) curIng += amount;
        if (k === prevKey) prevIng += amount;
        const tm = trendMap.get(k);
        if (tm) tm.ingresos += amount;
      } else {
        if (k === curKey) curGas += amount;
        if (k === prevKey) prevGas += amount;
        const tm = trendMap.get(k);
        if (tm) tm.gastos += amount;
      }
    });

    this.totalIngresos = curIng;
    this.totalGastos = curGas;
    this.balance = curIng - curGas;
    this.ahorro = curIng - curGas;
    this.prevIngresos = prevIng;
    this.prevGastos = prevGas;
    this.prevBalance = prevIng - prevGas;

    this.trend = Array.from(trendMap.values());
    this.buildTrendChart();
    this.buildMiniChart();

    const catMap = new Map<string, number>();
    this.transactions
      .filter(t => t.type === 'Gasto')
      .forEach(t => catMap.set(t.category, (catMap.get(t.category) || 0) + Number(t.amount)));

    this.categories = Array.from(catMap.entries()).map(([name, amount]) => ({
      name, amount, color: CATEGORY_COLORS[name] || '#A855F7'
    }));
    this.totalCategorias = this.categories.reduce((s, c) => s + c.amount, 0);

    this.recentTransactions = [...this.transactions]
      .sort((a, b) =>
        new Date(String(b.date).slice(0, 10)).getTime() -
        new Date(String(a.date).slice(0, 10)).getTime()
      )
      .slice(0, 5);
  }

  getAhorroPorcentaje(): string {
    if (this.totalIngresos === 0) return '0';
    return ((this.ahorro / this.totalIngresos) * 100).toFixed(0);
  }

  getVariacionIngresos(): string {
    return this.formatVariacion(this.totalIngresos, this.prevIngresos);
  }

  getVariacionGastos(): string {
    return this.formatVariacion(this.totalGastos, this.prevGastos);
  }

  isPositiva(current: number, previous: number): boolean {
    return current >= previous;
  }

  getBalanceTrend(): { dir: 'up' | 'down'; pct: number } | null {
    if (this.prevBalance === 0) return null;
    const pct = ((this.balance - this.prevBalance) / Math.abs(this.prevBalance)) * 100;
    return { dir: pct >= 0 ? 'up' : 'down', pct: Math.abs(pct) };
  }

  private formatVariacion(current: number, previous: number): string {
    if (previous === 0) return current > 0 ? 'Nuevo' : '0.0%';
    const pct = ((current - previous) / previous) * 100;
    return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
  }

  private readonly PLOT_LEFT = 60;
  private readonly PLOT_RIGHT = 500;
  private readonly PLOT_TOP = 15;
  private readonly PLOT_BOTTOM = 215;
  private readonly BAR_WIDTH = 22;
  private readonly BAR_GAP = 4;

  buildTrendChart(): void {
    const values = this.trend.flatMap(m => [m.ingresos, m.gastos]);
    const max = values.length ? Math.max(...values) : 0;
    const candidates = [1000, 2000, 2500, 5000, 10000, 20000, 50000];
    this.trendStep = candidates.find(c => c * 5 >= max) ?? 100000;
    this.trendMax = this.trendStep * 5;

    this.trendLabels = [];
    for (let k = 0; k <= 5; k++) {
      const v = this.trendMax - k * this.trendStep;
      this.trendLabels.push(v >= 1000 ? `Q${v / 1000}k` : `Q${v}`);
    }
  }

  getTrendGroupWidth(): number {
    return (this.PLOT_RIGHT - this.PLOT_LEFT) / Math.max(this.trend.length, 1);
  }

  getBarX(index: number, isGasto: boolean): number {
    const groupWidth = this.getTrendGroupWidth();
    const barsWidth = this.BAR_WIDTH * 2 + this.BAR_GAP;
    const startX = this.PLOT_LEFT + index * groupWidth + (groupWidth - barsWidth) / 2;
    return Math.round(isGasto ? startX + this.BAR_WIDTH + this.BAR_GAP : startX);
  }

  getBarHeight(value: number): number {
    return Math.round((value / this.trendMax) * (this.PLOT_BOTTOM - this.PLOT_TOP));
  }

  getBarY(value: number): number {
    return this.PLOT_BOTTOM - this.getBarHeight(value);
  }

  getGridY(k: number): number {
    return this.PLOT_TOP + k * ((this.PLOT_BOTTOM - this.PLOT_TOP) / 5);
  }

  getGroupCenterX(index: number): number {
    return this.PLOT_LEFT + index * this.getTrendGroupWidth() + this.getTrendGroupWidth() / 2;
  }

  buildMiniChart(): void {
    const balances = this.trend.map(m => m.ingresos - m.gastos);
    const n = balances.length;
    const min = Math.min(...balances);
    const max = Math.max(...balances);
    const range = max - min || 1;
    const top = 8, bottom = 72;

    const points = balances.map((b, i) => ({
      x: Math.round(n <= 1 ? 200 : (i / (n - 1)) * 400),
      y: Math.round(bottom - ((b - min) / range) * (bottom - top))
    }));

    const line = this.smoothPath(points);
    this.miniChartLinePath = line;
    this.miniChartAreaPath = `${line} L400,80 L0,80 Z`;
  }

  private smoothPath(pts: { x: number; y: number }[]): string {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const cp1x = (p1.x + (p2.x - p0.x) / 6).toFixed(1);
      const cp1y = (p1.y + (p2.y - p0.y) / 6).toFixed(1);
      const cp2x = (p2.x - (p3.x - p1.x) / 6).toFixed(1);
      const cp2y = (p2.y - (p3.y - p1.y) / 6).toFixed(1);
      d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
  }

  getCategoryColor(name: string): string {
    return CATEGORY_COLORS[name] || '#A855F7';
  }

  getRecentDateLabel(date: string): string {
    const d = new Date(String(date).slice(0, 10) + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (sameDay(d, today)) return 'Hoy';
    if (sameDay(d, yesterday)) return 'Ayer';
    return `${d.getDate()} ${MESES_CORTOS[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
  }

  openAddGoalModal(): void {
    this.newGoalName = '';
    this.newGoalTarget = null;
    this.newGoalSaved = null;
    this.goalError = '';
    this.goalLoading = false;
    this.showAddGoalModal = true;
  }

  closeAddGoalModal(): void {
    this.showAddGoalModal = false;
  }

  submitAddGoal(): void {
    if (!this.newGoalName || !this.newGoalName.trim()) {
      this.goalError = 'Ingresa el nombre de la meta';
      return;
    }
    const target = Number(this.newGoalTarget);
    if (!target || target <= 0) {
      this.goalError = 'El monto objetivo debe ser mayor a 0';
      return;
    }
    const saved = this.newGoalSaved !== null ? Math.max(0, Number(this.newGoalSaved)) : 0;

    this.goalLoading = true;
    this.goalError = '';

    this.goalService.addGoal({
      name: this.newGoalName.trim(),
      target,
      saved
    }).subscribe({
      next: () => {
        this.goalLoading = false;
        this.closeAddGoalModal();
      },
      error: (err) => {
        this.goalLoading = false;
        this.goalError = err.error?.message || 'Error al guardar la meta.';
      }
    });
  }

  openContributeModal(goal: Goal, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedGoal = goal;
    this.contributeAmount = null;
    this.contributeError = '';
    this.contributeLoading = false;
    this.showContributeModal = true;
  }

  closeContributeModal(): void {
    this.showContributeModal = false;
    this.selectedGoal = null;
  }

  submitContribute(): void {
    if (!this.selectedGoal) return;
    const amount = Number(this.contributeAmount);
    if (!amount || amount <= 0) {
      this.contributeError = 'Ingresa un monto válido mayor a 0';
      return;
    }

    this.contributeLoading = true;
    this.contributeError = '';

    this.goalService.contributeToGoal(this.selectedGoal.id, amount).subscribe({
      next: () => {
        this.contributeLoading = false;
        this.closeContributeModal();
      },
      error: (err) => {
        this.contributeLoading = false;
        this.contributeError = err.error?.message || 'Error al registrar el abono.';
      }
    });
  }

  deleteGoal(goal: Goal, event?: Event): void {
    if (event) event.stopPropagation();
    if (!confirm(`¿Deseas eliminar la meta "${goal.name}"?`)) return;

    this.goalService.deleteGoal(goal.id).subscribe({
      error: (err) => console.error('Error deleting goal:', err)
    });
  }

  getGoalPercent(goal: Goal): number {
    const target = Number(goal.target);
    const saved = Number(goal.saved);
    if (!target || target <= 0) return 0;
    return Math.min(100, Math.round((saved / target) * 100));
  }

  private readonly BUBBLE_CONTAINER_WIDTH = 450;
  private readonly BUBBLE_CONTAINER_HEIGHT = 350;
  private readonly BUBBLE_MIN_SIZE = 50;
  private readonly BUBBLE_MAX_SIZE = 140;

  getBubbleSize(amount: number): number {
    if (this.totalCategorias === 0) return this.BUBBLE_MIN_SIZE;
    const ratio = amount / this.totalCategorias;
    return Math.round(this.BUBBLE_MIN_SIZE + ratio * (this.BUBBLE_MAX_SIZE - this.BUBBLE_MIN_SIZE));
  }

  getBubbleX(index: number): number {
    if (this.categories.length === 0) return 0;
    const angle = (index / this.categories.length) * 2 * Math.PI;
    const radius = this.getLayoutRadius();
    const size = this.getBubbleSize(this.categories[index].amount);
    return Math.round(this.BUBBLE_CONTAINER_WIDTH / 2 + radius * Math.cos(angle) - size / 2);
  }

  getBubbleY(index: number): number {
    if (this.categories.length === 0) return 0;
    const angle = (index / this.categories.length) * 2 * Math.PI;
    const radius = this.getLayoutRadius();
    const size = this.getBubbleSize(this.categories[index].amount);
    return Math.round(this.BUBBLE_CONTAINER_HEIGHT / 2 + radius * Math.sin(angle) - size / 2);
  }

  getBubbleCenterX(index: number): number {
    return this.getBubbleX(index) + this.getBubbleSize(this.categories[index].amount) / 2;
  }

  getBubbleCenterY(index: number): number {
    return this.getBubbleY(index) + this.getBubbleSize(this.categories[index].amount) / 2;
  }

  private getLayoutRadius(): number {
    if (this.categories.length === 0) return 0;
    const maxRadius = Math.min(this.BUBBLE_CONTAINER_WIDTH, this.BUBBLE_CONTAINER_HEIGHT) / 2 - this.BUBBLE_MAX_SIZE / 2 - 10;
    return Math.max(60, maxRadius * (6 / (this.categories.length + 5)));
  }

  navigateToTransactions(): void {
    this.router.navigate(['/transacciones']);
  }
}
