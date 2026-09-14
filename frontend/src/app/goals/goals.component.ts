import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SidebarComponent } from '../shared/components/sidebar/sidebar.component';
import { GoalService, Goal } from '../services/goal.service';

const GOAL_COLORS = ['#A855F7', '#3B82F6', '#10B981', '#F59E0B', '#EC4899'];

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './goals.component.html',
  styleUrl: './goals.component.css'
})
export class GoalsComponent implements OnInit, OnDestroy {
  goals: Goal[] = [];
  goalColors = GOAL_COLORS;

  totalObjetivo = 0;
  totalAhorrado = 0;
  progresoGeneral = 0;
  metasCompletadas = 0;

  // Modal Nueva Meta
  showAddModal = false;
  newGoalName = '';
  newGoalTarget: number | null = null;
  newGoalSaved: number | null = null;
  goalError = '';
  goalLoading = false;

  // Modal Editar Meta
  showEditModal = false;
  editingGoal: Goal | null = null;
  editGoalName = '';
  editGoalTarget: number | null = null;
  editError = '';
  editLoading = false;

  // Modal Abonar
  showContributeModal = false;
  selectedGoal: Goal | null = null;
  contributeAmount: number | null = null;
  contributeError = '';
  contributeLoading = false;

  private goalsSub!: Subscription;

  constructor(private goalService: GoalService) {}

  ngOnInit(): void {
    this.goalService.fetchGoals();
    this.goalsSub = this.goalService.getGoals().subscribe(data => {
      this.goals = data;
      this.calculateSummary();
    });
  }

  ngOnDestroy(): void {
    this.goalsSub?.unsubscribe();
  }

  private calculateSummary(): void {
    this.totalObjetivo = this.goals.reduce((s, g) => s + Number(g.target), 0);
    this.totalAhorrado = this.goals.reduce((s, g) => s + Number(g.saved), 0);
    this.metasCompletadas = this.goals.filter(g => Number(g.saved) >= Number(g.target)).length;
    this.progresoGeneral = this.totalObjetivo > 0
      ? Math.min(100, Math.round((this.totalAhorrado / this.totalObjetivo) * 100))
      : 0;
  }

  getGoalPercent(goal: Goal): number {
    const target = Number(goal.target);
    const saved = Number(goal.saved);
    if (!target || target <= 0) return 0;
    return Math.min(100, Math.round((saved / target) * 100));
  }

  getFaltante(goal: Goal): number {
    return Math.max(0, Number(goal.target) - Number(goal.saved));
  }

  isCompletada(goal: Goal): boolean {
    return Number(goal.saved) >= Number(goal.target);
  }

  getColor(goal: Goal): string {
    const idx = this.goals.indexOf(goal);
    return this.goalColors[(idx < 0 ? 0 : idx) % this.goalColors.length];
  }

  // ===== Modal Nueva Meta =====
  openAddModal(): void {
    this.newGoalName = '';
    this.newGoalTarget = null;
    this.newGoalSaved = null;
    this.goalError = '';
    this.goalLoading = false;
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
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

    this.goalService.addGoal({ name: this.newGoalName.trim(), target, saved }).subscribe({
      next: () => {
        this.goalLoading = false;
        this.closeAddModal();
      },
      error: (err) => {
        this.goalLoading = false;
        this.goalError = err.error?.message || 'Error al guardar la meta.';
      }
    });
  }

  // ===== Modal Editar Meta =====
  openEditModal(goal: Goal, event?: Event): void {
    if (event) event.stopPropagation();
    this.editingGoal = goal;
    this.editGoalName = goal.name;
    this.editGoalTarget = Number(goal.target);
    this.editError = '';
    this.editLoading = false;
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingGoal = null;
  }

  submitEditGoal(): void {
    if (!this.editingGoal) return;
    if (!this.editGoalName || !this.editGoalName.trim()) {
      this.editError = 'Ingresa el nombre de la meta';
      return;
    }
    const target = Number(this.editGoalTarget);
    if (!target || target <= 0) {
      this.editError = 'El monto objetivo debe ser mayor a 0';
      return;
    }

    this.editLoading = true;
    this.editError = '';

    this.goalService.updateGoal(this.editingGoal.id, {
      name: this.editGoalName.trim(),
      target
    }).subscribe({
      next: () => {
        this.editLoading = false;
        this.closeEditModal();
      },
      error: (err) => {
        this.editLoading = false;
        this.editError = err.error?.message || 'Error al actualizar la meta.';
      }
    });
  }

  // ===== Modal Abonar =====
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
}
