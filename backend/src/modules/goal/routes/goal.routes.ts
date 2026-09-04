import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../../middlewares/auth.middleware';
import { pool } from '../../../config/database';

export const goalRoutes: Router = Router();

goalRoutes.use(authMiddleware);

// GET /api/goals — Obtener todas las metas del usuario autenticado
goalRoutes.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT id, user_id, name, target, saved, created_at FROM goals WHERE user_id = $1 ORDER BY id ASC',
      [req.userId]
    );

    // Si el usuario aún no tiene ninguna meta, sembramos las 3 iniciales por defecto
    if (result.rows.length === 0) {
      const defaultGoals = [
        { name: 'Fondo de emergencia', target: 10000, saved: 6200 },
        { name: 'Viaje de vacaciones', target: 6000, saved: 2700 },
        { name: 'Laptop nueva', target: 8000, saved: 1600 }
      ];

      for (const g of defaultGoals) {
        await pool.query(
          'INSERT INTO goals (user_id, name, target, saved) VALUES ($1, $2, $3, $4)',
          [req.userId, g.name, g.target, g.saved]
        );
      }

      const fresh = await pool.query(
        'SELECT id, user_id, name, target, saved, created_at FROM goals WHERE user_id = $1 ORDER BY id ASC',
        [req.userId]
      );
      res.status(200).json(fresh.rows);
      return;
    }

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor al consultar metas.' });
  }
});

// POST /api/goals — Crear una nueva meta de ahorro
goalRoutes.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, target, saved = 0 } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ success: false, message: 'El nombre de la meta es obligatorio.' });
      return;
    }

    const numTarget = Number(target);
    const numSaved = Number(saved);

    if (isNaN(numTarget) || numTarget <= 0) {
      res.status(400).json({ success: false, message: 'El monto objetivo debe ser mayor a 0.' });
      return;
    }

    if (isNaN(numSaved) || numSaved < 0) {
      res.status(400).json({ success: false, message: 'El monto ahorrado no puede ser negativo.' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO goals (user_id, name, target, saved)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, name, target, saved, created_at`,
      [req.userId, name.trim(), numTarget, numSaved]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor al crear la meta.' });
  }
});

// PUT /api/goals/:id — Actualizar una meta de ahorro
goalRoutes.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, target, saved } = req.body;

    if (!name && target === undefined && saved === undefined) {
      res.status(400).json({ success: false, message: 'No se enviaron campos para actualizar.' });
      return;
    }

    const numTarget = target !== undefined ? Number(target) : undefined;
    const numSaved = saved !== undefined ? Number(saved) : undefined;

    if (numTarget !== undefined && (isNaN(numTarget) || numTarget <= 0)) {
      res.status(400).json({ success: false, message: 'El monto objetivo debe ser mayor a 0.' });
      return;
    }

    if (numSaved !== undefined && (isNaN(numSaved) || numSaved < 0)) {
      res.status(400).json({ success: false, message: 'El monto ahorrado no puede ser negativo.' });
      return;
    }

    const result = await pool.query(
      `UPDATE goals
       SET name = COALESCE($1, name),
           target = COALESCE($2, target),
           saved = COALESCE($3, saved)
       WHERE id = $4 AND user_id = $5
       RETURNING id, user_id, name, target, saved, created_at`,
      [name?.trim() || null, numTarget ?? null, numSaved ?? null, id, req.userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, message: 'Meta no encontrada.' });
      return;
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor al actualizar la meta.' });
  }
});

// POST /api/goals/:id/contribute — Abonar a una meta de ahorro
goalRoutes.post('/:id/contribute', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ success: false, message: 'El monto a abonar debe ser mayor a 0.' });
      return;
    }

    const result = await pool.query(
      `UPDATE goals
       SET saved = saved + $1
       WHERE id = $2 AND user_id = $3
       RETURNING id, user_id, name, target, saved, created_at`,
      [numAmount, id, req.userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, message: 'Meta no encontrada.' });
      return;
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error contributing to goal:', error);
    res.status(500).json({ success: false, message: 'Error interno al abonar a la meta.' });
  }
});

// DELETE /api/goals/:id — Eliminar una meta de ahorro
goalRoutes.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, message: 'Meta no encontrada.' });
      return;
    }

    res.status(200).json({ success: true, message: 'Meta eliminada correctamente.', id: Number(id) });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ success: false, message: 'Error interno al eliminar la meta.' });
  }
});
