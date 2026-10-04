const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(express.json());

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errores: errors.array() });
  }
  next();
};

app.get('/rectangulos', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM rectangulos');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get(
  '/rectangulos/:id',
  [param('id').isInt({ min: 1 }).withMessage('El ID debe ser un entero mayor a 0')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.query('SELECT * FROM rectangulos WHERE id = ?', [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({ mensaje: 'Rectángulo no encontrado' });
      }
      res.json(rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.post(
  '/rectangulos',
  [
    body('lado1')
      .exists().withMessage('El lado1 es obligatorio')
      .isFloat({ gt: 0 }).withMessage('El lado1 debe ser un número mayor a 0'),
    body('lado2')
      .exists().withMessage('El lado2 es obligatorio')
      .isFloat({ gt: 0 }).withMessage('El lado2 debe ser un número mayor a 0')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { lado1, lado2 } = req.body;

      const perimetro = 2 * (Number(lado1) + Number(lado2));
      const superficie = Number(lado1) * Number(lado2);

      const [result] = await db.query(
        'INSERT INTO rectangulos (lado1, lado2, perimetro, superficie) VALUES (?, ?, ?, ?)',
        [lado1, lado2, perimetro, superficie]
      );

      res.status(201).json({
        id: result.insertId,
        lado1: Number(lado1),
        lado2: Number(lado2),
        perimetro,
        superficie
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.put(
  '/rectangulos/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('El ID debe ser un entero mayor a 0'),
    body('lado1')
      .exists().withMessage('El lado1 es obligatorio')
      .isFloat({ gt: 0 }).withMessage('El lado1 debe ser un número mayor a 0'),
    body('lado2')
      .exists().withMessage('El lado2 es obligatorio')
      .isFloat({ gt: 0 }).withMessage('El lado2 debe ser un número mayor a 0')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { lado1, lado2 } = req.body;

      const perimetro = 2 * (Number(lado1) + Number(lado2));
      const superficie = Number(lado1) * Number(lado2);

      const [result] = await db.query(
        'UPDATE rectangulos SET lado1 = ?, lado2 = ?, perimetro = ?, superficie = ? WHERE id = ?',
        [lado1, lado2, perimetro, superficie, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ mensaje: 'Rectángulo no encontrado' });
      }

      res.json({
        id: Number(id),
        lado1: Number(lado1),
        lado2: Number(lado2),
        perimetro,
        superficie
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.delete(
  '/rectangulos/:id',
  [param('id').isInt({ min: 1 }).withMessage('El ID debe ser un entero mayor a 0')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const [result] = await db.query('DELETE FROM rectangulos WHERE id = ?', [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ mensaje: 'Rectángulo no encontrado' });
      }

      res.json({ mensaje: `Rectángulo con id ${id} eliminado correctamente` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});