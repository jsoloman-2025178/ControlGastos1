# Control Gastos

Sistema de control de gastos personales con arquitectura cliente-servidor. Permite a los usuarios registrar ingresos y gastos, visualizar resúmenes financieros interactivos (balance total, métricas mensuales, metas de ahorro y distribución por categorías), con autenticación JWT, soporte para inicio de sesión con Google (Google Identity Services) y control de acceso basado en roles (`USER` y `ADMIN`).

---

## Características principales

### Autenticación y autorización
- Inicio de sesión con usuario/correo y contraseña.
- Integración opcional de inicio de sesión con Google (`Google Identity Services` / OAuth2 ID Token).
- Autenticación mediante **JWT (JSON Web Token)** con tiempo de expiración configurable (`8h` por defecto) y endpoint para renovación de sesión (`/refresh`).
- Detección de actividad del usuario en frontend para renovar tokens activos antes de su expiración.
- Cifrado y hash seguro de contraseñas con **bcryptjs** (10 salt rounds).
- Roles del sistema: `USER` y `ADMIN` con middleware de autorización en backend (`authMiddleware`, `adminOnly`) y guardianes de ruta (`authGuard`) en Angular.
- Usuarios predeterminados generados automáticamente si la base de datos está vacía.

### Dashboard y visualización
- **Resumen Financiero**: Cálculo en tiempo real de Balance actual, Ingresos totales, Gastos del mes y Ahorro proyectado vs. mes anterior.
- **Gráficos y Tendencias**: Gráfico de barras/tendencia de flujo de ingresos y gastos de los últimos 6 meses.
- **Distribución por Categorías**: Gráfico y métricas visuales con barras porcentuales por categoría (Comida, Transporte, Servicios, Entretenimiento, Salud, Vivienda, Otros).
- **Metas de Ahorro**: Barra de progreso interactiva para objetivos financieros con cálculo de porcentaje completado.
- **Gestión de Transacciones**: Historial de transacciones con filtrado por búsqueda de texto, tipo (Ingreso/Gasto), categoría y orden cronológico.
- **Experiencia de Usuario (UI/UX)**: Interfaz oscura moderna con diseño responsivo, lienzo animado de constelaciones/partículas interactivas (`ParticleCanvasComponent`) y barra lateral de navegación colapsable.

### Base de datos
- **Auto-inicialización al arrancar**: Conecta a la base de datos de mantenimiento `postgres`, verifica la existencia de la base de datos configurada (`gastos_db`), y la crea automáticamente si no existe.
- **Migración automática de esquema**: Crea y actualiza las tablas `users` y `transactions` con sus llaves foráneas (`CASCADE`), constraints `CHECK` y valores predeterminados.
- **Parser de fechas personalizado**: Previene desfases de zona horaria al serializar columnas `DATE` de PostgreSQL a JSON.

---

## Stack tecnológico

### Backend
- **Node.js** 20.x
- **TypeScript** 5.4
- **Express** 4.19 (Framework HTTP)
- **PostgreSQL** (`pg` 8.12 - Driver de base de datos con Connection Pooling)
- **jsonwebtoken** 9.0 (Generación y verificación de tokens JWT)
- **bcryptjs** 2.4 (Hashing y validación de contraseñas)
- **google-auth-library** 9.11 (Verificación de ID Tokens de Google)
- **cors** 2.8 (Manejo de Cross-Origin Resource Sharing)
- **dotenv** 16.4 (Gestión de variables de entorno)
- **tsx** 4.16 (Ejecución y recarga en caliente en desarrollo)

### Frontend
- **Angular** 17.0 (Standalone Components, Signals, Reactive Architecture)
- **TypeScript** 5.2
- **RxJS** 7.8 (Manejo reactivo de flujos y estado)
- **HTML5 Canvas API** (Animación interactiva de partículas y constelaciones)
- **Angular Router** (Navegación protegida con CanActivateFn)
- **Angular HttpClient** (Peticiones REST con interceptor funcional `HttpInterceptorFn`)

### Herramientas
- **pnpm** (Gestor de paquetes rápido y eficiente)
- **npm** / Node.js runtime

---

## Prerrequisitos

- **Node.js** (v18.x o superior, recomendado v20.x)
- **pnpm** (recomendado) o **npm**
- **PostgreSQL** (v14.x o superior) instalado y corriendo
- **Git**

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone <repository-url>
cd ControlGastos

# 2. Instalar dependencias del backend
cd backend
pnpm install

# 3. Instalar dependencias del frontend
cd ../frontend
pnpm install
```

---

## Configuración de variables de entorno

Crea un archivo `.env` dentro de la carpeta `backend/` con las siguientes variables:

```env
# ---- Base de Datos PostgreSQL ----
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_password_postgres
DB_NAME=gastos_db

# ---- Servidor Backend ----
PORT=3000

# ---- Autenticación JWT ----
JWT_SECRET=mi_secreto_super_seguro_cambiar_en_produccion
JWT_EXPIRES_IN=8h

```



---

## Estructura del proyecto

```
ControlGastos/
├── README.md
├── backend/
│   ├── .env                       # Variables de entorno
│   ├── package.json
│   ├── tsconfig.json
│   ├── server.ts                  # Punto de entrada del servidor e init de BD
│   ├── app.ts                     # Configuración de Express, middlewares y rutas
│   └── src/
│       ├── config/
│       │   ├── database.ts        # Conexión Pool PostgreSQL y auto-creación de BD
│       │   └── jwt.ts             # Configuración centralizada de claves y expiración JWT
│       ├── middlewares/
│       │   └── auth.middleware.ts # Validación de token JWT y control de roles (ADMIN)
│       └── modules/
│           ├── auth/
│           │   ├── controllers/
│           │   │   └── auth.controller.ts # Handlers para login, google login, refresh
│           │   ├── models/
│           │   │   └── user.model.ts      # Queries de usuarios y seed inicial
│           │   ├── routes/
│           │   │   └── auth.routes.ts     # Definición de rutas /api/auth/*
│           │   └── services/
│           │       └── auth.service.ts    # Lógica de autenticación y generación de JWT
│           └── expense/
│               └── routes/
│                   └── expense.routes.ts  # CRUD de transacciones /api/expense/*
└── frontend/
    ├── package.json
    ├── angular.json
    ├── tsconfig.json
    ├── tsconfig.app.json
    └── src/
        ├── index.html
        ├── main.ts
        ├── styles.css
        ├── environments/
        │   ├── environment.ts
        │   └── environment.prod.ts
        └── app/
            ├── app.component.ts
            ├── app.component.html
            ├── app.component.css
            ├── app.config.ts              # Configuración de app y provisión de interceptores
            ├── app.routes.ts              # Rutas frontend con authGuard
            ├── guards/
            │   └── auth.guard.ts          # Protección de rutas privadas
            ├── interceptors/
            │   └── auth.interceptor.ts    # Inyección de Bearer Token y manejo de 401
            ├── services/
            │   ├── auth.service.ts        # Manejo de sesión, expiración y actividad
            │   └── transaction.service.ts # Servicio reactivo de gastos e ingresos
            ├── login/
            │   ├── login.component.ts     # Vista de login y Google Sign-In
            │   ├── login.component.html
            │   └── login.component.css
            ├── dashboard/
            │   ├── dashboard.component.ts # Métricas, gráficos y metas de ahorro
            │   ├── dashboard.component.html
            │   └── dashboard.component.css
            ├── transactions/
            │   ├── transactions.component.ts # Listado y gestión de transacciones
            │   ├── transactions.component.html
            │   └── transactions.component.css
            ├── welcome/
            │   ├── welcome.component.ts   # Pantalla de bienvenida
            │   ├── welcome.component.html
            │   └── welcome.component.css
            └── shared/
                └── components/
                    ├── sidebar/           # Menú lateral colapsable
                    ├── particle-canvas/   # Efecto visual interactivo con Canvas
                    ├── glow-horizon/      # Efectos de iluminación y brillo
                    └── hero-background/   # Fondos estilizados
```

---

## Ejecución

### Desarrollo

Ejecuta el backend y el frontend en dos terminales separadas:

```bash
cd backend
pnpm run dev

cd frontend
pnpm run start
```

### Producción

```bash
# Compilar Backend
cd backend
pnpm run build
pnpm run start
# Ejecuta dist/server.js en el puerto configurado

# Compilar Frontend
cd frontend
pnpm run build
# Genera los archivos estáticos listos para producción en dist/
```

---



## Base de datos

### Esquema SQL

```sql
-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255),
  email VARCHAR(100) UNIQUE,
  role VARCHAR(10) NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER')),
  google_id VARCHAR(255),
  picture VARCHAR(500),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Transacciones
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('Gasto', 'Ingreso')),
  amount DECIMAL(12, 2) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```


## Seguridad

- **Hash seguro con bcrypt**: Las contraseñas nunca se almacenan en texto plano (cifradas con `bcryptjs` a 10 rondas de salt).
- **Protección de rutas con JWT**: Middleware `authMiddleware` valida la firma y vigencia del token antes de permitir acceso a cualquier endpoint sensible.
- **Aislamiento por usuario**: Las consultas a transacciones siempre filtran por el `user_id` decodificado del token, impidiendo que un usuario acceda o modifique datos ajenos.
- **Control de inactividad**: El frontend detecta la expiración y redirige de manera segura al login limpiando el almacenamiento local (`localStorage`).
