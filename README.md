# Inferencia Ecológica - Elecciones PBA (2025)

Este repositorio contiene las herramientas y scripts necesarios para realizar **Inferencia Ecológica (EI)** sobre los resultados electorales en la Provincia de Buenos Aires (PBA), comparando las elecciones de 2025 con las de octubre de 2025.

El objetivo principal es estimar los flujos de votos (transferencias) entre diferentes agrupaciones políticas a nivel de circuito electoral, utilizando modelos estadísticos avanzados.

## 🚀 Descripción del Proyecto

La Inferencia Ecológica es una técnica estadística que permite inferir el comportamiento individual (votos de personas) a partir de datos agregados (resultados por circuito). Este proyecto utiliza el paquete `eiPack` de R para implementar un modelo Bayesiano Multinomial-Dirichlet.

### Características principales:
- **Procesamiento de datos**: Conversión de datos crudos en formato JSON (provenientes del recuento) a CSV estructurado.
- **Modelado Estadístico**: Implementación del algoritmo `ei.MD.bayes` para estimar matrices de transferencia.
- **Validación**: Diagnósticos de convergencia MCMC (Heidelberger-Welch, Geweke, ESS) para asegurar la fiabilidad de los resultados.
- **Visualización**: Generación de diagramas de Sankey para representar visualmente el flujo de votantes.

## 📂 Estructura del Repositorio

- `ei_2025_to_oct2025.R`: Script principal de análisis que realiza el merge de datos, filtra circuitos estables y ejecuta el modelo de inferencia.
- `json_to_csv.R`: Script para transformar los archivos JSON de datos electorales en CSV procesables.
- `create_sankey_plot.R`: Genera visualizaciones interactivas de flujos de votos.
- `data/`: Directorio que contiene los datos de entrada (JSON/CSV) por circuito.
- `aux_scripts/`: Colección de utilidades para:
  - Chequeo de integridad de datos.
  - Diagnóstico de matrices de transferencia.
  - Pruebas de simulación y depuración.
- `results/`: (Generado tras ejecución) Contiene las matrices de proporciones y flujos absolutos.

## 🛠️ Requisitos Técnicos

Para ejecutar los scripts, es necesario tener instalado **R** y las siguientes bibliotecas:

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
