# Documentacion - YOVI

Este modulo contiene la documentacion de arquitectura y calidad del proyecto YOVI,
siguiendo la plantilla [Arc42](https://github.com/arc42/arc42-template).

La documentacion se compila en local y se despliega en GitHub Pages:

- URL publica: <https://arquisoft.github.io/yovi_es2c/>

## Requisitos

Para generar y desplegar la documentacion necesitas:

- [Ruby](https://www.ruby-lang.org/) (para instalar gems de Asciidoctor).
- [Java JRE](https://adoptium.net/) o similar.
- [PlantUML](https://plantuml.com) (para los diagramas).
- [Node.js](https://nodejs.org/) y `npm`.

La documentacion se escribe en [AsciiDoc](https://asciidoc.org/) y se transforma a HTML con
[Asciidoctor](https://asciidoctor.org/), usando `asciidoctor-diagram`/`asciidoctor-kroki`
para los diagramas y `gh-pages` para el despliegue.

En Linux puedes instalar Ruby y Java con:

```shell
apt-get install ruby default-jre
```

En Windows puedes seguir las instrucciones oficiales de Ruby:

- <https://www.ruby-lang.org/en/documentation/installation>

Si no tienes Java instalado, puedes descargarlo desde:

- <https://www.oracle.com/es/java/technologies/javase/javase8-archive-downloads.html>

## Instalacion de herramientas

1. Instalar las gems necesarias de Ruby:

   ```shell
   gem install asciidoctor asciidoctor-diagram
   ```

2. Instalar las dependencias npm del modulo `docs`:

   ```shell
   cd docs
   npm install
   ```

El script `npm install` trae, entre otros:

- `@asciidoctor/cli` y `@asciidoctor/core` para la generacion de HTML.
- `asciidoctor-kroki` para diagramas.
- `shx` para operaciones de ficheros multiplataforma.
- `gh-pages` para publicar en GitHub Pages.

## Generar la documentacion en local

Desde la carpeta `docs`:

```shell
npm run build
```

Este comando:

- Borra la carpeta `build` anterior.
- Ejecuta Asciidoctor sobre `index.adoc` generando los HTML bajo `build/`.
- Copia la carpeta `images` a `build/images`.

La salida final queda en `docs/build`. El fichero principal suele ser `docs/build/index.html`.

## Despliegue en GitHub Pages

Para publicar la documentacion generada en GitHub Pages (rama `gh-pages` del repositorio):

```shell
npm run deploy
```

Este script ejecuta internamente:

- `gh-pages -d build`

Es decir, sube el contenido de la carpeta `build` a la rama `gh-pages`.  
Todo lo que se sube a esa rama queda accesible en:

- <https://arquisoft.github.io/yovi_es2c/>

Es importante no commitear la carpeta `build` en las demas ramas del proyecto; solo se publica en `gh-pages`.

## Estructura de la documentacion (ficheros .adoc)

La documentacion se organiza siguiendo las secciones tipicas de Arc42.  
Los ficheros principales estan en `docs/src`:

- `config.adoc`: configuracion general de la plantilla y metadatos del documento.
- `01_introduction_and_goals.adoc`: introduccion al sistema YOVI, objetivos del proyecto y metas de calidad.
- `02_architecture_constraints.adoc`: restricciones de arquitectura (tecnologicas, organizativas, normativas, etc.).
- `03_context_and_scope.adoc`: contexto del sistema, limites y relaciones con sistemas externos.
- `04_solution_strategy.adoc`: ideas clave y decisiones globales que guian la solucion tecnica.
- `05_building_block_view.adoc`: vista de bloques de construccion (modulos como `webapp`, `users`, `gamey`, etc.).
- `06_runtime_view.adoc`: ejemplos de escenarios de ejecucion y secuencias de interaccion entre componentes.
- `07_deployment_view.adoc`: vista de despliegue (entornos, contenedores, nodos y como se distribuyen los componentes).
- `08_concepts.adoc`: conceptos clave del dominio y modelos conceptuales usados en el sistema.
- `09_architecture_decisions.adoc`: decisiones de arquitectura (ADR) y su justificacion.
- `10_quality_requirements.adoc`: requisitos de calidad (por ejemplo rendimiento, seguridad, mantenibilidad) y escenarios asociados.
- `11_technical_risks.adoc`: riesgos tecnicos identificados y posibles medidas de mitigacion.
- `12_glossary.adoc`: glosario de terminos importantes del dominio y abreviaturas.
- `13_load_test.adoc`: descripcion de las pruebas de carga realizadas (p.ej. con Gatling) y sus resultados principales.
- `about-arc42.adoc`: informacion sobre la plantilla Arc42 y como se aplica en este proyecto.
