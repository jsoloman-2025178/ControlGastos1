import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../../middlewares/auth.middleware';
import { pool } from '../../../config/database';

export const expenseRoutes: Router = Router();

expenseRoutes.use(authMiddleware);

// GET /api/expense — Obtener todas las transacciones del usuario autenticado
expenseRoutes.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC, created_at DESC',
      [req.userId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// POST /api/expense — Crear una nueva transacción
expenseRoutes.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { description, category, type, amount, date } = req.body;

    if (!description || !category || !type || amount === undefined || !date) {
      res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
      return;
    }

    if (!['Gasto', 'Ingreso'].includes(type)) {
      res.status(400).json({ success: false, message: 'El tipo debe ser "Gasto" o "Ingreso"' });
      return;
    }

    if (Number(amount) <= 0) {
      res.status(400).json({ success: false, message: 'El monto debe ser mayor a 0' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO transactions (user_id, description, category, type, amount, date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.userId, description, category, type, amount, date]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// PUT /api/expense/:id — Actualizar una transacción existente
expenseRoutes.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { description, category, type, amount, date } = req.body;

    if (!description || !category || !type || amount === undefined || !date) {
      res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
      return;
    }

    if (!['Gasto', 'Ingreso'].includes(type)) {
      res.status(400).json({ success: false, message: 'El tipo debe ser "Gasto" o "Ingreso"' });
      return;
    }

    const result = await pool.query(
      `UPDATE transactions
       SET description = $1, category = $2, type = $3, amount = $4, date = $5
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [description, category, type, amount, date, id, req.userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, message: 'Transacción no encontrada' });
      return;
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// DELETE /api/expense/:id — Eliminar una transacción
expenseRoutes.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, message: 'Transacción no encontrada' });
      return;
    }

    res.status(200).json({ success: true, message: 'Transacción eliminada correctamente' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});
