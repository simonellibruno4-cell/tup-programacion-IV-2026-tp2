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

app.get('/materias', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM materias');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post(
  '/materias',
  [
    body('nombre')
      .trim()
      .notEmpty().withMessage('El nombre de la materia es obligatorio')
      .isString().withMessage('El nombre debe ser una cadena de texto')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { nombre } = req.body;
      const [result] = await db.query('INSERT INTO materias (nombre) VALUES (?)', [nombre.trim()]);
      res.status(201).json({ id: result.insertId, nombre: nombre.trim() });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ mensaje: 'La materia ya existe' });
      }
      res.status(500).json({ error: error.message });
    }
  }
);

app.get('/calificaciones', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.id, c.alumno, m.nombre AS materia, c.materia_id, c.nota1, c.nota2, c.nota3, c.created_at
      FROM calificaciones c
      JOIN materias m ON c.materia_id = m.id
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get(
  '/calificaciones/:id',
  [param('id').isInt({ min: 1 }).withMessage('El ID debe ser un entero mayor a 0')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.query(`
        SELECT c.id, c.alumno, m.nombre AS materia, c.materia_id, c.nota1, c.nota2, c.nota3, c.created_at
        FROM calificaciones c
        JOIN materias m ON c.materia_id = m.id
        WHERE c.id = ?
      `, [id]);

      if (rows.length === 0) {
        return res.status(404).json({ mensaje: 'Calificación no encontrada' });
      }
      res.json(rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.post(
  '/calificaciones',
  [
    body('alumno')
      .trim()
      .notEmpty().withMessage('El nombre del alumno es obligatorio'),
    body('materia_id')
      .isInt({ min: 1 }).withMessage('ID de materia inválido'),
    body('nota1')
      .isFloat({ min: 1, max: 10 }).withMessage('La nota 1 debe estar entre 1 y 10'),
    body('nota2')
      .isFloat({ min: 1, max: 10 }).withMessage('La nota 2 debe estar entre 1 y 10'),
    body('nota3')
      .isFloat({ min: 1, max: 10 }).withMessage('La nota 3 debe estar entre 1 y 10')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { alumno, materia_id, nota1, nota2, nota3 } = req.body;

      const [materia] = await db.query('SELECT id FROM materias WHERE id = ?', [materia_id]);
      if (materia.length === 0) {
        return res.status(400).json({ mensaje: 'La materia especificada no existe' });
      }

      const [existentes] = await db.query(
        'SELECT id FROM calificaciones WHERE LOWER(alumno) = LOWER(?) AND materia_id = ?',
        [alumno.trim(), materia_id]
      );
      if (existentes.length > 0) {
        return res.status(400).json({ mensaje: 'Ya existe una calificación registrada para este alumno en esa materia' });
      }

      const [result] = await db.query(
        'INSERT INTO calificaciones (alumno, materia_id, nota1, nota2, nota3) VALUES (?, ?, ?, ?, ?)',
        [alumno.trim(), materia_id, nota1, nota2, nota3]
      );

      res.status(201).json({
        id: result.insertId,
        alumno: alumno.trim(),
        materia_id,
        nota1,
        nota2,
        nota3
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.put(
  '/calificaciones/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('El ID debe ser un entero mayor a 0'),
    body('alumno')
      .trim()
      .notEmpty().withMessage('El nombre del alumno es obligatorio'),
    body('materia_id')
      .isInt({ min: 1 }).withMessage('ID de materia inválido'),
    body('nota1')
      .isFloat({ min: 1, max: 10 }).withMessage('La nota 1 debe estar entre 1 y 10'),
    body('nota2')
      .isFloat({ min: 1, max: 10 }).withMessage('La nota 2 debe estar entre 1 y 10'),
    body('nota3')
      .isFloat({ min: 1, max: 10 }).withMessage('La nota 3 debe estar entre 1 y 10')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { alumno, materia_id, nota1, nota2, nota3 } = req.body;

      const [materia] = await db.query('SELECT id FROM materias WHERE id = ?', [materia_id]);
      if (materia.length === 0) {
        return res.status(400).json({ mensaje: 'La materia especificada no existe' });
      }

      const [existentes] = await db.query(
        'SELECT id FROM calificaciones WHERE LOWER(alumno) = LOWER(?) AND materia_id = ? AND id != ?',
        [alumno.trim(), materia_id, id]
      );
      if (existentes.length > 0) {
        return res.status(400).json({ mensaje: 'Ya existe otra calificación registrada para este alumno en esa materia' });
      }

      const [result] = await db.query(
        'UPDATE calificaciones SET alumno = ?, materia_id = ?, nota1 = ?, nota2 = ?, nota3 = ? WHERE id = ?',
        [alumno.trim(), materia_id, nota1, nota2, nota3, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ mensaje: 'Calificación no encontrada' });
      }

      res.json({
        id: Number(id),
        alumno: alumno.trim(),
        materia_id,
        nota1,
        nota2,
        nota3
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.delete(
  '/calificaciones/:id',
  [param('id').isInt({ min: 1 }).withMessage('El ID debe ser un entero mayor a 0')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const [result] = await db.query('DELETE FROM calificaciones WHERE id = ?', [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ mensaje: 'Calificación no encontrada' });
      }

      res.json({ mensaje: `Calificación con id ${id} eliminada correctamente` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor de Calificaciones corriendo en http://localhost:${PORT}`);
});