const db = require('../db/connection');

exports.getOcupacionGlobal = async (req, res) => {
  const query = `
  SELECT 
  COUNT(*) AS total,
  SUM(CASE WHEN s.ubicacion_ocupada = 1 THEN 1 ELSE 0 END) AS ocupadas,
  SUM(CASE WHEN s.ubicacion_ocupada = 0 THEN 1 ELSE 0 END) AS libres
FROM sub_ubicaciones s
JOIN ubicacion u ON s.id_ubicacion = u.id_ubicacion
WHERE u.Clase != 'Accesorio';
  `;

  try {
    const [results] = await db.query(query);

    const { total, ocupadas, libres } = results[0];
    const porcentaje_ocupado = ((ocupadas / total) * 100).toFixed(2);
    const porcentaje_libre = ((libres / total) * 100).toFixed(2);

    res.json({
      total,
      ocupadas,
      libres,
      porcentaje_ocupado: parseFloat(porcentaje_ocupado),
      porcentaje_libre: parseFloat(porcentaje_libre)
    });
  } catch (err) {
    console.error('Error en getOcupacionGlobal:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getOcupacionPorClase = async (req, res) => {
  const query = `
    SELECT 
      u.Clase AS clase,
      COUNT(s.id_sub_ubicacion) AS total,
      SUM(s.ubicacion_ocupada) AS ocupadas,
      ROUND(SUM(s.ubicacion_ocupada) / COUNT(s.id_sub_ubicacion) * 100, 2) AS porcentaje_ocupacion
    FROM sub_ubicaciones s
    JOIN ubicacion u ON s.id_ubicacion = u.id_ubicacion
    GROUP BY u.Clase
  `;

  try {
    const [results] = await db.query(query);

    let total_acum = 0;
    let ocupadas_acum = 0;

    const converted = results.map(row => {
      const total = Number(row.total);
      const ocupadas = Number(row.ocupadas);
      const porcentaje = Number(row.porcentaje_ocupacion);

      total_acum += total;
      ocupadas_acum += ocupadas;

      return {
        clase: row.clase,
        total,
        ocupadas,
        porcentaje_ocupacion: porcentaje
      };
    });

    const disponibles_acum = total_acum - ocupadas_acum;
    const porcentaje_acum = total_acum > 0 
      ? parseFloat(((ocupadas_acum / total_acum) * 100).toFixed(2)) 
      : 0;

    converted.push({
      clase: "TOTAL",
      total: total_acum,
      ocupadas: ocupadas_acum,
      disponibles: disponibles_acum,
      porcentaje_ocupacion: porcentaje_acum
    });

    res.json(converted);
  } catch (err) {
    console.error('Error en getOcupacionPorClase:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getEntradasSalidasPorSemana = async (req, res) => {
  const query = `
    SELECT 
      YEAR(fecha_entrada) AS anio,
      WEEK(fecha_entrada) AS semana,
      COUNT(*) AS entradas,
      SUM(CASE WHEN fecha_salida IS NOT NULL THEN 1 ELSE 0 END) AS salidas
    FROM equipo_ubicacion
    WHERE fecha_entrada >= DATE_SUB(CURDATE(), INTERVAL 4 WEEK)
    GROUP BY anio, semana
    ORDER BY anio DESC, semana DESC
  `;

  try {
    const [results] = await db.query(query);
    res.json(results);
  } catch (err) {
    console.error('Error en getEntradasSalidasPorSemana:', err);
    res.status(500).json({ error: err.message });
  }
};
exports.getEquiposMas12SemanasPorClase = async (req, res) => {
  const query = `
    SELECT 
      u.Clase AS clase,
      COUNT(eu.id_equipos) AS cantidad_mayores_12,
      ROUND(
        COUNT(eu.id_equipos) * 100.0 /
        (
          SELECT COUNT(*) 
          FROM equipo_ubicacion eu2
          JOIN sub_ubicaciones su2 ON eu2.id_sub_ubicacion = su2.id_sub_ubicacion
          JOIN ubicacion u2 ON su2.id_ubicacion = u2.id_ubicacion
          WHERE u2.Clase = u.Clase AND u2.Clase != 'Accesorio'
        ), 2
      ) AS porcentaje
    FROM equipo_ubicacion eu
    JOIN sub_ubicaciones su ON eu.id_sub_ubicacion = su.id_sub_ubicacion
    JOIN ubicacion u ON su.id_ubicacion = u.id_ubicacion
    WHERE DATEDIFF(CURDATE(), eu.fecha_entrada) > 12 * 7
      AND u.Clase != 'Accesorio'
    GROUP BY u.Clase;
  `;

  try {
    const [results] = await db.query(query);
    res.json(results);
  } catch (err) {
    console.error('Error en getEquiposMas12SemanasPorClase:', err);
    res.status(500).json({ error: err.message });
  }
};
exports.getEquiposMas18SemanasPorClase = async (req, res) => {
  const query = `
    SELECT 
      u.Clase AS clase,
      COUNT(eu.id_equipos) AS cantidad_mayores_18,
      ROUND(
        COUNT(eu.id_equipos) * 100.0 /
        (
          SELECT COUNT(*) 
          FROM equipo_ubicacion eu2
          JOIN sub_ubicaciones su2 ON eu2.id_sub_ubicacion = su2.id_sub_ubicacion
          JOIN ubicacion u2 ON su2.id_ubicacion = u2.id_ubicacion
          WHERE u2.Clase = u.Clase AND u2.Clase != 'Accesorio'
        ), 2
      ) AS porcentaje
    FROM equipo_ubicacion eu
    JOIN sub_ubicaciones su ON eu.id_sub_ubicacion = su.id_sub_ubicacion
    JOIN ubicacion u ON su.id_ubicacion = u.id_ubicacion
    WHERE DATEDIFF(CURDATE(), eu.fecha_entrada) > 18 * 7
      AND u.Clase != 'Accesorio'
    GROUP BY u.Clase;
  `;

  try {
    const [results] = await db.query(query);
    res.json(results);
  } catch (err) {
    console.error('Error en getEquiposMas18SemanasPorClase:', err);
    res.status(500).json({ error: err.message });
  }
};
