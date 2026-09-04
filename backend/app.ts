import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { authRoutes } from './src/modules/auth/routes/auth.routes';
import { expenseRoutes } from './src/modules/expense/routes/expense.routes';
import { goalRoutes } from './src/modules/goal/routes/goal.routes';

export const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Servidor funcionando correctamente'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/expense', expenseRoutes);
app.use('/api/goals', goalRoutes);

// 404 handler — must be last
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    message: 'Ruta no encontrada'
  });
});
