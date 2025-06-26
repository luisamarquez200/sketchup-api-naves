const db = require('../db/connection');

// Obtener todas las sububicaciones de un cuadrante específico
exports.getSububicacionesByCuadrante = async (req, res) => {
  const cuadrante = req.params.nombre;

  const query = `
    SELECT 
      su.nombre AS sub_ubicacion,
      su.ubicacion_ocupada AS ocupada,
      eu.id_equipos AS equipo_id,
      e.estado
    FROM sub_ubicaciones su
    LEFT JOIN equipo_ubicacion eu ON su.id_sub_ubicacion = eu.id_sub_ubicacion
    LEFT JOIN equipos e ON eu.id_equipos = e.id_equipos
    WHERE su.id_ubicacion = (
      SELECT id_ubicacion FROM ubicacion WHERE nombre_ubicacion = ?
    )
  `;

  try {
    const [results] = await db.query(query, [cuadrante]);
    res.json(results);
  } catch (err) {
    console.error('Error en getSububicacionesByCuadrante:', err);
    res.status(500).json({ error: err.message });
  }
};