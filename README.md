# Oficina virtual general

La aplicación inicia sin personajes ni giro seleccionados. Configura personas, gatos u otro animal, indica el giro y define el objetivo. Las sugerencias de giro son opcionales. Los animales distintos del gato utilizan una figura animal estilizada con la especie indicada en la configuración.

El equipo coordina, analiza, ejecuta y revisa tareas generales mediante Ollama. No aplica precios, impuestos ni temarios de MiDev. Puedes consultar solicitudes, cancelar, retomar y descargar resultados en texto. Retomar inicia una nueva ejecución de la solicitud original; no continúa una conexión interrumpida.

## Ejecutar y verificar

Node.js 22.18 o posterior. Ejecuta `npm install` y `npm run dev`. Ollama debe estar disponible con `qwen2.5-coder:7b`; se admiten `OLLAMA_URL` y `OLLAMA_MODEL`.

Verifica con `npm test`, `npm run typecheck`, `npm run lint` y `npm run build`.

## Datos e interfaces

- Configuración del navegador: `generalOffice.config.v1`.
- Solicitudes y resultados: `data/general-office.sqlite`. Respalda este archivo.
- `GET /api/work`: últimas 100 tareas, incluyendo estado, configuración y resultado.
- `POST /api/work`: `{request, config: {characters, sector, objective}}`; respuesta NDJSON con eventos `task`, `stage`, `message`, `done` o `error`. La conexión puede cancelarse; hay un límite de 120 segundos.
- Las tareas activas quedan interrumpidas al reiniciar el servidor.

Los datos anteriores de cotizaciones se conservan intactos. El código comercial anterior permanece como legado fuera de la interfaz principal; su documentación está en `HISTORICO_COTIZADOR.md`. No se ejecuta en el nuevo flujo general.

El prompt reutilizable está en `PROMPT_OFICINA.md`. Las acciones externas necesitan integraciones adicionales; el modelo actual produce texto y código.
