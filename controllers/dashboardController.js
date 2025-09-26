const db = require('../db/connection');


const SOLO_EQUIPOS_WHERE = "1=1"; 
const WHERE_VISTA = "(tipo_accesorio IS NULL OR tipo_accesorio = '')";

exports.getOcupacionGlobal = async (req, res) => {
  const sql = `
    SELECT
      /* Total equipos desde la vista (p.ej., 149) */
      (SELECT 
          SUM(COALESCE(equipos_clase_I,0) + COALESCE(equipos_clase_II,0) + COALESCE(equipos_clase_III,0))
       FROM Vista_equipos_unidad
       WHERE ${WHERE_VISTA}
      ) AS equipos_total,

      /* Equipos con sub_ubicación asignada (p.ej., 42) */
      (SELECT COUNT(DISTINCT v1.id_equipo)
         FROM Inventario v1
        WHERE ${SOLO_EQUIPOS_WHERE}
          AND v1.sub_ubicacion IS NOT NULL
      ) AS equipos_en_ubicacion,

      /* ---- Capacidad (sub_ubicaciones) ---- */
      (SELECT COUNT(*)
         FROM sub_ubicaciones s
         JOIN ubicacion u ON u.id_ubicacion = s.id_ubicacion
        WHERE TRIM(UPPER(u.Clase)) <> 'ACCESORIO'
      ) AS slots_total,

      (SELECT COUNT(DISTINCT v2.sub_ubicacion)
         FROM Inventario v2
         JOIN sub_ubicaciones s2 ON s2.id_sub_ubicacion = v2.sub_ubicacion
         JOIN ubicacion u2 ON u2.id_ubicacion = s2.id_ubicacion
        WHERE v2.sub_ubicacion IS NOT NULL
          AND TRIM(UPPER(u2.Clase)) <> 'ACCESORIO'
      ) AS slots_ocupados
  `;

  try {
    const [rows] = await db.query(sql);
    const r = rows?.[0] || {};

    // (1) Por equipos
    const equipos_total        = Number(r.equipos_total) || 0;        // <- 149
    const equipos_en_ubicacion = Number(r.equipos_en_ubicacion) || 0; // <- p.ej. 42
    const equipos_libres       = Math.max(0, equipos_total - equipos_en_ubicacion);
    const pct_equipos_ocupado  = equipos_total ? +((equipos_en_ubicacion / equipos_total) * 100).toFixed(2) : 0;
    const pct_equipos_libre    = equipos_total ? +((equipos_libres        / equipos_total) * 100).toFixed(2) : 0;

    // (2) Por capacidad (sub_ubicaciones)
    const slots_total    = Number(r.slots_total) || 0;
    const slots_ocupados = Number(r.slots_ocupados) || 0;
    const slots_libres   = Math.max(0, slots_total - slots_ocupados);
    const pct_slots_ocup = slots_total ? +((slots_ocupados / slots_total) * 100).toFixed(2) : 0;
    const pct_slots_lib  = slots_total ? +((slots_libres   / slots_total) * 100).toFixed(2) : 0;

    res.json({
      equipos: {
        total: equipos_total,
        en_ubicacion: equipos_en_ubicacion,
        sin_ubicacion: equipos_libres,
        porcentaje_ocupado: pct_equipos_ocupado,
        porcentaje_libre: pct_equipos_libre
      },
      sub_ubicaciones: {
        total: slots_total,
        ocupadas: slots_ocupados,
        libres: slots_libres,
        porcentaje_ocupado: pct_slots_ocup,
        porcentaje_libre: pct_slots_lib
      }
    });
  } catch (err) {
    console.error("Error en getOcupacionGlobal:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getOcupacionPorClase = async (req, res) => {
  const sql = `
    /* Totales por clase desde la vista */
    WITH tot AS (
      SELECT 'Clase I'  AS clase, SUM(COALESCE(equipos_clase_I,  0)) AS total
      FROM Vista_equipos_unidad WHERE ${WHERE_VISTA}
      UNION ALL
      SELECT 'Clase II' AS clase, SUM(COALESCE(equipos_clase_II, 0)) AS total
      FROM Vista_equipos_unidad WHERE ${WHERE_VISTA}
      UNION ALL
      SELECT 'Clase III' AS clase, SUM(COALESCE(equipos_clase_III,0)) AS total
      FROM Vista_equipos_unidad WHERE ${WHERE_VISTA}
    ),
    /* Ocupadas por clase desde Inventario (equipos en sub_ubicación) */
    occ AS (
      SELECT UPPER(TRIM(v.tipo)) AS clase, COUNT(DISTINCT v.id_equipo) AS ocupadas
      FROM Inventario v
      WHERE ${SOLO_EQUIPOS_WHERE}
        AND v.sub_ubicacion IS NOT NULL
      GROUP BY UPPER(TRIM(v.tipo))
    )
    SELECT
      t.clase,
      CAST(t.total AS UNSIGNED) AS total,
      COALESCE(o.ocupadas,0) AS ocupadas,
      GREATEST(CAST(t.total AS UNSIGNED) - COALESCE(o.ocupadas,0), 0) AS disponibles,
      /* % participación sobre el total global (para el pie y la barra de participación) */
      ROUND(100 * t.total / SUM(t.total) OVER (), 2) AS participacion,
      /* % ocupación dentro de cada clase (para barras de ocupación si lo usas) */
      ROUND(100 * COALESCE(o.ocupadas,0) / NULLIF(t.total,0), 2) AS porcentaje_ocupacion
    FROM tot t
    LEFT JOIN occ o ON o.clase = UPPER(t.clase)
    ORDER BY FIELD(t.clase,'Clase I','Clase II','Clase III');
  `;

  try {
    const [rows] = await db.query(sql);

    const total_global   = rows.reduce((a, r) => a + (Number(r.total)     || 0), 0);
    const total_ocupadas = rows.reduce((a, r) => a + (Number(r.ocupadas)  || 0), 0);

    res.json({
      total_global,                
      total_ocupadas,               
      detalle: rows.map(r => ({
        clase: r.clase,
        total: Number(r.total) || 0,
        ocupadas: Number(r.ocupadas) || 0,
        disponibles: Number(r.disponibles) || 0,
        participacion: Number(r.participacion) || 0,
        porcentaje_ocupacion: Number(r.porcentaje_ocupacion) || 0
      }))
    });
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
  const sql = `
    WITH base AS (
      SELECT
        UPPER(TRIM(tipo))   AS tipo_u,
        TRIM(tipo)          AS tipo_raw
      FROM Inventario
      WHERE UPPER(TRIM(estado)) = 'INGRESADO'
        AND UPPER(TRIM(tipo)) IN ('CARGADOR','BATERIA')
    )
    SELECT
      /* Normalizamos el nombre para el front */
      CASE tipo_u
        WHEN 'CARGADOR' THEN 'Cargador'
        WHEN 'BATERIA'  THEN 'Batería'
        ELSE tipo_raw
      END AS tipo,
      COUNT(*) AS cantidad,
      /* participación sobre el total de accesorios ingresados */
      ROUND(100 * COUNT(*) / NULLIF((SELECT COUNT(*) FROM base),0), 2) AS participacion
    FROM base
    GROUP BY tipo_u, tipo_raw
    ORDER BY cantidad DESC;
  `;

  try {
    const [rows] = await db.query(sql);

    const total = rows.reduce((acc, r) => acc + (Number(r.cantidad) || 0), 0);

    res.json({
      total,          // total de accesorios (Cargador + Batería) en estado INGRESADO
      detalle: rows   // [{ tipo: 'Cargador', cantidad: X, participacion: Y }, ...]
    });
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

