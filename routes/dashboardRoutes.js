const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/ocupacion-global', dashboardController.getOcupacionGlobal);
router.get('/ocupacion-por-clase', dashboardController.getOcupacionPorClase);
router.get('/ocupacion-semanal', dashboardController.getEntradasSalidasPorSemana);
router.get('/permanencia-12-semanas', dashboardController.getEquiposMas12SemanasPorClase);
router.get('/permanencia-18-semanas', dashboardController.getEquiposMas18SemanasPorClase);
router.get('/cantidad-accesorios', dashboardController.getCantidadAccesoriosPorTipo);
router.get('/cantidad-unidad-venta', dashboardController.getCantidadEquiposPorUnidad);
router.get('/cantidad-unidad-clase', dashboardController.getEquiposUnidadPorClase);

module.exports = router;