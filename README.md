# Netin

Netin es una app de monitoreo de salud para astronautas, hecha para NASA Space Apps. Cada persona de la tripulación lleva un registro diario (foto, chequeo, prueba motora y bitácora), anota síntomas en un mapa corporal y ve sus mediciones y tendencias. Todos los datos se quedan en el equipo.

La IA y la base de documentos médicos se integrarán después. Mientras tanto, cada reporte queda en una cola local con un formato estructurado, listo para que el asistente lo lea.

## Requisitos (Windows)

- Node.js 24 o superior (probado con 26). Comprueba la versión con `node --version`.
  Si tienes otro `node.exe` antiguo en el PATH (por ejemplo, el de Brackets), usa la ruta completa `"C:\Program Files\nodejs\node.exe"` o pon `C:\Program Files\nodejs` primero en el PATH.
- Un navegador moderno (Edge o Chrome) con permiso de cámara para la foto diaria.

## Cómo ejecutarlo

En PowerShell, dentro de la carpeta del proyecto:

```powershell
npm install
npm run dev
```

Abre http://localhost:5173. `npm run dev` levanta la API (puerto 4310) y la interfaz (puerto 5173) a la vez.

Para usarlo sin modo de desarrollo:

```powershell
npm run build
npm start
```

Después abre http://127.0.0.1:4310.

### Datos ficticios para la demo

```powershell
npm run demo:datos
```

Crea el perfil **Astra Demo** (contraseña `demo-netin`) con 14 días de registros inventados: chequeos, un síntoma en el hombro que va mejorando, pruebas motoras, bitácoras y mediciones simuladas. Las fotos no se generan. El perfil aparece marcado como «Datos ficticios». El registro de hoy queda pendiente para que puedas probar el flujo diario.

Para hacer pruebas sin mezclar con tus datos, usa otra carpeta:

```powershell
$env:NETIN_DATOS = "datos-prueba"; npm run demo:datos; npm run dev
```

### Pruebas

```powershell
npm test         # pruebas de la API de principio a fin (carpeta temporal, no toca tus datos)
npm run build    # revisión de tipos de interfaz y servidor y compilación
```

## Dónde se guarda cada cosa

| Qué | Dónde |
| --- | --- |
| Perfiles, contraseñas (hash scrypt), registros, historial de correcciones, conversación y cola para la IA | `datos/netin.db` (SQLite) |
| Fotos diarias | `datos/fotos/<perfil>/<AAAA-MM-DD>.jpg` |
| Documentos de la misión | `documentos/` (ver `documentos/LEEME.md`) |

Las carpetas `datos/` y `documentos/` no se suben a GitHub. Puedes cambiarlas con las variables `NETIN_DATOS` y `NETIN_DOCUMENTOS`.

## Estructura del código

```
compartido/   catálogos y tipos que usan la interfaz y el servidor (zonas, etapas, indicadores)
server/       API en Node.js + Express y SQLite integrado de Node (node:sqlite)
  app.ts        rutas HTTP; todo lo que va después de la sesión queda acotado al perfil
  perfiles.ts   perfiles, contraseñas y sesiones
  registros.ts  registros, foto diaria, chequeo, síntomas, borradores e importación CSV
  salida-ia.ts  cola de datos para la IA futura
  resumenes.ts  resúmenes automáticos sin IA
  tests/        pruebas de la API
src/          interfaz en React + Vite + Tailwind + shadcn/ui
  pantallas/    Acceso, flujo diario, Inicio, Asistente, Salud, Registros, Documentos, Ajustes
  componentes/  marco, horizonte animado, mapa corporal, cámara, prueba de reacción, gráficas
documentos/   carpeta local para los PDF y textos de la misión
```

## Conectar la IA más adelante

La IA no está integrada. El punto de entrada es la cola `cola_ia`:

- Cada registro que se crea, corrige o elimina, y cada mensaje del Asistente, agrega un evento.
- `GET /api/ia/pendientes` devuelve los eventos de la sesión actual. Cada evento trae un paquete que separa lo **reportado** por la persona (síntomas, chequeos, bitácoras, mensajes) de lo **medido** (vitales con su origen y hora, pruebas motoras) y del contexto (fecha y etapa).
- `POST /api/ia/procesados` con `{ "hasta": <número de evento> }` marca los eventos como leídos.
- Los resúmenes tienen el campo `origen` (`automatico`, `ia` o `simulado`), de modo que la interfaz ya distingue de dónde sale cada texto.

Las funciones de consulta están en `server/salida-ia.ts`. El asistente deberá respetar estas reglas: distinguir lo reportado, lo medido y lo que dice una fuente; no inventar diagnósticos, umbrales, dosis ni protocolos; y remitir al responsable médico de la misión cuando falte respaldo.

## Estado de las funciones

**Verificado con pruebas automáticas (`npm test`):**

- Crear perfil, contraseña con hash, rechazo de contraseña incorrecta y freno tras varios intentos, cerrar sesión.
- Aislamiento: un perfil no puede leer, corregir ni borrar registros ni fotos de otro.
- Foto diaria: se pide primero, se puede repetir, hay una por perfil y fecha, y se puede seguir sin cámara.
- Los datos se conservan al reiniciar el servidor.
- Chequeo con síntomas nuevos; al día siguiente pide la foto otra vez y hace seguimiento del síntoma pendiente.
- Prueba motora: las estadísticas se calculan en el servidor y se comparan con pruebas anteriores.
- Bitácora guardada tal cual.
- Corrección con historial y eliminación.
- Cola para la IA con lo reportado y lo medido separados.
- Importación de mediciones desde CSV.
- Archivar, restaurar y eliminar perfiles.

**Verificado a mano en el navegador:** selección y creación de perfil, y pantalla de foto sin cámara.

**Simulado:**

- El botón «Simular» en Salud y las mediciones del perfil de demostración generan valores inventados marcados como «Simulada».
- La guía del chequeo usa preguntas fijas y no es IA.

**Pendiente:**

- Asistente con IA: la conversación se guarda, pero todavía no responde.
- Interpretaciones del asistente en Salud Mental y Habilidades motoras.
- Posibles explicaciones con respaldo en el mapa corporal.
- Guía por indicador (cómo medir, qué observar, prevención, cuándo avisar): la app muestra «Sin documento de respaldo».
- Índice y búsqueda en los documentos: hoy Documentos solo lista y abre los archivos.
- Avisos compartidos con la tripulación: hoy solo existen avisos locales y simulacros.
- ARCHeR: el control está visible y marcado como «Integración futura».
