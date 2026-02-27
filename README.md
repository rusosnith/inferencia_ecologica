# Inferencia Ecológica - Elecciones PBA (2025)

Este repositorio contiene las herramientas y scripts necesarios para realizar **Inferencia Ecológica (EI)** sobre los resultados electorales en la Provincia de Buenos Aires (PBA), comparando las elecciones de 2025 con las de octubre de 2025.

El objetivo principal es estimar los flujos de votos (transferencias) entre diferentes agrupaciones políticas a nivel de circuito electoral, utilizando modelos estadísticos avanzados.

## 🚀 Descripción del Proyecto

La Inferencia Ecológica es una técnica estadística que permite inferir el comportamiento individual (votos de personas) a partir de datos agregados (resultados por circuito). Este proyecto utiliza el paquete `eiPack` de R para implementar un modelo Bayesiano Multinomial-Dirichlet.

### Características principales:
- **Interfaz Web (Nueva)**: Ejecución completa en el navegador mediante WebAssembly (`webR`), sin necesidad de instalar R ni dependencias locales. Visualización interactiva integrada en D3.js.
- **Procesamiento de datos**: Conversión de datos crudos en formato JSON (provenientes del recuento) a CSV estructurado.
- **Modelado Estadístico**: Implementación del algoritmo `ei.MD.bayes` para estimar matrices de transferencia.
- **Validación**: Diagnósticos de convergencia MCMC (Heidelberger-Welch, Geweke, ESS) para asegurar la fiabilidad de los resultados.
- **Visualización**: Generación de diagramas de Sankey para representar visualmente el flujo de votantes.

## 📂 Estructura del Repositorio

- `index.html`, `styles.css`, `app.js`: Interfaz de usuario de la **Aplicación Web** interactiva propulsada por WebR.
- `dataviz/`: Colección de scripts D3.js exportados de Observable para la renderización del diagrama de Sankey.
- `generic_ei.R`: Template de R puro en RBase y eiPack, adaptado para recibir datos serializados desde Javascript.
- `ei_2025_to_oct2025.R`: Script heredado de análisis que realiza el merge de datos, filtra circuitos estables y ejecuta el modelo de inferencia.
- `json_to_csv.R`: Script para transformar los archivos JSON de datos electorales en CSV procesables.
- `create_sankey_plot.R`: Genera visualizaciones interactivas de flujos de votos (versión local R).
- `data/`: Directorio que contiene los datos de entrada (JSON/CSV) por circuito.
- `aux_scripts/`: Colección de utilidades secundarias.
- `results/`: (Generado tras ejecución local) Contiene las matrices de proporciones y flujos absolutos.

## 🌐 Uso de la Aplicación Web (GitHub Pages)

La versión más reciente incluye una herramienta completamente portátil que corre en tu navegador gracias a **WebR** y **WebAssembly**. No requiere que instales R en tu máquina.

### ¿Cómo desplegarlo en GitHub Pages?
Como el código subido a este repositorio es 100% estático (HTML, CSS, y Javascript sin Backend), puedes desplegarlo gratuitamente en tu GitHub:

1. Ve a la pestaña **Settings** de este repositorio en GitHub.
2. Navega a **Pages** (en la barra lateral izquierda).
3. En la sección *Build and deployment*, en la opción *Source*, elige **Deploy from a branch**.
4. En *Branch*, selecciona la rama **`main`** y la carpeta `/(root)`.
5. Haz clic en **Save**. En unos minutos, tendrás el Inferenciómetro en línea disponible en `https://[tu-usuario].github.io/PBA_inferencia_ecologica/`.

*¡Alternativamente, puedes simplemente abrir el archivo `index.html` en tu navegador desde tu computadora local!*

## 🛠️ Requisitos Técnicos (Para uso Analítico Local)

Si prefieres explorar, modificar o usar herramientas de diagnóstico avanzadas en los scripts nativos, es necesario tener instalado **R** y las siguientes bibliotecas:

```r
install.packages(c("eiPack", "data.table", "dplyr", "jsonlite", "coda", "networkD3"))
```

## 📈 Metodología y Flujo de Trabajo

1. **Preparación**: Los datos se cargan desde archivos JSON y se limpian para asegurar la consistencia de los identificadores de circuitos.
2. **Filtrado**: Se seleccionan circuitos donde el padrón electoral se mantuvo estable (variación < 15%) entre ambas elecciones para minimizar el ruido por migraciones.
3. **Inferencia**: Se define una matriz de origen (2025) y una de destino (Oct 2025). El modelo estima la probabilidad de que un votante de la opción A en 2025 haya elegido la opción B en Octubre.
4. **Análisis de Resultados**:
   - **Matriz de Transferencia**: Probabilidades de transición.
   - **Flujos Absolutos**: Estimación de cantidad de personas que migraron entre partidos.
   - **Lealtad**: Porcentaje de votantes que permanecieron con su agrupación original.

## 📊 Visualizaciones

El proyecto genera archivos HTML con diagramas de Sankey (`vote_transfers_sankey.html`) que permiten explorar de forma interactiva cómo se distribuyeron los votos de una elección a otra.

---
*Desarrollado para el análisis de datos políticos y electorales en la Provincia de Buenos Aires.*
