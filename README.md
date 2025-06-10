# SketchUp API 🏗️

Este proyecto es una API desarrollada para brindar soporte a visualizaciones dinámicas de datos en un entorno 3D utilizando **SketchUp**. Se conecta a bases de datos y sirve información sobre ocupación, movimientos de montacargas y visualización por cuadrantes, facilitando integraciones con dashboards 3D interactivos.

---

## 🚀 Características principales

- 📊 Consulta de ocupación global y por clase
- 📆 Visualización de entradas y salidas por semana
- 📦 Consulta de sububicaciones por cuadrante
- 🔧 Integración con scripts Ruby para control en SketchUp

---

## 📁 Estructura del proyecto

```
sketchup-api/
│
├── controllers/
│   ├── dashboardController.js
│   └── forkliftController.js
│
├── routes/
│   ├── dashboardRoutes.js
│   └── forkliftRoutes.js
│
├── SketchUpScripts/
│   ├── load_dashboards_menu.rb
│   ├── scriptDashboard1.rb
│   ├── scriptDashboard2.rb
│   ├── scriptDashboard3.rb
│   ├── scriptDashboard4.rb
│   ├── scriptMontacargas.rb
│   ├── scriptTiempoReal.rb
│   └── scriptTiempoRealControlado.rb
│
├── db/
│   └── connection.js
│
├── index.js
├── .env
├── .gitignore
├── package.json
└── README.md
```

---

## 📌 Endpoints principales

### Dashboard Routes

- `GET /ocupacion-global`  
  Devuelve la ocupación total del sistema (equipos ocupados/libres).

- `GET /ocupacion-por-clase`  
  Muestra ocupación distribuida por clase de equipo.

- `GET /ocupacion-semanal`  
  Devuelve entradas y salidas por semana, ideal para gráficas.

### Forklift Routes

- `GET /:nombre`  
  Devuelve las sububicaciones de un cuadrante (por nombre).

---

## ⚙️ Instalación

1. Clona el repositorio:

```bash
git clone https://github.com/luisamarquez200/sketchup-api.git
cd sketchup-api
```

2. Instala las dependencias:

```bash
npm install
```

3. Configura el archivo `.env` con tus variables necesarias.

4. Inicia el servidor:

```bash
node index.js
```

---

## 🧪 Requisitos

- Node.js v16+
- SketchUp con soporte para Ruby scripts
- Conexión con base de datos (MySQL u otra)

---

## 🛠 Tecnologías usadas

- **Node.js**
- **Express.js**
- **JavaScript**
- **Ruby (SketchUp scripts)**


---

## 📄 Licencia

Este proyecto es de uso privado para fines de integración entre SketchUp y visualización de datos de operación en tiempo real.
