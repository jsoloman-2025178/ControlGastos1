import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface Transaction {
  id: string;
  description: string;
  category: string;
  type: 'Ingreso' | 'Gasto';
  amount: number;
  date: string;
}

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly apiUrl = 'http://localhost:3000/api/expense';
  private transactionsSubject = new BehaviorSubject<Transaction[]>([]);

  constructor(private http: HttpClient) {}

  fetchTransactions(): void {
    if (!localStorage.getItem('token')) return;
    this.http.get<Transaction[]>(this.apiUrl).subscribe({
      next: (data) => this.transactionsSubject.next(data),
      error: (error) => console.error('Error fetching transactions:', error)
    });
  }

  getTransactions(): Observable<Transaction[]> {
    return this.transactionsSubject.asObservable();
  }

  addTransaction(transaction: Omit<Transaction, 'id'>): Observable<Transaction> {
    return this.http.post<Transaction>(this.apiUrl, transaction).pipe(
      tap((newTx) => {
        const current = this.transactionsSubject.value;
        this.transactionsSubject.next([newTx, ...current]);
      })
    );
  }

  updateTransaction(id: string, transaction: Omit<Transaction, 'id'>): Observable<Transaction> {
    return this.http.put<Transaction>(`${this.apiUrl}/${id}`, transaction).pipe(
      tap((updated) => {
        const current = this.transactionsSubject.value.map(t => t.id === id ? updated : t);
        this.transactionsSubject.next(current);
      })
    );
  }

  deleteTransaction(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        const current = this.transactionsSubject.value.filter(t => t.id !== id);
        this.transactionsSubject.next(current);
      })
    );
  }
}
