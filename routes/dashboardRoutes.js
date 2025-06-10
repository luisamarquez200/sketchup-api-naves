const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/ocupacion-global', dashboardController.getOcupacionGlobal);
router.get('/ocupacion-por-clase', dashboardController.getOcupacionPorClase);
router.get('/ocupacion-semanal', dashboardController.getEntradasSalidasPorSemana);

module.exports = router;