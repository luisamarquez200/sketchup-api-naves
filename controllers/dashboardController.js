const db = require('../db/connection');

const CLASE_FILTER = "TRIM(UPPER(u.Clase)) <> 'ACCESORIO'";

exports.getOcupacionGlobal = async (req, res) => {
  const query = `
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN COALESCE(s.ubicacion_ocupada,0) = 1 THEN 1 ELSE 0 END) AS ocupadas,
      SUM(CASE WHEN COALESCE(s.ubicacion_ocupada,0) = 0 THEN 1 ELSE 0 END) AS libres
    FROM sub_ubicaciones s
    JOIN ubicacion u ON s.id_ubicacion = u.id_ubicacion
    WHERE ${CLASE_FILTER};
  `;

  try {
    const [rows] = await db.query(query);
    const { total, ocupadas, libres } = rows[0];
    const porcentaje_ocupado = total ? +( (ocupadas / total) * 100 ).toFixed(2) : 0;
    const porcentaje_libre   = total ? +( (libres    / total) * 100 ).toFixed(2) : 0;

    res.json({ 
      total: Number(total),
      ocupadas: Number(ocupadas),
      libres: Number(libres),
      porcentaje_ocupado,
      porcentaje_libre
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
      SUM(CASE WHEN COALESCE(s.ubicacion_ocupada,0) = 1 THEN 1 ELSE 0 END) AS ocupadas,
      SUM(CASE WHEN COALESCE(s.ubicacion_ocupada,0) = 0 THEN 1 ELSE 0 END) AS disponibles,
      ROUND(
        SUM(CASE WHEN COALESCE(s.ubicacion_ocupada,0) = 1 THEN 1 ELSE 0 END) 
        / COUNT(s.id_sub_ubicacion) * 100, 2
      ) AS porcentaje_ocupacion
    FROM sub_ubicaciones s
    JOIN ubicacion u ON s.id_ubicacion = u.id_ubicacion
    WHERE ${CLASE_FILTER}
    GROUP BY u.Clase
    ORDER BY u.Clase;
  `;

  try {
    const [rows] = await db.query(query);

    let total_acum = 0, ocupadas_acum = 0, disponibles_acum = 0;

    const detalle = rows.map(r => {
      const total = Number(r.total);
      const ocupadas = Number(r.ocupadas);
      const disponibles = Number(r.disponibles);
      const porcentaje_ocupacion = Number(r.porcentaje_ocupacion);

      total_acum += total;
      ocupadas_acum += ocupadas;
      disponibles_acum += disponibles;

      return {
        clase: r.clase,
        total,
        ocupadas,
        disponibles,
        porcentaje_ocupacion
      };
    });

    const detalleConParticipacion = detalle.map(d => ({
      ...d,
      participacion: total_acum ? +((d.total / total_acum) * 100).toFixed(2) : 0
    }));

    const porcentaje_acum = total_acum ? +((ocupadas_acum / total_acum) * 100).toFixed(2) : 0;

    detalleConParticipacion.push({
      clase: "TOTAL",
      total: total_acum,
      ocupadas: ocupadas_acum,
      disponibles: disponibles_acum,
      porcentaje_ocupacion: porcentaje_acum,
      participacion: 100
    });

    res.json(detalleConParticipacion);
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
exports.getCantidadAccesoriosPorTipo = async (req, res) => {
  const query = `
    SELECT 
      tipo,
      COUNT(*) AS cantidad
    FROM entrada_accesorios
    GROUP BY tipo
    ORDER BY cantidad DESC;
  `;

  try {
    const [results] = await db.query(query);
    res.json(results);
  } catch (err) {
    console.error('Error en getCantidadAccesoriosPorTipo:', err);
    res.status(500).json({ error: err.message });
  }
};
exports.getCantidadEquiposPorUnidad = async (req, res) => {
  const query = `
    SELECT 
      COALESCE(v.unidad_venta, 'SIN ASIGNAR') AS unidad_venta,
      CAST(SUM(v.cantidad_equipos) AS UNSIGNED) AS cantidad
    FROM Vista_equipos_unidad v
    WHERE v.tipo_accesorio IS NULL        -- ⬅️ Excluye accesorios
    GROUP BY COALESCE(v.unidad_venta, 'SIN ASIGNAR')
    HAVING cantidad > 0
    ORDER BY cantidad DESC;
  `;

  try {
    const [rows] = await db.query(query);
    const total = rows.reduce((a, r) => a + Number(r.cantidad || 0), 0);
    res.json([...rows, { unidad_venta: 'TOTAL', cantidad: total }]);
  } catch (err) {
    console.error('Error en getCantidadEquiposPorUnidad:', err);
    res.status(500).json({ error: err.message });
  }
};



exports.getEquiposUnidadPorClase = async (req, res) => {
  const query = `
    SELECT 
      COALESCE(unidad_venta, 'SIN ASIGNAR') AS unidad_venta,
      SUM(equipos_clase_I) AS clase_I,
      SUM(equipos_clase_II) AS clase_II,
      SUM(equipos_clase_III) AS clase_III
    FROM Vista_equipos_unidad
    GROUP BY unidad_venta
    ORDER BY unidad_venta;
  `;

  try {
    const [results] = await db.query(query);
    res.json(results);
  } catch (err) {
    console.error('Error en getEquiposUnidadPorClase:', err);
    res.status(500).json({ error: err.message });
  }
};

