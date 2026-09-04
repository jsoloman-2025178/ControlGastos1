import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface Goal {
  id: number;
  user_id?: number;
  name: string;
  target: number;
  saved: number;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class GoalService {
  private readonly apiUrl = 'http://localhost:3000/api/goals';
  private goalsSubject = new BehaviorSubject<Goal[]>([]);

  constructor(private http: HttpClient) {}

  fetchGoals(): void {
    if (!localStorage.getItem('token')) return;
    this.http.get<Goal[]>(this.apiUrl).subscribe({
      next: (data) => {
        // Asegurar que target y saved sean convertidos a Number
        const parsed = data.map(g => ({
          ...g,
          target: Number(g.target),
          saved: Number(g.saved)
        }));
        this.goalsSubject.next(parsed);
      },
      error: (error) => console.error('Error fetching goals:', error)
    });
  }

  getGoals(): Observable<Goal[]> {
    return this.goalsSubject.asObservable();
  }

  addGoal(goal: { name: string; target: number; saved: number }): Observable<Goal> {
    return this.http.post<Goal>(this.apiUrl, goal).pipe(
      tap((newGoal) => {
        const parsed: Goal = {
          ...newGoal,
          target: Number(newGoal.target),
          saved: Number(newGoal.saved)
        };
        const current = this.goalsSubject.value;
        this.goalsSubject.next([...current, parsed]);
      })
    );
  }

  updateGoal(id: number, goal: Partial<Goal>): Observable<Goal> {
    return this.http.put<Goal>(`${this.apiUrl}/${id}`, goal).pipe(
      tap((updated) => {
        const parsed: Goal = {
          ...updated,
          target: Number(updated.target),
          saved: Number(updated.saved)
        };
        const current = this.goalsSubject.value.map(g => g.id === id ? parsed : g);
        this.goalsSubject.next(current);
      })
    );
  }

  contributeToGoal(id: number, amount: number): Observable<Goal> {
    return this.http.post<Goal>(`${this.apiUrl}/${id}/contribute`, { amount }).pipe(
      tap((updated) => {
        const parsed: Goal = {
          ...updated,
          target: Number(updated.target),
          saved: Number(updated.saved)
        };
        const current = this.goalsSubject.value.map(g => g.id === id ? parsed : g);
        this.goalsSubject.next(current);
      })
    );
  }

  deleteGoal(id: number): Observable<{ success: boolean; message: string; id: number }> {
    return this.http.delete<{ success: boolean; message: string; id: number }>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        const current = this.goalsSubject.value.filter(g => g.id !== id);
        this.goalsSubject.next(current);
      })
    );
  }
}
