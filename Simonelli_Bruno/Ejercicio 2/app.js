const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
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

app.get(
  '/tareas',
  [
    query('estado')
      .optional()
      .isIn(['completadas', 'pendientes'])
      .withMessage('El estado debe ser "completadas" o "pendientes"')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { estado } = req.query;
      let sql = 'SELECT * FROM tareas';

      if (estado === 'completadas') {
        sql += ' WHERE completada = true';
      } else if (estado === 'pendientes') {
        sql += ' WHERE completada = false';
      }

      const [rows] = await db.query(sql);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.get(
  '/tareas/:id',
  [param('id').isInt({ min: 1 }).withMessage('El ID debe ser un entero mayor a 0')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.query('SELECT * FROM tareas WHERE id = ?', [id]);

      if (rows.length === 0) {
        return res.status(404).json({ mensaje: 'Tarea no encontrada' });
      }
      res.json(rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.post(
  '/tareas',
  [
    body('nombre')
      .trim()
      .notEmpty().withMessage('El nombre es obligatorio')
      .isString().withMessage('El nombre debe ser una cadena de texto'),
    body('completada')
      .optional()
      .isBoolean().withMessage('El estado completada debe ser booleano')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { nombre, completada = false } = req.body;

      const [existentes] = await db.query(
        'SELECT id FROM tareas WHERE LOWER(nombre) = LOWER(?)',
        [nombre.trim()]
      );

      if (existentes.length > 0) {
        return res.status(400).json({ mensaje: 'Ya existe una tarea con ese nombre' });
      }

      const [result] = await db.query(
        'INSERT INTO tareas (nombre, completada) VALUES (?, ?)',
        [nombre.trim(), completada]
      );

      res.status(201).json({
        id: result.insertId,
        nombre: nombre.trim(),
        completada: Boolean(completada)
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.put(
  '/tareas/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('El ID debe ser un entero mayor a 0'),
    body('nombre')
      .trim()
      .notEmpty().withMessage('El nombre es obligatorio')
      .isString().withMessage('El nombre debe ser una cadena de texto'),
    body('completada')
      .isBoolean().withMessage('El estado completada debe ser booleano')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, completada } = req.body;

      // Verificar unicidad excluyendo la misma tarea
      const [existentes] = await db.query(
        'SELECT id FROM tareas WHERE LOWER(nombre) = LOWER(?) AND id != ?',
        [nombre.trim(), id]
      );

      if (existentes.length > 0) {
        return res.status(400).json({ mensaje: 'Ya existe otra tarea con ese nombre' });
      }

      const [result] = await db.query(
        'UPDATE tareas SET nombre = ?, completada = ? WHERE id = ?',
        [nombre.trim(), completada, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ mensaje: 'Tarea no encontrada' });
      }

      res.json({
        id: Number(id),
        nombre: nombre.trim(),
        completada: Boolean(completada)
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.delete(
  '/tareas/:id',
  [param('id').isInt({ min: 1 }).withMessage('El ID debe ser un entero mayor a 0')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const [result] = await db.query('DELETE FROM tareas WHERE id = ?', [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ mensaje: 'Tarea no encontrada' });
      }

      res.json({ mensaje: `Tarea con id ${id} eliminada correctamente` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor de Tareas corriendo en http://localhost:${PORT}`);
});