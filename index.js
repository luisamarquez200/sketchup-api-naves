const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const forkLiftRoutes = require('./routes/forkliftRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Ruta base para cuadrantes
app.use('/api/cuadrantes', forkLiftRoutes);
app.use('/api/dashboard', dashboardRoutes);


// Ruta raíz
app.get('/', (req, res) => {
  res.send('🚀 API SketchUp funcionando correctamente');
});

app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en http://localhost:${PORT}`);
});
