const express = require('express');
const router = express.Router();
const controller = require('../controllers/forkliftController');
const dashboardController = require('../controllers/dashboardController');

// Ruta para obtener sububicaciones por cuadrante
router.get('/:nombre', controller.getSububicacionesByCuadrante);

module.exports = router;