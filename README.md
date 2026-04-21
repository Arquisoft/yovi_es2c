# Yovi ES2C

<p align="center">
  <img src="webapp/public/tri-billiard.svg" alt="Yovi logo" width="220">
</p>

<p align="center">
  Yovi es una plataforma web para jugar al juego Y con autenticacion de usuarios,
  historial personal de partidas y estadisticas personales.
</p>

<p align="center">
  <a href="http://13.49.237.46/"><img src="https://img.shields.io/badge/App-Online-2ea44f?style=for-the-badge" alt="Aplicacion online"></a>
  <a href="https://arquisoft.github.io/yovi_es2c/"><img src="https://img.shields.io/badge/Docs-Arc42-0366d6?style=for-the-badge" alt="Documentacion"></a>
</p>

[![Release](https://github.com/arquisoft/yovi_es2c/actions/workflows/release-deploy.yml/badge.svg)](https://github.com/arquisoft/yovi_es2c/actions/workflows/release-deploy.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_yovi_es2c&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Arquisoft_yovi_es2c)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_yovi_es2c&metric=coverage)](https://sonarcloud.io/summary/new_code?id=Arquisoft_yovi_es2c)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_yovi_es2c&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=Arquisoft_yovi_es2c)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_yovi_es2c&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=Arquisoft_yovi_es2c)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_yovi_es2c&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=Arquisoft_yovi_es2c)

## Que incluye

- Registro e inicio de sesion de usuarios.
- Juego local y contra bot.
- Historial de partidas asociado al usuario autenticado.
- Estadisticas personales por cuenta.
- Ranking global.
- Documentacion de arquitectura con Arc42.

## Arquitectura del repositorio

El proyecto esta dividido en varios modulos:

- `webapp/`: frontend en React, Vite y TypeScript.
- `users/`: servicio de usuarios en Node.js y Express.
- `gamey/`: motor del juego y servicio de bots en Rust.
- `docs/`: documentacion de arquitectura y despliegue.
- `gatling/`: pruebas de carga.

## Enlaces utiles

- Aplicacion desplegada: `http://13.49.237.46/`
- Documentacion: `https://arquisoft.github.io/yovi_es2c/`
- API docs de usuarios: `http://localhost:3000/api-docs`
- API de Gamey: `http://localhost:4000`

## Requisitos

Para desarrollo local:

- Node.js y npm
- Rust y Cargo
- Docker Desktop si quieres levantarlo con contenedores

## Puesta en marcha

### Opcion 1: con Docker

Desde la raiz del proyecto:

```bash
docker compose up --build
```

Servicios esperados:

- `webapp`: `http://localhost`
- `users`: `http://localhost:3000`
- `gamey`: `http://localhost:4000`
- `mongodb`: `mongodb://localhost:27017`

Variables usadas por `docker compose`:

- `DB_URI`
- `DB_PASSWORD`

### Opcion 2: en local

Arranca cada modulo en una terminal distinta.

#### 1. Users

```bash
cd users
npm install
npm start
```

#### 2. Gamey

```bash
cd gamey
cargo run
```

#### 3. Webapp

```bash
cd webapp
npm install
npm run dev
```

El frontend suele quedar disponible en:

```text
http://localhost:5173
```

## Como probar la funcionalidad principal

1. Registra una cuenta nueva.
2. Inicia sesion.
3. Juega una o varias partidas.
4. Entra en `Historial de partidas` y comprueba que ves solo tus partidas.
5. Entra en `Estadisticas personales` y revisa victorias, derrotas y ratio.
6. Cierra sesion y repite el proceso con otro usuario para verificar que no se mezclan los datos.

## Testing

### Webapp

```bash
cd webapp
npm test
```

Cobertura:

```bash
npm run test:coverage
```

E2E:

```bash
npm run test:e2e
```

### Users

```bash
cd users
npm test
```

### Gamey

```bash
cd gamey
cargo test
```

## Scripts utiles

### `webapp`

- `npm run dev`: arranca Vite en desarrollo.
- `npm run build`: genera el build de produccion.
- `npm test`: ejecuta tests unitarios.
- `npm run test:coverage`: ejecuta tests con cobertura.
- `npm run test:e2e`: ejecuta pruebas end-to-end.

### `users`

- `npm start`: arranca el servicio.
- `npm test`: ejecuta pruebas del servicio.

### `gamey`

- `cargo run`: arranca el servicio Gamey.
- `cargo test`: ejecuta la bateria de tests.
- `cargo build`: compila el proyecto.

## Tecnologias

- React
- TypeScript
- Vite
- Material UI
- Node.js
- Express
- MongoDB
- Rust
- Axum
- Docker
- GitHub Actions
- SonarCloud

## Documentacion extra

- [webapp/README.md](webapp/README.md)
- [docs/README.md](docs/README.md)
