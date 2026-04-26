# Yovi ES2C

<p align="center">
  <img src="webapp/public/yovi-arena-cover.png" alt="Yovi Arena cover" width="900">
</p>

<p align="center">
  Yovi es una plataforma web para jugar al juego Y con autenticacion de usuarios,
  historial personal de partidas y estadisticas personales.
</p>

<p align="center">
  <a href="http://100.49.176.54/"><img src="https://img.shields.io/badge/App-Online-2ea44f?style=for-the-badge" alt="Aplicacion online"></a>
  <a href="https://arquisoft.github.io/yovi_es2c/"><img src="https://img.shields.io/badge/Docs-Arc42-0366d6?style=for-the-badge" alt="Documentacion"></a>
</p>

[![Release](https://github.com/arquisoft/yovi_es2c/actions/workflows/release-deploy.yml/badge.svg)](https://github.com/arquisoft/yovi_es2c/actions/workflows/release-deploy.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_yovi_es2c\&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Arquisoft_yovi_es2c)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_yovi_es2c\&metric=coverage)](https://sonarcloud.io/summary/new_code?id=Arquisoft_yovi_es2c)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_yovi_es2c\&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=Arquisoft_yovi_es2c)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_yovi_es2c\&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=Arquisoft_yovi_es2c)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_yovi_es2c\&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=Arquisoft_yovi_es2c)

---

- [Guía de uso: Cómo jugar a Yovi](docs/how-to-play.md)

---

## Que incluye

* Registro e inicio de sesion de usuarios
* Juego local y contra bot
* Historial de partidas asociado al usuario autenticado
* Estadisticas personales por cuenta
* Ranking global
* Documentacion de arquitectura con Arc42
* Pruebas de carga con Gatling
* Monitorizacion con Prometheus y Grafana

---

## Arquitectura del repositorio

El proyecto esta dividido en varios modulos:

* `webapp/`: frontend en React, Vite y TypeScript
* `users/`: servicio de usuarios en Node.js y Express
* `gamey/`: motor del juego y servicio de bots en Rust
* `docs/`: documentacion de arquitectura y despliegue
* `gatling/`: pruebas de carga

---

## Enlaces utiles

* Aplicacion desplegada: [http://100.49.176.54/](http://100.49.176.54/)
* Documentacion: [https://arquisoft.github.io/yovi_es2c/](https://arquisoft.github.io/yovi_es2c/)
* API docs de usuarios: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
* API de Gamey: [http://localhost:4000](http://localhost:4000)

---

## Requisitos

Para desarrollo local:

* Node.js y npm
* Rust y Cargo
* Docker Desktop si quieres levantarlo con contenedores

---

## Puesta en marcha

### Opcion 1: con Docker

Desde la raiz del proyecto:

```bash
docker compose up --build
```

Servicios esperados:

* `webapp`: [http://localhost](http://localhost)
* `users`: [http://localhost:3000](http://localhost:3000)
* `gamey`: [http://localhost:4000](http://localhost:4000)
* `mongodb`: mongodb://localhost:27017

Variables usadas:

* DB_URI
* DB_PASSWORD

---

### Opcion 2: en local

#### Users

```bash
cd users
npm install
npm start
```

#### Gamey

```bash
cd gamey
cargo run -- --mode server --port 4000
```

#### Webapp

```bash
cd webapp
npm install
npm run dev
```

Frontend disponible en:

[http://localhost:5173](http://localhost:5173)

---

## Observabilidad (Prometheus + Grafana)

El sistema incluye monitorizacion basada en Prometheus y Grafana.

### Levantar monitorizacion

```bash
docker compose up -d prometheus grafana
```

Acceso:

* Prometheus: [http://localhost:9090](http://localhost:9090)
* Grafana: [http://localhost:9091](http://localhost:9091)

Credenciales:

* user: admin
* password: admin

---

### Metricas monitorizadas

Modelo RED:

* Rate (R): numero de peticiones
* Errors (E): errores HTTP (4xx y 5xx)
* Duration (D): latencia

Metricas adicionales:

* Error Rate (%)
* Throughput (RPS)
* Percentiles (p50, p90)

---

### Uso con pruebas de carga

```bash
cd gatling
./mvnw gatling:test
```

Windows:

```powershell
cd gatling
.\mvnw.cmd gatling:test
```

Durante la ejecucion se puede observar:

* Incremento de Rate
* Aparicion de errores
* Variacion de latencia
* Cambios en throughput

---

## Testing

### Webapp

```bash
cd webapp
npm test
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
### Carga
<p align="center">
Los test de carga han sido todos hechos con el recorder.sh.
Actualmente tras las actualizaciones de la app el unico funcional es el UltimaPrueba.scala sin embargo se dejan los anteriores para ver sus versiones antiguas.
</p>
---

##  Tecnologías

###  Frontend
<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" height="24"/>&nbsp;React<br/><br/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" height="24"/>&nbsp;TypeScript<br/><br/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vitejs/vitejs-original.svg" height="24"/>&nbsp;Vite<br/><br/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/materialui/materialui-original.svg" height="24"/>&nbsp;Material UI
</p>

---

###  Backend
<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" height="24"/>&nbsp;Node.js<br/><br/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg" height="24"/>&nbsp;Express<br/><br/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg" height="24"/>&nbsp;MongoDB<br/><br/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/rust/rust-original.svg" height="24"/>&nbsp;Rust (Axum)
</p>

---

###  DevOps & Observabilidad
<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg" height="24"/>&nbsp;Docker<br/><br/>
  <img src="https://cdn.simpleicons.org/gatling" height="24"/>&nbsp;Gatling<br/><br/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/prometheus/prometheus-original.svg" height="24"/>&nbsp;Prometheus<br/><br/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/grafana/grafana-original.svg" height="24"/>&nbsp;Grafana<br/><br/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg" height="24"/>&nbsp;GitHub Actions<br/><br/>
  <img src="https://static.cdnlogo.com/logos/s/13/sonarcloud.svg" height="24"/>&nbsp;SonarCloud
</p>

## Documentacion extra

* webapp/README.md
* docs/README.md
