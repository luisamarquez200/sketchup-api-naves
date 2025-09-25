const db = require('../db/connection');

// 🔧 Filtro único para ambos endpoints (ajústalo según tu regla de negocio)
const CLASE_FILTER_EQUIPOS = "UPPER(TRIM(e.clase)) <> 'ACCESORIO'";

// ✅ Definición única de “ocupado” (existe movimiento vigente con sub-ubicación)
const OCUPADO_EXISTS = `
  EXISTS (
    SELECT 1
    FROM equipo_ubicacion eu
    WHERE eu.id_equipos = e.id_equipos
      AND eu.fecha_salida IS NULL
      AND eu.id_sub_ubicacion IS NOT NULL
  )
`;

/**
 * GET /ocupacion-global
 * Respuesta:
 * {
 *   total, ocupadas, libres,
 *   porcentaje_ocupado, porcentaje_libre
 * }
 */
exports.getOcupacionGlobal = async (req, res) => {
  const sql = `
    SELECT
      COUNT(DISTINCT e.id_equipos) AS total,
      COUNT(DISTINCT CASE WHEN ${OCUPADO_EXISTS} THEN e.id_equipos END) AS ocupadas,
      COUNT(DISTINCT CASE WHEN NOT ${OCUPADO_EXISTS} THEN e.id_equipos END) AS libres
    FROM equipos e
    WHERE ${CLASE_FILTER_EQUIPOS};
  `;

  try {
    const [rows] = await db.query(sql);
    const { total = 0, ocupadas = 0, libres = 0 } = rows?.[0] || {};
    const t = Number(total) || 0;
    const o = Number(ocupadas) || 0;
    const l = Number(libres) || 0;

    res.json({
      total: t,
      ocupadas: o,
      libres: l,
      porcentaje_ocupado: t ? +((o / t) * 100).toFixed(2) : 0,
      porcentaje_libre:   t ? +((l / t) * 100).toFixed(2) : 0,
    });
  } catch (err) {
    console.error("Error en getOcupacionGlobal:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /ocupacion-por-clase
 * Respuesta:
 * [
 *   { clase, total, ocupadas, disponibles, porcentaje_ocupacion, participacion },
 *   ...,
 *   { clase: 'TOTAL', ... }
 * ]
 */
exports.getOcupacionPorClase = async (req, res) => {
  const sql = `
    SELECT
      COALESCE(NULLIF(UPPER(TRIM(e.clase)), ''), 'Todas las clases') AS clase,
      COUNT(DISTINCT e.id_equipos) AS total,
      COUNT(DISTINCT CASE WHEN ${OCUPADO_EXISTS} THEN e.id_equipos END) AS ocupadas,
      COUNT(DISTINCT CASE WHEN NOT ${OCUPADO_EXISTS} THEN e.id_equipos END) AS disponibles
    FROM equipos e
    WHERE ${CLASE_FILTER_EQUIPOS}
    GROUP BY COALESCE(NULLIF(UPPER(TRIM(e.clase)), ''), 'Todas las clases')
    ORDER BY clase;
  `;

  try {
    const [rows] = await db.query(sql);

    let total_acum = 0, ocupadas_acum = 0, disponibles_acum = 0;

    const detalle = rows.map((r) => {
      const total = Number(r.total) || 0;
      const ocupadas = Number(r.ocupadas) || 0;
      const disponibles = Number(r.disponibles) || 0;

      total_acum += total;
      ocupadas_acum += ocupadas;
      disponibles_acum += disponibles;

      return {
        clase: r.clase,
        total,            // “cantidad” por clase
        ocupadas,
        disponibles,      // “disponibilidad” por clase
        porcentaje_ocupacion: total ? +((ocupadas / total) * 100).toFixed(2) : 0,
      };
    });

    const conParticipacion = detalle.map((d) => ({
      ...d,
      participacion: total_acum ? +((d.total / total_acum) * 100).toFixed(2) : 0,
    }));

    conParticipacion.push({
      clase: "TOTAL",
      total: total_acum,
      ocupadas: ocupadas_acum,
      disponibles: disponibles_acum,
      porcentaje_ocupacion: total_acum
        ? +((ocupadas_acum / total_acum) * 100).toFixed(2)
        : 0,
      participacion: 100,
    });

    res.json(conParticipacion);
  } catch (err) {
    console.error("Error en getOcupacionPorClase:", err);
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
    WHERE UPPER(TRIM(estado)) = 'INGRESADO'
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

